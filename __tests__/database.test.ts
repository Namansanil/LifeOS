/**
 * Database Repository Tests — verifies CRUD operations, user isolation,
 * and sync queue correctness using the web fallback (AsyncStorage).
 *
 * We test via the repository layer since that's what screens consume.
 * We mock expo-sqlite to force the AsyncStorage fallback code path,
 * which makes tests deterministic and environment-independent.
 */

// Force SQLite to fail so we fall back to AsyncStorage
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockRejectedValue(new Error('SQLite unavailable in test env')),
}));

// In-memory AsyncStorage mock
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn().mockImplementation((key: string) => {
    return Promise.resolve(store[key] ?? null);
  }),
  removeItem: jest.fn().mockImplementation((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
}));

import {
  activitiesRepository,
  habitsRepository,
  goalsRepository,
  projectsRepository,
} from '../services/repositories';
import { Activity, Goal, Habit, Project } from '../types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function makeActivity(overrides?: Partial<Activity>): Activity {
  const ts = new Date().toISOString();
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: 'user-001',
    type: 'RUN',
    category: 'MOVE',
    title: 'Morning Run',
    started_at: ts,
    ended_at: ts,
    duration: 1800,
    distance: 5000,
    moving_time: 1700,
    elevation_gain: 45,
    elevation_loss: 38,
    average_speed: 2.94,
    max_speed: 4.2,
    average_pace: 340,
    best_pace: 310,
    calories: 325,
    source: 'GPS',
    visibility: 'PRIVATE',
    gps_quality: 'EXCELLENT',
    created_at: ts,
    updated_at: ts,
    ...overrides,
  };
}

function makeHabit(overrides?: Partial<Habit>): Habit {
  const ts = new Date().toISOString();
  return {
    id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    user_id: 'user-001',
    name: 'Morning Cold Shower',
    category: 'MORNING',
    frequency: 'DAILY',
    active: true,
    sort_order: 1,
    created_at: ts,
    updated_at: ts,
    ...overrides,
  };
}

function makeGoal(overrides?: Partial<Goal>): Goal {
  const ts = new Date().toISOString();
  return {
    id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    user_id: 'user-001',
    title: 'Run a Half Marathon',
    description: 'Complete 21.1km in under 2 hours',
    pillar: 'MOVE',
    status: 'ACTIVE',
    progress_percentage: 0,
    milestones: [
      {
        id: 'ms-001',
        goal_id: 'goal-001',
        title: 'Run 15km continuously',
        completed: false,
        order_index: 1,
      },
    ],
    created_at: ts,
    updated_at: ts,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// Clear store before each test
// ─────────────────────────────────────────────
beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────
// 1. ACTIVITIES REPOSITORY
// ─────────────────────────────────────────────
describe('activitiesRepository', () => {
  it('saves and retrieves an activity', async () => {
    const act = makeActivity();
    await activitiesRepository.saveActivity(act);
    const all = await activitiesRepository.getActivities('user-001');
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(act.id);
    expect(all[0].distance).toBe(5000);
    expect(all[0].gps_quality).toBe('EXCELLENT');
  });

  it('preserves GPS metrics (elevation_loss, max_speed, best_pace, splits)', async () => {
    const act = makeActivity({
      elevation_loss: 38,
      max_speed: 4.2,
      best_pace: 310,
      splits: [
        {
          splitNumber: 1,
          distanceMeters: 1000,
          durationSeconds: 340,
          movingSeconds: 335,
          paceSecKm: 340,
          speedKmh: 10.6,
          elevationGainMeters: 12,
          elevationLossMeters: 8,
        },
      ],
    });

    await activitiesRepository.saveActivity(act);
    const all = await activitiesRepository.getActivities('user-001');
    const saved = all[0];

    expect(saved.elevation_loss).toBe(38);
    expect(saved.max_speed).toBe(4.2);
    expect(saved.best_pace).toBe(310);
    expect(saved.splits).toHaveLength(1);
    expect(saved.splits![0].splitNumber).toBe(1);
    expect(saved.splits![0].paceSecKm).toBe(340);
  });

  it('enforces user isolation — user-002 cannot see user-001 activities', async () => {
    await activitiesRepository.saveActivity(makeActivity({ user_id: 'user-001' }));
    await activitiesRepository.saveActivity(makeActivity({ user_id: 'user-002' }));

    const user1Activities = await activitiesRepository.getActivities('user-001');
    const user2Activities = await activitiesRepository.getActivities('user-002');

    expect(user1Activities).toHaveLength(1);
    expect(user2Activities).toHaveLength(1);
    expect(user1Activities[0].user_id).toBe('user-001');
    expect(user2Activities[0].user_id).toBe('user-002');
  });

  it('retrieves activity by id', async () => {
    const act = makeActivity({ id: 'known-id-abc' });
    await activitiesRepository.saveActivity(act);

    const found = await activitiesRepository.getActivityById('user-001', 'known-id-abc');
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Morning Run');
  });

  it('returns null for non-existent activity id', async () => {
    const result = await activitiesRepository.getActivityById('user-001', 'nonexistent-id');
    expect(result).toBeNull();
  });

  it('enqueues a sync item on save', async () => {
    const act = makeActivity();
    await activitiesRepository.saveActivity(act);
    // The AsyncStorage store should have a sync_queue entry
    const queueData = store['@lifeos_sync_queue'];
    expect(queueData).toBeDefined();
    const queue = JSON.parse(queueData);
    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0].entity).toBe('activities');
    expect(queue[0].entity_id).toBe(act.id);
  });
});

// ─────────────────────────────────────────────
// 2. HABITS REPOSITORY
// ─────────────────────────────────────────────
describe('habitsRepository', () => {
  it('saves and retrieves active habits', async () => {
    const habit = makeHabit();
    await habitsRepository.saveHabit(habit);
    const habits = await habitsRepository.getHabits('user-001');
    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe('Morning Cold Shower');
    expect(habits[0].active).toBe(true);
  });

  it('toggles habit completion and round-trips correctly', async () => {
    const habit = makeHabit();
    await habitsRepository.saveHabit(habit);

    const completion = await habitsRepository.toggleHabit(habit.id, 'user-001', '2026-08-28', true);
    expect(completion.completed).toBe(true);
    expect(completion.completed_at).toBeDefined();

    // Retrieve completions for the date
    const completions = await habitsRepository.getHabitCompletions('user-001', '2026-08-28');
    expect(completions).toHaveLength(1);
    expect(completions[0].habit_id).toBe(habit.id);
    expect(completions[0].completed).toBe(true);
  });

  it('un-toggles a habit completion', async () => {
    const habit = makeHabit();
    await habitsRepository.saveHabit(habit);
    await habitsRepository.toggleHabit(habit.id, 'user-001', '2026-08-28', true);
    const uncompleted = await habitsRepository.toggleHabit(habit.id, 'user-001', '2026-08-28', false);
    expect(uncompleted.completed).toBe(false);
    expect(uncompleted.completed_at).toBeUndefined();
  });

  it('saves and retrieves daily priorities', async () => {
    const priorities = [
      {
        id: 'p1',
        user_id: 'user-001',
        date: '2026-08-28',
        order_index: 1,
        title: 'Complete module 3 of calculus',
        completed: false,
        category: 'LEARN' as const,
      },
    ];

    await habitsRepository.saveDailyPriorities(priorities);
    const loaded = await habitsRepository.getDailyPriorities('user-001', '2026-08-28');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Complete module 3 of calculus');
  });
});

// ─────────────────────────────────────────────
// 3. GOALS REPOSITORY
// ─────────────────────────────────────────────
describe('goalsRepository', () => {
  it('saves and retrieves goals with milestones', async () => {
    const goal = makeGoal();
    await goalsRepository.saveGoal(goal);

    const goals = await goalsRepository.getGoals('user-001');
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe('Run a Half Marathon');
    expect(goals[0].milestones).toHaveLength(1);
    expect(goals[0].milestones[0].title).toBe('Run 15km continuously');
    expect(goals[0].milestones[0].completed).toBe(false);
  });

  it('toggles milestone completion and updates progress_percentage', async () => {
    const goal = makeGoal({
      id: 'goal-ms-test',
      milestones: [
        { id: 'ms-A', goal_id: 'goal-ms-test', title: 'Milestone A', completed: false, order_index: 1 },
        { id: 'ms-B', goal_id: 'goal-ms-test', title: 'Milestone B', completed: false, order_index: 2 },
      ],
    });
    await goalsRepository.saveGoal(goal);

    // Toggle milestone A to completed
    const updated = await goalsRepository.toggleMilestone('user-001', 'goal-ms-test', 'ms-A', true);
    expect(updated).not.toBeNull();
    const completedMs = updated!.milestones.find((m) => m.id === 'ms-A');
    expect(completedMs?.completed).toBe(true);
    // 1 out of 2 milestones done = 50%
    expect(updated!.progress_percentage).toBe(50);
  });

  it('deletes a goal by id and isolates by user', async () => {
    const g1 = makeGoal({ id: 'g-del-001', user_id: 'user-001' });
    const g2 = makeGoal({ id: 'g-del-002', user_id: 'user-002' });
    await goalsRepository.saveGoal(g1);
    await goalsRepository.saveGoal(g2);

    await goalsRepository.deleteGoal('g-del-001', 'user-001');

    const user1Goals = await goalsRepository.getGoals('user-001');
    const user2Goals = await goalsRepository.getGoals('user-002');

    expect(user1Goals).toHaveLength(0);
    expect(user2Goals).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────
// 4. PROJECTS REPOSITORY
// ─────────────────────────────────────────────
describe('projectsRepository', () => {
  it('saves and retrieves a project with tasks', async () => {
    const ts = new Date().toISOString();
    const project: Project = {
      id: 'proj-001',
      user_id: 'user-001',
      name: 'LifeOS iOS App',
      description: 'React Native personal operating system',
      status: 'ACTIVE',
      technologies: ['TypeScript', 'React Native', 'Expo', 'Supabase'],
      total_time_seconds: 86400,
      tasks: [
        {
          id: 'task-001',
          project_id: 'proj-001',
          user_id: 'user-001',
          title: 'Implement GPS engine',
          status: 'DONE',
          priority: 'HIGH',
          order_index: 1,
          created_at: ts,
        },
        {
          id: 'task-002',
          project_id: 'proj-001',
          user_id: 'user-001',
          title: 'Add sync service',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          order_index: 2,
          created_at: ts,
        },
      ],
      created_at: ts,
      updated_at: ts,
    };

    await projectsRepository.saveProject(project);
    const projects = await projectsRepository.getProjects('user-001');

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('LifeOS iOS App');
    expect(projects[0].technologies).toHaveLength(4);
    expect(projects[0].tasks).toHaveLength(2);
    expect(projects[0].tasks[0].status).toBe('DONE');
  });
});
