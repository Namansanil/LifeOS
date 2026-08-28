-- ==========================================================
-- LIFEOS — PRODUCTION POSTGRESQL SCHEMA WITH RLS & FUNCTIONS
-- ==========================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  enabled_pillars JSONB NOT NULL DEFAULT '{"move": true, "surf": true, "learn": true, "build": true, "live": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  distance_unit TEXT NOT NULL DEFAULT 'km',
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  gps_auto_pause BOOLEAN NOT NULL DEFAULT true,
  location_privacy TEXT NOT NULL DEFAULT 'PRIVATE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Habits Table
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'DAY',
  frequency TEXT NOT NULL DEFAULT 'DAILY',
  target_days JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Habit Completions Table
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, date)
);

-- 5. Activities (GPS and Physical Activities)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'MOVE',
  title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration INT NOT NULL DEFAULT 0, -- seconds
  distance REAL NOT NULL DEFAULT 0, -- meters
  moving_time INT NOT NULL DEFAULT 0, -- seconds
  elevation_gain REAL NOT NULL DEFAULT 0, -- meters
  average_speed REAL NOT NULL DEFAULT 0, -- m/s
  average_pace REAL NOT NULL DEFAULT 0, -- sec/km
  calories INT,
  source TEXT NOT NULL DEFAULT 'GPS',
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  notes TEXT,
  rating INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Activity Route Points (Separated for fast query performance)
CREATE TABLE IF NOT EXISTS public.activity_route_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude REAL,
  accuracy REAL,
  speed REAL,
  timestamp BIGINT NOT NULL
);

-- 7. Workouts Table
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'GYM',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration INT NOT NULL DEFAULT 0,
  volume REAL NOT NULL DEFAULT 0,
  rating INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Workout Exercises Table
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT
);

-- 9. Surf Sessions Table
CREATE TABLE IF NOT EXISTS public.surf_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'FUN',
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration INT NOT NULL DEFAULT 0,
  wave_quality INT NOT NULL DEFAULT 3,
  energy_level INT NOT NULL DEFAULT 7,
  board_used TEXT,
  rating INT NOT NULL DEFAULT 4,
  notes TEXT,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. College Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4338CA',
  credits INT DEFAULT 3,
  target_weekly_hours REAL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. College Tasks & Deadlines
CREATE TABLE IF NOT EXISTS public.college_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ASSIGNMENT',
  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Study Sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT,
  duration INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  category TEXT,
  technologies JSONB DEFAULT '[]'::jsonb,
  total_time_seconds INT NOT NULL DEFAULT 0,
  next_action TEXT,
  last_worked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Project Tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  due_date TIMESTAMPTZ,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Daily Priorities (Top 3)
CREATE TABLE IF NOT EXISTS public.daily_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  order_index INT NOT NULL CHECK (order_index IN (1, 2, 3)),
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  category TEXT DEFAULT 'LIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, order_index)
);

-- 16. Daily Logs & Reflection
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  life_score INT NOT NULL DEFAULT 0,
  readiness_score INT NOT NULL DEFAULT 75,
  readiness_label TEXT NOT NULL DEFAULT 'RECOVERED',
  completed_habits_count INT NOT NULL DEFAULT 0,
  total_habits_count INT NOT NULL DEFAULT 0,
  active_duration_minutes INT NOT NULL DEFAULT 0,
  study_duration_minutes INT NOT NULL DEFAULT 0,
  project_duration_minutes INT NOT NULL DEFAULT 0,
  review_completed BOOLEAN NOT NULL DEFAULT false,
  journal_entry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_route_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surf_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- User Preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Habits
CREATE POLICY "Users can manage own habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id);

-- Habit Completions
CREATE POLICY "Users can manage own habit completions" ON public.habit_completions
  FOR ALL USING (auth.uid() = user_id);

-- Activities
CREATE POLICY "Users can manage own activities" ON public.activities
  FOR ALL USING (auth.uid() = user_id);

-- Route Points (Access via activity ownership)
CREATE POLICY "Users can manage own route points" ON public.activity_route_points
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_route_points.activity_id AND a.user_id = auth.uid())
  );

-- Workouts & Exercises
CREATE POLICY "Users can manage own workouts" ON public.workouts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workout exercises" ON public.workout_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid())
  );

-- Surf Sessions
CREATE POLICY "Users can manage own surf sessions" ON public.surf_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Subjects, College Tasks, Study
CREATE POLICY "Users can manage own subjects" ON public.subjects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own college tasks" ON public.college_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own study sessions" ON public.study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Projects & Tasks
CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own project tasks" ON public.project_tasks
  FOR ALL USING (auth.uid() = user_id);

-- Daily Priorities & Daily Logs
CREATE POLICY "Users can manage own priorities" ON public.daily_priorities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily logs" ON public.daily_logs
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ==========================================================

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically populate profile upon signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_activities_updated_at ON public.activities;
CREATE TRIGGER set_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_workouts_updated_at ON public.workouts;
CREATE TRIGGER set_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_surf_updated_at ON public.surf_sessions;
CREATE TRIGGER set_surf_updated_at
  BEFORE UPDATE ON public.surf_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RPC Function for Backend Daily Summary Calculation
CREATE OR REPLACE FUNCTION public.get_daily_summary(p_user_id UUID, p_date DATE)
RETURNS JSONB AS $$
DECLARE
  v_priorities_count INT;
  v_priorities_completed INT;
  v_habits_count INT;
  v_habits_completed INT;
  v_active_minutes INT;
  v_study_minutes INT;
  v_total_volume NUMERIC;
BEGIN
  -- Priorities
  SELECT count(*), count(*) FILTER (WHERE completed = true)
  INTO v_priorities_count, v_priorities_completed
  FROM public.daily_priorities
  WHERE user_id = p_user_id AND date = p_date;

  -- Habits
  SELECT count(*) INTO v_habits_count
  FROM public.habits
  WHERE user_id = p_user_id AND active = true;

  SELECT count(*) INTO v_habits_completed
  FROM public.habit_completions
  WHERE user_id = p_user_id AND date = p_date AND completed = true;

  -- Active movement duration (seconds to minutes)
  SELECT COALESCE(sum(duration) / 60, 0) INTO v_active_minutes
  FROM public.activities
  WHERE user_id = p_user_id AND (started_at AT TIME ZONE 'UTC')::DATE = p_date;

  -- Study minutes
  SELECT COALESCE(sum(duration) / 60, 0) INTO v_study_minutes
  FROM public.study_sessions
  WHERE user_id = p_user_id AND (started_at AT TIME ZONE 'UTC')::DATE = p_date;

  -- Workout volume
  SELECT COALESCE(sum(volume), 0) INTO v_total_volume
  FROM public.workouts
  WHERE user_id = p_user_id AND (started_at AT TIME ZONE 'UTC')::DATE = p_date;

  RETURN jsonb_build_object(
    'date', p_date,
    'priorities_count', v_priorities_count,
    'priorities_completed', v_priorities_completed,
    'habits_count', v_habits_count,
    'habits_completed', v_habits_completed,
    'active_minutes', v_active_minutes,
    'study_minutes', v_study_minutes,
    'workout_volume', v_total_volume
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Indexes for fast timeline and summary queries
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON public.activities (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_surf_user_date ON public.surf_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_priorities_user_date ON public.daily_priorities (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_route_points_activity ON public.activity_route_points (activity_id);

-- ==========================================================
-- SUPABASE STORAGE BUCKETS & POLICIES
-- ==========================================================

-- 1. Insert buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('activity_routes', 'activity_routes', false),
  ('session_media', 'session_media', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Avatars bucket storage policies
CREATE POLICY "Public Avatar Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Activity Routes bucket storage policies (Private GPX/GeoJSON tracks)
CREATE POLICY "Users can access own route files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'activity_routes' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own route files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'activity_routes' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Session Media storage policies
CREATE POLICY "Users can access own session media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'session_media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own session media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'session_media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

