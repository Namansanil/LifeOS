const mockExpoBarometer = {
  isAvailableAsync: jest.fn(),
  setUpdateInterval: jest.fn(),
  addListener: jest.fn(),
  removeSubscription: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn((name: string) => {
    if (name === 'ExpoBarometer') return mockExpoBarometer;
    return null;
  }),
  requireNativeModule: jest.fn(() => ({})),
}));

import {
  barometerService,
  calculatePressureDeltaAltitude,
  pressureToIsaAltitude,
} from '../services/barometer';

describe('Barometer Tracker & ISA Pressure Physics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ISA Barometric Pressure-to-Altitude Formula', () => {
    it('returns 0m altitude at standard sea-level pressure (1013.25 hPa)', () => {
      const alt = pressureToIsaAltitude(1013.25);
      expect(alt).toBeCloseTo(0, 1);
    });

    it('computes realistic altitude at higher elevations (lower atmospheric pressure)', () => {
      // At ~900 hPa (~Bangalore/highland elevation ~920m)
      const alt900 = pressureToIsaAltitude(900);
      expect(alt900).toBeGreaterThan(900);
      expect(alt900).toBeLessThan(1050);

      // At ~800 hPa (high mountain ~2000m)
      const alt800 = pressureToIsaAltitude(800);
      expect(alt800).toBeGreaterThan(1900);
      expect(alt800).toBeLessThan(2100);
    });

    it('accurately calculates relative elevation change for small pressure drops', () => {
      // 1 hPa pressure drop corresponds to ~8.3 - 8.5m climb near sea level
      const deltaH = calculatePressureDeltaAltitude(1012.25, 1013.25);
      expect(deltaH).toBeGreaterThan(8.0);
      expect(deltaH).toBeLessThan(9.0);
    });

    it('safely handles zero or negative pressure inputs', () => {
      expect(pressureToIsaAltitude(0)).toBe(0);
      expect(pressureToIsaAltitude(-50)).toBe(0);
      expect(calculatePressureDeltaAltitude(0, 1013.25)).toBe(0);
    });
  });

  describe('Barometer Tracker Hardware Lifecycle & Fallback', () => {
    it('detects availability when sensor is present', async () => {
      mockExpoBarometer.isAvailableAsync.mockResolvedValueOnce(true);
      const isAvailable = await barometerService.isAvailableAsync();
      expect(isAvailable).toBe(true);
    });

    it('gracefully handles missing or budget devices without barometer sensor', async () => {
      mockExpoBarometer.isAvailableAsync.mockRejectedValueOnce(new Error('Hardware sensor not present'));
      const isAvail = await barometerService.isAvailableAsync();
      expect(typeof isAvail).toBe('boolean');
    });

    it('subscribes to listener and computes calibrated relative altitude', async () => {
      let listenerCallback: any = null;
      mockExpoBarometer.isAvailableAsync.mockResolvedValue(true);
      mockExpoBarometer.addListener.mockImplementation((_event: string, cb: any) => {
        listenerCallback = cb;
        return { remove: jest.fn() };
      });

      await barometerService.start(100); // Anchor at 100m initial GPS fix

      const receivedReadings: any[] = [];
      const unsubscribe = barometerService.subscribe((reading) => {
        receivedReadings.push(reading);
      });

      // Simulate base reading: 1013.25 hPa -> calibrated = 100m
      listenerCallback({ pressure: 1013.25 });
      expect(receivedReadings.length).toBeGreaterThanOrEqual(1);
      expect(receivedReadings[receivedReadings.length - 1].calibratedAltitudeMeters).toBeCloseTo(100, 1);

      // Simulate 1 hPa climb: 1012.25 hPa -> calibrated = ~108.4m
      listenerCallback({ pressure: 1012.25 });
      const latest = receivedReadings[receivedReadings.length - 1];
      expect(latest.calibratedAltitudeMeters).toBeGreaterThan(107);
      expect(latest.calibratedAltitudeMeters).toBeLessThan(110);

      unsubscribe();
      barometerService.stop();
    });
  });
});
