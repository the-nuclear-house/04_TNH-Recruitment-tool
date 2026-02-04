-- ============================================
-- TIMESHEET TABLES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Add user_id column to consultants table (links consultant to user account for login)
ALTER TABLE public.consultants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_consultants_user_id ON public.consultants(user_id);

-- ============================================
-- TIMESHEET ENTRIES TABLE
-- Stores individual half-day entries
-- ============================================

CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('mission', 'bench', 'leave', 'bank_holiday')),
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique entry per consultant, date, and period
  UNIQUE(consultant_id, date, period)
);

-- Indexes for timesheet_entries
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_consultant ON public.timesheet_entries(consultant_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_week ON public.timesheet_entries(week_start_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON public.timesheet_entries(date);

-- ============================================
-- TIMESHEET WEEKS TABLE
-- Tracks submission and approval status per week
-- ============================================

CREATE TABLE IF NOT EXISTS public.timesheet_weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique week per consultant
  UNIQUE(consultant_id, week_start_date)
);

-- Indexes for timesheet_weeks
CREATE INDEX IF NOT EXISTS idx_timesheet_weeks_consultant ON public.timesheet_weeks(consultant_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_weeks_status ON public.timesheet_weeks(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_weeks_week ON public.timesheet_weeks(week_start_date);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_weeks ENABLE ROW LEVEL SECURITY;

-- Policy: Consultants can manage their own entries
CREATE POLICY "Consultants can view own entries" ON public.timesheet_entries
  FOR SELECT USING (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can insert own entries" ON public.timesheet_entries
  FOR INSERT WITH CHECK (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can update own entries" ON public.timesheet_entries
  FOR UPDATE USING (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can delete own entries" ON public.timesheet_entries
  FOR DELETE USING (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

-- Policy: Managers can view entries for their consultants
CREATE POLICY "Managers can view team entries" ON public.timesheet_entries
  FOR SELECT USING (
    consultant_id IN (
      SELECT id FROM public.consultants 
      WHERE account_manager_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['business_director'])
    )
  );

-- Similar policies for timesheet_weeks
CREATE POLICY "Consultants can view own weeks" ON public.timesheet_weeks
  FOR SELECT USING (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can insert own weeks" ON public.timesheet_weeks
  FOR INSERT WITH CHECK (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can update own weeks" ON public.timesheet_weeks
  FOR UPDATE USING (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE user_id = auth.uid()
    )
  );

-- Policy: Managers can view and update weeks for their consultants
CREATE POLICY "Managers can view team weeks" ON public.timesheet_weeks
  FOR SELECT USING (
    consultant_id IN (
      SELECT id FROM public.consultants 
      WHERE account_manager_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['business_director'])
    )
  );

CREATE POLICY "Managers can update team weeks" ON public.timesheet_weeks
  FOR UPDATE USING (
    consultant_id IN (
      SELECT id FROM public.consultants 
      WHERE account_manager_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['business_director'])
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.timesheet_entries IS 'Stores individual half-day timesheet entries for consultants';
COMMENT ON TABLE public.timesheet_weeks IS 'Tracks weekly timesheet submission and approval status';
COMMENT ON COLUMN public.timesheet_entries.period IS 'AM or PM half-day period';
COMMENT ON COLUMN public.timesheet_entries.entry_type IS 'Type of work: mission (project), bench, leave, or bank_holiday';
COMMENT ON COLUMN public.timesheet_weeks.status IS 'Workflow status: draft, submitted, approved, or rejected';
COMMENT ON COLUMN public.consultants.user_id IS 'Links consultant to a user account for authentication and timesheet access';
