/**
 * Sync Service Tests — verifies exponential backoff, duplicate prevention,
 * PROCESSING guard, and table name mapping.
 */

// Mock expo-sqlite so it never hits real FS
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// Mock the database to control queue state
const mockPendingItems: any[] = [];
jest.mock('../services/database', () => ({
  db: {
    init: jest.fn().mockResolvedValue(undefined),
    getPendingSyncItems: jest.fn().mockImplementation(() => Promise.resolve([...mockPendingItems])),
    updateSyncItemStatus: jest.fn().mockResolvedValue(undefined),
    enqueueSync: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks
import { syncService } from '../services/sync';
import { db } from '../services/database';

describe('SyncService — Hardened Sync Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPendingItems.length = 0;
  });

  // ===================================================================
  // 1. Happy Path
  // ===================================================================
  it('processes a PENDING item and marks it COMPLETED', async () => {
    mockPendingItems.push({
      id: 'item-001',
      entity: 'activities',
      entity_id: 'act-001',
      operation: 'CREATE',
      payload: JSON.stringify({ id: 'act-001', title: 'Morning Run' }),
      retry_count: 0,
      status: 'PENDING',
    });

    const result = await syncService.processQueue();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    // Should have set PROCESSING first, then COMPLETED
    const updateCalls = (db.updateSyncItemStatus as jest.Mock).mock.calls;
    const statuses = updateCalls.map((c) => c[1]);
    expect(statuses).toContain('PROCESSING');
    expect(statuses).toContain('COMPLETED');
  });

  // ===================================================================
  // 2. Remote Error → FAILED
  // ===================================================================
  it('marks a failed remote upsert as FAILED', async () => {
    const { supabase } = require('../services/supabase');
    supabase.from.mockReturnValueOnce({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
    });

    mockPendingItems.push({
      id: 'item-002',
      entity: 'habits',
      entity_id: 'hab-001',
      operation: 'CREATE',
      payload: JSON.stringify({ id: 'hab-001', name: 'Read' }),
      retry_count: 0,
      status: 'PENDING',
    });

    const result = await syncService.processQueue();

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    const updateCalls = (db.updateSyncItemStatus as jest.Mock).mock.calls;
    const failedCall = updateCalls.find((c) => c[1] === 'FAILED');
    expect(failedCall).toBeDefined();
    expect(failedCall[2]).toContain('RLS violation');
  });

  // ===================================================================
  // 3. Exponential Backoff — do not retry too soon after a failure
  // ===================================================================
  it('skips items that have not yet passed their backoff window after a failure', async () => {
    const { supabase } = require('../services/supabase');
    // Make Supabase fail so the item is marked FAILED and lastAttemptedAt is retained
    supabase.from.mockReturnValueOnce({
      upsert: jest.fn().mockRejectedValue(new Error('Network timeout')),
    });

    // An item with retry_count=3 requires at least 8s backoff (2^3 * 1000ms)
    mockPendingItems.push({
      id: 'item-backoff-003',
      entity: 'workouts',
      entity_id: 'wkt-001',
      operation: 'CREATE',
      payload: JSON.stringify({ id: 'wkt-001' }),
      retry_count: 3,
      status: 'FAILED',
    });

    // First call — triggers the attempt (fails), records lastAttemptedAt, does NOT delete it
    await syncService.processQueue();
    jest.clearAllMocks();

    // Immediate second call — should skip because backoff (8s) hasn't elapsed
    await syncService.processQueue();
    const secondPassCalls = (db.updateSyncItemStatus as jest.Mock).mock.calls.length;

    // Zero calls means the item was correctly skipped
    expect(secondPassCalls).toBe(0);
  });

  // ===================================================================
  // 4. Duplicate Prevention via enqueue()
  // ===================================================================
  it('does not enqueue a duplicate item if PENDING item already exists for same entity_id+operation', async () => {
    mockPendingItems.push({
      id: 'item-004',
      entity: 'goals',
      entity_id: 'goal-001',
      operation: 'CREATE',
      payload: JSON.stringify({ id: 'goal-001' }),
      retry_count: 0,
      status: 'PENDING',
    });

    // Calling enqueue for the same goal with CREATE operation
    await syncService.enqueue('goals', 'goal-001', 'CREATE', { id: 'goal-001', updated: true });

    // db.enqueueSync should NOT have been called because a PENDING item already exists
    expect(db.enqueueSync).not.toHaveBeenCalled();
  });

  it('enqueues a new item when no matching PENDING item exists', async () => {
    // No items in queue
    await syncService.enqueue('activities', 'act-new-001', 'CREATE', { id: 'act-new-001' });

    expect(db.enqueueSync).toHaveBeenCalledWith(
      'activities',
      'act-new-001',
      'CREATE',
      expect.any(Object)
    );
  });

  // ===================================================================
  // 5. Entity → Table Name Mapping
  // ===================================================================
  it('correctly processes all entity types with correct table mapping', async () => {
    const { supabase } = require('../services/supabase');
    const tablesCalled: string[] = [];

    supabase.from.mockImplementation((table: string) => {
      tablesCalled.push(table);
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    const entities = [
      { entity: 'habits', entity_id: 'h1', expectedTable: 'habits' },
      { entity: 'habit_completions', entity_id: 'hc1', expectedTable: 'habit_completions' },
      { entity: 'activities', entity_id: 'a1', expectedTable: 'activities' },
      { entity: 'workouts', entity_id: 'w1', expectedTable: 'workouts' },
      { entity: 'surf_sessions', entity_id: 's1', expectedTable: 'surf_sessions' },
      { entity: 'goals', entity_id: 'g1', expectedTable: 'goals' },
    ];

    for (const e of entities) {
      mockPendingItems.push({
        id: `item-${e.entity_id}`,
        entity: e.entity,
        entity_id: e.entity_id,
        operation: 'CREATE',
        payload: JSON.stringify({ id: e.entity_id }),
        retry_count: 0,
        status: 'PENDING',
      });
    }

    await syncService.processQueue();

    for (const e of entities) {
      expect(tablesCalled).toContain(e.expectedTable);
    }
  });

  // ===================================================================
  // 6. DELETE operation
  // ===================================================================
  it('correctly routes DELETE operations to supabase .delete().eq()', async () => {
    const { supabase } = require('../services/supabase');
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({
      delete: jest.fn().mockReturnValue({ eq: eqMock }),
    });

    mockPendingItems.push({
      id: 'item-del-001',
      entity: 'goals',
      entity_id: 'goal-999',
      operation: 'DELETE',
      payload: JSON.stringify({ id: 'goal-999' }),
      retry_count: 0,
      status: 'PENDING',
    });

    const result = await syncService.processQueue();

    expect(result.processed).toBe(1);
    expect(eqMock).toHaveBeenCalledWith('id', 'goal-999');
  });
});
