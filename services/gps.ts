import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ActivityType, RoutePoint, TrackingMetrics, TrackingState } from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import {
  calculateElevationGain,
  calculatePace,
  haversineDistance,
} from './calculations';

export const GPS_BACKGROUND_TASK_NAME = 'LIFEOS_BACKGROUND_LOCATION_TASK';

interface GPSListener {
  onStateChange: (state: TrackingState) => void;
  onMetricsUpdate: (metrics: TrackingMetrics) => void;
  onPointAdded: (point: RoutePoint) => void;
}

class GPSTrackingEngine {
  private state: TrackingState = 'IDLE';
  private activityType: ActivityType = 'RUN';
  private points: RoutePoint[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private lastPauseTimestamp: number = 0;
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private timerInterval: any = null;
  private listeners: Set<GPSListener> = new Set();

  private metrics: TrackingMetrics = {
    distanceMeters: 0,
    elapsedSeconds: 0,
    movingSeconds: 0,
    currentSpeedMps: 0,
    averageSpeedMps: 0,
    currentPaceSecKm: 0,
    averagePaceSecKm: 0,
    elevationGainMeters: 0,
    currentAltitudeMeters: undefined,
    currentAccuracyMeters: undefined,
    pointsCount: 0,
  };

  getState(): TrackingState {
    return this.state;
  }

  getMetrics(): TrackingMetrics {
    return { ...this.metrics };
  }

  getPoints(): RoutePoint[] {
    return [...this.points];
  }

  getActivityType(): ActivityType {
    return this.activityType;
  }

  subscribe(listener: GPSListener) {
    this.listeners.add(listener);
    listener.onStateChange(this.state);
    listener.onMetricsUpdate(this.metrics);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyState() {
    this.listeners.forEach((l) => l.onStateChange(this.state));
    this.persistActiveSession();
  }

  private notifyMetrics() {
    this.listeners.forEach((l) => l.onMetricsUpdate({ ...this.metrics }));
  }

  private notifyPoint(point: RoutePoint) {
    this.listeners.forEach((l) => l.onPointAdded(point));
  }

  // ==========================================
  // STATE TRANSITIONS
  // ==========================================

  async prepare(type: ActivityType = 'RUN'): Promise<boolean> {
    if (this.state !== 'IDLE' && this.state !== 'COMPLETED' && this.state !== 'ERROR') {
      return false;
    }

    this.activityType = type;
    this.points = [];
    this.startTime = 0;
    this.pausedDuration = 0;
    this.lastPauseTimestamp = 0;
    this.metrics = {
      distanceMeters: 0,
      elapsedSeconds: 0,
      movingSeconds: 0,
      currentSpeedMps: 0,
      averageSpeedMps: 0,
      currentPaceSecKm: 0,
      averagePaceSecKm: 0,
      elevationGainMeters: 0,
      currentAltitudeMeters: undefined,
      currentAccuracyMeters: undefined,
      pointsCount: 0,
    };

    this.state = 'PREPARING';
    this.notifyState();
    return true;
  }

  async start(): Promise<boolean> {
    if (this.state !== 'PREPARING' && this.state !== 'IDLE') {
      return false;
    }

    this.startTime = Date.now();
    this.state = 'TRACKING';
    this.notifyState();

    this.startTimer();
    await this.startLocationTracking();
    return true;
  }

  async pause(): Promise<boolean> {
    if (this.state !== 'TRACKING') return false;

    this.state = 'PAUSED';
    this.lastPauseTimestamp = Date.now();
    this.notifyState();
    return true;
  }

  async resume(): Promise<boolean> {
    if (this.state !== 'PAUSED') return false;

    if (this.lastPauseTimestamp > 0) {
      this.pausedDuration += Date.now() - this.lastPauseTimestamp;
      this.lastPauseTimestamp = 0;
    }

    this.state = 'TRACKING';
    this.notifyState();
    return true;
  }

  async finish(): Promise<boolean> {
    if (this.state !== 'TRACKING' && this.state !== 'PAUSED') return false;

    this.state = 'FINISHING';
    this.notifyState();

    this.stopTimer();
    await this.stopLocationTracking();

    this.state = 'COMPLETED';
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');
    return true;
  }

  async reset(): Promise<void> {
    this.stopTimer();
    await this.stopLocationTracking();
    this.state = 'IDLE';
    this.points = [];
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');
  }

  // ==========================================
  // POINT PROCESSING & FILTERING
  // ==========================================

  handleNewLocation(location: Location.LocationObject) {
    if (this.state !== 'TRACKING') return;

    const { latitude, longitude, altitude, accuracy, speed } = location.coords;
    const timestamp = location.timestamp;

    // Filter 1: Accuracy check (reject poor signals > 35m)
    if (accuracy !== null && accuracy > 35) {
      this.metrics.currentAccuracyMeters = accuracy;
      this.notifyMetrics();
      return;
    }

    const activityConfig = ACTIVITY_DEFINITIONS[this.activityType] || ACTIVITY_DEFINITIONS.RUN;

    // Filter 2: Speed sanity check
    if (speed !== null && speed > activityConfig.maxValidSpeedMps) {
      return;
    }

    const newPoint: RoutePoint = {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed ?? undefined,
      timestamp,
    };

    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];

      // Filter 3: Duplicate point filter
      if (lastPoint.latitude === latitude && lastPoint.longitude === longitude) {
        return;
      }

      // Filter 4: Jump rejection
      const stepDistance = haversineDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        latitude,
        longitude
      );

      if (stepDistance > activityConfig.maxValidJumpMeters) {
        return;
      }

      // Accumulate distance
      this.metrics.distanceMeters += stepDistance;

      // Check moving speed
      const timeDeltaSec = Math.max(1, (timestamp - lastPoint.timestamp) / 1000);
      const computedSpeed = stepDistance / timeDeltaSec;
      if (computedSpeed >= activityConfig.minValidSpeedMps) {
        this.metrics.movingSeconds += timeDeltaSec;
      }
    }

    this.points.push(newPoint);
    this.metrics.pointsCount = this.points.length;
    this.metrics.currentAltitudeMeters = altitude ?? undefined;
    this.metrics.currentAccuracyMeters = accuracy ?? undefined;
    this.metrics.currentSpeedMps = speed !== null && speed >= 0 ? speed : 0;

    // Elevation Gain
    const altitudes = this.points
      .map((p) => p.altitude)
      .filter((a): a is number => typeof a === 'number');
    this.metrics.elevationGainMeters = calculateElevationGain(altitudes);

    // Pace & Speed
    if (this.metrics.distanceMeters > 10) {
      this.metrics.averagePaceSecKm = calculatePace(
        this.metrics.distanceMeters,
        this.metrics.elapsedSeconds
      );
      this.metrics.averageSpeedMps =
        this.metrics.distanceMeters / Math.max(1, this.metrics.elapsedSeconds);

      if (this.metrics.currentSpeedMps > 0.5) {
        this.metrics.currentPaceSecKm = Math.round(1000 / this.metrics.currentSpeedMps);
      } else {
        this.metrics.currentPaceSecKm = this.metrics.averagePaceSecKm;
      }
    }

    this.notifyPoint(newPoint);
    this.notifyMetrics();
  }

  // ==========================================
  // HARDWARE TRACKING & TIMERS
  // ==========================================

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state === 'TRACKING') {
        const totalDurationMs = Date.now() - this.startTime - this.pausedDuration;
        this.metrics.elapsedSeconds = Math.max(0, Math.floor(totalDurationMs / 1000));
        this.notifyMetrics();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async startLocationTracking() {
    if (Platform.OS === 'web') {
      // Polyfill GPS simulation on web preview if native hardware not accessible
      return;
    }

    try {
      const config = ACTIVITY_DEFINITIONS[this.activityType];
      const accuracy =
        config.gpsProfile === 'high'
          ? Location.Accuracy.BestForNavigation
          : Location.Accuracy.Balanced;

      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval: 1500,
          distanceInterval: 3,
        },
        (loc) => this.handleNewLocation(loc)
      );

      // Start background task if registered
      const isTaskDefined = TaskManager.isTaskDefined(GPS_BACKGROUND_TASK_NAME);
      if (isTaskDefined) {
        await Location.startLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME, {
          accuracy,
          timeInterval: 2000,
          distanceInterval: 4,
          foregroundService: {
            notificationTitle: `LifeOS · Tracking ${config.label}`,
            notificationBody: 'Recording route and endurance metrics...',
            notificationColor: '#1B3B2B',
          },
          showsBackgroundLocationIndicator: true,
        });
      }
    } catch (err) {
      console.warn('GPS hardware watch error:', err);
    }
  }

  private async stopLocationTracking() {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    if (Platform.OS !== 'web') {
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(
          GPS_BACKGROUND_TASK_NAME
        );
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME);
        }
      } catch {}
    }
  }

  private async persistActiveSession() {
    try {
      if (this.state === 'TRACKING' || this.state === 'PAUSED') {
        await AsyncStorage.setItem(
          '@lifeos_active_gps_session',
          JSON.stringify({
            state: this.state,
            activityType: this.activityType,
            startTime: this.startTime,
            pausedDuration: this.pausedDuration,
            lastPauseTimestamp: this.lastPauseTimestamp,
            metrics: this.metrics,
          })
        );
      }
    } catch {}
  }
}

export const gpsEngine = new GPSTrackingEngine();

// Register background task handler for native builds
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GPS_BACKGROUND_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.warn('Background location task error:', error);
      return;
    }
    if (data) {
      const { locations } = data;
      if (Array.isArray(locations)) {
        for (const loc of locations) {
          gpsEngine.handleNewLocation(loc);
        }
      }
    }
  });
}
