jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6, Balanced: 3 },
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
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

describe('GPS Tracking State Machine & Filtering', () => {
  beforeEach(async () => {
    await gpsEngine.reset();
  });

  it('starts in IDLE state', () => {
    expect(gpsEngine.getState()).toBe('IDLE');
  });

  it('transitions through PREPARING -> TRACKING -> PAUSED -> TRACKING -> COMPLETED', async () => {
    await gpsEngine.prepare('RUN');
    expect(gpsEngine.getState()).toBe('PREPARING');

    await gpsEngine.start();
    expect(gpsEngine.getState()).toBe('TRACKING');

    await gpsEngine.pause();
    expect(gpsEngine.getState()).toBe('PAUSED');

    await gpsEngine.resume();
    expect(gpsEngine.getState()).toBe('TRACKING');

    await gpsEngine.finish();
    expect(gpsEngine.getState()).toBe('COMPLETED');
  });

  it('rejects duplicate and inaccurate coordinates', async () => {
    await gpsEngine.prepare('RUN');
    await gpsEngine.start();

    // 1. Initial valid location
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 920,
        accuracy: 10,
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });
    expect(gpsEngine.getPoints().length).toBe(1);

    // 2. Duplicate coordinate (should be ignored)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9716,
        longitude: 77.5946,
        altitude: 920,
        accuracy: 10,
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 2000,
    });
    expect(gpsEngine.getPoints().length).toBe(1);

    // 3. Inaccurate coordinate (accuracy > 35m, should be rejected)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.973,
        longitude: 77.596,
        altitude: 920,
        accuracy: 75, // Too poor
        speed: 3.2,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 3000,
    });
    expect(gpsEngine.getPoints().length).toBe(1);

    // 4. Valid second point (genuine movement > 10m)
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.9718,
        longitude: 77.5948,
        altitude: 921,
        accuracy: 5,
        speed: 3.4,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 4000,
    });
    expect(gpsEngine.getPoints().length).toBe(2);
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
        accuracy: 12,
        speed: 0.1,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 1000,
    });

    // Tiny 0.5m drift jitter while sitting still
    gpsEngine.handleNewLocation({
      coords: {
        latitude: 12.971604,
        longitude: 77.594602,
        altitude: 920,
        accuracy: 14,
        speed: 0.1,
        heading: 0,
        altitudeAccuracy: null,
      },
      timestamp: 2000,
    });

    // Should NOT accumulate distance during stationary jitter
    expect(gpsEngine.getMetrics().distanceMeters).toBe(0);
  });
});
