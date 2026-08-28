import { goalsRepository } from '../services/repositories/goalsRepository';
import { habitsRepository } from '../services/repositories/habitsRepository';
import { Goal } from '../types';

jest.mock('../services/database', () => {
  const store: Record<string, any[]> = {
    goals: [],
    habits: [],
    habit_completions: [],
    daily_priorities: [],
    sync_queue: [],
  };

  return {
    db: {
      getGoals: jest.fn(async (userId: string) => store.goals.filter((g) => g.user_id === userId)),
      saveGoal: jest.fn(async (goal: Goal) => {
        const idx = store.goals.findIndex((g) => g.id === goal.id);
        if (idx >= 0) store.goals[idx] = goal;
        else store.goals.push(goal);
      }),
      deleteGoal: jest.fn(async (goalId: string, userId: string) => {
        store.goals = store.goals.filter((g) => !(g.id === goalId && g.user_id === userId));
      }),
      getHabits: jest.fn(async (userId: string) => store.habits.filter((h) => h.user_id === userId)),
      saveHabit: jest.fn(async (habit: any) => {
        store.habits.push(habit);
      }),
      getHabitCompletions: jest.fn(async () => []),
      toggleHabitCompletion: jest.fn(async (habitId, userId, date, completed) => ({
        id: `${habitId}_${date}`,
        habit_id: habitId,
        user_id: userId,
        date,
        completed,
      })),
      getDailyPriorities: jest.fn(async () => []),
      saveDailyPriorities: jest.fn(async () => {}),
      enqueueSync: jest.fn(async (entity, id, op, payload) => {
        store.sync_queue.push({ entity, id, op, payload });
      }),
    },
  };
});

describe('LifeOS Repositories & Goals Domain', () => {
  const userId = 'athlete_1';

  it('creates and retrieves goals with milestone completion percentage', async () => {
    const goal: Goal = {
      id: 'g1',
      user_id: userId,
      title: 'Run First Half Marathon',
      pillar: 'MOVE',
      status: 'ACTIVE',
      progress_percentage: 0,
      milestones: [
        { id: 'm1', goal_id: 'g1', title: 'Complete 5K', completed: true, order_index: 1 },
        { id: 'm2', goal_id: 'g1', title: 'Complete 10K', completed: false, order_index: 2 },
        { id: 'm3', goal_id: 'g1', title: 'Complete 15K', completed: false, order_index: 3 },
        { id: 'm4', goal_id: 'g1', title: 'Race Day 21.1K', completed: false, order_index: 4 },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await goalsRepository.saveGoal(goal);

    const retrieved = await goalsRepository.getGoals(userId);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].title).toBe('Run First Half Marathon');
    // 1 of 4 milestones completed => 25%
    expect(retrieved[0].progress_percentage).toBe(25);
  });

  it('toggles milestones and updates progress', async () => {
    const updated = await goalsRepository.toggleMilestone(userId, 'g1', 'm2', true);
    expect(updated).toBeDefined();
    // 2 of 4 completed => 50%
    expect(updated?.progress_percentage).toBe(50);
  });

  it('filters goals by pillar', async () => {
    const moveGoals = await goalsRepository.getGoalsByPillar(userId, 'MOVE');
    expect(moveGoals.length).toBe(1);

    const surfGoals = await goalsRepository.getGoalsByPillar(userId, 'SURF');
    expect(surfGoals.length).toBe(0);
  });
});
