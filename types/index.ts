export type LifePillar = 'MOVE' | 'SURF' | 'LEARN' | 'BUILD' | 'LIVE';

export type ActivityType =
  | 'RUN'
  | 'WALK'
  | 'CYCLE'
  | 'HIKE'
  | 'SURF'
  | 'GYM'
  | 'MOBILITY'
  | 'OTHER';

export type ActivitySource = 'MANUAL' | 'GPS' | 'HEALTH' | 'IMPORTED';

export type ActivityVisibility = 'PRIVATE' | 'FRIENDS' | 'PUBLIC';

export type GPSQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DEGRADED' | 'INVALID' | 'LOST';

export type MovementState = 'MOVING' | 'POSSIBLE_STOP' | 'STOPPED';

export interface LocationQualityGateResult {
  accepted: boolean;
  quality: GPSQuality;
  reason?: string;
}

export interface PredictedMapPosition {
  latitude: number;
  longitude: number;
  heading?: number;
  accuracy?: number;
  isPredicted: boolean;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  email_verified?: boolean;
  created_at: string;
  updated_at?: string;
  enabled_pillars: {
    move: boolean;
    surf: boolean;
    learn: boolean;
    build: boolean;
    live: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    distance_unit: 'km' | 'mi';
    weight_unit: 'kg' | 'lb';
    notifications_enabled: boolean;
    gps_auto_pause: boolean;
    location_privacy: ActivityVisibility;
  };
}

export interface RawGPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  speedAccuracy?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface RoutePoint {
  id?: string;
  activity_id?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export interface ActivitySplit {
  splitNumber: number;
  distanceMeters: number;
  durationSeconds: number;
  movingSeconds: number;
  paceSecKm: number;
  gapSecKm?: number; // Grade Adjusted Pace (sec/km) for running
  speedKmh: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
}

export interface Activity {
  id: string;
  user_id: string;
  type: ActivityType;
  category: LifePillar;
  title: string;
  started_at: string;
  ended_at?: string;
  duration: number; // in seconds (elapsed)
  distance: number; // in meters (authoritative post-processed)
  moving_time: number; // in seconds
  elevation_gain: number; // in meters
  elevation_loss?: number; // in meters
  average_speed: number; // in m/s
  max_speed?: number; // in m/s
  average_pace: number; // in sec/km
  best_pace?: number; // in sec/km
  average_gap?: number; // in sec/km (Grade Adjusted Pace for running)
  gap_distance?: number; // in meters
  elevation_source?: 'BAROMETER' | 'DEM' | 'GPS_RAW';
  elevation_corrected?: boolean;
  calories?: number;
  source: ActivitySource;
  visibility: ActivityVisibility;
  notes?: string;
  rating?: number; // 1-5
  gps_quality?: GPSQuality;
  splits?: ActivitySplit[];
  route?: RoutePoint[];
  display_route?: RoutePoint[];
  raw_route?: RawGPSPoint[];
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: 'MORNING' | 'DAY' | 'NIGHT' | 'FITNESS' | 'MIND';
  frequency: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM';
  target_days?: number[];
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completed_at?: string;
}

export interface WorkoutSet {
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number;
  is_pr?: boolean;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  order_index: number;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  type: 'GYM' | 'STRENGTH' | 'RUNNING' | 'MOBILITY' | 'RECOVERY' | 'CUSTOM';
  started_at: string;
  ended_at?: string;
  duration: number; // in seconds
  volume: number; // in kg
  exercises: WorkoutExercise[];
  rating?: number; // 1-5
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SurfSession {
  id: string;
  user_id: string;
  location_name: string;
  session_type: 'TRAINING' | 'FUN' | 'COMPETITION' | 'RECOVERY';
  started_at: string;
  ended_at?: string;
  duration: number; // in seconds
  wave_quality: number; // 1-5
  energy_level: number; // 1-10
  board_used?: string;
  rating: number; // 1-5
  notes?: string;
  activity_id?: string;
  created_at: string;
  updated_at: string;
}

// Generalized Learning Domain (Academic subjects, online courses, certifications, self-study)
export interface Subject {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  credits?: number;
  target_weekly_hours?: number;
  created_at: string;
}

export interface CollegeTask {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  type: 'ASSIGNMENT' | 'EXAM' | 'READING' | 'PROJECT' | 'CERTIFICATION' | 'OTHER';
  due_date: string;
  completed: boolean;
  completed_at?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  title?: string;
  duration: number; // in seconds
  started_at: string;
  ended_at: string;
  notes?: string;
  created_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_date?: string;
  order_index: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  category?: string;
  technologies: string[];
  total_time_seconds: number;
  next_action?: string;
  last_worked_at?: string;
  tasks: ProjectTask[];
  created_at: string;
  updated_at: string;
}

// First-Class Goals Domain
export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  order_index: number;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  pillar: LifePillar;
  target_date?: string;
  status: 'ACTIVE' | 'ACHIEVED' | 'PAUSED' | 'ARCHIVED';
  milestones: GoalMilestone[];
  progress_percentage: number; // 0-100 derived from milestones
  linked_project_ids?: string[];
  linked_habit_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyPriority {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  order_index: number; // 1, 2, 3
  title: string;
  completed: boolean;
  completed_at?: string;
  category?: LifePillar;
  goal_id?: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  life_score: number | null; // null if insufficient data
  readiness_score: number | null; // null if insufficient data
  readiness_label: string; // "RECOVERED", "OPTIMAL", "MODERATE", "FATIGUED", "INSUFFICIENT_DATA"
  completed_habits_count: number;
  total_habits_count: number;
  active_duration_minutes: number;
  study_duration_minutes: number;
  project_duration_minutes: number;
  review_completed: boolean;
  journal_entry?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineItem {
  id: string;
  time: string; // HH:MM
  timestamp: string;
  category: LifePillar;
  title: string;
  subtitle?: string;
  duration_minutes?: number;
  metrics?: { label: string; value: string }[];
  type: 'ACTIVITY' | 'WORKOUT' | 'SURF' | 'STUDY' | 'PROJECT' | 'HABIT' | 'JOURNAL';
}

export interface SyncQueueItem {
  id: string;
  entity: string;
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string; // JSON string
  created_at: string;
  retry_count: number;
  status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';
  last_error?: string;
}

// Expanded GPS State Machine
export type TrackingState =
  | 'IDLE'
  | 'PREPARING'
  | 'GPS_READY'
  | 'TRACKING'
  | 'PAUSED'
  | 'GPS_LOST'
  | 'RECOVERING'
  | 'FINISHING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';

export interface TrackingMetrics {
  distanceMeters: number;
  elapsedSeconds: number;
  movingSeconds: number;
  currentSpeedMps: number;
  authoritativeSpeedMps?: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  averagePaceSecKm: number;
  bestPaceSecKm?: number;
  averageGapSecKm?: number;
  gapDistanceMeters?: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  elevationSource?: 'BAROMETER' | 'DEM' | 'GPS_RAW';
  isElevationCorrected?: boolean;
  currentAltitudeMeters?: number;
  currentAccuracyMeters?: number;
  gpsQuality: GPSQuality;
  movementState?: MovementState;
  pointsCount: number;
  currentSplitNumber: number;
  splits: ActivitySplit[];
}
