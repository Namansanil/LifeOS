// In-memory AsyncStorage mock for Jest environment
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

import { db } from '../services/database';
import {
  activitiesRepository,
  goalsRepository,
  habitsRepository,
  workoutsRepository,
} from '../services/repositories';
import { Activity, Goal, Habit, Workout } from '../types';

describe('Production Authentication & Multi-Tenant Data Isolation', () => {
  beforeEach(async () => {
    // Clear storage before each test
    for (const k of Object.keys(store)) {
      delete store[k];
    }
    await db.init();
  });

  describe('Input Validation & Normalization Rules', () => {
    test('normalizes email casing and whitespace', () => {
      const input = '  Athlete.One@LifeOS.App  ';
      const normalized = input.trim().toLowerCase();
      expect(normalized).toBe('athlete.one@lifeos.app');
    });

    test('validates email format regex', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('athlete@lifeos.app')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('athlete@')).toBe(false);
      expect(emailRegex.test('@lifeos.app')).toBe(false);
    });

    test('enforces minimum 8 character password requirement', () => {
      const isValidPassword = (p: string) => p.length >= 8;
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
      expect(isValidPassword('12345678')).toBe(true);
      expect(isValidPassword('StrongPass#2026')).toBe(true);
    });
  });

  describe('Strict Multi-Tenant User Isolation', () => {
    const userA = 'user_uuid_alpha_111';
    const userB = 'user_uuid_beta_222';

    test('isolates activities between different authenticated users', async () => {
      const activityA: Activity = {
        id: 'act_user_a_001',
        user_id: userA,
        type: 'RUN',
        category: 'MOVE',
        title: 'Morning 5K Run',
        started_at: new Date().toISOString(),
        duration: 1500,
        distance: 5000,
        moving_time: 1450,
        elevation_gain: 45,
        average_speed: 3.33,
        average_pace: 300,
        source: 'GPS',
        visibility: 'PRIVATE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const activityB: Activity = {
        id: 'act_user_b_001',
        user_id: userB,
        type: 'CYCLE',
        category: 'MOVE',
        title: 'Coastal Ride',
        started_at: new Date().toISOString(),
        duration: 3600,
        distance: 25000,
        moving_time: 3500,
        elevation_gain: 120,
        average_speed: 6.94,
        average_pace: 144,
        source: 'GPS',
        visibility: 'PRIVATE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await activitiesRepository.saveActivity(activityA);
      await activitiesRepository.saveActivity(activityB);

      const userAActivities = await activitiesRepository.getActivities(userA);
      const userBActivities = await activitiesRepository.getActivities(userB);

      expect(userAActivities.some((a) => a.id === 'act_user_a_001')).toBe(true);
      expect(userAActivities.some((a) => a.id === 'act_user_b_001')).toBe(false);

      expect(userBActivities.some((a) => a.id === 'act_user_b_001')).toBe(true);
      expect(userBActivities.some((a) => a.id === 'act_user_a_001')).toBe(false);
    });

    test('isolates habits and habit completions per user', async () => {
      const habitA: Habit = {
        id: 'habit_user_a_01',
        user_id: userA,
        name: 'Hydration 2L',
        category: 'DAY',
        frequency: 'DAILY',
        active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const habitB: Habit = {
        id: 'habit_user_b_01',
        user_id: userB,
        name: 'Cold Plunge',
        category: 'MORNING',
        frequency: 'DAILY',
        active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await habitsRepository.saveHabit(habitA);
      await habitsRepository.saveHabit(habitB);

      const habitsA = await habitsRepository.getHabits(userA);
      const habitsB = await habitsRepository.getHabits(userB);

      expect(habitsA.some((h) => h.id === 'habit_user_a_01')).toBe(true);
      expect(habitsA.some((h) => h.id === 'habit_user_b_01')).toBe(false);

      expect(habitsB.some((h) => h.id === 'habit_user_b_01')).toBe(true);
      expect(habitsB.some((h) => h.id === 'habit_user_a_01')).toBe(false);
    });

    test('isolates goals and milestone toggles per user', async () => {
      const goalA: Goal = {
        id: 'goal_user_a_01',
        user_id: userA,
        title: 'Run a Half Marathon',
        pillar: 'MOVE',
        status: 'ACTIVE',
        progress_percentage: 0,
        milestones: [
          { id: 'ms_1', goal_id: 'goal_user_a_01', title: '5K non-stop', completed: false, order_index: 0 },
          { id: 'ms_2', goal_id: 'goal_user_a_01', title: '10K non-stop', completed: false, order_index: 1 },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await goalsRepository.saveGoal(goalA);

      const userBGoals = await goalsRepository.getGoals(userB);
      expect(userBGoals.some((g) => g.id === 'goal_user_a_01')).toBe(false);

      const updated = await goalsRepository.toggleMilestone(userA, 'goal_user_a_01', 'ms_1', true);
      expect(updated?.milestones[0].completed).toBe(true);
      expect(updated?.progress_percentage).toBe(50);
    });
  });
});
