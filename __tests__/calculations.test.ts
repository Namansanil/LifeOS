import {
  calculate3DDistance,
  calculateDailyScore,
  calculateElevationGain,
  calculateElevationProfile,
  calculateElevationProfileStrava,
  calculateGradeAdjustedDistance,
  calculateGradeAdjustedPace,
  calculateMinettiGapFactor,
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

    it('calculates average pace strictly from cumulative distance and moving time', () => {
      // 5,000m in 1,650s = 330 sec/km = 5:30 /km
      const pace = calculatePace(5000, 1650);
      expect(pace).toBe(330);
      expect(formatPace(pace)).toBe('5:30 /km');

      // 10,000m in 3,000s = 300 sec/km = 5:00 /km
      const pace10k = calculatePace(10000, 3000);
      expect(pace10k).toBe(300);
      expect(formatPace(pace10k)).toBe('5:00 /km');
    });

    it('returns 0 and formats as --:-- for distances below the 30m stabilization threshold', () => {
      // Below 30m (e.g. 10m, 20m, 29m) returns 0 to eliminate initial GPS jitter
      expect(calculatePace(10, 3)).toBe(0);
      expect(formatPace(calculatePace(10, 3))).toBe('--:--');

      expect(calculatePace(25, 8)).toBe(0);
      expect(formatPace(calculatePace(25, 8))).toBe('--:--');

      // At >= 30m (e.g. 30m in 10s = 333 s/km = 5:33 /km)
      const pace30m = calculatePace(30, 10);
      expect(pace30m).toBe(333);
      expect(formatPace(pace30m)).toBe('5:33 /km');
    });

    it('returns 0 and formats as --:-- for zero or invalid distance and moving time', () => {
      expect(calculatePace(0, 1000)).toBe(0);
      expect(formatPace(calculatePace(0, 1000))).toBe('--:--');

      expect(calculatePace(5000, 0)).toBe(0);
      expect(formatPace(calculatePace(5000, 0))).toBe('--:--');

      expect(calculatePace(-500, 100)).toBe(0);
      expect(formatPace(calculatePace(-500, 100))).toBe('--:--');

      expect(formatPace(0)).toBe('--:--');
      expect(formatPace(-10)).toBe('--:--');
      expect(formatPace(3700)).toBe('--:--');
    });

    it('calculates cycling average speed in km/h from cumulative moving data', () => {
      // 20,000m in 3000s (50 mins) = 6.67 m/s = 24.0 km/h
      const speed = calculateSpeedKmh(20000, 3000);
      expect(speed).toBe(24);

      // Zero time or distance returns 0
      expect(calculateSpeedKmh(0, 3000)).toBe(0);
      expect(calculateSpeedKmh(20000, 0)).toBe(0);
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

  describe('Minetti Grade Adjusted Pace (GAP) Physics Model', () => {
    it('returns exact 1.0 factor at 0% flat grade', () => {
      const factor = calculateMinettiGapFactor(0.0);
      expect(factor).toBeCloseTo(1.0, 3);
    });

    it('increases cost factor for uphill grades (+5% and +10%)', () => {
      const factor5Pct = calculateMinettiGapFactor(0.05);
      const factor10Pct = calculateMinettiGapFactor(0.10);

      // +5% grade should be ~1.30x flat cost
      expect(factor5Pct).toBeGreaterThan(1.25);
      expect(factor5Pct).toBeLessThan(1.35);

      // +10% grade should be ~1.65-1.70x flat cost
      expect(factor10Pct).toBeGreaterThan(1.60);
      expect(factor10Pct).toBeLessThan(1.75);
    });

    it('decreases cost factor for moderate downhill grades (-5% and -10%)', () => {
      const factorMinus5Pct = calculateMinettiGapFactor(-0.05);
      const factorMinus10Pct = calculateMinettiGapFactor(-0.10);

      // -5% downhill costs less energy (~0.76x)
      expect(factorMinus5Pct).toBeGreaterThan(0.70);
      expect(factorMinus5Pct).toBeLessThan(0.80);

      // -10% downhill is near optimal running economy (~0.58-0.62x)
      expect(factorMinus10Pct).toBeGreaterThan(0.55);
      expect(factorMinus10Pct).toBeLessThan(0.65);
    });

    it('models braking forces on steep descents (-20%)', () => {
      const factorMinus20Pct = calculateMinettiGapFactor(-0.20);
      // On steep descents (-20%), eccentric braking increases cost relative to optimal downhill
      expect(factorMinus20Pct).toBeCloseTo(0.50, 1);
    });

    it('clamps grade inputs at +/- 45% to reject extreme noise', () => {
      const extremeUphill = calculateMinettiGapFactor(0.85); // 85% grade
      const clampedUphill = calculateMinettiGapFactor(0.45); // 45% grade
      expect(extremeUphill).toBe(clampedUphill);

      const extremeDownhill = calculateMinettiGapFactor(-0.90);
      const clampedDownhill = calculateMinettiGapFactor(-0.45);
      expect(extremeDownhill).toBe(clampedDownhill);
    });

    it('applies GAP to distance and derives Grade Adjusted Pace correctly', () => {
      // 1000m horizontal with 50m climb (+5% grade) in 300 seconds (5:00 min)
      // Flat pace = 300 sec/km (5:00/km)
      // GAP distance = 1000m * ~1.3014 = ~1301.4m
      // GAP pace = 300 / 1.3014 = ~230 sec/km (3:50/km effort)
      const gapDist = calculateGradeAdjustedDistance(1000, 50);
      expect(gapDist).toBeGreaterThan(1280);
      expect(gapDist).toBeLessThan(1320);

      const gapPace = calculateGradeAdjustedPace(gapDist, 300);
      expect(gapPace).toBeLessThan(300); // GAP pace is faster than actual pace because of uphill effort
      expect(gapPace).toBeGreaterThan(220);
    });
  });

  describe('3D Geodesic Distance with Slope Correction', () => {
    it('calculates true 3D hypotenuse when slope correction is enabled', () => {
      // Coordinate delta corresponding to approx ~100m horizontal
      // Plus 100m vertical climb
      // 3D distance = sqrt(100^2 + 100^2) = 141.42m
      const p1 = { lat: 0, lon: 0, alt: 0 };
      const p2 = { lat: 0.0009, lon: 0, alt: 100 }; // approx 100m horizontal

      const uncorrected = calculate3DDistance(p1.lat, p1.lon, p1.alt, p2.lat, p2.lon, p2.alt, false);
      const corrected = calculate3DDistance(p1.lat, p1.lon, p1.alt, p2.lat, p2.lon, p2.alt, true);

      expect(corrected.distance3DMeters).toBeGreaterThan(uncorrected.distance3DMeters);
      expect(corrected.elevationDelta).toBe(100);
    });

    it('falls back cleanly when elevation data is missing or undefined', () => {
      const result = calculate3DDistance(12.97, 77.59, undefined, 12.98, 77.59, null, true);
      expect(result.distance3DMeters).toBe(result.horizontalMeters);
      expect(result.elevationDelta).toBe(0);
    });
  });

  describe('Strava-Grade Elevation Profile & Hysteresis Thresholding', () => {
    it('rejects sensor micro-oscillations below 2m threshold for barometric/DEM data', () => {
      // 100m base with micro-jitter (+/- 0.8m)
      const noisyAltitudes = [100, 100.8, 99.4, 100.5, 99.8, 100.2, 99.7, 100.4, 100];
      const result = calculateElevationProfileStrava(noisyAltitudes, { isBarometricOrDem: true });

      // No climb exceeded 2.0m threshold -> 0m false gain
      expect(result.gainMeters).toBe(0);
      expect(result.lossMeters).toBe(0);
    });

    it('enforces 10m threshold for noisy raw GPS altitude', () => {
      // GPS altitude jumping +/- 5m (noisy)
      const gpsAltitudes = [100, 105, 98, 104, 96, 103, 99, 105, 100];
      const result = calculateElevationProfileStrava(gpsAltitudes, { isBarometricOrDem: false });

      // None of the swings exceed 10m threshold from local extremum -> 0m false gain
      expect(result.gainMeters).toBe(0);
      expect(result.lossMeters).toBe(0);
    });

    it('accurately accumulates genuine sustained climbs exceeding threshold', () => {
      // Steady climb from 100m to 250m (150m vertical gain)
      const climbAltitudes = [100, 110, 125, 140, 160, 180, 205, 230, 250];
      const result = calculateElevationProfileStrava(climbAltitudes, { isBarometricOrDem: true });

      expect(result.gainMeters).toBeGreaterThanOrEqual(140);
      expect(result.gainMeters).toBeLessThanOrEqual(155);
      expect(result.lossMeters).toBe(0);
    });
  });

  describe('Interpolated Splits Crossings', () => {
    it('linearly interpolates timestamps and split boundaries between GPS fixes', () => {
      // Create synthetic points passing 1000m mark:
      // Point 0: 0m, t=0
      // Point 1: 600m, t=180s
      // Point 2: 1200m, t=360s (crosses 1000m boundary)
      const points = [
        { latitude: 12.9700, longitude: 77.5900, timestamp: 1000000, altitude: 100, speed: 3.33 },
        { latitude: 12.9754, longitude: 77.5900, timestamp: 1000180000, altitude: 110, speed: 3.33 },
        { latitude: 12.9808, longitude: 77.5900, timestamp: 1000360000, altitude: 120, speed: 3.33 },
      ];

      const splits = calculateSplits(points, 1000, { isRunning: true });

      expect(splits.length).toBeGreaterThanOrEqual(1);
      expect(splits[0].splitNumber).toBe(1);
      expect(splits[0].distanceMeters).toBe(1000);
      expect(splits[0].paceSecKm).toBeGreaterThan(0);
      expect(splits[0].gapSecKm).toBeDefined();
    });
  });
});
