-- ==========================================================
-- START: Personal Anti-Procrastination Operating System
-- Normalized PostgreSQL Schema with Row Level Security (RLS)
-- ==========================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  sound_enabled BOOLEAN DEFAULT true,
  work_day_start TIME DEFAULT '09:00',
  work_day_end TIME DEFAULT '18:00',
  is_onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Onboarding Profiles Table (Behavioral Baseline Configuration)
CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_role TEXT NOT NULL,
  custom_role TEXT,
  typical_categories JSONB DEFAULT '[]'::jsonb,
  normal_working_days JSONB DEFAULT '[]'::jsonb,
  approx_available_hours NUMERIC(4,1) DEFAULT 4.0,
  primary_goals JSONB DEFAULT '[]'::jsonb,
  responsibilities TEXT,
  upcoming_deadlines JSONB DEFAULT '[]'::jsonb,
  delay_triggers JSONB DEFAULT '[]'::jsonb,
  common_distractions JSONB DEFAULT '[]'::jsonb,
  best_working_time TEXT DEFAULT 'morning',
  enabled_rule_codes JSONB DEFAULT '[]'::jsonb,
  first_commitment JSONB NOT NULL,
  generated_operating_profile JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assignments Table (Long-term projects, exams, research reports)
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Technical / Coding',
  description TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  estimated_total_hours NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'paused', 'completed', 'archived')),
  next_action TEXT NOT NULL,
  progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Milestones Table (Assignment deconstructions with visible output)
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  intended_output TEXT NOT NULL, -- "What would count as visible evidence that this step is complete?"
  sequence INT NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  next_action TEXT NOT NULL,
  target_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tasks Table (Concrete physical tasks with desired outputs)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  desired_output TEXT NOT NULL,
  first_physical_action TEXT NOT NULL,
  estimated_minutes INT NOT NULL DEFAULT 25,
  category TEXT DEFAULT 'technical' CHECK (category IN ('technical', 'writing', 'administrative', 'reading', 'planning')),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Work Slots Table (Daily planned time windows)
CREATE TABLE IF NOT EXISTS public.work_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_title TEXT NOT NULL,
  desired_output TEXT NOT NULL,
  first_physical_action TEXT NOT NULL,
  estimated_duration_minutes INT NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'missed', 'recovered')),
  slot_type TEXT DEFAULT 'study_topic' CHECK (slot_type IN ('assignment', 'project', 'study_topic', 'personal_goal', 'custom_task')),
  phone_location TEXT DEFAULT 'outside reach',
  if_then_plan TEXT,
  likely_obstacle TEXT,
  planned_reward TEXT,
  prepared_data JSONB,
  delay_reason TEXT,
  is_top_priority INT CHECK (is_top_priority IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Work Sessions Table (Active execution metrics)
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  work_slot_id UUID REFERENCES public.work_slots(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  task_title TEXT NOT NULL,
  actual_duration_minutes INT NOT NULL,
  target_duration_minutes INT NOT NULL,
  resistance_level INT NOT NULL CHECK (resistance_level BETWEEN 1 AND 5),
  energy_level INT NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  phone_outside_reach BOOLEAN NOT NULL DEFAULT true,
  produced_output TEXT,
  distractions_captured_count INT DEFAULT 0,
  delay_reason TEXT,
  was_recovery_session BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 8. Distractions Table (Impulse capture feed)
CREATE TABLE IF NOT EXISTS public.distractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.work_sessions(id) ON DELETE CASCADE,
  urge_text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  returned_to_work BOOLEAN DEFAULT true
);

-- 9. Daily Reviews Table (Phase 5 Guided Night Protocol)
CREATE TABLE IF NOT EXISTS public.daily_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL UNIQUE,
  accomplished_summary TEXT NOT NULL,
  planned_slots_count INT DEFAULT 0,
  completed_slots_count INT DEFAULT 0,
  missed_slots_count INT DEFAULT 0,
  procrastinated_areas JSONB DEFAULT '[]'::jsonb,
  delay_triggers JSONB DEFAULT '[]'::jsonb,
  what_helped_start TEXT,
  distractions_count INT DEFAULT 0,
  key_learning TEXT,
  tomorrow_top1 JSONB NOT NULL,
  tomorrow_top2 TEXT,
  tomorrow_top3 TEXT,
  tomorrow_behavioral_experiment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Observed Patterns Table (Behavioral engine reflections)
CREATE TABLE IF NOT EXISTS public.observed_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  evidence TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  suggested_experiment TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('resistance', 'timing', 'environment', 'clarity', 'recovery')),
  detected_date DATE DEFAULT CURRENT_DATE
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observed_patterns ENABLE ROW LEVEL SECURITY;

-- Standard user ownership policies
CREATE POLICY "Users access own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users access own onboarding" ON public.onboarding_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users access own assignments" ON public.assignments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own milestones" ON public.milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.user_id = auth.uid())
);
CREATE POLICY "Users access own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own work slots" ON public.work_slots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own work sessions" ON public.work_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own distractions" ON public.distractions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own reviews" ON public.daily_reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own patterns" ON public.observed_patterns FOR ALL USING (auth.uid() = user_id);
