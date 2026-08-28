import {
  calculateDailyScore,
  calculateElevationGain,
  calculatePace,
  calculateReadiness,
  calculateStreak,
  calculateWorkoutStats,
  douglasPeucker,
  estimate1RM,
  formatDuration,
  formatPace,
  haversineDistance,
} from '../services/calculations';
import { DailyPriority, Habit, HabitCompletion, Workout } from '../types';

describe('LifeOS Calculation Engine', () => {
  describe('calculateDailyScore', () => {
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
    });

    it('handles rest days without penalizing zero activity to negative scores', () => {
      const result = calculateDailyScore({
        priorities: [],
        habits: [],
        habitCompletions: [],
      });
      expect(result.score).toBeGreaterThanOrEqual(40);
    });
  });

  describe('calculateReadiness', () => {
    it('returns OPTIMAL when well-rested with balanced consistency', () => {
      const readiness = calculateReadiness({
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

  describe('Workout Stats & 1RM', () => {
    it('calculates Brzycki 1RM accurately', () => {
      // 100kg x 6 reps => 100 * (36 / 31) = ~116.1kg
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
    it('calculates Haversine distance between known coordinates', () => {
      // Sydney Opera House to Bondi Beach (~6.2km)
      const dist = haversineDistance(-33.8568, 151.2153, -33.8915, 151.2767);
      expect(dist).toBeGreaterThan(6000);
      expect(dist).toBeLessThan(7000);
    });

    it('calculates and formats pace correctly', () => {
      // 5km in 25 mins (1500s) => 300 sec/km => 5:00 /km
      const pace = calculatePace(5000, 1500);
      expect(pace).toBe(300);
      expect(formatPace(pace)).toBe('5:00 /km');
    });

    it('formats duration', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3665)).toBe('1:01:05');
    });

    it('calculates elevation gain filtering micro-noise', () => {
      const altitudes = [100, 100.4, 103, 102.8, 107, 106];
      const gain = calculateElevationGain(altitudes);
      expect(gain).toBe(7); // (103-100.4=2.6) + (107-102.8=4.2) = 6.8 => 7
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
