import {
  Activity,
  DailyPriority,
  Habit,
  HabitCompletion,
  Project,
  RoutePoint,
  StudySession,
  SurfSession,
  Workout,
} from '@/types';

/**
 * Calculates a holistic Life Score (0-100) based on intentionality and balance.
 * Rewards consistency, deep focus, and movement without promoting burnout.
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
}): { score: number; label: string } {
  const {
    priorities = [],
    habits = [],
    habitCompletions = [],
    activities = [],
    workouts = [],
    surfSessions = [],
    studySessions = [],
    projects = [],
  } = params;

  let totalPoints = 0;
  let maxPossible = 0;

  // 1. Top 3 Priorities (Weight: 30%)
  if (priorities.length > 0) {
    maxPossible += 30;
    const completedPriorities = priorities.filter((p) => p.completed).length;
    const priorityRatio = completedPriorities / priorities.length;
    totalPoints += Math.round(priorityRatio * 30);
  } else {
    // If no priorities were set, default allocated weight is 20 for baseline
    maxPossible += 20;
    totalPoints += 15;
  }

  // 2. Habits Consistency (Weight: 25%)
  const activeHabits = habits.filter((h) => h.active);
  if (activeHabits.length > 0) {
    maxPossible += 25;
    const completedCount = habitCompletions.filter((c) => c.completed).length;
    const habitRatio = Math.min(1, completedCount / activeHabits.length);
    totalPoints += Math.round(habitRatio * 25);
  } else {
    maxPossible += 20;
    totalPoints += 20;
  }

  // 3. Move & Surf Physical Activity (Weight: 25%)
  maxPossible += 25;
  const hasGpsActivity = activities.some((a) => a.duration >= 600); // 10+ mins
  const hasWorkout = workouts.length > 0;
  const hasSurf = surfSessions.length > 0;

  if (hasGpsActivity || hasWorkout || hasSurf) {
    // High quality intentional movement
    totalPoints += 25;
  } else if (activities.length > 0) {
    totalPoints += 15;
  } else {
    // Rest day or light recovery
    totalPoints += 5;
  }

  // 4. Learn & Build (Weight: 20%)
  maxPossible += 20;
  const totalStudyMinutes = studySessions.reduce(
    (acc, s) => acc + (s.duration || 0) / 60,
    0
  );
  const totalProjectTasksDone = projects.reduce(
    (acc, p) => acc + (p.tasks || []).filter((t) => t.status === 'DONE').length,
    0
  );

  if (totalStudyMinutes >= 45 || totalProjectTasksDone >= 2) {
    totalPoints += 20;
  } else if (totalStudyMinutes > 0 || totalProjectTasksDone > 0) {
    totalPoints += 14;
  } else {
    totalPoints += 5;
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

  return { score: normalizedScore, label };
}

/**
 * Calculates LifeOS Readiness (0-100%) from behavioral and training load signals.
 * Does NOT claim medical diagnosis or fake physiological certainty.
 */
export function calculateReadiness(params: {
  recentDaysActivitiesCount?: number;
  recentTrainingLoadMinutes?: number;
  habitConsistencyPercent?: number;
  restDaysInPastWeek?: number;
  sleepHours?: number;
}): { score: number; label: string; description: string } {
  const {
    recentDaysActivitiesCount = 3,
    recentTrainingLoadMinutes = 180,
    habitConsistencyPercent = 80,
    restDaysInPastWeek = 1,
    sleepHours = 7.5,
  } = params;

  let score = 70; // Baseline ready

  // Sleep adjustment
  if (sleepHours >= 8) score += 10;
  else if (sleepHours >= 7) score += 5;
  else if (sleepHours < 6) score -= 15;

  // Training load balance
  if (recentTrainingLoadMinutes > 360 && restDaysInPastWeek === 0) {
    // High acute fatigue
    score -= 15;
  } else if (recentDaysActivitiesCount >= 2 && restDaysInPastWeek >= 1) {
    score += 10;
  }

  // Habit consistency (routine stability)
  if (habitConsistencyPercent >= 80) score += 10;
  else if (habitConsistencyPercent < 50) score -= 10;

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
    description = 'High accumulated load or low sleep. Focus on hydration, mobility, and rest.';
  }

  return { score, label, description };
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

/**
 * Computes workout volume, estimated 1RM, and detects new PRs.
 */
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

  // Map of historical max 1RM per exercise
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

/**
 * Brzycki formula for estimated 1 Rep Max.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 30) return weightKg * (1 + reps / 30);
  // Brzycki: weight / (1.0278 - 0.0278 * reps)
  return Math.round((weightKg * (36 / (37 - reps))) * 10) / 10;
}

/**
 * Calculates surf statistics from real sessions.
 */
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

// ==========================================
// GPS & GEOMETRY ALGORITHMS
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

/**
 * Calculates pace in seconds per kilometer.
 */
export function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 10 || durationSeconds <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return Math.round(durationSeconds / distanceKm);
}

/**
 * Formats pace (sec/km) into "M:SS /km" or "--:--".
 */
export function formatPace(paceSecKm: number): string {
  if (!paceSecKm || paceSecKm <= 0 || !isFinite(paceSecKm) || paceSecKm > 3600) {
    return '--:--';
  }
  const minutes = Math.floor(paceSecKm / 60);
  const seconds = Math.floor(paceSecKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

/**
 * Formats seconds into "HH:MM:SS" or "MM:SS".
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return '00:00';
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
 * Filters altitude noise and calculates cumulative elevation gain in meters.
 */
export function calculateElevationGain(altitudes: number[]): number {
  if (!altitudes || altitudes.length < 2) return 0;
  let gain = 0;
  for (let i = 1; i < altitudes.length; i++) {
    const diff = altitudes[i] - altitudes[i - 1];
    // Reject GPS micro-jitter (< 1.5m) and extreme anomalies (> 50m single-step)
    if (diff > 1.5 && diff < 50) {
      gain += diff;
    }
  }
  return Math.round(gain);
}

/**
 * Douglas-Peucker algorithm for polyline simplification.
 * Compresses large GPS point datasets into smooth polylines for fast 60fps native map rendering.
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
