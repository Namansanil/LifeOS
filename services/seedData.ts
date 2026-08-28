import { db } from './database';
import {
  Activity,
  DailyPriority,
  Habit,
  HabitCompletion,
  Project,
  StudySession,
  Subject,
  SurfSession,
  UserProfile,
  Workout,
} from '@/types';

export const SEED_USER_ID = 'demo-user-naman';

export const SEED_PROFILE: UserProfile = {
  id: SEED_USER_ID,
  email: 'naman@lifeos.app',
  full_name: 'Naman',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  enabled_pillars: {
    move: true,
    surf: true,
    learn: true,
    build: true,
    live: true,
  },
  preferences: {
    theme: 'light',
    distance_unit: 'km',
    weight_unit: 'kg',
    notifications_enabled: true,
    gps_auto_pause: true,
    location_privacy: 'PRIVATE',
  },
};

export async function populateSeedData(userId = SEED_USER_ID): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 1. Habits
  const defaultHabits: Habit[] = [
    {
      id: 'h_water',
      user_id: userId,
      name: 'Hydration (1L Morning)',
      category: 'MORNING',
      frequency: 'DAILY',
      active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'h_sunlight',
      user_id: userId,
      name: 'Morning Sunlight & Walk',
      category: 'MORNING',
      frequency: 'DAILY',
      active: true,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'h_read',
      user_id: userId,
      name: 'Read 20 Pages',
      category: 'DAY',
      frequency: 'DAILY',
      active: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'h_journal',
      user_id: userId,
      name: 'Evening Journal & Review',
      category: 'NIGHT',
      frequency: 'DAILY',
      active: true,
      sort_order: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'h_sleep',
      user_id: userId,
      name: 'Screen-off by 10:30 PM',
      category: 'NIGHT',
      frequency: 'DAILY',
      active: true,
      sort_order: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const h of defaultHabits) {
    await db.saveHabit(h);
  }

  // Today Completions
  await db.toggleHabitCompletion('h_water', userId, today, true);
  await db.toggleHabitCompletion('h_sunlight', userId, today, true);
  await db.toggleHabitCompletion('h_read', userId, today, true);

  // 2. Top 3 Priorities
  const priorities: DailyPriority[] = [
    {
      id: 'p_1',
      user_id: userId,
      date: today,
      order_index: 1,
      title: 'Finish DBMS indexing assignment',
      completed: true,
      completed_at: new Date().toISOString(),
      category: 'LEARN',
    },
    {
      id: 'p_2',
      user_id: userId,
      date: today,
      order_index: 2,
      title: 'Heavy lower workout + mobility',
      completed: true,
      completed_at: new Date().toISOString(),
      category: 'MOVE',
    },
    {
      id: 'p_3',
      user_id: userId,
      date: today,
      order_index: 3,
      title: 'TideWise email automation queue',
      completed: false,
      category: 'BUILD',
    },
  ];
  await db.saveDailyPriorities(priorities);

  // 3. Activities (GPS Run)
  const runActivity: Activity = {
    id: 'act_morning_run',
    user_id: userId,
    type: 'RUN',
    category: 'MOVE',
    title: 'Coastal Morning Tempo',
    started_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 3.5 * 3600000).toISOString(),
    duration: 1902, // 31m 42s
    distance: 5820, // 5.82 km
    moving_time: 1858,
    elevation_gain: 74,
    average_speed: 3.06, // m/s
    average_pace: 327, // 5:27 /km
    calories: 412,
    source: 'GPS',
    visibility: 'PRIVATE',
    notes: 'Crisp morning ocean breeze. Maintained even cadence through the headland hills.',
    rating: 5,
    route: [
      { latitude: 12.9716, longitude: 77.5946, timestamp: Date.now() - 1900000, altitude: 920 },
      { latitude: 12.9725, longitude: 77.5960, timestamp: Date.now() - 1500000, altitude: 935 },
      { latitude: 12.9740, longitude: 77.5982, timestamp: Date.now() - 1000000, altitude: 955 },
      { latitude: 12.9760, longitude: 77.6010, timestamp: Date.now() - 500000, altitude: 994 },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.saveActivity(runActivity);

  // 4. Workout (Strength)
  const workout: Workout = {
    id: 'w_lower_session',
    user_id: userId,
    title: 'Legs & Core Strength',
    type: 'GYM',
    started_at: new Date(Date.now() - 7 * 3600000).toISOString(),
    duration: 3480, // 58m
    volume: 7420,
    rating: 5,
    notes: 'Solid depth on Back Squat. Set a new PR with 110kg x 5 reps.',
    exercises: [
      {
        id: 'ex_1',
        workout_id: 'w_lower_session',
        exercise_name: 'Barbell Back Squat',
        order_index: 0,
        sets: [
          { set_number: 1, weight_kg: 80, reps: 8, completed: true },
          { set_number: 2, weight_kg: 95, reps: 6, completed: true },
          { set_number: 3, weight_kg: 105, reps: 5, completed: true },
          { set_number: 4, weight_kg: 110, reps: 5, is_pr: true, completed: true },
        ],
      },
      {
        id: 'ex_2',
        workout_id: 'w_lower_session',
        exercise_name: 'Romanian Deadlift',
        order_index: 1,
        sets: [
          { set_number: 1, weight_kg: 70, reps: 10, completed: true },
          { set_number: 2, weight_kg: 85, reps: 8, completed: true },
          { set_number: 3, weight_kg: 85, reps: 8, completed: true },
        ],
      },
      {
        id: 'ex_3',
        workout_id: 'w_lower_session',
        exercise_name: 'Hanging Leg Raises',
        order_index: 2,
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: true },
          { set_number: 2, weight_kg: 0, reps: 12, completed: true },
        ],
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.saveWorkout(workout);

  // 5. Surf Session
  const surf: SurfSession = {
    id: 'surf_session_1',
    user_id: userId,
    location_name: 'North Point Reef',
    session_type: 'TRAINING',
    started_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    duration: 5400, // 1h 30m
    wave_quality: 4,
    energy_level: 8,
    board_used: '6’0 Shortboard',
    rating: 4,
    notes: 'Clean 4ft offshore peelers at incoming mid tide. Great paddle endurance.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.saveSurfSession(surf);

  // 6. College Subjects & Study
  const subjects: Subject[] = [
    {
      id: 'sub_dbms',
      user_id: userId,
      code: 'CS301',
      name: 'Database Management Systems',
      color: '#1B3B2B',
      credits: 4,
      target_weekly_hours: 6,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sub_algo',
      user_id: userId,
      code: 'CS305',
      name: 'Algorithms & Complexity',
      color: '#1B2E3D',
      credits: 4,
      target_weekly_hours: 8,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sub_arch',
      user_id: userId,
      code: 'CS208',
      name: 'Computer Architecture',
      color: '#C25E00',
      credits: 3,
      target_weekly_hours: 5,
      created_at: new Date().toISOString(),
    },
  ];
  for (const sub of subjects) await db.saveSubject(sub);

  await db.saveStudySession({
    id: 'study_1',
    user_id: userId,
    subject_id: 'sub_dbms',
    title: 'B-Tree Indexing & Query Optimization',
    duration: 7200, // 2h
    started_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    notes: 'Reviewed composite indexes and analyzed EXPLAIN query plans.',
    created_at: new Date().toISOString(),
  });

  // 7. Projects
  const project: Project = {
    id: 'proj_tidewise',
    user_id: userId,
    name: 'TideWise Engine',
    description: 'Autonomous swell prediction & surf notification engine',
    status: 'ACTIVE',
    category: 'Engineering',
    technologies: ['TypeScript', 'FastAPI', 'PostgreSQL', 'Docker'],
    total_time_seconds: 32400, // 9 hours
    next_action: 'Integrate NOAA marine buoy real-time telemetry webhook',
    last_worked_at: new Date().toISOString(),
    tasks: [
      {
        id: 'pt_1',
        project_id: 'proj_tidewise',
        user_id: userId,
        title: 'Design buoy API data pipeline',
        status: 'DONE',
        priority: 'HIGH',
        order_index: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'pt_2',
        project_id: 'proj_tidewise',
        user_id: userId,
        title: 'Build automated email alert dispatch',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        order_index: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 'pt_3',
        project_id: 'proj_tidewise',
        user_id: userId,
        title: 'Deploy Docker container to Fly.io',
        status: 'TODO',
        priority: 'MEDIUM',
        order_index: 2,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.saveProject(project);
}
