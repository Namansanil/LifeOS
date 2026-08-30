import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export interface BarometerMeasurement {
  pressure: number;
  relativeAltitude?: number;
}

export interface BarometerAltitudeReading {
  pressureHpa: number;
  relativeAltitudeMeters: number;
  calibratedAltitudeMeters: number;
  timestamp: number;
}

export type BarometerCallback = (reading: BarometerAltitudeReading) => void;

/**
 * Safely fetches the optional native ExpoBarometer module without throwing errors
 * when run in environments without the native sensor binary compiled.
 */
function getNativeBarometerModule(): any {
  if (Platform.OS === 'web') return null;
  try {
    return requireOptionalNativeModule('ExpoBarometer');
  } catch {
    return null;
  }
}

/**
 * Standard International Standard Atmosphere (ISA) barometric altitude formula.
 * Converts pressure in hPa to theoretical altitude in meters above sea level at standard 1013.25 hPa.
 */
export function pressureToIsaAltitude(pressureHpa: number): number {
  if (!pressureHpa || pressureHpa <= 0 || !isFinite(pressureHpa)) return 0;
  // ISA model: 44330 * (1 - (P / 1013.25)^(1/5.255))
  return 44330 * (1 - Math.pow(pressureHpa / 1013.25, 0.190263));
}

/**
 * Calculates relative elevation change between two pressure measurements.
 * Delta_h = ISA(P2) - ISA(P1)
 */
export function calculatePressureDeltaAltitude(
  currentPressureHpa: number,
  referencePressureHpa: number
): number {
  if (
    !currentPressureHpa ||
    !referencePressureHpa ||
    currentPressureHpa <= 0 ||
    referencePressureHpa <= 0
  ) {
    return 0;
  }
  return pressureToIsaAltitude(currentPressureHpa) - pressureToIsaAltitude(referencePressureHpa);
}

class BarometerTrackerService {
  private subscription: { remove: () => void } | null = null;
  private isAvailable: boolean | null = null;
  private isTracking: boolean = false;

  private referencePressureHpa: number | null = null;
  private anchorGpsAltitudeMeters: number = 0;
  private lastReading: BarometerAltitudeReading | null = null;

  private listeners: Set<BarometerCallback> = new Set();

  /**
   * Checks whether the physical device is equipped with a hardware barometric altimeter.
   * Safe to call on all platforms (Android, iOS, Web, Simulators, Expo Go).
   */
  async isAvailableAsync(): Promise<boolean> {
    if (Platform.OS === 'web') {
      this.isAvailable = false;
      return false;
    }

    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      const nativeMod = getNativeBarometerModule();
      if (!nativeMod || typeof nativeMod.isAvailableAsync !== 'function') {
        this.isAvailable = false;
        return false;
      }
      this.isAvailable = await nativeMod.isAvailableAsync();
      return !!this.isAvailable;
    } catch {
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Starts barometric pressure sampling and anchors calibration to initial GPS altitude.
   */
  async start(initialGpsAltitude: number = 0): Promise<boolean> {
    if (this.isTracking) return true;

    const available = await this.isAvailableAsync();
    if (!available) {
      return false;
    }

    this.anchorGpsAltitudeMeters = isFinite(initialGpsAltitude) ? initialGpsAltitude : 0;
    this.referencePressureHpa = null;
    this.lastReading = null;
    this.isTracking = true;

    try {
      const nativeMod = getNativeBarometerModule();
      if (!nativeMod) {
        this.isTracking = false;
        return false;
      }

      if (typeof nativeMod.setUpdateInterval === 'function') {
        nativeMod.setUpdateInterval(1000); // 1 Hz sampling matching GPS fix rate
      }

      if (typeof nativeMod.addListener === 'function') {
        const sub = nativeMod.addListener('barometerDidUpdate', (measurement: BarometerMeasurement) => {
          this.handleMeasurement(measurement);
        });

        this.subscription = sub && typeof sub.remove === 'function'
          ? sub
          : {
              remove: () => {
                if (typeof nativeMod.removeSubscription === 'function' && sub) {
                  nativeMod.removeSubscription(sub);
                } else if (typeof nativeMod.removeAllListeners === 'function') {
                  nativeMod.removeAllListeners('barometerDidUpdate');
                }
              },
            };
        return true;
      }

      this.isTracking = false;
      return false;
    } catch {
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Re-anchors baseline GPS altitude once a high-accuracy GPS fix is acquired.
   */
  updateAnchorGpsAltitude(gpsAltitude: number) {
    if (typeof gpsAltitude === 'number' && isFinite(gpsAltitude)) {
      this.anchorGpsAltitudeMeters = gpsAltitude;
    }
  }

  /**
   * Handles incoming hardware pressure events.
   */
  private handleMeasurement(measurement: BarometerMeasurement) {
    const { pressure } = measurement;
    if (!pressure || pressure <= 0 || !isFinite(pressure)) return;

    if (this.referencePressureHpa === null) {
      this.referencePressureHpa = pressure;
    }

    const relativeDelta = calculatePressureDeltaAltitude(pressure, this.referencePressureHpa);
    const calibratedAltitude = this.anchorGpsAltitudeMeters + relativeDelta;

    const reading: BarometerAltitudeReading = {
      pressureHpa: +pressure.toFixed(2),
      relativeAltitudeMeters: +relativeDelta.toFixed(2),
      calibratedAltitudeMeters: +calibratedAltitude.toFixed(2),
      timestamp: Date.now(),
    };

    this.lastReading = reading;
    this.listeners.forEach((callback) => {
      try {
        callback(reading);
      } catch (e) {
        console.warn('Barometer listener callback error:', e);
      }
    });
  }

  /**
   * Stops barometric sampling.
   */
  stop() {
    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch {
        // Safe unsubscribe
      }
      this.subscription = null;
    }
    this.isTracking = false;
    this.referencePressureHpa = null;
  }

  /**
   * Retrieves the most recent barometric altitude reading.
   */
  getLastReading(): BarometerAltitudeReading | null {
    return this.lastReading;
  }

  /**
   * Subscribes a listener to receive real-time barometric altitude updates.
   */
  subscribe(callback: BarometerCallback): () => void {
    this.listeners.add(callback);
    if (this.lastReading) {
      callback(this.lastReading);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }
}

export const barometerService = new BarometerTrackerService();
