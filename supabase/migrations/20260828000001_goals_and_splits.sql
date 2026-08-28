-- ==========================================================
-- LIFEOS — GOALS & PRODUCTION ACTIVITY ENHANCEMENTS MIGRATION
-- ==========================================================

-- 1. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pillar TEXT NOT NULL DEFAULT 'MOVE',
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  progress_percentage REAL NOT NULL DEFAULT 0,
  linked_project_ids JSONB DEFAULT '[]'::jsonb,
  linked_habit_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Goal Milestones Table
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  order_index INT NOT NULL DEFAULT 0
);

-- 3. Enhance Activities Table with Splits & Extended Metrics
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS elevation_loss REAL DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS max_speed REAL DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS best_pace REAL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS gps_quality TEXT DEFAULT 'EXCELLENT';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS splits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS raw_route JSONB DEFAULT '[]'::jsonb;

-- 4. Enable Row Level Security (RLS) on Goals and Milestones
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Goals (Complete User Isolation)
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
CREATE POLICY "Users can insert their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;
CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for Goal Milestones (Inherited via Goal Owner)
DROP POLICY IF EXISTS "Users can view milestones of their goals" ON public.goal_milestones;
CREATE POLICY "Users can view milestones of their goals"
  ON public.goal_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = goal_milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can mutate milestones of their goals" ON public.goal_milestones;
CREATE POLICY "Users can mutate milestones of their goals"
  ON public.goal_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = goal_milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON public.goal_milestones(goal_id);
