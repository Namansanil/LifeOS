import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Activity,
  ActivitySplit,
  ActivityType,
  GPSQuality,
  LocationQualityGateResult,
  MovementState,
  PredictedMapPosition,
  RawGPSPoint,
  RoutePoint,
  TrackingMetrics,
  TrackingState,
} from '@/types';
import { ACTIVITY_DEFINITIONS, ActivityMeta } from '@/constants/activity';
import {
  calculate3DDistance,
  calculateElevationProfile,
  calculateElevationProfileStrava,
  calculateGradeAdjustedDistance,
  calculateGradeAdjustedPace,
  calculateIncrementalElevation,
  calculatePace,
  calculateSpeedKmh,
  calculateSplits,
  evaluateLocationQuality,
  haversineDistance,
  isValidCoordinate,
  postProcessActivity,
  postProcessActivityAsync,
  predictDeadReckoningPosition,
} from './calculations';
import { barometerService } from './barometer';

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
  private splits: ActivitySplit[] = [];

  private startTime: number = 0;
  private pausedDuration: number = 0;
  private lastPauseTimestamp: number = 0;
  private lastValidPoint: RoutePoint | null = null;
  private isResuming: boolean = false;
  private isBarometerActive: boolean = false;

  // Signal Loss & Heartbeat
  private lastGpsFixTimestamp: number = 0;
  private gpsLostTimestamp: number = 0;
  private signalLossCheckInterval: any = null;

  // Live Velocity Pipeline & Adaptive Filter (Used for movement/stop detection)
  private smoothedSpeedMps: number = 0;
  private displaySpeedMps: number = 0;
  private movementState: MovementState = 'MOVING';
  private subThresholdTicks: number = 0;

  // Real-time GAP Accumulators (Running only)
  private liveGapDistanceMeters: number = 0;
  private currentSplitGapDistanceAccumulator: number = 0;

  // Position Prediction / Dead Reckoning (For Map Display Only)
  private lastTrustedPosition: {
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
    accuracy?: number;
    timestamp: number;
  } | null = null;

  // Live Splits Accumulator
  private currentSplitDistanceAccumulator: number = 0;
  private currentSplitStartTime: number = 0;
  private currentSplitMovingSeconds: number = 0;
  private currentSplitAltitudes: number[] = [];

  // Live O(1) Elevation Accumulator
  private recentAltitudes: number[] = [];
  private lastSmoothedAltitude: number | null = null;
  private liveElevationGain: number = 0;
  private liveElevationLoss: number = 0;

  private foregroundSubscription: Location.LocationSubscription | null = null;
  private timerInterval: any = null;
  private listeners: Set<GPSListener> = new Set();

  private metrics: TrackingMetrics = {
    distanceMeters: 0,
    elapsedSeconds: 0,
    movingSeconds: 0,
    currentSpeedMps: 0,
    authoritativeSpeedMps: 0,
    averageSpeedMps: 0,
    maxSpeedMps: 0,
    averagePaceSecKm: 0,
    bestPaceSecKm: undefined,
    averageGapSecKm: undefined,
    gapDistanceMeters: undefined,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    currentAltitudeMeters: undefined,
    currentAccuracyMeters: undefined,
    gpsQuality: 'EXCELLENT',
    movementState: 'MOVING',
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

  getMovementState(): MovementState {
    return this.movementState;
  }

  /**
   * Generates short-horizon dead reckoning position for the live map puck.
   * STRICT ISOLATION: Display-only. Never modifies authoritative route points, distance, or elevation.
   */
  getLiveMapPosition(nowTimestamp: number = Date.now()): PredictedMapPosition {
    if (!this.lastTrustedPosition) {
      return {
        latitude: 12.9716,
        longitude: 77.5946,
        isPredicted: false,
        timestamp: nowTimestamp,
      };
    }

    if (
      this.state !== 'TRACKING' ||
      this.movementState === 'STOPPED' ||
      this.displaySpeedMps < 0.2
    ) {
      return {
        latitude: this.lastTrustedPosition.latitude,
        longitude: this.lastTrustedPosition.longitude,
        heading: this.lastTrustedPosition.heading,
        accuracy: this.lastTrustedPosition.accuracy,
        isPredicted: false,
        timestamp: this.lastTrustedPosition.timestamp,
      };
    }

    const config = ACTIVITY_DEFINITIONS[this.activityType] || ACTIVITY_DEFINITIONS.RUN;
    const predicted = predictDeadReckoningPosition(
      this.lastTrustedPosition,
      this.displaySpeedMps,
      this.lastTrustedPosition.heading,
      nowTimestamp,
      config.predictionHorizonMs
    );

    return {
      ...predicted,
      accuracy: this.lastTrustedPosition.accuracy,
      timestamp: nowTimestamp,
    };
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
    if (
      this.state !== 'IDLE' &&
      this.state !== 'COMPLETED' &&
      this.state !== 'ERROR' &&
      this.state !== 'CANCELLED'
    ) {
      return false;
    }

    this.activityType = type;
    this.rawPoints = [];
    this.processedPoints = [];
    this.splits = [];
    this.startTime = 0;
    this.pausedDuration = 0;
    this.lastPauseTimestamp = 0;
    this.lastValidPoint = null;
    this.lastTrustedPosition = null;
    this.isResuming = false;

    this.smoothedSpeedMps = 0;
    this.displaySpeedMps = 0;
    this.movementState = 'MOVING';
    this.subThresholdTicks = 0;

    this.liveGapDistanceMeters = 0;
    this.currentSplitGapDistanceAccumulator = 0;

    this.recentAltitudes = [];
    this.lastSmoothedAltitude = null;
    this.liveElevationGain = 0;
    this.liveElevationLoss = 0;

    this.currentSplitDistanceAccumulator = 0;
    this.currentSplitStartTime = 0;
    this.currentSplitMovingSeconds = 0;
    this.currentSplitAltitudes = [];

    this.metrics = {
      distanceMeters: 0,
      elapsedSeconds: 0,
      movingSeconds: 0,
      currentSpeedMps: 0,
      authoritativeSpeedMps: 0,
      averageSpeedMps: 0,
      maxSpeedMps: 0,
      averagePaceSecKm: 0,
      bestPaceSecKm: undefined,
      averageGapSecKm: undefined,
      gapDistanceMeters: undefined,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      currentAltitudeMeters: undefined,
      currentAccuracyMeters: undefined,
      gpsQuality: 'EXCELLENT',
      movementState: 'MOVING',
      pointsCount: 0,
      currentSplitNumber: 1,
      splits: [],
    };

    this.state = 'PREPARING';
    this.notifyState();

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

    // Start hardware barometric sensor if available
    try {
      const isBaro = await barometerService.isAvailableAsync();
      if (isBaro) {
        await barometerService.start(0);
        this.isBarometerActive = true;
        this.metrics.elevationSource = 'BAROMETER';
        this.metrics.isElevationCorrected = true;
      } else {
        this.isBarometerActive = false;
        this.metrics.elevationSource = 'GPS_RAW';
        this.metrics.isElevationCorrected = false;
      }
    } catch {
      this.isBarometerActive = false;
    }

    this.startTimer();
    this.startSignalLossChecker();
    await this.startLocationTracking();
    return true;
  }

  async pause(): Promise<boolean> {
    if (this.state !== 'TRACKING' && this.state !== 'GPS_LOST' && this.state !== 'RECOVERING') {
      return false;
    }

    this.state = 'PAUSED';
    this.lastPauseTimestamp = Date.now();
    this.smoothedSpeedMps = 0;
    this.displaySpeedMps = 0;
    this.movementState = 'STOPPED';
    this.metrics.currentSpeedMps = 0;
    this.metrics.movementState = 'STOPPED';
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

    this.isResuming = true;
    this.movementState = 'MOVING';
    this.metrics.movementState = 'MOVING';
    this.state = 'TRACKING';
    this.notifyState();
    return true;
  }

  async cancel(): Promise<void> {
    this.stopTimer();
    this.stopSignalLossChecker();
    barometerService.stop();
    this.isBarometerActive = false;
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
    barometerService.stop();
    await this.stopLocationTracking();

    this.state = 'PROCESSING';
    this.notifyState();

    const startedAt = new Date(this.startTime || Date.now()).toISOString();
    const endedAt = new Date().toISOString();

    const postResults = await postProcessActivityAsync({
      rawPoints: this.rawPoints,
      type: this.activityType,
      startedAt,
      endedAt,
      isBarometric: this.isBarometerActive,
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
    this.metrics.elevationSource = postResults.elevationSource;
    this.metrics.isElevationCorrected = postResults.isElevationCorrected;
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
      elevation_source: postResults.elevationSource,
      elevation_corrected: postResults.isElevationCorrected,
      average_speed: postResults.averageSpeedMps,
      max_speed: postResults.maxSpeedMps,
      average_pace: postResults.averagePaceSecKm,
      best_pace: postResults.bestPaceSecKm,
      source: 'GPS',
      visibility: 'PRIVATE',
      gps_quality: postResults.gpsQuality,
      splits: postResults.splits,
      route: postResults.processedRoute,
      display_route: postResults.displayRoute,
      raw_route: this.rawPoints,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return activity;
  }

  async reset(): Promise<void> {
    this.stopTimer();
    this.stopSignalLossChecker();
    barometerService.stop();
    this.isBarometerActive = false;
    await this.stopLocationTracking();
    this.state = 'IDLE';
    this.rawPoints = [];
    this.processedPoints = [];
    this.recentAltitudes = [];
    this.lastSmoothedAltitude = null;
    this.liveElevationGain = 0;
    this.liveElevationLoss = 0;
    this.splits = [];
    this.smoothedSpeedMps = 0;
    this.displaySpeedMps = 0;
    this.movementState = 'MOVING';
    this.subThresholdTicks = 0;
    this.lastValidPoint = null;
    this.lastTrustedPosition = null;
    this.notifyState();
    await AsyncStorage.removeItem('@lifeos_active_gps_session');
  }

  // ==========================================
  // 2. REAL-TIME PIPELINE & QUALITY GATE
  // ==========================================

  handleNewLocation(location: Location.LocationObject) {
    if (
      this.state !== 'TRACKING' &&
      this.state !== 'GPS_LOST' &&
      this.state !== 'RECOVERING'
    ) {
      return;
    }

    const { latitude, longitude, altitude, accuracy, speed, heading } = location.coords;
    const speedAccuracy = (location.coords as any).speedAccuracy ?? null;
    const timestamp = location.timestamp;

    const rawPoint: RawGPSPoint = {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed !== null && speed >= 0 ? speed : undefined,
      speedAccuracy: speedAccuracy ?? undefined,
      heading: heading ?? undefined,
      timestamp,
    };
    this.rawPoints.push(rawPoint);

    const config = ACTIVITY_DEFINITIONS[this.activityType] || ACTIVITY_DEFINITIONS.RUN;

    // Multi-Criteria Location Quality Gate
    const gateResult = evaluateLocationQuality({
      rawPoint,
      lastValidPoint: this.lastValidPoint,
      config,
      systemTime: Date.now(),
    });

    if (!gateResult.accepted) {
      if (accuracy !== undefined && accuracy !== null) {
        this.metrics.currentAccuracyMeters = accuracy;
        this.metrics.gpsQuality =
          accuracy > 40 ? 'POOR' : accuracy > config.accuracyThresholdMeters ? 'FAIR' : 'DEGRADED';
        this.notifyMetrics();
      }

      // Handle stationary duplicate coordinate fix with zero speed
      if (gateResult.reason === 'Duplicate coordinate') {
        const rawSpeed = speed !== null && speed !== undefined && speed >= 0 ? speed : 0;
        if (rawSpeed === 0 || rawSpeed <= config.stopSpeedMps) {
          this.subThresholdTicks++;
          this.smoothedSpeedMps = 0;
          this.displaySpeedMps = 0;
          this.metrics.currentSpeedMps = 0;
          if (this.subThresholdTicks >= config.stopConfirmationTicks || rawSpeed === 0) {
            this.movementState = 'STOPPED';
            this.metrics.movementState = 'STOPPED';
          }
          this.notifyMetrics();
        }
      }
      return;
    }

    // Recovering from Signal Loss
    if (this.state === 'GPS_LOST') {
      this.state = 'RECOVERING';
      this.notifyState();
    }
    this.lastGpsFixTimestamp = timestamp;
    this.metrics.gpsQuality = gateResult.quality;
    // If hardware barometer is active, use high-precision barometric calibrated altitude
    let effectiveAltitude = altitude;
    if (this.isBarometerActive) {
      const baroReading = barometerService.getLastReading();
      if (baroReading && typeof baroReading.calibratedAltitudeMeters === 'number') {
        effectiveAltitude = baroReading.calibratedAltitudeMeters;
      }
    }

    const processedPoint: RoutePoint = {
      latitude,
      longitude,
      altitude: effectiveAltitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed !== null && speed >= 0 ? speed : undefined,
      heading: heading ?? undefined,
      timestamp,
    };

    let stepDistance = 0;
    let timeDeltaSec = 1;
    let computedSpeed = 0;

    if (this.lastValidPoint) {
      // Resume Re-anchoring (Prevents displacement leap after pause)
      if (this.isResuming) {
        this.isResuming = false;
        this.lastValidPoint = processedPoint;
        this.lastTrustedPosition = {
          latitude,
          longitude,
          speed: speed !== null && speed >= 0 ? speed : 0,
          heading: heading ?? undefined,
          accuracy: accuracy ?? undefined,
          timestamp,
        };
        this.processedPoints.push(processedPoint);
        this.notifyPoint(processedPoint);
        return;
      }

      const { horizontalMeters, distance3DMeters, elevationDelta } = calculate3DDistance(
        this.lastValidPoint.latitude,
        this.lastValidPoint.longitude,
        this.lastValidPoint.altitude,
        latitude,
        longitude,
        effectiveAltitude,
        config.enableSlopeCorrection
      );
      timeDeltaSec = Math.max(0.2, (timestamp - this.lastValidPoint.timestamp) / 1000);
      computedSpeed = horizontalMeters / timeDeltaSec;

      // Determine instant velocity source: prefer native reported Doppler speed when quality is good
      const hasNativeSpeed =
        speed !== null && speed !== undefined && speed >= 0 && gateResult.quality !== 'DEGRADED';
      const instantVelocity = hasNativeSpeed ? (speed as number) : computedSpeed;

      // Hysteresis Stop Detection
      const isSubThreshold =
        instantVelocity < config.stopSpeedMps && horizontalMeters < config.minMovementDeltaMeters;

      if (isSubThreshold) {
        this.subThresholdTicks++;
        if (this.subThresholdTicks >= config.stopConfirmationTicks) {
          this.movementState = 'STOPPED';
        } else {
          this.movementState = 'POSSIBLE_STOP';
        }
      } else if (
        instantVelocity >= config.resumeSpeedMps ||
        horizontalMeters >= config.minMovementDeltaMeters
      ) {
        this.subThresholdTicks = 0;
        this.movementState = 'MOVING';
      }

      // Stationary Drift Rejection
      const isStationaryDrift =
        horizontalMeters < config.minMovementDeltaMeters &&
        computedSpeed < config.minValidSpeedMps &&
        instantVelocity < config.minValidSpeedMps;

      // O(1) Incremental Distance Accumulation (Accepted genuine moving points only)
      if (this.movementState !== 'STOPPED' && !isStationaryDrift) {
        this.metrics.distanceMeters += distance3DMeters;
        this.currentSplitDistanceAccumulator += distance3DMeters;

        if (config.enableGap) {
          const segGapDist = calculateGradeAdjustedDistance(horizontalMeters, elevationDelta);
          this.liveGapDistanceMeters += segGapDist;
          this.currentSplitGapDistanceAccumulator += segGapDist;
        }

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

    // Save trusted position for live map dead reckoning interpolation
    const trustedSpeed =
      this.movementState === 'STOPPED'
        ? 0
        : speed !== null && speed >= 0
        ? speed
        : computedSpeed;
    this.lastTrustedPosition = {
      latitude,
      longitude,
      speed: trustedSpeed,
      heading: heading ?? undefined,
      accuracy: accuracy ?? undefined,
      timestamp,
    };

    if (this.state === 'RECOVERING') {
      this.state = 'TRACKING';
      this.notifyState();
    }

    // Adaptive Speed Filter (Used for movement/stop detection)
    const targetInstantSpeed =
      speed !== null && speed !== undefined && speed >= 0 ? speed : computedSpeed;

    if (this.movementState === 'STOPPED' || targetInstantSpeed < config.stopSpeedMps) {
      // Stopped state -> immediate zero response
      this.smoothedSpeedMps = 0;
      this.displaySpeedMps = 0;
    } else if (this.smoothedSpeedMps === 0) {
      this.smoothedSpeedMps = targetInstantSpeed;
      this.displaySpeedMps = targetInstantSpeed;
    } else {
      const alpha =
        gateResult.quality === 'EXCELLENT'
          ? config.adaptiveAlpha.excellent
          : gateResult.quality === 'GOOD'
          ? config.adaptiveAlpha.good
          : config.adaptiveAlpha.degraded;

      this.smoothedSpeedMps = alpha * targetInstantSpeed + (1 - alpha) * this.smoothedSpeedMps;
      this.displaySpeedMps = Math.max(0, +this.smoothedSpeedMps.toFixed(2));
    }

    this.metrics.pointsCount = this.processedPoints.length;
    this.metrics.currentAltitudeMeters = effectiveAltitude ?? undefined;
    this.metrics.currentSpeedMps = Math.max(0, +this.smoothedSpeedMps.toFixed(2));
    this.metrics.movementState = this.movementState;

    // O(1) Real-Time Incremental Elevation Accumulator
    if (effectiveAltitude !== undefined && effectiveAltitude !== null) {
      this.currentSplitAltitudes.push(effectiveAltitude);
      this.recentAltitudes.push(effectiveAltitude);
      if (this.recentAltitudes.length > 3) {
        this.recentAltitudes.shift();
      }
      const { currentSmoothed, gainDelta, lossDelta } = calculateIncrementalElevation(
        this.lastSmoothedAltitude,
        this.recentAltitudes
      );
      this.lastSmoothedAltitude = currentSmoothed;
      this.liveElevationGain += gainDelta;
      this.liveElevationLoss += lossDelta;
      this.metrics.elevationGainMeters = Math.round(this.liveElevationGain);
      this.metrics.elevationLossMeters = Math.round(this.liveElevationLoss);
    }

    // Average Pace & Average Speed from cumulative valid activity data
    const activeMovingTime = this.metrics.movingSeconds;
    // Require at least 30m of verified cumulative movement to prevent initial cold-start GPS noise
    if (this.metrics.distanceMeters >= 30 && activeMovingTime > 0) {
      this.metrics.averagePaceSecKm = calculatePace(this.metrics.distanceMeters, activeMovingTime, 30);
      this.metrics.averageSpeedMps = +(this.metrics.distanceMeters / activeMovingTime).toFixed(2);
    } else {
      this.metrics.averagePaceSecKm = 0; // Formats as '--:--'
      this.metrics.averageSpeedMps = 0;
    }
    this.metrics.authoritativeSpeedMps = this.metrics.averageSpeedMps;

    if (config.enableGap && this.liveGapDistanceMeters >= 30 && activeMovingTime > 0) {
      this.metrics.gapDistanceMeters = Math.round(this.liveGapDistanceMeters);
      this.metrics.averageGapSecKm = calculateGradeAdjustedPace(
        this.liveGapDistanceMeters,
        activeMovingTime
      );
    }

    // Live Splits Check
    if (this.currentSplitDistanceAccumulator >= config.splitDistanceMeters) {
      const splitDuration = Math.max(1, (timestamp - this.currentSplitStartTime) / 1000);
      const splitElev = calculateElevationProfileStrava(this.currentSplitAltitudes, {
        isBarometricOrDem: true,
      });

      const gapSecKm =
        config.enableGap && this.currentSplitGapDistanceAccumulator > 0
          ? calculateGradeAdjustedPace(
              this.currentSplitGapDistanceAccumulator,
              this.currentSplitMovingSeconds || splitDuration
            )
          : undefined;

      const newSplit: ActivitySplit = {
        splitNumber: this.metrics.currentSplitNumber,
        distanceMeters: Math.round(this.currentSplitDistanceAccumulator),
        durationSeconds: Math.round(splitDuration),
        movingSeconds: Math.round(this.currentSplitMovingSeconds || splitDuration),
        paceSecKm: calculatePace(
          this.currentSplitDistanceAccumulator,
          this.currentSplitMovingSeconds || splitDuration
        ),
        gapSecKm,
        speedKmh: calculateSpeedKmh(
          this.currentSplitDistanceAccumulator,
          this.currentSplitMovingSeconds || splitDuration
        ),
        elevationGainMeters: splitElev.gainMeters,
        elevationLossMeters: splitElev.lossMeters,
      };

      this.splits.push(newSplit);
      this.metrics.splits = [...this.splits];
      this.metrics.currentSplitNumber += 1;

      this.notifySplit(newSplit);

      // Reset for next split
      this.currentSplitDistanceAccumulator = 0;
      this.currentSplitGapDistanceAccumulator = 0;
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
      if (
        this.state === 'TRACKING' ||
        this.state === 'GPS_LOST' ||
        this.state === 'RECOVERING'
      ) {
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

