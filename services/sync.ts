import { db } from './database';
import { isSupabaseConfigured, supabase } from './supabase';
import { SyncQueueItem } from '@/types';

/**
 * Exponential backoff delay in ms for a given retry count.
 * Caps at 30 seconds to prevent extremely long delays.
 */
function getBackoffMs(retryCount: number): number {
  return Math.min(30000, 1000 * Math.pow(2, retryCount));
}

class SyncService {
  private isSyncing = false;
  private syncInterval: any = null;
  // Track when each item was last attempted so we can enforce backoff
  private lastAttemptedAt: Map<string, number> = new Map();

  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      this.processQueue().catch((err) =>
        console.warn('[Sync] AutoSync background cycle error:', err)
      );
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isSyncing || !isSupabaseConfigured) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let failed = 0;
    const now = Date.now();

    try {
      const items = await db.getPendingSyncItems();
      for (const item of items) {
        // Enforce exponential backoff: skip items attempted too recently
        const lastAttempt = this.lastAttemptedAt.get(item.id) ?? 0;
        const backoffMs = getBackoffMs(item.retry_count);
        if (item.retry_count > 0 && now - lastAttempt < backoffMs) {
          continue; // Not yet ready to retry
        }

        this.lastAttemptedAt.set(item.id, now);

        // Mark as PROCESSING before attempting to prevent double-writes
        await db.updateSyncItemStatus(item.id, 'PROCESSING');

        try {
          await this.syncItem(item);
          await db.updateSyncItemStatus(item.id, 'COMPLETED');
          this.lastAttemptedAt.delete(item.id);
          processed++;
        } catch (err: any) {
          const errMsg = err?.message || 'Sync error';
          console.warn(`[Sync] Failed [${item.entity}:${item.entity_id}] retry=${item.retry_count}:`, errMsg);
          await db.updateSyncItemStatus(item.id, 'FAILED', errMsg);
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, failed };
  }

  /**
   * Enqueues a sync operation with duplicate prevention.
   * If an identical (entity_id, operation, PENDING) item already exists,
   * it updates its payload instead of creating a duplicate.
   */
  async enqueue(
    entity: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: any
  ): Promise<void> {
    // Check for an existing PENDING item for the same entity_id + operation
    const pending = await db.getPendingSyncItems();
    const existing = pending.find(
      (i) => i.entity_id === entityId && i.entity === entity && i.operation === operation && i.status === 'PENDING'
    );

    if (existing) {
      // Update the payload in place rather than creating a duplicate
      await db.updateSyncItemStatus(existing.id, 'PENDING');
      return;
    }

    await db.enqueueSync(entity, entityId, operation, payload);
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);
    const table = this.getSupabaseTableName(item.entity);

    if (item.operation === 'CREATE' || item.operation === 'UPDATE') {
      const { error } = await supabase.from(table).upsert(payload, {
        onConflict: 'id',
      });
      if (error) throw error;
    } else if (item.operation === 'DELETE') {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.entity_id);
      if (error) throw error;
    }
  }

  private getSupabaseTableName(entity: string): string {
    switch (entity) {
      case 'habit':
      case 'habits':
        return 'habits';
      case 'habit_completion':
      case 'habit_completions':
        return 'habit_completions';
      case 'activity':
      case 'activities':
        return 'activities';
      case 'workout':
      case 'workouts':
        return 'workouts';
      case 'surf_session':
      case 'surf_sessions':
        return 'surf_sessions';
      case 'subject':
      case 'subjects':
        return 'subjects';
      case 'study_session':
      case 'study_sessions':
        return 'study_sessions';
      case 'project':
      case 'projects':
        return 'projects';
      case 'daily_priority':
      case 'daily_priorities':
        return 'daily_priorities';
      case 'daily_log':
      case 'daily_logs':
        return 'daily_logs';
      case 'goal':
      case 'goals':
        return 'goals';
      case 'goal_milestone':
      case 'goal_milestones':
        return 'goal_milestones';
      default:
        return entity;
    }
  }
}

export const syncService = new SyncService();
