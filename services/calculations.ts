import {
  Activity,
  ActivitySplit,
  ActivityType,
  DailyPriority,
  GPSQuality,
  Habit,
  HabitCompletion,
  Project,
  RawGPSPoint,
  RoutePoint,
  StudySession,
  SurfSession,
  Workout,
} from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';

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
 * Calculates running pace in seconds per kilometer (prioritizes moving time).
 */
export function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 10 || durationSeconds <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return Math.round(durationSeconds / distanceKm);
}

export function calculateSpeedKmh(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 5 || durationSeconds <= 0) return 0;
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
 * Filters vertical noise and computes cumulative elevation gain and loss in meters.
 * Uses a 2.0m vertical noise threshold to reject micro-jitter.
 */
export function calculateElevationProfile(altitudes: number[]): {
  gainMeters: number;
  lossMeters: number;
} {
  if (!altitudes || altitudes.length < 2) {
    return { gainMeters: 0, lossMeters: 0 };
  }

  // 1. Moving average smoothing on raw altitude
  const smoothed: number[] = [];
  const windowSize = 3;
  for (let i = 0; i < altitudes.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = altitudes.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    smoothed.push(avg);
  }

  let gain = 0;
  let loss = 0;

  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - smoothed[i - 1];
    // Reject micro-jitter (< 2.0m) and physically impossible step jumps (> 60m per second)
    if (diff >= 2.0 && diff < 60) {
      gain += diff;
    } else if (diff <= -2.0 && diff > -60) {
      loss += Math.abs(diff);
    }
  }

  return {
    gainMeters: Math.round(gain),
    lossMeters: Math.round(loss),
  };
}

export function calculateElevationGain(altitudes: number[]): number {
  return calculateElevationProfile(altitudes).gainMeters;
}

/**
 * Calculates distance-based splits (e.g. every 1000m for run, 5000m for cycle).
 */
export function calculateSplits(
  points: RoutePoint[],
  splitTargetMeters = 1000
): ActivitySplit[] {
  if (!points || points.length < 2 || splitTargetMeters <= 0) {
    return [];
  }

  const splits: ActivitySplit[] = [];
  let currentSplitIndex = 1;
  let splitDistanceAccumulator = 0;
  let splitStartTime = points[0].timestamp;
  let splitMovingSeconds = 0;
  let splitAltitudes: number[] = [points[0].altitude || 0];

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const stepDist = haversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    const timeDeltaSec = Math.max(0.5, (p2.timestamp - p1.timestamp) / 1000);

    splitDistanceAccumulator += stepDist;
    if (p2.altitude !== undefined && p2.altitude !== null) {
      splitAltitudes.push(p2.altitude);
    }

    if (p2.speed !== undefined && p2.speed !== null && p2.speed >= 0.5) {
      splitMovingSeconds += timeDeltaSec;
    } else if (stepDist / timeDeltaSec >= 0.5) {
      splitMovingSeconds += timeDeltaSec;
    }

    if (splitDistanceAccumulator >= splitTargetMeters) {
      const splitDuration = Math.max(1, (p2.timestamp - splitStartTime) / 1000);
      const elev = calculateElevationProfile(splitAltitudes);

      splits.push({
        splitNumber: currentSplitIndex,
        distanceMeters: Math.round(splitDistanceAccumulator),
        durationSeconds: Math.round(splitDuration),
        movingSeconds: Math.round(splitMovingSeconds),
        paceSecKm: calculatePace(splitDistanceAccumulator, splitMovingSeconds || splitDuration),
        speedKmh: calculateSpeedKmh(splitDistanceAccumulator, splitMovingSeconds || splitDuration),
        elevationGainMeters: elev.gainMeters,
        elevationLossMeters: elev.lossMeters,
      });

      // Reset for next split
      currentSplitIndex++;
      splitDistanceAccumulator = 0;
      splitStartTime = p2.timestamp;
      splitMovingSeconds = 0;
      splitAltitudes = [p2.altitude || 0];
    }
  }

  // Handle final partial split if > 100m
  if (splitDistanceAccumulator >= 100) {
    const lastPoint = points[points.length - 1];
    const partialDuration = Math.max(1, (lastPoint.timestamp - splitStartTime) / 1000);
    const elev = calculateElevationProfile(splitAltitudes);

    splits.push({
      splitNumber: currentSplitIndex,
      distanceMeters: Math.round(splitDistanceAccumulator),
      durationSeconds: Math.round(partialDuration),
      movingSeconds: Math.round(splitMovingSeconds || partialDuration),
      paceSecKm: calculatePace(splitDistanceAccumulator, splitMovingSeconds || partialDuration),
      speedKmh: calculateSpeedKmh(splitDistanceAccumulator, splitMovingSeconds || partialDuration),
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
}): {
  authoritativeDistanceMeters: number;
  elapsedSeconds: number;
  movingSeconds: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  averagePaceSecKm: number;
  bestPaceSecKm: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  splits: ActivitySplit[];
  processedRoute: RoutePoint[];
  displayRoute: RoutePoint[];
  gpsQuality: GPSQuality;
} {
  const { rawPoints = [], type, startedAt, endedAt } = params;
  const config = ACTIVITY_DEFINITIONS[type] || ACTIVITY_DEFINITIONS.RUN;

  const validPoints: RoutePoint[] = [];
  let totalDistance = 0;
  let movingTime = 0;
  let maxSpeed = 0;
  let poorAccuracyCount = 0;

  // 1. Validation & Drift Filtering Pass
  for (let i = 0; i < rawPoints.length; i++) {
    const raw = rawPoints[i];

    if (!isValidCoordinate(raw.latitude, raw.longitude)) continue;

    // Filter accuracy
    if (raw.accuracy !== null && raw.accuracy !== undefined && raw.accuracy > config.accuracyThresholdMeters) {
      poorAccuracyCount++;
      continue;
    }

    const currentPt: RoutePoint = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      altitude: raw.altitude ?? null,
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

      const stepDist = haversineDistance(
        prevPt.latitude,
        prevPt.longitude,
        currentPt.latitude,
        currentPt.longitude
      );

      // Jump anomaly check
      if (stepDist > config.maxValidJumpMeters) {
        continue;
      }

      const timeDeltaSec = (currentPt.timestamp - prevPt.timestamp) / 1000;
      const speedMps = stepDist / timeDeltaSec;

      if (speedMps > config.maxValidSpeedMps) {
        continue;
      }

      // Stationary drift rejection
      const isStationary = stepDist < config.minMovementDeltaMeters && speedMps < config.minValidSpeedMps;

      if (!isStationary) {
        totalDistance += stepDist;
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

  // 2. Duration Calculation
  const startTs = new Date(startedAt).getTime();
  const endTs = endedAt ? new Date(endedAt).getTime() : Date.now();
  const elapsedSeconds = Math.max(1, Math.round((endTs - startTs) / 1000));
  const finalMovingSeconds = Math.min(elapsedSeconds, Math.max(0, Math.round(movingTime)));

  // 3. Elevation
  const altitudes = validPoints
    .map((p) => p.altitude)
    .filter((a): a is number => typeof a === 'number');
  const elev = calculateElevationProfile(altitudes);

  // 4. Pace & Speed
  const avgPace = calculatePace(totalDistance, finalMovingSeconds || elapsedSeconds);
  const avgSpeed = +(totalDistance / Math.max(1, finalMovingSeconds || elapsedSeconds)).toFixed(2);

  // 5. Splits
  const splits = calculateSplits(validPoints, config.splitDistanceMeters);

  // 6. Best Pace (fastest 1km split)
  let bestPace = avgPace;
  if (splits.length > 0) {
    const validSplits = splits.filter((s) => s.distanceMeters >= 500 && s.paceSecKm > 0);
    if (validSplits.length > 0) {
      bestPace = Math.min(...validSplits.map((s) => s.paceSecKm));
    }
  }

  // 7. Route Simplification for 60fps Rendering
  const simplifiedRoute = douglasPeucker(validPoints, 0.00003);

  // 8. GPS Quality Assessment
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
    elevationGainMeters: elev.gainMeters,
    elevationLossMeters: elev.lossMeters,
    splits,
    processedRoute: validPoints,
    displayRoute: simplifiedRoute,
    gpsQuality,
  };
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
