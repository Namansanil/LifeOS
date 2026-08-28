import {
  calculateDailyScore,
  calculateElevationGain,
  calculateElevationProfile,
  calculatePace,
  calculateReadiness,
  calculateSpeedKmh,
  calculateSplits,
  calculateStreak,
  calculateWorkoutStats,
  douglasPeucker,
  estimate1RM,
  formatDuration,
  formatPace,
  haversineDistance,
  isValidCoordinate,
  postProcessActivity,
} from '../services/calculations';
import { DailyPriority, Habit, HabitCompletion, Workout } from '../types';

describe('LifeOS Calculation Engine (Zero Fabrication & Deterministic Math)', () => {
  describe('calculateDailyScore (Honest & Pillar-Aware)', () => {
    it('returns isInsufficientData = true and score = null when no user data exists', () => {
      const result = calculateDailyScore({
        priorities: [],
        habits: [],
        habitCompletions: [],
        activities: [],
        workouts: [],
        surfSessions: [],
        studySessions: [],
        projects: [],
      });

      expect(result.score).toBeNull();
      expect(result.isInsufficientData).toBe(true);
      expect(result.label).toBe('INSUFFICIENT DATA');
    });

    it('calculates balanced high score for completed priorities and habits', () => {
      const priorities: DailyPriority[] = [
        { id: '1', user_id: 'u1', date: '2026-08-28', order_index: 1, title: 'Finish assignment', completed: true },
        { id: '2', user_id: 'u1', date: '2026-08-28', order_index: 2, title: 'Workout', completed: true },
        { id: '3', user_id: 'u1', date: '2026-08-28', order_index: 3, title: 'Tech sprint', completed: true },
      ];
      const habits: Habit[] = [
        { id: 'h1', user_id: 'u1', name: 'Water', category: 'MORNING', frequency: 'DAILY', active: true, sort_order: 1, created_at: '', updated_at: '' },
        { id: 'h2', user_id: 'u1', name: 'Read', category: 'DAY', frequency: 'DAILY', active: true, sort_order: 2, created_at: '', updated_at: '' },
      ];
      const habitCompletions: HabitCompletion[] = [
        { id: 'c1', habit_id: 'h1', user_id: 'u1', date: '2026-08-28', completed: true },
        { id: 'c2', habit_id: 'h2', user_id: 'u1', date: '2026-08-28', completed: true },
      ];

      const result = calculateDailyScore({
        priorities,
        habits,
        habitCompletions,
        studySessions: [{ id: 's1', user_id: 'u1', subject_id: 'sub1', duration: 3600, started_at: '', ended_at: '', created_at: '' }],
        workouts: [{ id: 'w1', user_id: 'u1', title: 'Chest', type: 'GYM', started_at: '', duration: 3000, volume: 5000, exercises: [], created_at: '', updated_at: '' }],
      });

      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.label).toBe('EXCELLENT');
      expect(result.isInsufficientData).toBe(false);
    });

    it('does NOT penalize user when a pillar is disabled', () => {
      // User disabled SURF and BUILD pillars
      const priorities: DailyPriority[] = [
        { id: '1', user_id: 'u1', date: '2026-08-28', order_index: 1, title: 'Focus 1', completed: true },
      ];
      const habits: Habit[] = [
        { id: 'h1', user_id: 'u1', name: 'Water', category: 'MORNING', frequency: 'DAILY', active: true, sort_order: 1, created_at: '', updated_at: '' },
      ];
      const habitCompletions: HabitCompletion[] = [
        { id: 'c1', habit_id: 'h1', user_id: 'u1', date: '2026-08-28', completed: true },
      ];

      const result = calculateDailyScore({
        priorities,
        habits,
        habitCompletions,
        studySessions: [{ id: 's1', user_id: 'u1', subject_id: 'sub1', duration: 3600, started_at: '', ended_at: '', created_at: '' }],
        enabledPillars: {
          move: true,
          surf: false, // Disabled
          learn: true,
          build: false, // Disabled
          live: true,
        },
      });

      // Denominator should be appropriately reduced, not artificially deflating score
      expect(result.score).toBeGreaterThanOrEqual(75);
    });
  });

  describe('calculateReadiness (Honest Behavioral Capacity)', () => {
    it('returns INSUFFICIENT DATA when no historical activity or training load exists', () => {
      const readiness = calculateReadiness({
        hasHistoricalData: false,
        recentTrainingLoadMinutes: 0,
        habitConsistencyPercent: 0,
      });

      expect(readiness.score).toBeNull();
      expect(readiness.isInsufficientData).toBe(true);
      expect(readiness.label).toBe('INSUFFICIENT DATA');
    });

    it('returns OPTIMAL when well-rested with balanced consistency and real data', () => {
      const readiness = calculateReadiness({
        hasHistoricalData: true,
        sleepHours: 8.5,
        recentDaysActivitiesCount: 3,
        recentTrainingLoadMinutes: 120,
        restDaysInPastWeek: 2,
        habitConsistencyPercent: 90,
      });

      expect(readiness.score).toBeGreaterThanOrEqual(80);
      expect(['OPTIMAL', 'RECOVERED']).toContain(readiness.label);
    });

    it('returns FATIGUED with low sleep and high acute training load', () => {
      const readiness = calculateReadiness({
        hasHistoricalData: true,
        sleepHours: 5,
        recentDaysActivitiesCount: 7,
        recentTrainingLoadMinutes: 500,
        restDaysInPastWeek: 0,
        habitConsistencyPercent: 40,
      });

      expect(readiness.score).toBeLessThanOrEqual(50);
      expect(readiness.label).toBe('FATIGUED');
    });
  });

  describe('calculateStreak', () => {
    it('calculates consecutive active streak correctly', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

      const streak = calculateStreak([today, yesterday, dayBefore]);
      expect(streak).toBe(3);
    });

    it('returns 0 when no activity occurred yesterday or today', () => {
      const pastDate = '2025-01-01';
      const streak = calculateStreak([pastDate]);
      expect(streak).toBe(0);
    });
  });

  describe('Workout Stats & 1RM', () => {
    it('calculates Brzycki 1RM accurately', () => {
      const e1rm = estimate1RM(100, 6);
      expect(e1rm).toBeCloseTo(116.1, 0);
    });

    it('accurately identifies true PRs based on past history', () => {
      const pastWorkout: Workout = {
        id: 'w0',
        user_id: 'u1',
        title: 'Old Bench',
        type: 'GYM',
        started_at: '',
        duration: 2000,
        volume: 3000,
        exercises: [
          {
            id: 'e0',
            workout_id: 'w0',
            exercise_name: 'Bench Press',
            order_index: 0,
            sets: [{ set_number: 1, weight_kg: 80, reps: 5, completed: true }],
          },
        ],
        created_at: '',
        updated_at: '',
      };

      const currentWorkout: Workout = {
        id: 'w1',
        user_id: 'u1',
        title: 'New Bench Day',
        type: 'GYM',
        started_at: '',
        duration: 2400,
        volume: 4500,
        exercises: [
          {
            id: 'e1',
            workout_id: 'w1',
            exercise_name: 'Bench Press',
            order_index: 0,
            sets: [{ set_number: 1, weight_kg: 90, reps: 5, completed: true }],
          },
        ],
        created_at: '',
        updated_at: '',
      };

      const stats = calculateWorkoutStats(currentWorkout, [pastWorkout]);
      expect(stats.totalVolumeKg).toBe(450);
      expect(stats.newPrs.length).toBe(1);
      expect(stats.newPrs[0].exercise).toBe('Bench Press');
      expect(stats.newPrs[0].weight).toBe(90);
    });
  });

  describe('GPS Math & Geometry', () => {
    it('validates coordinate bounds', () => {
      expect(isValidCoordinate(12.9716, 77.5946)).toBe(true);
      expect(isValidCoordinate(120.0, 77.5946)).toBe(false);
      expect(isValidCoordinate(12.9716, 200.0)).toBe(false);
      expect(isValidCoordinate(0, 0)).toBe(false);
    });

    it('calculates Haversine distance between known coordinates', () => {
      const dist = haversineDistance(-33.8568, 151.2153, -33.8915, 151.2767);
      expect(dist).toBeGreaterThan(6000);
      expect(dist).toBeLessThan(7000);
    });

    it('calculates and formats pace correctly', () => {
      const pace = calculatePace(5000, 1500);
      expect(pace).toBe(300);
      expect(formatPace(pace)).toBe('5:00 /km');
    });

    it('calculates cycling speed in km/h', () => {
      // 10,000m in 1200s (20 mins) = 8.33 m/s = 30.0 km/h
      const speed = calculateSpeedKmh(10000, 1200);
      expect(speed).toBe(30);
    });

    it('formats duration', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3665)).toBe('1:01:05');
    });

    it('simplifies polylines with Douglas-Peucker without distorting endpoints', () => {
      const points = [
        { latitude: 0, longitude: 0, timestamp: 1 },
        { latitude: 0.00001, longitude: 0.00001, timestamp: 2 },
        { latitude: 0.00002, longitude: 0.00002, timestamp: 3 },
        { latitude: 0.001, longitude: 0.001, timestamp: 4 },
      ];
      const simplified = douglasPeucker(points, 0.0001);
      expect(simplified.length).toBeLessThan(points.length);
      expect(simplified[0].timestamp).toBe(1);
      expect(simplified[simplified.length - 1].timestamp).toBe(4);
    });
  });
});
