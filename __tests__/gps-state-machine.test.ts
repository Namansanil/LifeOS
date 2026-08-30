jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6, Balanced: 3 },
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
  hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 10 },
  }),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn().mockReturnValue(false),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import { gpsEngine } from '../services/gps';
import {
  calculateElevationProfile,
  calculatePace,
  calculateSplits,
  postProcessActivity,
} from '../services/calculations';

describe('GPS Tracking State Machine & Production Filtering', () => {
  beforeEach(async () => {
    await gpsEngine.reset();
  });

  it('starts in IDLE state', () => {
    expect(gpsEngine.getState()).toBe('IDLE');
  });

  it('transitions deterministically through PREPARING -> GPS_READY -> TRACKING -> PAUSED -> TRACKING -> COMPLETED', async () => {
    await gpsEngine.prepare('RUN');
    expect(['PREPARING', 'GPS_READY']).toContain(gpsEngine.getState());

    await gpsEngine.start();
    expect(gpsEngine.getState()).toBe('TRACKING');

    await gpsEngine.pause();
    expect(gpsEngine.getState()).toBe('PAUSED');

    await gpsEngine.resume();
    expect(gpsEngine.getState()).toBe('TRACKING');

    const activity = await gpsEngine.finish();
    expect(gpsEngine.getState()).toBe('COMPLETED');
    expect(activity).toBeDefined();
    expect(activity?.source).toBe('GPS');
  });

  it('supports cancellation to CANCELLED state and cleans up', async () => {
    await gpsEngine.prepare('RUN');
    await gpsEngine.start();
    expect(gpsEngine.getState()).toBe('TRACKING');

    await gpsEngine.cancel();
    expect(gpsEngine.getState()).toBe('CANCELLED');
    expect(gpsEngine.getProcessedPoints().length).toBe(0);
  });

  it('rejects duplicate, invalid coordinates, and poor GPS accuracy', async () => {
    await gpsEngine.prepare('RUN');
    await gpsEngine.start();

    // 1. Initial valid location
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 920,
        accuracy: 8,
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });
    expect(gpsEngine.getProcessedPoints().length).toBe(1);

    // 2. Duplicate coordinate (should be ignored)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 920,
        accuracy: 8,
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 2000,
    });
    expect(gpsEngine.getProcessedPoints().length).toBe(1);

    // 3. Inaccurate coordinate (accuracy > 18m threshold for RUN, should be rejected)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.973,
        longitude: 77.596,
        altitude: 920,
        accuracy: 45, // Poor accuracy
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 3000,
    });
    expect(gpsEngine.getProcessedPoints().length).toBe(1);
    expect(gpsEngine.getMetrics().gpsQuality).toBe('POOR');

    // 4. Out-of-bounds latitude/longitude (should be rejected)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 120.0,
        longitude: 250.0,
        altitude: 920,
        accuracy: 5,
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 4000,
    });
    expect(gpsEngine.getProcessedPoints().length).toBe(1);

    // 5. Valid genuine movement (~15m in 4s => 3.75 m/s)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.97170,
        longitude: 77.59470,
        altitude: 921,
        accuracy: 5,
        speed: 3.4,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 5000,
    });
    expect(gpsEngine.getProcessedPoints().length).toBe(2);
    expect(gpsEngine.getMetrics().distanceMeters).toBeGreaterThan(0);
  });

  it('rejects stationary drift jitter when not moving', async () => {
    await gpsEngine.prepare('RUN');
    await gpsEngine.start();

    // Initial point
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.971600,
        longitude: 77.594600,
        altitude: 920,
        accuracy: 10,
        speed: 0.1,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });

    // Tiny 0.6m drift jitter while stationary
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.971604,
        longitude: 77.594602,
        altitude: 920,
        accuracy: 12,
        speed: 0.1,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 2000,
    });

    // Distance must NOT increase from stationary GPS jitter
    expect(gpsEngine.getMetrics().distanceMeters).toBe(0);
  });

  it('prevents teleport jump on resume after pause', async () => {
    await gpsEngine.prepare('RUN');
    await gpsEngine.start();

    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 920,
        accuracy: 5,
        speed: 3.0,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });

    // Pause tracking
    await gpsEngine.pause();
    const distanceAtPause = gpsEngine.getMetrics().distanceMeters;

    // Resume tracking at a different location (e.g. user took a bus/car while paused)
    await gpsEngine.resume();

    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9900, // 2km away
        longitude: 77.6100,
        altitude: 920,
        accuracy: 5,
        speed: 3.0,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 50000,
    });

    // Must NOT add the 2km straight-line jump to the activity distance
    expect(gpsEngine.getMetrics().distanceMeters).toBe(distanceAtPause);
  });

  it('computes elevation gain and loss with a noise deadband filter', () => {
    const rawAltitudes = [100, 100.4, 100.8, 101.2, 104.0, 108.5, 108.2, 105.0, 101.0];
    const profile = calculateElevationProfile(rawAltitudes);

    expect(profile.gainMeters).toBeGreaterThan(0);
    expect(profile.lossMeters).toBeGreaterThan(0);
  });

  it('generates deterministic distance splits (1km splits)', () => {
    const points = [
      { latitude: 12.9700, longitude: 77.5900, timestamp: 1000, altitude: 100, speed: 3.5 },
      { latitude: 12.9750, longitude: 77.5950, timestamp: 200000, altitude: 105, speed: 3.5 },
      { latitude: 12.9800, longitude: 77.6000, timestamp: 400000, altitude: 110, speed: 3.5 },
    ];

    const splits = calculateSplits(points as any, 1000);
    expect(splits.length).toBeGreaterThan(0);
    expect(splits[0].splitNumber).toBe(1);
    expect(splits[0].paceSecKm).toBeGreaterThan(0);
  });

  it('performs authoritative post-activity processing with route simplification', () => {
    const rawPoints = [
      { latitude: 12.97000, longitude: 77.59000, timestamp: 1000, altitude: 100, accuracy: 5, speed: 3.0 },
      { latitude: 12.97015, longitude: 77.59015, timestamp: 5000, altitude: 102, accuracy: 5, speed: 3.0 },
      { latitude: 12.97030, longitude: 77.59030, timestamp: 10000, altitude: 105, accuracy: 5, speed: 3.0 },
      { latitude: 12.97045, longitude: 77.59045, timestamp: 15000, altitude: 108, accuracy: 5, speed: 3.0 },
    ];

    const processed = postProcessActivity({
      rawPoints,
      type: 'RUN',
      startedAt: new Date(1000).toISOString(),
      endedAt: new Date(15000).toISOString(),
    });

    expect(processed.authoritativeDistanceMeters).toBeGreaterThan(0);
    expect(processed.elapsedSeconds).toBe(14);
    expect(processed.movingSeconds).toBeGreaterThan(0);
    expect(processed.processedRoute.length).toBeGreaterThan(0);
    expect(processed.displayRoute.length).toBeGreaterThan(0);
    expect(processed.gpsQuality).toBe('EXCELLENT');
  });

  it('responds quickly to speed changes and immediately zeros out speed upon stopping without lag', async () => {
    await gpsEngine.prepare('RUN');
    await gpsEngine.start();

    // Start moving at 4.0 m/s
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.97160,
        longitude: 77.59460,
        altitude: 920,
        accuracy: 5,
        speed: 4.0,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });

    expect(gpsEngine.getMetrics().currentSpeedMps).toBeCloseTo(4.0, 1);

    // Stop moving (speed drops to 0.0)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.97160,
        longitude: 77.59460,
        altitude: 920,
        accuracy: 5,
        speed: 0.0,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 2000,
    });

    // Speed must zero out immediately upon stopping
    expect(gpsEngine.getMetrics().currentSpeedMps).toBe(0);
    expect(gpsEngine.getMetrics().movementState).toBe('STOPPED');
  });

  it('accumulates elevation gain and loss in real-time during tracking', async () => {
    await gpsEngine.prepare('HIKE');
    await gpsEngine.start();

    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 100,
        accuracy: 5,
        speed: 1.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });

    // Ascend 10 meters over 6 seconds (~2.5 m/s)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9717,
        longitude: 77.5947,
        altitude: 110,
        accuracy: 5,
        speed: 1.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 7000,
    });

    expect(gpsEngine.getMetrics().elevationGainMeters).toBeGreaterThan(0);
  });

  describe('Location Quality Gate & Hysteresis Stop Detection', () => {
    it('handles hysteresis transitions: MOVING -> POSSIBLE_STOP -> STOPPED -> MOVING', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      // 1. Initial point at moving speed
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.97160,
          longitude: 77.59460,
          altitude: 100,
          accuracy: 5,
          speed: 3.5,
          heading: 90,
          altitudeAccuracy: null,
        },
        timestamp: 1000,
      });
      expect(gpsEngine.getMovementState()).toBe('MOVING');

      // 2. Speed drops below stopSpeedMps (0.5 m/s) for 1 tick -> enters POSSIBLE_STOP
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.971602,
          longitude: 77.594602,
          altitude: 100,
          accuracy: 6,
          speed: 0.3,
          heading: 90,
          altitudeAccuracy: null,
        },
        timestamp: 2000,
      });
      expect(gpsEngine.getMovementState()).toBe('POSSIBLE_STOP');

      // 3. Sustained low speed for 2nd tick -> transitions to STOPPED
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.971603,
          longitude: 77.594603,
          altitude: 100,
          accuracy: 6,
          speed: 0.2,
          heading: 90,
          altitudeAccuracy: null,
        },
        timestamp: 3000,
      });
      expect(gpsEngine.getMovementState()).toBe('STOPPED');
      expect(gpsEngine.getMetrics().currentSpeedMps).toBe(0);

      // 4. Minor noise below resumeSpeedMps (0.8 m/s) stays STOPPED
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.971604,
          longitude: 77.594604,
          altitude: 100,
          accuracy: 6,
          speed: 0.6, // Above stop threshold (0.5), but below resume threshold (0.8)
          heading: 90,
          altitudeAccuracy: null,
        },
        timestamp: 4000,
      });
      expect(gpsEngine.getMovementState()).toBe('STOPPED');

      // 5. Genuine resumption above resumeSpeedMps (0.8 m/s) -> transitions back to MOVING
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.971650,
          longitude: 77.594650,
          altitude: 100,
          accuracy: 5,
          speed: 3.0,
          heading: 90,
          altitudeAccuracy: null,
        },
        timestamp: 6000,
      });
      expect(gpsEngine.getMovementState()).toBe('MOVING');
      expect(gpsEngine.getMetrics().currentSpeedMps).toBeGreaterThan(0);
    });

    it('rejects stale timestamps older than 15s', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.97160,
          longitude: 77.59460,
          altitude: 100,
          accuracy: 5,
          speed: 3.0,
          heading: 0,
          altitudeAccuracy: null,
        },
        timestamp: Date.now() - 30000, // 30 seconds stale
      });

      expect(gpsEngine.getProcessedPoints().length).toBe(0);
    });

    it('rejects out-of-order timestamp fixes', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      const now = Date.now();
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.97160,
          longitude: 77.59460,
          altitude: 100,
          accuracy: 5,
          speed: 3.0,
          heading: 0,
          altitudeAccuracy: null,
        },
        timestamp: now - 2000,
      });
      expect(gpsEngine.getProcessedPoints().length).toBe(1);

      // Out of order point (older timestamp)
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.97170,
          longitude: 77.59470,
          altitude: 100,
          accuracy: 5,
          speed: 3.0,
          heading: 0,
          altitudeAccuracy: null,
        },
        timestamp: now - 4000, // older!
      });
      expect(gpsEngine.getProcessedPoints().length).toBe(1);
    });
  });

  describe('Dead Reckoning Map Position Prediction & Data Isolation', () => {
    it('predicts smooth map position within horizon and never contaminates authoritative activity metrics', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      const baseTime = 10000;
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.971600,
          longitude: 77.594600,
          altitude: 100,
          accuracy: 5,
          speed: 3.0, // 3 m/s east
          heading: 90,
          altitudeAccuracy: null,
        },
        timestamp: baseTime,
      });

      const initialPointsCount = gpsEngine.getProcessedPoints().length;
      const initialDistance = gpsEngine.getMetrics().distanceMeters;

      // 1. Get predicted map position 1000ms later
      const predictedPos = gpsEngine.getLiveMapPosition(baseTime + 1000);
      expect(predictedPos.isPredicted).toBe(true);
      expect(predictedPos.longitude).toBeGreaterThan(77.594600);

      // 2. Ensure prediction did NOT alter authoritative recorded activity data!
      expect(gpsEngine.getProcessedPoints().length).toBe(initialPointsCount);
      expect(gpsEngine.getMetrics().distanceMeters).toBe(initialDistance);
      expect(gpsEngine.getMetrics().elevationGainMeters).toBe(0);

      // 3. Stale prediction horizon (>2500ms) halts dead reckoning
      const stalePredicted = gpsEngine.getLiveMapPosition(baseTime + 5000);
      expect(stalePredicted.isPredicted).toBe(false);
      expect(stalePredicted.latitude).toBeCloseTo(12.971600, 5);
      expect(stalePredicted.longitude).toBeCloseTo(77.594600, 5);
    });
  });

  describe('Average Pace & Cumulative Activity Metrics', () => {
    it('calculates average pace strictly from cumulative moving data during a Run', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      expect(gpsEngine.getMetrics().averagePaceSecKm).toBe(0);

      // Point 1 (0s)
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.97160,
          longitude: 77.59460,
          altitude: 100,
          accuracy: 4,
          speed: 3.33,
          heading: 0,
          altitudeAccuracy: null,
        },
        timestamp: 10000,
      });

      // Point 2 (10s later, ~33.3m away)
      gpsEngine.handleNewLocation({
        coords: {
          latitude: 12.97190,
          longitude: 77.59460,
          altitude: 100,
          accuracy: 4,
          speed: 3.33,
          heading: 0,
          altitudeAccuracy: null,
        },
        timestamp: 20000,
      });

      const metrics = gpsEngine.getMetrics();
      expect(metrics.distanceMeters).toBeGreaterThan(30);
      expect(metrics.movingSeconds).toBeGreaterThanOrEqual(10);
      expect(metrics.averagePaceSecKm).toBeGreaterThan(250);
      expect(metrics.averagePaceSecKm).toBeLessThan(350);
    });

    it('rejects stationary GPS drift and maintains stable average pace during stopped periods', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      // Fix 1
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.97160, longitude: 77.59460, altitude: 100, accuracy: 4, speed: 3.0, heading: 0, altitudeAccuracy: null },
        timestamp: 10000,
      });
      // Fix 2: Genuine movement (30m in 10s)
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.97187, longitude: 77.59460, altitude: 100, accuracy: 4, speed: 3.0, heading: 0, altitudeAccuracy: null },
        timestamp: 20000,
      });

      const movingDistance = gpsEngine.getMetrics().distanceMeters;
      const movingTime = gpsEngine.getMetrics().movingSeconds;
      const avgPaceBeforeStop = gpsEngine.getMetrics().averagePaceSecKm;

      expect(movingDistance).toBeGreaterThan(25);
      expect(movingTime).toBeGreaterThanOrEqual(10);

      // Fix 3: Stationary jitter / drift (speed 0, tiny delta 0.5m)
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.971871, longitude: 77.594601, altitude: 100, accuracy: 4, speed: 0.1, heading: 0, altitudeAccuracy: null },
        timestamp: 25000,
      });

      // Distance and moving time must NOT increase from stationary drift!
      expect(gpsEngine.getMetrics().distanceMeters).toBe(movingDistance);
      expect(gpsEngine.getMetrics().movingSeconds).toBe(movingTime);
      expect(gpsEngine.getMetrics().averagePaceSecKm).toBe(avgPaceBeforeStop);
    });

    it('handles pause and resume without artificial distance or pace spikes', async () => {
      await gpsEngine.prepare('RUN');
      await gpsEngine.start();

      // Fix 1
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.97160, longitude: 77.59460, altitude: 100, accuracy: 4, speed: 3.0, heading: 0, altitudeAccuracy: null },
        timestamp: 10000,
      });
      // Fix 2 (30m in 10s)
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.97187, longitude: 77.59460, altitude: 100, accuracy: 4, speed: 3.0, heading: 0, altitudeAccuracy: null },
        timestamp: 20000,
      });

      const distBeforePause = gpsEngine.getMetrics().distanceMeters;
      const movingTimeBeforePause = gpsEngine.getMetrics().movingSeconds;

      // Pause for 10 minutes (600,000 ms)
      await gpsEngine.pause();
      expect(gpsEngine.getState()).toBe('PAUSED');

      // Location arriving during PAUSE must be ignored
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.98000, longitude: 77.60000, altitude: 100, accuracy: 4, speed: 0, heading: 0, altitudeAccuracy: null },
        timestamp: 50000,
      });
      expect(gpsEngine.getMetrics().distanceMeters).toBe(distBeforePause);

      // Resume
      await gpsEngine.resume();
      expect(gpsEngine.getState()).toBe('TRACKING');

      // First fix after resume should re-anchor without jumping
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.98000, longitude: 77.60000, altitude: 100, accuracy: 4, speed: 3.0, heading: 0, altitudeAccuracy: null },
        timestamp: 620000,
      });

      // No leap in distance from the gap
      expect(gpsEngine.getMetrics().distanceMeters).toBe(distBeforePause);
      expect(gpsEngine.getMetrics().movingSeconds).toBe(movingTimeBeforePause);
    });

    it('calculates average speed for cycling activities', async () => {
      await gpsEngine.prepare('CYCLE');
      await gpsEngine.start();

      // Fix 1
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.97160, longitude: 77.59460, altitude: 100, accuracy: 4, speed: 8.0, heading: 0, altitudeAccuracy: null },
        timestamp: 10000,
      });
      // Fix 2: Cycling 80m in 10s = 8 m/s (~28.8 km/h)
      gpsEngine.handleNewLocation({
        coords: { latitude: 12.97232, longitude: 77.59460, altitude: 100, accuracy: 4, speed: 8.0, heading: 0, altitudeAccuracy: null },
        timestamp: 20000,
      });

      const metrics = gpsEngine.getMetrics();
      expect(metrics.averageSpeedMps).toBeGreaterThanOrEqual(7.5);
      expect(metrics.averageSpeedMps).toBeLessThanOrEqual(8.5);
    });
  });
});
