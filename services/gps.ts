import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Activity,
  ActivitySplit,
  ActivityType,
  GPSQuality,
  RawGPSPoint,
  RoutePoint,
  TrackingMetrics,
  TrackingState,
} from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import {
  calculateElevationProfile,
  calculatePace,
  calculateSpeedKmh,
  calculateSplits,
  haversineDistance,
  isValidCoordinate,
  postProcessActivity,
} from './calculations';

export const GPS_BACKGROUND_TASK_NAME = 'LIFEOS_BACKGROUND_LOCATION_TASK';

interface GPSListener {
  onStateChange: (state: TrackingState) => void;
  onMetricsUpdate: (metrics: TrackingMetrics) => void;
  onPointAdded: (point: RoutePoint) => void;
  onSplitCompleted?: (split: ActivitySplit) => void;
}

export class GPSTrackingEngine {
  private state: TrackingState = 'IDLE';
  private activityType: ActivityType = 'RUN';
  private rawPoints: RawGPSPoint[] = [];
  private processedPoints: RoutePoint[] = [];
  private recentPointsWindow: RoutePoint[] = [];
  private splits: ActivitySplit[] = [];

  private startTime: number = 0;
  private pausedDuration: number = 0;
  private lastPauseTimestamp: number = 0;
  private lastValidPoint: RoutePoint | null = null;
  private isResuming: boolean = false;

  // Signal Loss Tracking
  private lastGpsFixTimestamp: number = 0;
  private gpsLostTimestamp: number = 0;
  private signalLossCheckInterval: any = null;

  // Live Splits Accumulator
  private currentSplitDistanceAccumulator: number = 0;
  private currentSplitStartTime: number = 0;
  private currentSplitMovingSeconds: number = 0;
  private currentSplitAltitudes: number[] = [];

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
    maxSpeedMps: 0,
    currentPaceSecKm: 0,
    averagePaceSecKm: 0,
    bestPaceSecKm: undefined,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    currentAltitudeMeters: undefined,
    currentAccuracyMeters: undefined,
    gpsQuality: 'EXCELLENT',
    pointsCount: 0,
    currentSplitNumber: 1,
    splits: [],
  };

  getState(): TrackingState {
    return this.state;
  }

  getMetrics(): TrackingMetrics {
    return { ...this.metrics };
  }

  getProcessedPoints(): RoutePoint[] {
    return [...this.processedPoints];
  }

  getRawPoints(): RawGPSPoint[] {
    return [...this.rawPoints];
  }

  getSplits(): ActivitySplit[] {
    return [...this.splits];
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

  private notifySplit(split: ActivitySplit) {
    this.listeners.forEach((l) => l.onSplitCompleted?.(split));
  }

  // ==========================================
  // 1. STATE TRANSITIONS & LIFECYCLE
  // ==========================================

  async prepare(type: ActivityType = 'RUN'): Promise<boolean> {
    if (this.state !== 'IDLE' && this.state !== 'COMPLETED' && this.state !== 'ERROR' && this.state !== 'CANCELLED') {
      return false;
    }

    this.activityType = type;
    this.rawPoints = [];
    this.processedPoints = [];
    this.recentPointsWindow = [];
    this.splits = [];
    this.startTime = 0;
    this.pausedDuration = 0;
    this.lastPauseTimestamp = 0;
    this.lastValidPoint = null;
    this.isResuming = false;
    this.smoothedSpeedMps = 0;
    this.currentSplitDistanceAccumulator = 0;
    this.currentSplitStartTime = 0;
    this.currentSplitMovingSeconds = 0;
    this.currentSplitAltitudes = [];

    this.metrics = {
      distanceMeters: 0,
      elapsedSeconds: 0,
      movingSeconds: 0,
      currentSpeedMps: 0,
      averageSpeedMps: 0,
      maxSpeedMps: 0,
      currentPaceSecKm: 0,
      averagePaceSecKm: 0,
      bestPaceSecKm: undefined,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      currentAltitudeMeters: undefined,
      currentAccuracyMeters: undefined,
      gpsQuality: 'EXCELLENT',
      pointsCount: 0,
      currentSplitNumber: 1,
      splits: [],
    };

    this.state = 'PREPARING';
    this.notifyState();

    // Check GPS Signal Availability & Permissions
    if (Platform.OS !== 'web') {
      try {
        const hasServices = await Location.hasServicesEnabledAsync();
        if (!hasServices) {
          this.state = 'ERROR';
          this.notifyState();
          return false;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          this.state = 'ERROR';
          this.notifyState();
          return false;
        }
        const currentLoc = await Location.getLastKnownPositionAsync();
        if (currentLoc && currentLoc.coords.accuracy && currentLoc.coords.accuracy <= 25) {
          this.state = 'GPS_READY';
        }
      } catch {
        // Fallback to PREPARING
      }
    } else {
      this.state = 'GPS_READY';
    }

    this.notifyState();
    return true;
  }

  async start(): Promise<boolean> {
    if (this.state !== 'PREPARING' && this.state !== 'GPS_READY' && this.state !== 'IDLE') {
      return false;
    }

    this.startTime = Date.now();
    this.lastGpsFixTimestamp = Date.now();
    this.currentSplitStartTime = this.startTime;
    this.state = 'TRACKING';
    this.notifyState();

    this.startTimer();
    this.startSignalLossChecker();
    await this.startLocationTracking();
    return true;
  }

  async pause(): Promise<boolean> {
    if (this.state !== 'TRACKING' && this.state !== 'GPS_LOST') return false;

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

    this.isResuming = true; // Signals that next location must NOT compute displacement jump from pre-pause point
    this.state = 'TRACKING';
    this.notifyState();
    return true;
  }

  async cancel(): Promise<void> {
    this.stopTimer();
    this.stopSignalLossChecker();
    await this.stopLocationTracking();
    this.state = 'CANCELLED';
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');
  }

  async finish(): Promise<Activity | null> {
    if (this.state !== 'TRACKING' && this.state !== 'PAUSED' && this.state !== 'GPS_LOST') {
      return null;
    }

    this.state = 'FINISHING';
    this.notifyState();

    this.stopTimer();
    this.stopSignalLossChecker();
    await this.stopLocationTracking();

    this.state = 'PROCESSING';
    this.notifyState();

    // Run authoritative post-processing
    const startedAt = new Date(this.startTime || Date.now()).toISOString();
    const endedAt = new Date().toISOString();

    const postResults = postProcessActivity({
      rawPoints: this.rawPoints,
      type: this.activityType,
      startedAt,
      endedAt,
    });

    this.metrics.distanceMeters = postResults.authoritativeDistanceMeters;
    this.metrics.movingSeconds = postResults.movingSeconds;
    this.metrics.elapsedSeconds = postResults.elapsedSeconds;
    this.metrics.averagePaceSecKm = postResults.averagePaceSecKm;
    this.metrics.averageSpeedMps = postResults.averageSpeedMps;
    this.metrics.maxSpeedMps = postResults.maxSpeedMps;
    this.metrics.bestPaceSecKm = postResults.bestPaceSecKm;
    this.metrics.elevationGainMeters = postResults.elevationGainMeters;
    this.metrics.elevationLossMeters = postResults.elevationLossMeters;
    this.metrics.splits = postResults.splits;
    this.metrics.gpsQuality = postResults.gpsQuality;

    this.state = 'COMPLETED';
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');

    const activity: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: '',
      type: this.activityType,
      category: 'MOVE',
      title: `${ACTIVITY_DEFINITIONS[this.activityType]?.label || 'Outdoor'} Session`,
      started_at: startedAt,
      ended_at: endedAt,
      duration: postResults.elapsedSeconds,
      distance: postResults.authoritativeDistanceMeters,
      moving_time: postResults.movingSeconds,
      elevation_gain: postResults.elevationGainMeters,
      elevation_loss: postResults.elevationLossMeters,
      average_speed: postResults.averageSpeedMps,
      max_speed: postResults.maxSpeedMps,
      average_pace: postResults.averagePaceSecKm,
      best_pace: postResults.bestPaceSecKm,
      source: 'GPS',
      visibility: 'PRIVATE',
      gps_quality: postResults.gpsQuality,
      splits: postResults.splits,
      route: postResults.processedRoute,
      raw_route: this.rawPoints,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return activity;
  }

  async reset(): Promise<void> {
    this.stopTimer();
    this.stopSignalLossChecker();
    await this.stopLocationTracking();
    this.state = 'IDLE';
    this.rawPoints = [];
    this.processedPoints = [];
    this.recentPointsWindow = [];
    this.splits = [];
    this.smoothedSpeedMps = 0;
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');
  }

  // ==========================================
  // 2. REAL-TIME POINT PROCESSING PIPELINE
  // ==========================================

  handleNewLocation(location: Location.LocationObject) {
    if (this.state !== 'TRACKING' && this.state !== 'GPS_LOST' && this.state !== 'RECOVERING') {
      return;
    }

    const { latitude, longitude, altitude, accuracy, speed, heading } = location.coords;
    const timestamp = location.timestamp;

    // 1. Store in RAW Points
    const rawPoint: RawGPSPoint = {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed !== null && speed >= 0 ? speed : undefined,
      heading: heading ?? undefined,
      timestamp,
    };
    this.rawPoints.push(rawPoint);

    // 2. Validate Coordinate Sanity
    if (!isValidCoordinate(latitude, longitude)) {
      return;
    }

    const config = ACTIVITY_DEFINITIONS[this.activityType] || ACTIVITY_DEFINITIONS.RUN;

    // 3. Accuracy Filter (Activity Aware)
    if (accuracy !== null && accuracy !== undefined && accuracy > config.accuracyThresholdMeters) {
      this.metrics.currentAccuracyMeters = accuracy;
      this.metrics.gpsQuality = accuracy > 40 ? 'POOR' : 'FAIR';
      this.notifyMetrics();
      return;
    }

    // Recovering from Signal Loss
    if (this.state === 'GPS_LOST') {
      this.state = 'RECOVERING';
      this.notifyState();
    }
    this.lastGpsFixTimestamp = timestamp;
    this.metrics.gpsQuality = accuracy !== null && accuracy <= 12 ? 'EXCELLENT' : 'GOOD';

    // 4. Plausible Speed Check
    if (speed !== null && speed !== undefined && speed > config.maxValidSpeedMps) {
      return;
    }

    const processedPoint: RoutePoint = {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed !== null && speed >= 0 ? speed : undefined,
      timestamp,
    };

    if (this.lastValidPoint) {
      // 5. Duplicate Check
      if (this.lastValidPoint.latitude === latitude && this.lastValidPoint.longitude === longitude) {
        return;
      }

      // 6. Timestamp Ordering Check
      if (timestamp <= this.lastValidPoint.timestamp) {
        return;
      }

      // 7. Resume Re-anchoring (Prevents huge displacement leaps after pausing)
      if (this.isResuming) {
        this.isResuming = false;
        this.lastValidPoint = processedPoint;
        this.processedPoints.push(processedPoint);
        this.notifyPoint(processedPoint);
        return;
      }

      // 8. Jump Anomaly Rejection
      const stepDistance = haversineDistance(
        this.lastValidPoint.latitude,
        this.lastValidPoint.longitude,
        latitude,
        longitude
      );

      if (stepDistance > config.maxValidJumpMeters) {
        // Discard teleport glitch
        return;
      }

      const timeDeltaSec = Math.max(0.5, (timestamp - this.lastValidPoint.timestamp) / 1000);
      const computedSpeed = stepDistance / timeDeltaSec;

      if (computedSpeed > config.maxValidSpeedMps) {
        return;
      }

      // 9. Stationary Drift Rejection
      const isStationary = stepDistance < config.minMovementDeltaMeters && computedSpeed < config.minValidSpeedMps;

      if (!isStationary) {
        this.metrics.distanceMeters += stepDistance;
        this.currentSplitDistanceAccumulator += stepDistance;

        if (computedSpeed >= config.minValidSpeedMps) {
          this.metrics.movingSeconds += timeDeltaSec;
          this.currentSplitMovingSeconds += timeDeltaSec;
        }

        if (computedSpeed > this.metrics.maxSpeedMps) {
          this.metrics.maxSpeedMps = +computedSpeed.toFixed(2);
        }
      }
    }

    this.lastValidPoint = processedPoint;
    this.processedPoints.push(processedPoint);

    if (this.state === 'RECOVERING') {
      this.state = 'TRACKING';
      this.notifyState();
    }

    // 10. Live Rolling Window for Smooth Pace
    this.recentPointsWindow.push(processedPoint);
    if (this.recentPointsWindow.length > 6) {
      this.recentPointsWindow.shift();
    }

    // Exponential Moving Average for Instantaneous Speed
    const instantSpeed = speed !== null && speed !== undefined && speed >= 0 ? speed : 0;
    if (this.smoothedSpeedMps === 0) {
      this.smoothedSpeedMps = instantSpeed;
    } else {
      const alpha = 0.25;
      this.smoothedSpeedMps = alpha * instantSpeed + (1 - alpha) * this.smoothedSpeedMps;
    }

    this.metrics.pointsCount = this.processedPoints.length;
    this.metrics.currentAltitudeMeters = altitude ?? undefined;
    this.metrics.currentAccuracyMeters = accuracy ?? undefined;
    this.metrics.currentSpeedMps = Math.max(0, +this.smoothedSpeedMps.toFixed(2));

    // 11. Elevation Gain & Loss
    if (altitude !== undefined && altitude !== null) {
      this.currentSplitAltitudes.push(altitude);
    }
    const altitudes = this.processedPoints
      .map((p) => p.altitude)
      .filter((a): a is number => typeof a === 'number');
    const elev = calculateElevationProfile(altitudes);
    this.metrics.elevationGainMeters = elev.gainMeters;
    this.metrics.elevationLossMeters = elev.lossMeters;

    // 12. Pace & Average Speed
    if (this.metrics.distanceMeters > 10) {
      const activeDuration = this.metrics.movingSeconds || this.metrics.elapsedSeconds;
      this.metrics.averagePaceSecKm = calculatePace(this.metrics.distanceMeters, activeDuration);
      this.metrics.averageSpeedMps = +(this.metrics.distanceMeters / Math.max(1, activeDuration)).toFixed(2);

      if (this.recentPointsWindow.length >= 3) {
        const firstPt = this.recentPointsWindow[0];
        const lastPt = this.recentPointsWindow[this.recentPointsWindow.length - 1];
        const winDist = haversineDistance(firstPt.latitude, firstPt.longitude, lastPt.latitude, lastPt.longitude);
        const winTime = (lastPt.timestamp - firstPt.timestamp) / 1000;

        if (winDist > 5 && winTime > 1) {
          this.metrics.currentPaceSecKm = calculatePace(winDist, winTime);
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

    // 13. Live Splits Check
    if (this.currentSplitDistanceAccumulator >= config.splitDistanceMeters) {
      const splitDuration = Math.max(1, (timestamp - this.currentSplitStartTime) / 1000);
      const splitElev = calculateElevationProfile(this.currentSplitAltitudes);

      const newSplit: ActivitySplit = {
        splitNumber: this.metrics.currentSplitNumber,
        distanceMeters: Math.round(this.currentSplitDistanceAccumulator),
        durationSeconds: Math.round(splitDuration),
        movingSeconds: Math.round(this.currentSplitMovingSeconds || splitDuration),
        paceSecKm: calculatePace(this.currentSplitDistanceAccumulator, this.currentSplitMovingSeconds || splitDuration),
        speedKmh: calculateSpeedKmh(this.currentSplitDistanceAccumulator, this.currentSplitMovingSeconds || splitDuration),
        elevationGainMeters: splitElev.gainMeters,
        elevationLossMeters: splitElev.lossMeters,
      };

      this.splits.push(newSplit);
      this.metrics.splits = [...this.splits];
      this.metrics.currentSplitNumber += 1;

      this.notifySplit(newSplit);

      // Reset for next split
      this.currentSplitDistanceAccumulator = 0;
      this.currentSplitStartTime = timestamp;
      this.currentSplitMovingSeconds = 0;
      this.currentSplitAltitudes = [altitude || 0];
    }

    this.notifyPoint(processedPoint);
    this.notifyMetrics();
  }

  // ==========================================
  // 3. HARDWARE & SIGNAL LOSS DETECTION
  // ==========================================

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state === 'TRACKING' || this.state === 'GPS_LOST' || this.state === 'RECOVERING') {
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

  private startSignalLossChecker() {
    this.stopSignalLossChecker();
    this.signalLossCheckInterval = setInterval(() => {
      if (this.state === 'TRACKING') {
        const timeSinceLastFix = Date.now() - this.lastGpsFixTimestamp;
        if (timeSinceLastFix > 8000) {
          // No GPS fix for > 8 seconds -> Mark as GPS_LOST
          this.state = 'GPS_LOST';
          this.gpsLostTimestamp = Date.now();
          this.metrics.gpsQuality = 'LOST';
          this.notifyState();
          this.notifyMetrics();
        }
      }
    }, 3000);
  }

  private stopSignalLossChecker() {
    if (this.signalLossCheckInterval) {
      clearInterval(this.signalLossCheckInterval);
      this.signalLossCheckInterval = null;
    }
  }

  private async startLocationTracking() {
    if (Platform.OS === 'web') return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted for tracking');
        this.state = 'ERROR';
        this.notifyState();
        return;
      }

      const config = ACTIVITY_DEFINITIONS[this.activityType];
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

      const isTaskDefined = TaskManager.isTaskDefined(GPS_BACKGROUND_TASK_NAME);
      if (isTaskDefined) {
        await Location.startLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME, {
          accuracy,
          timeInterval: 1000,
          distanceInterval: 2,
          foregroundService: {
            notificationTitle: `LifeOS · ${config.label}`,
            notificationBody: 'Recording route and endurance metrics...',
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
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME);
        }
      } catch {}
    }
  }

  private async persistActiveSession() {
    try {
      if (this.state === 'TRACKING' || this.state === 'PAUSED' || this.state === 'GPS_LOST') {
        await AsyncStorage.setItem(
          '@lifeos_active_gps_session',
          JSON.stringify({
            state: this.state,
            activityType: this.activityType,
            startTime: this.startTime,
            pausedDuration: this.pausedDuration,
            lastPauseTimestamp: this.lastPauseTimestamp,
            metrics: this.metrics,
            rawPointsCount: this.rawPoints.length,
            processedPointsCount: this.processedPoints.length,
          })
        );
      }
    } catch {}
  }
}

export const gpsEngine = new GPSTrackingEngine();

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
