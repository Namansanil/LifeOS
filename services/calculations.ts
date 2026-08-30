import {
  Activity,
  ActivitySplit,
  ActivityType,
  DailyPriority,
  GPSQuality,
  Habit,
  HabitCompletion,
  LocationQualityGateResult,
  Project,
  RawGPSPoint,
  RoutePoint,
  StudySession,
  SurfSession,
  Workout,
} from '@/types';
import { ACTIVITY_DEFINITIONS, ActivityMeta } from '@/constants/activity';

// ==========================================
// 1. LIFE SCORE & READINESS (HONEST & ZERO FABRICATION)
// ==========================================

export interface DailyScoreResult {
  score: number | null;
  label: string;
  isInsufficientData: boolean;
  breakdown?: {
    prioritiesScore: number;
    habitsScore: number;
    movementScore: number;
    learningScore: number;
    totalPossible: number;
  };
}

/**
 * Calculates a deterministic, explainable Life Score (0-100) based on intentionality and balance.
 * Returns null if insufficient real data exists (never fabricates arbitrary numbers).
 * Automatically excludes disabled pillars so users are never penalized.
 */
export function calculateDailyScore(params: {
  priorities?: DailyPriority[];
  habits?: Habit[];
  habitCompletions?: HabitCompletion[];
  activities?: Activity[];
  workouts?: Workout[];
  surfSessions?: SurfSession[];
  studySessions?: StudySession[];
  projects?: Project[];
  enabledPillars?: {
    move?: boolean;
    surf?: boolean;
    learn?: boolean;
    build?: boolean;
    live?: boolean;
  };
}): DailyScoreResult {
  const {
    priorities = [],
    habits = [],
    habitCompletions = [],
    activities = [],
    workouts = [],
    surfSessions = [],
    studySessions = [],
    projects = [],
    enabledPillars = { move: true, surf: true, learn: true, build: true, live: true },
  } = params;

  // Check if any tracking was done today
  const hasAnyData =
    priorities.length > 0 ||
    habits.length > 0 ||
    activities.length > 0 ||
    workouts.length > 0 ||
    surfSessions.length > 0 ||
    studySessions.length > 0 ||
    projects.length > 0;

  if (!hasAnyData) {
    return {
      score: null,
      label: 'INSUFFICIENT DATA',
      isInsufficientData: true,
    };
  }

  let totalPoints = 0;
  let maxPossible = 0;

  // 1. LIVE Pillar: Top 3 Focus Priorities (Weight: 30 if enabled)
  let prioritiesScore = 0;
  if (enabledPillars.live !== false) {
    if (priorities.length > 0) {
      maxPossible += 30;
      const completedPriorities = priorities.filter((p) => p.completed).length;
      const priorityRatio = completedPriorities / priorities.length;
      prioritiesScore = Math.round(priorityRatio * 30);
      totalPoints += prioritiesScore;
    }
  }

  // 2. LIVE Pillar: Daily Habits Consistency (Weight: 25 if enabled)
  let habitsScore = 0;
  if (enabledPillars.live !== false) {
    const activeHabits = habits.filter((h) => h.active);
    if (activeHabits.length > 0) {
      maxPossible += 25;
      const completedCount = habitCompletions.filter((c) => c.completed).length;
      const habitRatio = Math.min(1, completedCount / activeHabits.length);
      habitsScore = Math.round(habitRatio * 25);
      totalPoints += habitsScore;
    }
  }

  // 3. MOVE & SURF Pillars: Physical Activity (Weight: 25 if enabled)
  let movementScore = 0;
  const isMoveEnabled = enabledPillars.move !== false;
  const isSurfEnabled = enabledPillars.surf !== false;

  if (isMoveEnabled || isSurfEnabled) {
    maxPossible += 25;
    const hasGpsActivity = activities.some((a) => a.duration >= 600); // 10+ mins
    const hasWorkout = workouts.length > 0;
    const hasSurf = surfSessions.length > 0;

    if ((isMoveEnabled && (hasGpsActivity || hasWorkout)) || (isSurfEnabled && hasSurf)) {
      movementScore = 25;
      totalPoints += 25;
    } else if (activities.length > 0) {
      movementScore = 15;
      totalPoints += 15;
    } else {
      // Rest or recovery
      movementScore = 5;
      totalPoints += 5;
    }
  }

  // 4. LEARN & BUILD Pillars (Weight: 20 if enabled)
  let learningScore = 0;
  const isLearnEnabled = enabledPillars.learn !== false;
  const isBuildEnabled = enabledPillars.build !== false;

  if (isLearnEnabled || isBuildEnabled) {
    maxPossible += 20;
    const totalStudyMinutes = studySessions.reduce(
      (acc, s) => acc + (s.duration || 0) / 60,
      0
    );
    const totalProjectTasksDone = projects.reduce(
      (acc, p) => acc + (p.tasks || []).filter((t) => t.status === 'DONE').length,
      0
    );

    if (
      (isLearnEnabled && totalStudyMinutes >= 45) ||
      (isBuildEnabled && totalProjectTasksDone >= 2)
    ) {
      learningScore = 20;
      totalPoints += 20;
    } else if (totalStudyMinutes > 0 || totalProjectTasksDone > 0) {
      learningScore = 14;
      totalPoints += 14;
    } else {
      learningScore = 5;
      totalPoints += 5;
    }
  }

  if (maxPossible === 0) {
    return {
      score: null,
      label: 'INSUFFICIENT DATA',
      isInsufficientData: true,
    };
  }

  const normalizedScore = Math.min(
    100,
    Math.max(0, Math.round((totalPoints / maxPossible) * 100))
  );

  let label = 'STEADY';
  if (normalizedScore >= 90) label = 'EXCELLENT';
  else if (normalizedScore >= 75) label = 'STRONG';
  else if (normalizedScore >= 60) label = 'BALANCED';
  else if (normalizedScore >= 40) label = 'STEADY';
  else label = 'REST DAY';

  return {
    score: normalizedScore,
    label,
    isInsufficientData: false,
    breakdown: {
      prioritiesScore,
      habitsScore,
      movementScore,
      learningScore,
      totalPossible: maxPossible,
    },
  };
}

export interface ReadinessResult {
  score: number | null;
  label: string;
  description: string;
  isInsufficientData: boolean;
}

/**
 * Calculates LifeOS Readiness (0-100%) from behavioral signals (load, rest, routine stability).
 * Never claims medical diagnosis. Returns isInsufficientData if no history exists.
 */
export function calculateReadiness(params: {
  recentDaysActivitiesCount?: number;
  recentTrainingLoadMinutes?: number;
  habitConsistencyPercent?: number;
  restDaysInPastWeek?: number;
  sleepHours?: number;
  hasHistoricalData?: boolean;
}): ReadinessResult {
  const {
    recentDaysActivitiesCount = 0,
    recentTrainingLoadMinutes = 0,
    habitConsistencyPercent = 0,
    restDaysInPastWeek = 0,
    sleepHours = undefined,
    hasHistoricalData = false,
  } = params;

  if (!hasHistoricalData && recentTrainingLoadMinutes === 0 && habitConsistencyPercent === 0) {
    return {
      score: null,
      label: 'INSUFFICIENT DATA',
      description: 'Track activities, workouts, and routines to calculate behavioral readiness.',
      isInsufficientData: true,
    };
  }

  let score = 70; // Baseline capacity

  // Sleep adjustment (if logged)
  if (typeof sleepHours === 'number') {
    if (sleepHours >= 8) score += 10;
    else if (sleepHours >= 7) score += 5;
    else if (sleepHours < 6) score -= 15;
  }

  // Training load balance
  if (recentTrainingLoadMinutes > 360 && restDaysInPastWeek === 0) {
    score -= 15;
  } else if (recentDaysActivitiesCount >= 2 && restDaysInPastWeek >= 1) {
    score += 10;
  }

  // Routine stability
  if (habitConsistencyPercent >= 80) score += 10;
  else if (habitConsistencyPercent < 50 && habitConsistencyPercent > 0) score -= 10;

  score = Math.min(98, Math.max(35, Math.round(score)));

  let label = 'RECOVERED';
  let description = 'Behavioral signals indicate balanced recovery and optimal capacity.';

  if (score >= 85) {
    label = 'OPTIMAL';
    description = 'High recovery balance. Great capacity for demanding training or deep work.';
  } else if (score >= 70) {
    label = 'RECOVERED';
    description = 'Consistent routine and healthy balance. Ready for scheduled activities.';
  } else if (score >= 50) {
    label = 'MODERATE';
    description = 'Moderate load accumulation. Consider balanced effort or active recovery.';
  } else {
    label = 'FATIGUED';
    description = 'High accumulated load. Focus on hydration, mobility, and rest.';
  }

  return { score, label, description, isInsufficientData: false };
}

/**
 * Calculates consecutive active streak days.
 */
export function calculateStreak(activeDates: string[]): number {
  if (!activeDates || activeDates.length === 0) return 0;

  const uniqueSortedDates = Array.from(new Set(activeDates)).sort().reverse();
  const today = new Date().toISOString().split('T')[0];

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const first = uniqueSortedDates[0];
  if (first !== today && first !== yesterday) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(first);

  for (const dateStr of uniqueSortedDates) {
    const expected = currentDate.toISOString().split('T')[0];
    if (dateStr === expected) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ==========================================
// 2. GPS, GEOMETRY & ATHLETIC ENGINE
// ==========================================

const EARTH_RADIUS_METERS = 6371000;

/**
 * Haversine formula to compute great-circle distance between two coordinates in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return 0;
  }
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

/**
 * Predicts short-horizon map position using dead reckoning.
 * STRICT ISOLATION: Used exclusively for live map puck interpolation, never for recorded activity metrics.
 */
export function predictDeadReckoningPosition(
  lastPoint: { latitude: number; longitude: number; timestamp: number } | null,
  speedMps: number,
  headingDeg: number | undefined | null,
  nowTimestamp: number,
  maxHorizonMs: number = 2500
): { latitude: number; longitude: number; heading?: number; isPredicted: boolean } {
  if (!lastPoint || !isValidCoordinate(lastPoint.latitude, lastPoint.longitude)) {
    return { latitude: 0, longitude: 0, isPredicted: false };
  }

  const elapsedMs = Math.max(0, nowTimestamp - lastPoint.timestamp);
  if (
    elapsedMs === 0 ||
    elapsedMs > maxHorizonMs ||
    speedMps < 0.2 ||
    headingDeg === null ||
    headingDeg === undefined ||
    isNaN(headingDeg)
  ) {
    return {
      latitude: lastPoint.latitude,
      longitude: lastPoint.longitude,
      heading: headingDeg ?? undefined,
      isPredicted: false,
    };
  }

  const elapsedSec = elapsedMs / 1000;
  const distanceMeters = speedMps * elapsedSec;
  const angularDist = distanceMeters / EARTH_RADIUS_METERS;
  const headingRad = (headingDeg * Math.PI) / 180;
  const lat1Rad = (lastPoint.latitude * Math.PI) / 180;
  const lon1Rad = (lastPoint.longitude * Math.PI) / 180;

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDist) +
      Math.cos(lat1Rad) * Math.sin(angularDist) * Math.cos(headingRad)
  );

  const lon2Rad =
    lon1Rad +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(angularDist) * Math.cos(lat1Rad),
      Math.cos(angularDist) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  const lat2Deg = (lat2Rad * 180) / Math.PI;
  const lon2Deg = (lon2Rad * 180) / Math.PI;

  if (!isValidCoordinate(lat2Deg, lon2Deg)) {
    return {
      latitude: lastPoint.latitude,
      longitude: lastPoint.longitude,
      heading: headingDeg,
      isPredicted: false,
    };
  }

  return {
    latitude: lat2Deg,
    longitude: lon2Deg,
    heading: headingDeg,
    isPredicted: true,
  };
}

/**
 * Multi-criteria Location Quality Gate.
 * Evaluates timestamp age, monotonicity, accuracy, acceleration, and coordinate sanity.
 */
export function evaluateLocationQuality(params: {
  rawPoint: RawGPSPoint;
  lastValidPoint: RoutePoint | null;
  config: ActivityMeta;
  systemTime?: number;
}): LocationQualityGateResult {
  const { rawPoint, lastValidPoint, config, systemTime = Date.now() } = params;
  const { latitude, longitude, accuracy, speed, timestamp } = rawPoint;

  // 1. Basic Coordinate Sanity
  if (!isValidCoordinate(latitude, longitude)) {
    return { accepted: false, quality: 'INVALID', reason: 'Invalid coordinate values' };
  }

  // 2. Timestamp Stale / Future Check (for standard Unix epoch timestamps)
  if (timestamp > 1000000000000) {
    const ageMs = systemTime - timestamp;
    if (ageMs > 15000) {
      return { accepted: false, quality: 'INVALID', reason: 'Stale cached location fix (>15s old)' };
    }
    if (ageMs < -5000) {
      return { accepted: false, quality: 'INVALID', reason: 'Future timestamp anomaly' };
    }
  }

  // 3. Accuracy Gate
  if (accuracy !== null && accuracy !== undefined) {
    if (accuracy <= 0 || accuracy > config.degradedAccuracyMeters) {
      return { accepted: false, quality: 'INVALID', reason: `Accuracy ${accuracy}m exceeds degraded threshold` };
    }
  }

  // 4. Native Speed Threshold Check
  if (speed !== null && speed !== undefined && speed > config.maxValidSpeedMps) {
    return { accepted: false, quality: 'INVALID', reason: `Speed ${speed}m/s exceeds max activity speed` };
  }

  // Initial fix classification
  if (!lastValidPoint) {
    const quality: GPSQuality =
      accuracy !== null && accuracy !== undefined && accuracy <= 10
        ? 'EXCELLENT'
        : accuracy && accuracy <= config.accuracyThresholdMeters
        ? 'GOOD'
        : 'DEGRADED';
    return { accepted: true, quality };
  }

  // 5. Duplicate Check
  if (lastValidPoint.latitude === latitude && lastValidPoint.longitude === longitude) {
    return { accepted: false, quality: 'GOOD', reason: 'Duplicate coordinate' };
  }

  // 6. Monotonic Timestamp Ordering
  if (timestamp <= lastValidPoint.timestamp) {
    return { accepted: false, quality: 'INVALID', reason: 'Out-of-order timestamp' };
  }

  const stepDist = haversineDistance(
    lastValidPoint.latitude,
    lastValidPoint.longitude,
    latitude,
    longitude
  );

  // 7. Impossible Teleport Jump
  if (stepDist > config.maxValidJumpMeters) {
    return { accepted: false, quality: 'INVALID', reason: `Jump distance ${stepDist.toFixed(1)}m exceeds max jump` };
  }

  const timeDeltaSec = Math.max(0.2, (timestamp - lastValidPoint.timestamp) / 1000);
  const computedSpeed = stepDist / timeDeltaSec;

  if (computedSpeed > config.maxValidSpeedMps) {
    return { accepted: false, quality: 'INVALID', reason: `Computed speed ${computedSpeed.toFixed(1)}m/s exceeds max` };
  }

  // 8. Plausible Acceleration Check
  if (lastValidPoint.speed !== undefined && lastValidPoint.speed !== null && computedSpeed > lastValidPoint.speed) {
    const accel = (computedSpeed - lastValidPoint.speed) / timeDeltaSec;
    if (accel > config.maxAccelerationMps2 && stepDist > 5) {
      return { accepted: false, quality: 'INVALID', reason: `Acceleration ${accel.toFixed(1)}m/s² exceeds threshold` };
    }
  }

  // Quality Classification
  let quality: GPSQuality = 'GOOD';
  if (accuracy !== null && accuracy !== undefined) {
    if (accuracy <= 10 && (!rawPoint.speedAccuracy || rawPoint.speedAccuracy <= 1.5)) {
      quality = 'EXCELLENT';
    } else if (accuracy <= config.accuracyThresholdMeters) {
      quality = 'GOOD';
    } else {
      quality = 'DEGRADED';
    }
  }

  return { accepted: true, quality };
}

/**
 * Calculates average running/walking pace in seconds per kilometer strictly from cumulative moving data.
 * Requires at least 30m of verified displacement to eliminate initial GPS cold-start jitter.
 * averagePaceSecondsPerKm = totalMovingTimeSeconds / (totalMovingDistanceMeters / 1000)
 */
export function calculatePace(
  distanceMeters: number,
  movingTimeSeconds: number,
  minDistanceMeters: number = 30
): number {
  if (
    !distanceMeters ||
    distanceMeters < minDistanceMeters ||
    !movingTimeSeconds ||
    movingTimeSeconds <= 0
  ) {
    return 0;
  }
  const distanceKm = distanceMeters / 1000;
  return Math.round(movingTimeSeconds / distanceKm);
}

export function calculateSpeedKmh(distanceMeters: number, durationSeconds: number): number {
  if (!distanceMeters || distanceMeters <= 0 || !durationSeconds || durationSeconds <= 0) return 0;
  const speedMps = distanceMeters / durationSeconds;
  return +(speedMps * 3.6).toFixed(1);
}

export function formatPace(paceSecKm: number): string {
  if (!paceSecKm || paceSecKm <= 0 || !isFinite(paceSecKm) || paceSecKm > 3600) {
    return '--:--';
  }
  const minutes = Math.floor(paceSecKm / 60);
  const seconds = Math.floor(paceSecKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0 || isNaN(totalSeconds)) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Minetti et al. (2002) energy cost of locomotion polynomial for running on gradients.
 * C(i) = 155.4*i^5 - 30.4*i^4 - 43.3*i^3 + 46.3*i^2 + 19.5*i + 3.6  [J/(kg*m)]
 * Returns relative cost factor F_gap(i) = C(i) / 3.6 (flat cost = 3.6)
 */
export function calculateMinettiGapFactor(gradeDecimal: number): number {
  if (!isFinite(gradeDecimal) || isNaN(gradeDecimal)) return 1.0;
  // Clamp grade to [-0.45, 0.45] (+/- 45%) to prevent noise explosion
  const i = Math.max(-0.45, Math.min(0.45, gradeDecimal));

  const i2 = i * i;
  const i3 = i2 * i;
  const i4 = i3 * i;
  const i5 = i4 * i;

  const cost =
    155.4 * i5 -
    30.4 * i4 -
    43.3 * i3 +
    46.3 * i2 +
    19.5 * i +
    3.6;

  // Relative factor compared to flat cost (3.6 J/kg*m)
  const factor = cost / 3.6;
  return Math.max(0.1, factor);
}

/**
 * Calculates grade-adjusted distance (GAP distance) for a segment.
 * d_gap = horizontalDistance * MinettiFactor(elevationDelta / horizontalDistance)
 */
export function calculateGradeAdjustedDistance(
  horizontalMeters: number,
  elevationDeltaMeters: number
): number {
  if (horizontalMeters <= 0.1 || !isFinite(horizontalMeters)) return 0;
  const grade = (elevationDeltaMeters || 0) / horizontalMeters;
  const factor = calculateMinettiGapFactor(grade);
  return horizontalMeters * factor;
}

/**
 * Calculates Grade Adjusted Pace (GAP) in seconds per kilometer.
 */
export function calculateGradeAdjustedPace(
  gapDistanceMeters: number,
  movingSeconds: number
): number {
  if (gapDistanceMeters <= 5 || movingSeconds <= 0 || !isFinite(gapDistanceMeters)) return 0;
  const gapKm = gapDistanceMeters / 1000;
  return Math.round(movingSeconds / gapKm);
}

/**
 * Calculates 3D distance with optional slope correction.
 * distance_3d = sqrt(horizontal^2 + delta_altitude^2)
 */
export function calculate3DDistance(
  lat1: number,
  lon1: number,
  alt1: number | undefined | null,
  lat2: number,
  lon2: number,
  alt2: number | undefined | null,
  enableSlopeCorrection: boolean = false
): {
  horizontalMeters: number;
  distance3DMeters: number;
  elevationDelta: number;
} {
  const horizontalMeters = haversineDistance(lat1, lon1, lat2, lon2);
  let elevationDelta = 0;

  if (
    enableSlopeCorrection &&
    alt1 !== undefined &&
    alt1 !== null &&
    alt2 !== undefined &&
    alt2 !== null &&
    isFinite(alt1) &&
    isFinite(alt2)
  ) {
    elevationDelta = alt2 - alt1;
    // Reject physically impossible single-step elevation delta (> 1000m)
    if (Math.abs(elevationDelta) < 1000) {
      const distance3DMeters = Math.sqrt(
        horizontalMeters * horizontalMeters + elevationDelta * elevationDelta
      );
      return { horizontalMeters, distance3DMeters, elevationDelta };
    }
  }

  return {
    horizontalMeters,
    distance3DMeters: horizontalMeters,
    elevationDelta,
  };
}

/**
 * Strava-Grade Elevation Gain & Loss calculation with low-pass pre-smoothing
 * and hysteresis turning-point thresholding (2.0m for barometric/DEM, 10.0m for raw GPS).
 */
export function calculateElevationProfileStrava(
  altitudes: number[],
  options?: {
    isBarometricOrDem?: boolean;
    customThresholdMeters?: number;
    smoothingWindow?: number;
  }
): {
  gainMeters: number;
  lossMeters: number;
  smoothedAltitudes: number[];
} {
  const validAltitudes = (altitudes || []).filter(
    (a) => typeof a === 'number' && !isNaN(a) && isFinite(a)
  );

  if (validAltitudes.length < 2) {
    return { gainMeters: 0, lossMeters: 0, smoothedAltitudes: validAltitudes };
  }

  // 1. Low-pass filter with endpoint preservation to prevent baseline compression
  const smoothed: number[] = [];
  if (validAltitudes.length <= 2) {
    smoothed.push(...validAltitudes);
  } else {
    smoothed.push(validAltitudes[0]);
    for (let i = 1; i < validAltitudes.length - 1; i++) {
      const avg =
        0.25 * validAltitudes[i - 1] +
        0.5 * validAltitudes[i] +
        0.25 * validAltitudes[i + 1];
      smoothed.push(avg);
    }
    smoothed.push(validAltitudes[validAltitudes.length - 1]);
  }

  // 2. Hysteresis Threshold (2.0m for barometric/DEM, 10.0m for raw GPS)
  const threshold =
    options?.customThresholdMeters ?? (options?.isBarometricOrDem ? 2.0 : 10.0);

  let gain = 0;
  let loss = 0;

  let minAlt = smoothed[0];
  let maxAlt = smoothed[0];
  let currentTrend: 'UP' | 'DOWN' | 'NONE' = 'NONE';

  for (let i = 1; i < smoothed.length; i++) {
    const curr = smoothed[i];

    if (currentTrend === 'NONE') {
      if (curr - minAlt >= threshold) {
        currentTrend = 'UP';
        gain += curr - minAlt;
        maxAlt = curr;
      } else if (maxAlt - curr >= threshold) {
        currentTrend = 'DOWN';
        loss += maxAlt - curr;
        minAlt = curr;
      } else {
        if (curr < minAlt) minAlt = curr;
        if (curr > maxAlt) maxAlt = curr;
      }
    } else if (currentTrend === 'UP') {
      if (curr > maxAlt) {
        gain += curr - maxAlt;
        maxAlt = curr;
      } else if (maxAlt - curr >= threshold) {
        currentTrend = 'DOWN';
        loss += maxAlt - curr;
        minAlt = curr;
      }
    } else if (currentTrend === 'DOWN') {
      if (curr < minAlt) {
        loss += minAlt - curr;
        minAlt = curr;
      } else if (curr - minAlt >= threshold) {
        currentTrend = 'UP';
        gain += curr - minAlt;
        maxAlt = curr;
      }
    }
  }

  return {
    gainMeters: Math.round(gain),
    lossMeters: Math.round(loss),
    smoothedAltitudes: smoothed,
  };
}

/**
 * Standard elevation profile wrapper for backward compatibility.
 */
export function calculateElevationProfile(altitudes: number[]): {
  gainMeters: number;
  lossMeters: number;
} {
  const result = calculateElevationProfileStrava(altitudes, { isBarometricOrDem: true });
  return {
    gainMeters: result.gainMeters,
    lossMeters: result.lossMeters,
  };
}

/**
 * Computes incremental elevation gain and loss for real-time tracking in O(1) time.
 */
export function calculateIncrementalElevation(
  prevSmoothed: number | null,
  recentAltitudes: number[]
): {
  currentSmoothed: number;
  gainDelta: number;
  lossDelta: number;
} {
  if (!recentAltitudes || recentAltitudes.length === 0) {
    return { currentSmoothed: 0, gainDelta: 0, lossDelta: 0 };
  }
  const currentSmoothed =
    recentAltitudes.reduce((a, b) => a + b, 0) / recentAltitudes.length;

  if (prevSmoothed === null) {
    return { currentSmoothed, gainDelta: 0, lossDelta: 0 };
  }

  const diff = currentSmoothed - prevSmoothed;
  let gainDelta = 0;
  let lossDelta = 0;

  // 2.0m vertical noise deadband to reject GPS jitter, discard impossible jumps (>60m/s)
  if (diff >= 2.0 && diff < 60) {
    gainDelta = diff;
  } else if (diff <= -2.0 && diff > -60) {
    lossDelta = Math.abs(diff);
  }

  return { currentSmoothed, gainDelta, lossDelta };
}

export function calculateElevationGain(altitudes: number[]): number {
  return calculateElevationProfile(altitudes).gainMeters;
}

/**
 * Calculates distance-based splits with linear interpolation across boundary crossings.
 * Accurately interpolates split timestamps, coordinates, altitudes, and computes GAP for running.
 */
export function calculateSplits(
  points: RoutePoint[],
  splitTargetMeters = 1000,
  options?: {
    isRunning?: boolean;
    enableSlopeCorrection?: boolean;
    isBarometricOrDem?: boolean;
  }
): ActivitySplit[] {
  if (!points || points.length < 2 || splitTargetMeters <= 0) {
    return [];
  }

  const isRunning = options?.isRunning ?? false;
  const enableSlopeCorrection = options?.enableSlopeCorrection ?? false;
  const isBarometricOrDem = options?.isBarometricOrDem ?? true;

  const splits: ActivitySplit[] = [];
  let currentSplitIndex = 1;
  let splitStartDistance = 0;
  let splitStartTime = points[0].timestamp;
  let splitMovingSeconds = 0;
  let splitGapDistanceAccumulator = 0;
  let splitAltitudes: number[] = [points[0].altitude || 0];

  let cumulativeDistance = 0;
  let nextSplitBoundary = splitTargetMeters;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const { distance3DMeters, horizontalMeters, elevationDelta } = calculate3DDistance(
      p1.latitude,
      p1.longitude,
      p1.altitude,
      p2.latitude,
      p2.longitude,
      p2.altitude,
      enableSlopeCorrection
    );

    const timeDeltaSec = Math.max(0.2, (p2.timestamp - p1.timestamp) / 1000);
    const speed = p2.speed !== undefined && p2.speed !== null ? p2.speed : horizontalMeters / timeDeltaSec;

    if (speed >= 0.5) {
      splitMovingSeconds += timeDeltaSec;
    }

    if (isRunning) {
      const segGapDist = calculateGradeAdjustedDistance(horizontalMeters, elevationDelta);
      splitGapDistanceAccumulator += segGapDist;
    }

    if (p2.altitude !== undefined && p2.altitude !== null) {
      splitAltitudes.push(p2.altitude);
    }

    const prevCumDist = cumulativeDistance;
    cumulativeDistance += distance3DMeters;

    // Check if this segment crosses one or more split boundaries
    while (cumulativeDistance >= nextSplitBoundary) {
      // Fraction of segment at which crossing occurs
      const distIntoSegment = nextSplitBoundary - prevCumDist;
      const segmentTotalDist = distance3DMeters > 0 ? distance3DMeters : 1;
      const fraction = Math.max(0, Math.min(1, distIntoSegment / segmentTotalDist));

      // Linearly interpolate timestamp at crossing
      const crossingTime = p1.timestamp + fraction * (p2.timestamp - p1.timestamp);
      const splitDuration = Math.max(1, (crossingTime - splitStartTime) / 1000);
      const splitDistance = nextSplitBoundary - splitStartDistance;

      const elev = calculateElevationProfileStrava(splitAltitudes, {
        isBarometricOrDem,
      });

      const paceSecKm = calculatePace(splitDistance, splitMovingSeconds || splitDuration);
      const speedKmh = calculateSpeedKmh(splitDistance, splitMovingSeconds || splitDuration);
      const gapSecKm = isRunning
        ? calculateGradeAdjustedPace(splitGapDistanceAccumulator, splitMovingSeconds || splitDuration)
        : undefined;

      splits.push({
        splitNumber: currentSplitIndex,
        distanceMeters: Math.round(splitDistance),
        durationSeconds: Math.round(splitDuration),
        movingSeconds: Math.round(splitMovingSeconds || splitDuration),
        paceSecKm,
        gapSecKm: gapSecKm && gapSecKm > 0 ? gapSecKm : undefined,
        speedKmh,
        elevationGainMeters: elev.gainMeters,
        elevationLossMeters: elev.lossMeters,
      });

      // Prepare for next split
      currentSplitIndex++;
      splitStartDistance = nextSplitBoundary;
      splitStartTime = crossingTime;
      splitMovingSeconds = 0;
      splitGapDistanceAccumulator = 0;
      splitAltitudes = [p2.altitude || 0];
      nextSplitBoundary += splitTargetMeters;
    }
  }

  // Handle final partial split if remaining distance >= 100m
  const remainingDist = cumulativeDistance - splitStartDistance;
  if (remainingDist >= 100) {
    const lastPoint = points[points.length - 1];
    const partialDuration = Math.max(1, (lastPoint.timestamp - splitStartTime) / 1000);
    const elev = calculateElevationProfileStrava(splitAltitudes, {
      isBarometricOrDem,
    });

    const paceSecKm = calculatePace(remainingDist, splitMovingSeconds || partialDuration);
    const speedKmh = calculateSpeedKmh(remainingDist, splitMovingSeconds || partialDuration);
    const gapSecKm = isRunning
      ? calculateGradeAdjustedPace(splitGapDistanceAccumulator, splitMovingSeconds || partialDuration)
      : undefined;

    splits.push({
      splitNumber: currentSplitIndex,
      distanceMeters: Math.round(remainingDist),
      durationSeconds: Math.round(partialDuration),
      movingSeconds: Math.round(splitMovingSeconds || partialDuration),
      paceSecKm,
      gapSecKm: gapSecKm && gapSecKm > 0 ? gapSecKm : undefined,
      speedKmh,
      elevationGainMeters: elev.gainMeters,
      elevationLossMeters: elev.lossMeters,
    });
  }

  return splits;
}

/**
 * Authoritative Post-Activity Processing.
 * Validates, filters drift, computes true distance, moving time, splits, and simplified polyline.
 */
export function postProcessActivity(params: {
  rawPoints: RawGPSPoint[];
  type: ActivityType;
  startedAt: string;
  endedAt?: string;
  isBarometric?: boolean;
  correctedAltitudes?: number[];
}): {
  authoritativeDistanceMeters: number;
  elapsedSeconds: number;
  movingSeconds: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  averagePaceSecKm: number;
  bestPaceSecKm: number;
  averageGapSecKm?: number;
  gapDistanceMeters?: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  elevationSource: 'BAROMETER' | 'DEM' | 'GPS_RAW';
  isElevationCorrected: boolean;
  splits: ActivitySplit[];
  processedRoute: RoutePoint[];
  displayRoute: RoutePoint[];
  gpsQuality: GPSQuality;
} {
  const {
    rawPoints = [],
    type,
    startedAt,
    endedAt,
    isBarometric = false,
    correctedAltitudes,
  } = params;
  const config = ACTIVITY_DEFINITIONS[type] || ACTIVITY_DEFINITIONS.RUN;

  const validPoints: RoutePoint[] = [];
  let totalDistance = 0;
  let movingTime = 0;
  let maxSpeed = 0;
  let poorAccuracyCount = 0;

  // Determine authoritative elevation source
  const isDemCorrected = Array.isArray(correctedAltitudes) && correctedAltitudes.length > 0;
  const isBarometricOrDem = isBarometric || isDemCorrected;
  const elevationSource: 'BAROMETER' | 'DEM' | 'GPS_RAW' = isBarometric
    ? 'BAROMETER'
    : isDemCorrected
    ? 'DEM'
    : 'GPS_RAW';

  // 1. Validation & Drift Filtering Pass
  for (let i = 0; i < rawPoints.length; i++) {
    const raw = rawPoints[i];

    if (!isValidCoordinate(raw.latitude, raw.longitude)) continue;

    // Filter accuracy
    if (raw.accuracy !== null && raw.accuracy !== undefined && raw.accuracy > config.accuracyThresholdMeters) {
      poorAccuracyCount++;
      continue;
    }

    const altitude = isDemCorrected && correctedAltitudes[validPoints.length] !== undefined
      ? correctedAltitudes[validPoints.length]
      : raw.altitude ?? null;

    const currentPt: RoutePoint = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      altitude,
      accuracy: raw.accuracy ?? null,
      speed: raw.speed ?? null,
      timestamp: raw.timestamp,
    };

    if (validPoints.length > 0) {
      const prevPt = validPoints[validPoints.length - 1];

      // Duplicate check
      if (prevPt.latitude === currentPt.latitude && prevPt.longitude === currentPt.longitude) {
        continue;
      }

      // Timestamp ordering
      if (currentPt.timestamp <= prevPt.timestamp) {
        continue;
      }

      const { horizontalMeters, distance3DMeters } = calculate3DDistance(
        prevPt.latitude,
        prevPt.longitude,
        prevPt.altitude,
        currentPt.latitude,
        currentPt.longitude,
        currentPt.altitude,
        config.enableSlopeCorrection
      );

      // Jump anomaly check
      if (horizontalMeters > config.maxValidJumpMeters) {
        continue;
      }

      const timeDeltaSec = (currentPt.timestamp - prevPt.timestamp) / 1000;
      const speedMps = horizontalMeters / timeDeltaSec;

      if (speedMps > config.maxValidSpeedMps) {
        continue;
      }

      // Stationary drift rejection
      const isStationary = horizontalMeters < config.minMovementDeltaMeters && speedMps < config.minValidSpeedMps;

      if (!isStationary) {
        totalDistance += distance3DMeters;
        if (speedMps >= config.minValidSpeedMps) {
          movingTime += timeDeltaSec;
        }
        if (speedMps > maxSpeed) {
          maxSpeed = speedMps;
        }
      }
    }

    validPoints.push(currentPt);
  }

  // If DEM elevations were provided after validation, map them directly onto validPoints
  if (isDemCorrected && correctedAltitudes.length === validPoints.length) {
    for (let k = 0; k < validPoints.length; k++) {
      validPoints[k].altitude = correctedAltitudes[k];
    }
  }

  // 2. Duration Calculation
  const startTs = new Date(startedAt).getTime();
  const endTs = endedAt ? new Date(endedAt).getTime() : Date.now();
  const elapsedSeconds = Math.max(1, Math.round((endTs - startTs) / 1000));
  const finalMovingSeconds = Math.min(elapsedSeconds, Math.max(0, Math.round(movingTime)));

  // 3. Strava-Grade Elevation (2m threshold for barometric/DEM, 10m for raw GPS)
  const altitudes = validPoints
    .map((p) => p.altitude)
    .filter((a): a is number => typeof a === 'number');
  const elev = calculateElevationProfileStrava(altitudes, {
    isBarometricOrDem,
  });

  // 4. Pace & Speed
  const avgPace = calculatePace(totalDistance, finalMovingSeconds || elapsedSeconds);
  const avgSpeed = +(totalDistance / Math.max(1, finalMovingSeconds || elapsedSeconds)).toFixed(2);

  // 5. Splits with exact boundary interpolation & GAP
  const splits = calculateSplits(validPoints, config.splitDistanceMeters, {
    isRunning: config.enableGap,
    enableSlopeCorrection: config.enableSlopeCorrection,
    isBarometricOrDem,
  });

  // 6. Grade Adjusted Pace (Running Only)
  let averageGapSecKm: number | undefined = undefined;
  let gapDistanceMeters: number | undefined = undefined;

  if (config.enableGap && validPoints.length >= 2) {
    let totalGapDist = 0;
    for (let i = 1; i < validPoints.length; i++) {
      const p1 = validPoints[i - 1];
      const p2 = validPoints[i];
      const hDist = haversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      const eDelta = (p2.altitude || 0) - (p1.altitude || 0);
      totalGapDist += calculateGradeAdjustedDistance(hDist, eDelta);
    }
    gapDistanceMeters = Math.round(totalGapDist);
    averageGapSecKm = calculateGradeAdjustedPace(totalGapDist, finalMovingSeconds || elapsedSeconds);
  }

  // 7. Best Pace (fastest split)
  let bestPace = avgPace;
  if (splits.length > 0) {
    const validSplits = splits.filter((s) => s.distanceMeters >= 500 && s.paceSecKm > 0);
    if (validSplits.length > 0) {
      bestPace = Math.min(...validSplits.map((s) => s.paceSecKm));
    }
  }

  // 8. Route Simplification for 60fps Rendering (Display only - never alters metrics)
  const simplifiedRoute = douglasPeucker(validPoints, 0.00003);

  // 9. GPS Quality Assessment
  let gpsQuality: GPSQuality = 'EXCELLENT';
  if (validPoints.length === 0) {
    gpsQuality = 'LOST';
  } else {
    const poorRatio = poorAccuracyCount / (rawPoints.length || 1);
    if (poorRatio > 0.4) gpsQuality = 'POOR';
    else if (poorRatio > 0.2) gpsQuality = 'FAIR';
    else if (poorRatio > 0.05) gpsQuality = 'GOOD';
  }

  return {
    authoritativeDistanceMeters: Math.round(totalDistance),
    elapsedSeconds,
    movingSeconds: finalMovingSeconds,
    averageSpeedMps: avgSpeed,
    maxSpeedMps: +maxSpeed.toFixed(2),
    averagePaceSecKm: avgPace,
    bestPaceSecKm: bestPace,
    averageGapSecKm,
    gapDistanceMeters,
    elevationGainMeters: elev.gainMeters,
    elevationLossMeters: elev.lossMeters,
    elevationSource,
    isElevationCorrected: isBarometricOrDem,
    splits,
    processedRoute: validPoints,
    displayRoute: simplifiedRoute,
    gpsQuality,
  };
}

/**
 * Asynchronous Post-Activity Processing with automated DEM elevation lookup.
 * Automatically queries Open Topo Data / Copernicus GLO-30 when barometric altimeter data is absent.
 */
export async function postProcessActivityAsync(params: {
  rawPoints: RawGPSPoint[];
  type: ActivityType;
  startedAt: string;
  endedAt?: string;
  isBarometric?: boolean;
}): Promise<ReturnType<typeof postProcessActivity>> {
  const { rawPoints = [], type, startedAt, endedAt, isBarometric = false } = params;

  // If barometric data was recorded, proceed immediately with the 2.0m barometric threshold
  if (isBarometric) {
    return postProcessActivity({
      rawPoints,
      type,
      startedAt,
      endedAt,
      isBarometric: true,
    });
  }

  // If no barometric data, perform DEM elevation lookup using the ElevationCorrectionService
  try {
    const { elevationService } = await import('./elevation');
    const validRaw = rawPoints.filter((p) => isValidCoordinate(p.latitude, p.longitude));

    if (validRaw.length >= 2) {
      const demResult = await elevationService.correctRouteAltitudes(validRaw);
      if (demResult.success && demResult.correctedAltitudes.length > 0) {
        return postProcessActivity({
          rawPoints,
          type,
          startedAt,
          endedAt,
          isBarometric: false,
          correctedAltitudes: demResult.correctedAltitudes,
        });
      }
    }
  } catch (err) {
    console.warn('[postProcessActivityAsync] DEM lookup failed, falling back to raw GPS:', err);
  }

  // Graceful fallback to raw GPS altitude (10.0m noise rejection threshold)
  return postProcessActivity({
    rawPoints,
    type,
    startedAt,
    endedAt,
    isBarometric: false,
  });
}

/**
 * Douglas-Peucker algorithm for polyline simplification.
 */
export function douglasPeucker(points: RoutePoint[], epsilon = 0.00005): RoutePoint[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = douglasPeucker(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(
  p: RoutePoint,
  p1: RoutePoint,
  p2: RoutePoint
): number {
  let dx = p2.longitude - p1.longitude;
  let dy = p2.latitude - p1.latitude;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }
  const pvx = p.longitude - p1.longitude;
  const pvy = p.latitude - p1.latitude;
  const pvdot = dx * pvx + dy * pvy;
  const dsx = pvdot * dx;
  const dsy = pvdot * dy;
  const ax = pvx - dsx;
  const ay = pvy - dsy;
  return Math.sqrt(ax * ax + ay * ay);
}

// ==========================================
// 3. WORKOUT & SURF STATS
// ==========================================

export function calculateWorkoutStats(
  workout: Workout,
  historicalWorkouts: Workout[] = []
): {
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  newPrs: { exercise: string; weight: number; reps: number; estimated1RM: number }[];
} {
  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;
  const newPrs: { exercise: string; weight: number; reps: number; estimated1RM: number }[] = [];

  const historicalMax1RM: Record<string, number> = {};
  for (const past of historicalWorkouts) {
    if (past.id === workout.id) continue;
    for (const ex of past.exercises || []) {
      const name = ex.exercise_name.trim().toLowerCase();
      for (const set of ex.sets || []) {
        if (set.completed && set.weight_kg > 0 && set.reps > 0) {
          const e1rm = estimate1RM(set.weight_kg, set.reps);
          historicalMax1RM[name] = Math.max(historicalMax1RM[name] || 0, e1rm);
        }
      }
    }
  }

  for (const exercise of workout.exercises || []) {
    const exName = exercise.exercise_name.trim();
    const key = exName.toLowerCase();
    let highestSet1RM = 0;
    let bestSet = { weight: 0, reps: 0 };

    for (const set of exercise.sets || []) {
      if (set.completed) {
        totalSets++;
        totalReps += set.reps;
        const setVolume = set.weight_kg * set.reps;
        totalVolumeKg += setVolume;

        if (set.weight_kg > 0 && set.reps > 0) {
          const e1rm = estimate1RM(set.weight_kg, set.reps);
          if (e1rm > highestSet1RM) {
            highestSet1RM = e1rm;
            bestSet = { weight: set.weight_kg, reps: set.reps };
          }
        }
      }
    }

    const pastBest = historicalMax1RM[key];
    if (pastBest !== undefined && highestSet1RM > pastBest && pastBest > 0) {
      newPrs.push({
        exercise: exName,
        weight: bestSet.weight,
        reps: bestSet.reps,
        estimated1RM: Math.round(highestSet1RM * 10) / 10,
      });
    }
  }

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    totalReps,
    newPrs,
  };
}

export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 30) return weightKg * (1 + reps / 30);
  return Math.round((weightKg * (36 / (37 - reps))) * 10) / 10;
}

export function calculateSurfStats(sessions: SurfSession[]) {
  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      totalDurationSeconds: 0,
      avgWaveQuality: 0,
      avgEnergy: 0,
      topLocation: 'None yet',
    };
  }

  const totalSessions = sessions.length;
  const totalDurationSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
  const avgWaveQuality =
    sessions.reduce((sum, s) => sum + s.wave_quality, 0) / totalSessions;
  const avgEnergy =
    sessions.reduce((sum, s) => sum + s.energy_level, 0) / totalSessions;

  const locationCounts: Record<string, number> = {};
  for (const s of sessions) {
    const loc = s.location_name.trim();
    if (loc) {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  }

  let topLocation = 'None yet';
  let maxCount = 0;
  for (const [loc, count] of Object.entries(locationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topLocation = loc;
    }
  }

  return {
    totalSessions,
    totalDurationSeconds,
    avgWaveQuality: Math.round(avgWaveQuality * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    topLocation,
  };
}
