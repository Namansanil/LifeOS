import { DailyPriority, Habit, HabitCompletion } from '@/types';
import { db } from '../database';

export const habitsRepository = {
  async getHabits(userId: string): Promise<Habit[]> {
    return await db.getHabits(userId);
  },

  async saveHabit(habit: Habit): Promise<void> {
    await db.saveHabit(habit);
    await db.enqueueSync('habits', habit.id, 'CREATE', habit);
  },

  async getHabitCompletions(userId: string, date: string): Promise<HabitCompletion[]> {
    return await db.getHabitCompletions(userId, date);
  },

  async toggleHabit(
    habitId: string,
    userId: string,
    date: string,
    completed: boolean
  ): Promise<HabitCompletion> {
    const res = await db.toggleHabitCompletion(habitId, userId, date, completed);
    await db.enqueueSync('habit_completions', res.id, 'CREATE', res);
    return res;
  },

  async getDailyPriorities(userId: string, date: string): Promise<DailyPriority[]> {
    return await db.getDailyPriorities(userId, date);
  },

  async saveDailyPriorities(priorities: DailyPriority[]): Promise<void> {
    await db.saveDailyPriorities(priorities);
    for (const p of priorities) {
      await db.enqueueSync('daily_priorities', p.id, 'CREATE', p);
    }
  },
};
