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
});
