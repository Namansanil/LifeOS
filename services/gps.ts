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
  private recentPointsWindow: RoutePoint[] = []; // Rolling window for smooth pace
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private lastPauseTimestamp: number = 0;
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private timerInterval: any = null;
  private listeners: Set<GPSListener> = new Set();
  private smoothedSpeedMps: number = 0;

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
    this.recentPointsWindow = [];
    this.startTime = 0;
    this.pausedDuration = 0;
    this.lastPauseTimestamp = 0;
    this.smoothedSpeedMps = 0;
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
    this.smoothedSpeedMps = 0;
    this.metrics.currentSpeedMps = 0;
    this.notifyMetrics();
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
    this.recentPointsWindow = [];
    this.smoothedSpeedMps = 0;
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');
  }

  // ==========================================
  // POINT PROCESSING & ADVANCED ACCURACY FILTERING
  // ==========================================

  handleNewLocation(location: Location.LocationObject) {
    if (this.state !== 'TRACKING') return;

    const { latitude, longitude, altitude, accuracy, speed } = location.coords;
    const timestamp = location.timestamp;

    // Filter 1: Strict Accuracy Check (reject noisy signals > 20m)
    if (accuracy !== null && accuracy > 20) {
      this.metrics.currentAccuracyMeters = accuracy;
      this.notifyMetrics();
      return;
    }

    const activityConfig = ACTIVITY_DEFINITIONS[this.activityType] || ACTIVITY_DEFINITIONS.RUN;

    // Filter 2: Speed sanity check (e.g. running cannot exceed 12 m/s / 43 km/h)
    if (speed !== null && speed > activityConfig.maxValidSpeedMps) {
      return;
    }

    const newPoint: RoutePoint = {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed !== null && speed >= 0 ? speed : undefined,
      timestamp,
    };

    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];

      // Filter 3: Exact duplicate coordinates filter
      if (lastPoint.latitude === latitude && lastPoint.longitude === longitude) {
        return;
      }

      // Filter 4: Jump rejection (teleporting / signal glitch)
      const stepDistance = haversineDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        latitude,
        longitude
      );

      if (stepDistance > activityConfig.maxValidJumpMeters) {
        return;
      }

      const timeDeltaSec = Math.max(0.5, (timestamp - lastPoint.timestamp) / 1000);
      const computedSpeed = stepDistance / timeDeltaSec;

      // Filter 5: Stationary Drift Rejection (Zero-Speed Filter)
      // When moving less than 1.8m or speed < 0.4 m/s, reject jitter accumulation
      const isStationary = stepDistance < 1.8 && (speed === null || speed < 0.4 || computedSpeed < 0.4);

      if (!isStationary) {
        // Accumulate truthful distance
        this.metrics.distanceMeters += stepDistance;

        if (computedSpeed >= activityConfig.minValidSpeedMps) {
          this.metrics.movingSeconds += timeDeltaSec;
        }
      }
    }

    // Add point to master array
    this.points.push(newPoint);

    // Keep sliding window of last 6 points for smooth rolling pace
    this.recentPointsWindow.push(newPoint);
    if (this.recentPointsWindow.length > 6) {
      this.recentPointsWindow.shift();
    }

    // Smooth instantaneous speed with Exponential Moving Average (EMA)
    const rawSpeed = speed !== null && speed >= 0 ? speed : 0;
    if (this.smoothedSpeedMps === 0) {
      this.smoothedSpeedMps = rawSpeed;
    } else {
      const alpha = 0.3; // 30% new measurement, 70% history
      this.smoothedSpeedMps = alpha * rawSpeed + (1 - alpha) * this.smoothedSpeedMps;
    }

    this.metrics.pointsCount = this.points.length;
    this.metrics.currentAltitudeMeters = altitude ?? undefined;
    this.metrics.currentAccuracyMeters = accuracy ?? undefined;
    this.metrics.currentSpeedMps = Math.max(0, +this.smoothedSpeedMps.toFixed(2));

    // Elevation Gain (filters vertical sensor noise)
    const altitudes = this.points
      .map((p) => p.altitude)
      .filter((a): a is number => typeof a === 'number');
    this.metrics.elevationGainMeters = calculateElevationGain(altitudes);

    // Pace & Speed calculation
    if (this.metrics.distanceMeters > 10) {
      this.metrics.averagePaceSecKm = calculatePace(
        this.metrics.distanceMeters,
        this.metrics.elapsedSeconds
      );
      this.metrics.averageSpeedMps = +(
        this.metrics.distanceMeters / Math.max(1, this.metrics.elapsedSeconds)
      ).toFixed(2);

      // Compute rolling window pace for smooth, truthful real-time feedback
      if (this.recentPointsWindow.length >= 3) {
        const firstWinPoint = this.recentPointsWindow[0];
        const lastWinPoint = this.recentPointsWindow[this.recentPointsWindow.length - 1];
        const winDistance = haversineDistance(
          firstWinPoint.latitude,
          firstWinPoint.longitude,
          lastWinPoint.latitude,
          lastWinPoint.longitude
        );
        const winTimeSec = (lastWinPoint.timestamp - firstWinPoint.timestamp) / 1000;

        if (winDistance > 5 && winTimeSec > 1) {
          this.metrics.currentPaceSecKm = calculatePace(winDistance, winTimeSec);
        } else if (this.smoothedSpeedMps > 0.5) {
          this.metrics.currentPaceSecKm = Math.round(1000 / this.smoothedSpeedMps);
        } else {
          this.metrics.currentPaceSecKm = this.metrics.averagePaceSecKm;
        }
      } else if (this.smoothedSpeedMps > 0.5) {
        this.metrics.currentPaceSecKm = Math.round(1000 / this.smoothedSpeedMps);
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
      return;
    }

    try {
      const config = ACTIVITY_DEFINITIONS[this.activityType];
      // Highest accuracy navigation profile
      const accuracy = Location.Accuracy.BestForNavigation;

      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval: 1000,
          distanceInterval: 1,
          mayShowUserSettingsDialog: true,
        },
        (loc) => this.handleNewLocation(loc)
      );

      // Start background location updates if task defined
      const isTaskDefined = TaskManager.isTaskDefined(GPS_BACKGROUND_TASK_NAME);
      if (isTaskDefined) {
        await Location.startLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME, {
          accuracy,
          timeInterval: 1000,
          distanceInterval: 2,
          foregroundService: {
            notificationTitle: `LifeOS · Tracking ${config.label}`,
            notificationBody: 'High-precision route and endurance recording...',
            notificationColor: '#1B3B2B',
          },
          showsBackgroundLocationIndicator: true,
          pausesUpdatesAutomatically: false,
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
