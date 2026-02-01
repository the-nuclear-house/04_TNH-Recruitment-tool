-- ============================================
-- RECRUIT HUB DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & ORGANISATION
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'director', 'manager', 'recruiter', 'interviewer')),
  business_unit_id UUID,
  reports_to UUID REFERENCES public.users(id),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Units table
CREATE TABLE public.business_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.business_units(id),
  head_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key from users to business_units
ALTER TABLE public.users 
  ADD CONSTRAINT fk_user_business_unit 
  FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id);

-- ============================================
-- CANDIDATES
-- ============================================

CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  
  -- Professional information
  current_role TEXT,
  current_company TEXT,
  years_experience INTEGER,
  degree TEXT,
  summary TEXT,
  
  -- Skills (stored as array for easy querying)
  skills TEXT[] DEFAULT '{}',
  
  -- Admin information
  right_to_work TEXT NOT NULL DEFAULT 'unknown' CHECK (right_to_work IN (
    'british_citizen', 'settled_status', 'pre_settled_status', 
    'skilled_worker_visa', 'graduate_visa', 'other_visa', 
    'requires_sponsorship', 'unknown'
  )),
  security_vetting TEXT NOT NULL DEFAULT 'none' CHECK (security_vetting IN (
    'none', 'bpss', 'ctc', 'sc', 'esc', 'dv', 'edv'
  )),
  open_to_relocate BOOLEAN DEFAULT false,
  relocation_preferences TEXT,
  
  -- Salary
  current_salary INTEGER,
  salary_expectation_min INTEGER,
  salary_expectation_max INTEGER,
  salary_currency TEXT DEFAULT 'GBP',
  
  -- Flexibility
  sector_flexibility TEXT,
  scope_flexibility TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'screening', 'phone_qualification', 'technical_interview',
    'director_interview', 'offer', 'hired', 'rejected', 'withdrawn', 'on_hold'
  )),
  source TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidate Documents
CREATE TABLE public.candidate_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'cover_letter', 'certificate', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidate Notes
CREATE TABLE public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REQUIREMENTS (Customer Needs)
-- ============================================

CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  
  -- Role information
  role_title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Requirements
  skills_required TEXT[] DEFAULT '{}',
  experience_min INTEGER,
  experience_max INTEGER,
  security_required TEXT DEFAULT 'none',
  
  -- Budget
  salary_min INTEGER,
  salary_max INTEGER,
  day_rate_min INTEGER,
  day_rate_max INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'on_hold', 'filled', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Ownership
  business_unit_id UUID REFERENCES public.business_units(id),
  owner_id UUID NOT NULL REFERENCES public.users(id),
  
  -- Dates
  start_date DATE,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- APPLICATIONS & INTERVIEWS
-- ============================================

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN (
    'applied', 'phone_qualification', 'technical_interview', 'director_interview',
    'offer_pending', 'offer_sent', 'accepted', 'rejected', 'withdrawn'
  )),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(candidate_id, requirement_id)
);

CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('phone_qualification', 'technical_interview', 'director_interview')),
  
  -- Scheduling
  interviewer_id UUID NOT NULL REFERENCES public.users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Outcome
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'pass', 'fail', 'reschedule')),
  
  -- Feedback - General
  general_comments TEXT,
  
  -- Feedback - Admin elements
  years_experience_confirmed INTEGER,
  degree_confirmed TEXT,
  right_to_work_confirmed TEXT,
  security_vetting_confirmed TEXT,
  current_salary_confirmed INTEGER,
  salary_expectation_confirmed TEXT,
  salary_proposed TEXT,
  open_to_relocate_confirmed BOOLEAN,
  relocation_notes TEXT,
  
  -- Feedback - Soft skills (1-5 scale)
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  communication_notes TEXT,
  professionalism_score INTEGER CHECK (professionalism_score >= 1 AND professionalism_score <= 5),
  professionalism_notes TEXT,
  enthusiasm_score INTEGER CHECK (enthusiasm_score >= 1 AND enthusiasm_score <= 5),
  enthusiasm_notes TEXT,
  cultural_fit_score INTEGER CHECK (cultural_fit_score >= 1 AND cultural_fit_score <= 5),
  cultural_fit_notes TEXT,
  
  -- Feedback - Technical
  technical_depth_score INTEGER CHECK (technical_depth_score >= 1 AND technical_depth_score <= 5),
  technical_depth_notes TEXT,
  problem_solving_score INTEGER CHECK (problem_solving_score >= 1 AND problem_solving_score <= 5),
  problem_solving_notes TEXT,
  technical_background TEXT,
  skills_summary TEXT,
  
  -- Feedback - Flexibility
  sector_flexibility_notes TEXT,
  scope_flexibility_notes TEXT,
  
  -- Recommendation
  recommendation TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CONTRACTS & APPROVALS
-- ============================================

CREATE TABLE public.contract_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  
  -- Contract terms
  job_title TEXT NOT NULL,
  salary INTEGER NOT NULL,
  salary_currency TEXT DEFAULT 'GBP',
  start_date DATE NOT NULL,
  location TEXT NOT NULL,
  right_to_work_verified BOOLEAN DEFAULT false,
  
  -- Additional terms
  notice_period TEXT,
  benefits TEXT,
  special_conditions TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'sent', 'signed'
  )),
  
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.approval_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_unit_id UUID REFERENCES public.business_units(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.approval_chain_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID NOT NULL REFERENCES public.approval_chains(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.users(id),
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(chain_id, sequence)
);

CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES public.contract_drafts(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.users(id),
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Candidates
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_skills ON public.candidates USING GIN(skills);
CREATE INDEX idx_candidates_search ON public.candidates USING GIN(
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || 
  coalesce(current_role, '') || ' ' || coalesce(summary, ''))
);
CREATE INDEX idx_candidates_created_at ON public.candidates(created_at DESC);

-- Requirements
CREATE INDEX idx_requirements_status ON public.requirements(status);
CREATE INDEX idx_requirements_owner ON public.requirements(owner_id);

-- Applications
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_requirement ON public.applications(requirement_id);
CREATE INDEX idx_applications_status ON public.applications(status);

-- Interviews
CREATE INDEX idx_interviews_application ON public.interviews(application_id);
CREATE INDEX idx_interviews_scheduled ON public.interviews(scheduled_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_chain_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users to read/write (you can make these more restrictive later)
CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "All authenticated can view business_units" ON public.business_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage business_units" ON public.business_units FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can create candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated can update candidates" ON public.candidates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "All authenticated can view documents" ON public.candidate_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can manage documents" ON public.candidate_documents FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view notes" ON public.candidate_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can manage notes" ON public.candidate_notes FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view requirements" ON public.requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can manage requirements" ON public.requirements FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view applications" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can manage applications" ON public.applications FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view interviews" ON public.interviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can manage interviews" ON public.interviews FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view contracts" ON public.contract_drafts FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can manage contracts" ON public.contract_drafts FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view approval_chains" ON public.approval_chains FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage approval_chains" ON public.approval_chains FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view approval_chain_steps" ON public.approval_chain_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage approval_chain_steps" ON public.approval_chain_steps FOR ALL TO authenticated USING (true);

CREATE POLICY "All authenticated can view approval_requests" ON public.approval_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Approvers can manage own requests" ON public.approval_requests FOR UPDATE TO authenticated USING (approver_id = auth.uid());

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_candidate_notes_updated_at BEFORE UPDATE ON public.candidate_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contract_drafts_updated_at BEFORE UPDATE ON public.contract_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- RECRUIT HUB DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & ORGANISATION
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'director', 'manager', 'recruiter', 'interviewer');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'recruiter',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CANDIDATES
-- ============================================

CREATE TYPE candidate_status AS ENUM (
  'new',
  'screening', 
  'phone_qualification',
  'technical_interview',
  'director_interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
  'on_hold'
);

CREATE TYPE right_to_work AS ENUM (
  'british_citizen',
  'settled_status',
  'pre_settled_status',
  'skilled_worker_visa',
  'graduate_visa',
  'other_visa',
  'requires_sponsorship',
  'unknown'
);

CREATE TYPE security_vetting AS ENUM (
  'none',
  'bpss',
  'ctc',
  'sc',
  'esc',
  'dv',
  'edv',
  'doe_q',
  'doe_l'
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  
  -- Professional information
  years_experience INTEGER,
  degree TEXT,
  summary TEXT,
  skills TEXT[] DEFAULT '{}',
  previous_companies TEXT[] DEFAULT '{}',
  
  -- Salary
  minimum_salary_expected INTEGER,
  
  -- Compliance
  right_to_work right_to_work DEFAULT 'unknown',
  security_vetting security_vetting DEFAULT 'none',
  
  -- Status
  status candidate_status DEFAULT 'new',
  source TEXT,
  
  -- Documents
  cv_url TEXT,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);

-- ============================================
-- REQUIREMENTS
-- ============================================

CREATE TYPE requirement_status AS ENUM (
  'opportunity',
  'active',
  'won',
  'lost',
  'cancelled'
);

CREATE TYPE engineering_discipline AS ENUM (
  'electrical',
  'mechanical',
  'civil',
  'software',
  'systems',
  'nuclear',
  'chemical',
  'structural',
  'other'
);

CREATE TABLE requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer information
  customer TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  
  -- Requirement details
  fte_count INTEGER DEFAULT 1,
  max_day_rate INTEGER,
  skills TEXT[] DEFAULT '{}',
  description TEXT,
  
  -- Classification
  engineering_discipline engineering_discipline DEFAULT 'software',
  clearance_required security_vetting DEFAULT 'none',
  
  -- Status
  status requirement_status DEFAULT 'opportunity',
  
  -- Assignment
  manager_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_manager ON requirements(manager_id);

-- ============================================
-- INTERVIEWS
-- ============================================

CREATE TYPE interview_stage AS ENUM (
  'phone_qualification',
  'technical_interview',
  'director_interview'
);

CREATE TYPE interview_outcome AS ENUM (
  'pending',
  'pass',
  'fail',
  'cancelled'
);

CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Links
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  
  -- Interview details
  stage interview_stage NOT NULL,
  interviewer_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Outcome
  outcome interview_outcome DEFAULT 'pending',
  
  -- Scores (1-5)
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  professionalism_score INTEGER CHECK (professionalism_score >= 1 AND professionalism_score <= 5),
  enthusiasm_score INTEGER CHECK (enthusiasm_score >= 1 AND enthusiasm_score <= 5),
  cultural_fit_score INTEGER CHECK (cultural_fit_score >= 1 AND cultural_fit_score <= 5),
  technical_depth_score INTEGER CHECK (technical_depth_score >= 1 AND technical_depth_score <= 5),
  problem_solving_score INTEGER CHECK (problem_solving_score >= 1 AND problem_solving_score <= 5),
  
  -- Feedback
  general_comments TEXT,
  recommendation TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_interviewer ON interviews(interviewer_id);
CREATE INDEX idx_interviews_scheduled ON interviews(scheduled_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Users can read all users (for dropdowns etc)
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Everyone can read candidates
CREATE POLICY "Authenticated users can view candidates" ON candidates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Everyone can insert candidates
CREATE POLICY "Authenticated users can insert candidates" ON candidates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Everyone can update candidates
CREATE POLICY "Authenticated users can update candidates" ON candidates
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Everyone can read requirements
CREATE POLICY "Authenticated users can view requirements" ON requirements
  FOR SELECT USING (auth.role() = 'authenticated');

-- Everyone can insert requirements
CREATE POLICY "Authenticated users can insert requirements" ON requirements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Everyone can update requirements
CREATE POLICY "Authenticated users can update requirements" ON requirements
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Everyone can read interviews
CREATE POLICY "Authenticated users can view interviews" ON interviews
  FOR SELECT USING (auth.role() = 'authenticated');

-- Everyone can insert interviews
CREATE POLICY "Authenticated users can insert interviews" ON interviews
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Everyone can update interviews
CREATE POLICY "Authenticated users can update interviews" ON interviews
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_requirements_updated_at
  BEFORE UPDATE ON requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA - TEST USERS
-- ============================================

-- Note: These users need to be created in Supabase Auth first
-- Then update these UUIDs to match the auth.users IDs

-- For now, insert placeholder users that you'll update later
INSERT INTO users (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@recruithub.com', 'Admin User', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'director@recruithub.com', 'Sarah Thompson', 'director'),
  ('00000000-0000-0000-0000-000000000003', 'manager@recruithub.com', 'James Wilson', 'manager'),
  ('00000000-0000-0000-0000-000000000004', 'recruiter@recruithub.com', 'Emma Clarke', 'recruiter'),
  ('00000000-0000-0000-0000-000000000005', 'interviewer@recruithub.com', 'Michael Chen', 'interviewer');

-- ============================================
-- DONE!
-- ============================================
-- Add assigned_recruiter_id to candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS assigned_recruiter_id UUID REFERENCES users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_candidates_assigned_recruiter ON candidates(assigned_recruiter_id);
-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
CREATE POLICY "Users can view all applications" ON applications
  FOR SELECT USING (true);

CREATE POLICY "Users can create applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update applications" ON applications
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete applications" ON applications
  FOR DELETE USING (true);
-- Create candidate_comments table for activity/discussion on candidates
CREATE TABLE IF NOT EXISTS candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_candidate_comments_candidate_id ON candidate_comments(candidate_id);
CREATE INDEX idx_candidate_comments_user_id ON candidate_comments(user_id);

-- Enable RLS
ALTER TABLE candidate_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view comments
CREATE POLICY "Users can view all comments" ON candidate_comments
  FOR SELECT USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments" ON candidate_comments
  FOR INSERT WITH CHECK (true);

-- Users can only update their own comments
CREATE POLICY "Users can update own comments" ON candidate_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own comments (or admin)
CREATE POLICY "Users can delete own comments" ON candidate_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Add created_by to requirements table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requirements' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE requirements ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;
-- Create customer_assessments table
CREATE TABLE IF NOT EXISTS customer_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  customer_contact TEXT,
  location TEXT,
  notes TEXT,
  outcome TEXT CHECK (outcome IN ('pending', 'go', 'nogo')),
  outcome_notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_assessments_application_id ON customer_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_customer_assessments_scheduled_date ON customer_assessments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_customer_assessments_outcome ON customer_assessments(outcome);

-- Enable RLS
ALTER TABLE customer_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all customer assessments" ON customer_assessments
  FOR SELECT USING (true);

CREATE POLICY "Users can create customer assessments" ON customer_assessments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customer assessments" ON customer_assessments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete customer assessments" ON customer_assessments
  FOR DELETE USING (true);
-- Fix RLS policies for delete operations
-- This allows authenticated users (especially admin) to delete records

-- Drop existing restrictive delete policies if they exist
DROP POLICY IF EXISTS "Users can delete candidates" ON candidates;
DROP POLICY IF EXISTS "Users can delete requirements" ON requirements;

-- Create permissive delete policies (admin check done in application)
CREATE POLICY "Authenticated users can delete candidates" ON candidates
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete requirements" ON requirements
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also ensure comments can be deleted by their owner
DROP POLICY IF EXISTS "Users can delete own comments" ON candidate_comments;
CREATE POLICY "Users can delete own comments" ON candidate_comments
  FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- If RLS is too restrictive, you can also disable it temporarily for testing
-- ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE requirements DISABLE ROW LEVEL SECURITY;
-- Add new interview fields
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS warnings TEXT,
ADD COLUMN IF NOT EXISTS contract_preference VARCHAR(50),
ADD COLUMN IF NOT EXISTS salary_proposed DECIMAL(10,2);

-- contract_preference values: 'contractor', 'permanent', 'open_to_both'
-- Migration: Change role (single) to roles (array)
-- This allows users to have multiple roles

-- Step 1: Add new roles column as array
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['recruiter'];

-- Step 2: Migrate existing role data to roles array
UPDATE users SET roles = ARRAY[role] WHERE role IS NOT NULL AND (roles IS NULL OR roles = '{}');

-- Step 3: Drop the old role column (optional - can keep for backwards compatibility)
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Note: If you want to keep backwards compatibility during transition, 
-- keep the old 'role' column and update both when changing roles.
-- Once all code is updated, you can drop the old column.
-- Add reference_id columns for human-readable IDs
-- These will be auto-generated using triggers

-- Add reference_id and deleted_at to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add reference_id and deleted_at to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add reference_id and deleted_at to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add reference_id, title and deleted_at to requirements
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for soft delete queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_candidates_deleted_at ON candidates(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requirements_deleted_at ON requirements(deleted_at) WHERE deleted_at IS NULL;

-- Create sequences for auto-generating reference IDs
CREATE SEQUENCE IF NOT EXISTS candidate_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS company_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contact_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS requirement_ref_seq START 1;

-- Function to generate candidate reference ID
CREATE OR REPLACE FUNCTION generate_candidate_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'CAND-' || LPAD(nextval('candidate_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate company reference ID
CREATE OR REPLACE FUNCTION generate_company_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'CUST-' || LPAD(nextval('company_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate contact reference ID
CREATE OR REPLACE FUNCTION generate_contact_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'CON-' || LPAD(nextval('contact_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate requirement reference ID
CREATE OR REPLACE FUNCTION generate_requirement_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'REQ-' || LPAD(nextval('requirement_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS set_candidate_reference_id ON candidates;
CREATE TRIGGER set_candidate_reference_id
  BEFORE INSERT ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION generate_candidate_reference_id();

DROP TRIGGER IF EXISTS set_company_reference_id ON companies;
CREATE TRIGGER set_company_reference_id
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION generate_company_reference_id();

DROP TRIGGER IF EXISTS set_contact_reference_id ON contacts;
CREATE TRIGGER set_contact_reference_id
  BEFORE INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION generate_contact_reference_id();

DROP TRIGGER IF EXISTS set_requirement_reference_id ON requirements;
CREATE TRIGGER set_requirement_reference_id
  BEFORE INSERT ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION generate_requirement_reference_id();

-- Backfill existing records with reference IDs
UPDATE candidates SET reference_id = 'CAND-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') 
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM candidates WHERE reference_id IS NULL) sub 
WHERE candidates.id = sub.id AND candidates.reference_id IS NULL;

UPDATE companies SET reference_id = 'CUST-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM companies WHERE reference_id IS NULL) sub
WHERE companies.id = sub.id AND companies.reference_id IS NULL;

UPDATE contacts SET reference_id = 'CON-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM contacts WHERE reference_id IS NULL) sub
WHERE contacts.id = sub.id AND contacts.reference_id IS NULL;

UPDATE requirements SET reference_id = 'REQ-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM requirements WHERE reference_id IS NULL) sub
WHERE requirements.id = sub.id AND requirements.reference_id IS NULL;

-- Reset sequences to max value + 1
SELECT setval('candidate_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)) FROM candidates WHERE reference_id LIKE 'CAND-%'), 0) + 1);
SELECT setval('company_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)) FROM companies WHERE reference_id LIKE 'CUST-%'), 0) + 1);
SELECT setval('contact_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)) FROM contacts WHERE reference_id LIKE 'CON-%'), 0) + 1);
SELECT setval('requirement_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)) FROM requirements WHERE reference_id LIKE 'REQ-%'), 0) + 1);
-- Add org chart fields to contacts table
-- This adds role and direct report linking for org chart visualization

-- Add role field (e.g., "CEO", "Director", "Manager", etc.)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS role VARCHAR(100);

-- Add reports_to field (links to another contact who is their direct manager)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Create index for reports_to lookups
CREATE INDEX IF NOT EXISTS idx_contacts_reports_to ON contacts(reports_to_id);

-- Update requirements table to also link to a contact (the person who raised the requirement)
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requirements_contact ON requirements(contact_id);
-- Customers and Contacts tables for CRM functionality

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(50), -- e.g., '1-10', '11-50', '51-200', '201-500', '500+'
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'United Kingdom',
  status VARCHAR(50) DEFAULT 'prospect', -- prospect, active, inactive
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer_id to requirements (link requirements to customers)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view customers" ON customers
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and above can create customers" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers and above can update customers" ON customers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customers" ON customers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- Customer contacts policies
CREATE POLICY "Users can view customer contacts" ON customer_contacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and above can manage contacts" ON customer_contacts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_requirements_customer ON requirements(customer_id);
-- Customers Module: Companies and Contacts
-- This creates the structure for managing customers and their contacts

-- Companies table (supports parent/child hierarchy)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255),  -- If different from registered name
  companies_house_number VARCHAR(20),
  
  -- Classification
  industry VARCHAR(100),
  company_size VARCHAR(50),  -- e.g., 'startup', 'sme', 'enterprise'
  
  -- Hierarchy (for business units / subsidiaries)
  parent_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Primary Address
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United Kingdom',
  
  -- Contact Info
  main_phone VARCHAR(50),
  main_email VARCHAR(255),
  website VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'prospect',  -- prospect, active, inactive, former
  
  -- Notes
  notes TEXT,
  
  -- Ownership
  created_by UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table (people at companies)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Linked company (required)
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Personal Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(255),
  department VARCHAR(100),
  
  -- Contact Details
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  linkedin_url VARCHAR(500),
  
  -- Status
  is_primary_contact BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer meetings / interactions
CREATE TABLE IF NOT EXISTS customer_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Meeting details
  meeting_type VARCHAR(50) NOT NULL,  -- call, video, in_person, email
  subject VARCHAR(255) NOT NULL,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Location (for in-person)
  location VARCHAR(255),
  
  -- Notes
  notes TEXT,
  outcome TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Ownership
  created_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update requirements table to link to companies
ALTER TABLE requirements 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_parent ON companies(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_meetings_company ON customer_meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_requirements_company ON requirements(company_id);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view companies" ON companies
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert companies" ON companies
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update companies" ON companies
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete companies" ON companies
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts" ON contacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert contacts" ON contacts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update contacts" ON contacts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete contacts" ON contacts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- RLS Policies for customer_meetings
CREATE POLICY "Users can view customer_meetings" ON customer_meetings
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert customer_meetings" ON customer_meetings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_meetings" ON customer_meetings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_meetings" ON customer_meetings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);
-- Fix interviews table to ensure all required columns exist
-- This migration reconciles differences between original and updated schema

-- Add candidate_id if it doesn't exist (newer schema uses this instead of application_id)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id);

-- Add deleted_at for soft deletes
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add requirement_id for linking to requirements
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES requirements(id);

-- Ensure warnings column exists
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS warnings TEXT;

-- Ensure contract_preference column exists
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS contract_preference VARCHAR(50);

-- Ensure salary_proposed exists (use NUMERIC to handle both number and decimal inputs)
-- First check if it exists as TEXT and needs conversion
DO $$
BEGIN
  -- Try to add as numeric type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'salary_proposed') THEN
    ALTER TABLE interviews ADD COLUMN salary_proposed NUMERIC(10,2);
  END IF;
END $$;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_interviews_deleted_at ON interviews(deleted_at);

-- Create index for candidate lookups  
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
-- Fix script for offers table RLS policy
-- Run this if you already have the offers table but are getting permission errors

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update relevant offers" ON offers;

-- Create simpler update policy
CREATE POLICY "Authenticated users can update offers" ON offers
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create delete policy if not exists
DROP POLICY IF EXISTS "Authenticated users can delete offers" ON offers;
CREATE POLICY "Authenticated users can delete offers" ON offers
  FOR DELETE USING (auth.uid() IS NOT NULL);
-- Fix RLS policy for users table to allow admins to create new users
-- The issue is the check was too restrictive

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

-- Create a more permissive policy
-- Allow authenticated users to insert if:
-- 1. They are inserting their own record (for initial setup / self-registration)
-- 2. They have admin role (can create any user)
CREATE POLICY "Users can insert" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow self-insert (user creating their own profile after auth signup)
  auth.uid() = id
  OR
  -- Allow admins to insert any user
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- Also ensure admins can delete users
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);
-- Add meeting status and outcome notes to customer_meetings
-- Status: planned, completed, cancelled
-- preparation_notes: notes before the meeting (what to prepare)
-- outcome_notes: notes after the meeting (takeaways) or cancellation reason

ALTER TABLE customer_meetings
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned',
ADD COLUMN IF NOT EXISTS preparation_notes TEXT,
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Add constraint for valid status values
-- Note: If constraint already exists, this will fail silently
DO $$
BEGIN
  ALTER TABLE customer_meetings
  ADD CONSTRAINT customer_meetings_status_check
  CHECK (status IN ('planned', 'completed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_customer_meetings_status ON customer_meetings(status);

-- Comment on columns for documentation
COMMENT ON COLUMN customer_meetings.status IS 'Meeting status: planned, completed, or cancelled';
COMMENT ON COLUMN customer_meetings.preparation_notes IS 'Notes for meeting preparation (before the meeting)';
COMMENT ON COLUMN customer_meetings.outcome_notes IS 'Notes about meeting outcome/takeaways or cancellation reason';
-- Offers table for contract workflow
-- This stores offer requests that need approval before becoming contracts

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  
  -- Offer details
  job_title TEXT NOT NULL,
  salary_amount DECIMAL(12,2),
  salary_currency TEXT DEFAULT 'GBP',
  contract_type TEXT NOT NULL DEFAULT 'permanent', -- permanent, contract, fixed_term
  day_rate DECIMAL(10,2), -- For contractors
  start_date DATE NOT NULL,
  end_date DATE, -- For fixed term contracts
  work_location TEXT,
  
  -- Candidate document details
  candidate_full_name TEXT NOT NULL, -- Full legal name for contract
  candidate_address TEXT,
  candidate_nationality TEXT,
  
  -- Document uploads (store file paths/URLs)
  id_document_url TEXT, -- Passport or British ID
  right_to_work_document_url TEXT, -- RTW proof if non-British
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending_approval', 
  -- pending_approval, approved, rejected, contract_sent, contract_signed, withdrawn
  
  requested_by UUID REFERENCES users(id),
  approver_id UUID REFERENCES users(id), -- The director who needs to approve
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Contract tracking
  contract_sent_at TIMESTAMPTZ,
  contract_sent_by UUID REFERENCES users(id),
  contract_signed_at TIMESTAMPTZ,
  contract_signed_confirmed_by UUID REFERENCES users(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_requirement ON offers(requirement_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_approver ON offers(approver_id);
CREATE INDEX IF NOT EXISTS idx_offers_requested_by ON offers(requested_by);

-- RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Everyone can read offers (we'll restrict in UI based on role)
CREATE POLICY "Users can read offers" ON offers
  FOR SELECT USING (true);

-- Authenticated users can create offers
CREATE POLICY "Authenticated users can create offers" ON offers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update offers (UI controls who can do what)
CREATE POLICY "Authenticated users can update offers" ON offers
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete offers
CREATE POLICY "Authenticated users can delete offers" ON offers
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Comments for documentation
COMMENT ON TABLE offers IS 'Stores job offers pending approval and contract workflow status';
COMMENT ON COLUMN offers.status IS 'pending_approval, approved, rejected, contract_sent, contract_signed, withdrawn';
COMMENT ON COLUMN offers.approver_id IS 'The director (from org hierarchy) who needs to approve this offer';
-- Add winning_candidate_id to requirements
-- This is set when a Customer Assessment results in GO

ALTER TABLE requirements 
ADD COLUMN IF NOT EXISTS winning_candidate_id UUID REFERENCES candidates(id),
ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;

-- Add requirement_id to customer_assessments for direct linking
ALTER TABLE customer_assessments
ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES requirements(id);

-- Create index for winning candidate lookups
CREATE INDEX IF NOT EXISTS idx_requirements_winning_candidate ON requirements(winning_candidate_id);
CREATE INDEX IF NOT EXISTS idx_customer_assessments_requirement ON customer_assessments(requirement_id);

-- Comment on columns for documentation
COMMENT ON COLUMN requirements.winning_candidate_id IS 'The candidate who won this requirement (set when assessment = GO)';
COMMENT ON COLUMN requirements.won_at IS 'Timestamp when the requirement was won';
COMMENT ON COLUMN customer_assessments.requirement_id IS 'Direct link to requirement for easier querying';
-- ============================================
-- ADD SUPERADMIN TO ALL RLS POLICIES
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- COMPANIES
DROP POLICY IF EXISTS "Managers can insert companies" ON companies;
DROP POLICY IF EXISTS "Managers can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

CREATE POLICY "Managers can insert companies" ON companies
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update companies" ON companies
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete companies" ON companies
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CONTACTS
DROP POLICY IF EXISTS "Managers can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Managers can update contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON contacts;

CREATE POLICY "Managers can insert contacts" ON contacts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update contacts" ON contacts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete contacts" ON contacts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Managers can insert customers" ON customers;
DROP POLICY IF EXISTS "Managers can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

CREATE POLICY "Managers can insert customers" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customers" ON customers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customers" ON customers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMER_CONTACTS
DROP POLICY IF EXISTS "Managers can insert customer_contacts" ON customer_contacts;
DROP POLICY IF EXISTS "Managers can update customer_contacts" ON customer_contacts;
DROP POLICY IF EXISTS "Admins can delete customer_contacts" ON customer_contacts;

CREATE POLICY "Managers can insert customer_contacts" ON customer_contacts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_contacts" ON customer_contacts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_contacts" ON customer_contacts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMER_MEETINGS
DROP POLICY IF EXISTS "Managers can insert customer_meetings" ON customer_meetings;
DROP POLICY IF EXISTS "Managers can update customer_meetings" ON customer_meetings;
DROP POLICY IF EXISTS "Admins can delete customer_meetings" ON customer_meetings;

CREATE POLICY "Managers can insert customer_meetings" ON customer_meetings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_meetings" ON customer_meetings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_meetings" ON customer_meetings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMER_ASSESSMENTS
DROP POLICY IF EXISTS "Managers can insert customer_assessments" ON customer_assessments;
DROP POLICY IF EXISTS "Managers can update customer_assessments" ON customer_assessments;
DROP POLICY IF EXISTS "Admins can delete customer_assessments" ON customer_assessments;

CREATE POLICY "Managers can insert customer_assessments" ON customer_assessments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_assessments" ON customer_assessments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_assessments" ON customer_assessments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CONSULTANTS
DROP POLICY IF EXISTS "Managers can insert consultants" ON consultants;
DROP POLICY IF EXISTS "Managers can update consultants" ON consultants;
DROP POLICY IF EXISTS "Admins can delete consultants" ON consultants;

CREATE POLICY "Managers can insert consultants" ON consultants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update consultants" ON consultants
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete consultants" ON consultants
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- MISSIONS
DROP POLICY IF EXISTS "Managers can insert missions" ON missions;
DROP POLICY IF EXISTS "Managers can update missions" ON missions;
DROP POLICY IF EXISTS "Admins can delete missions" ON missions;

CREATE POLICY "Managers can insert missions" ON missions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update missions" ON missions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete missions" ON missions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CONSULTANT_MEETINGS
DROP POLICY IF EXISTS "Managers can insert consultant_meetings" ON consultant_meetings;
DROP POLICY IF EXISTS "Managers can update consultant_meetings" ON consultant_meetings;
DROP POLICY IF EXISTS "Admins can delete consultant_meetings" ON consultant_meetings;

CREATE POLICY "Managers can insert consultant_meetings" ON consultant_meetings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update consultant_meetings" ON consultant_meetings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete consultant_meetings" ON consultant_meetings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- APPROVAL_REQUESTS
DROP POLICY IF EXISTS "Managers can insert approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Directors can update approval_requests" ON approval_requests;

CREATE POLICY "Managers can insert approval_requests" ON approval_requests
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Directors can update approval_requests" ON approval_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'hr'])
  )
);

-- SALARY_HISTORY
DROP POLICY IF EXISTS "Managers can insert salary_history" ON salary_history;
DROP POLICY IF EXISTS "Managers can update salary_history" ON salary_history;

CREATE POLICY "Managers can insert salary_history" ON salary_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

CREATE POLICY "Managers can update salary_history" ON salary_history
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

-- BONUS_PAYMENTS
DROP POLICY IF EXISTS "Managers can insert bonus_payments" ON bonus_payments;
DROP POLICY IF EXISTS "Managers can update bonus_payments" ON bonus_payments;

CREATE POLICY "Managers can insert bonus_payments" ON bonus_payments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

CREATE POLICY "Managers can update bonus_payments" ON bonus_payments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

-- CONSULTANT_EXITS
DROP POLICY IF EXISTS "Managers can insert consultant_exits" ON consultant_exits;
DROP POLICY IF EXISTS "Directors can update consultant_exits" ON consultant_exits;

CREATE POLICY "Managers can insert consultant_exits" ON consultant_exits
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Directors can update consultant_exits" ON consultant_exits
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'hr'])
  )
);

-- HR_TICKETS
DROP POLICY IF EXISTS "HR can manage tickets" ON hr_tickets;

CREATE POLICY "HR can manage tickets" ON hr_tickets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'hr'])
  )
);

-- USERS (for creating new users)
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

CREATE POLICY "Admins can insert users" ON users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

CREATE POLICY "Admins can update users" ON users
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- Verify superadmin role is working
SELECT email, roles FROM users WHERE 'superadmin' = ANY(roles);
-- ============================================
-- SALARY HISTORY TABLE
-- ============================================
-- Tracks all salary changes for consultants

CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Salary details
  salary_type TEXT NOT NULL, -- 'annual_salary' or 'day_rate'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  
  -- Effective date (month/year)
  effective_month INTEGER NOT NULL, -- 1-12
  effective_year INTEGER NOT NULL,
  
  -- Change reason
  change_type TEXT NOT NULL, -- 'initial', 'increase', 'decrease', 'adjustment'
  change_reason TEXT,
  
  -- Link to approval if applicable
  approval_request_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_salary_history_consultant ON salary_history(consultant_id);
CREATE INDEX idx_salary_history_effective ON salary_history(effective_year, effective_month);

-- RLS
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read salary history" ON salary_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create salary history" ON salary_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- BONUS PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bonus_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Bonus details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  bonus_type TEXT NOT NULL, -- 'performance', 'retention', 'project', 'referral', 'other'
  reason TEXT NOT NULL,
  
  -- Payment date (month/year)
  payment_month INTEGER NOT NULL,
  payment_year INTEGER NOT NULL,
  
  -- Link to approval
  approval_request_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_bonus_payments_consultant ON bonus_payments(consultant_id);

-- RLS
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read bonus payments" ON bonus_payments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create bonus payments" ON bonus_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- APPROVAL REQUESTS TABLE
-- ============================================
-- Generic approval workflow for various HR processes

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- APR-0001
  
  -- Request type
  request_type TEXT NOT NULL, -- 'salary_increase', 'bonus_payment', 'employee_exit'
  
  -- Subject (consultant this relates to)
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Request details (type-specific data stored as JSONB)
  request_data JSONB NOT NULL,
  /*
    For salary_increase:
    { "current_salary": 50000, "new_salary": 55000, "salary_type": "annual_salary", "reason": "..." }
    
    For bonus_payment:
    { "amount": 2000, "bonus_type": "performance", "reason": "..." }
    
    For employee_exit:
    { "exit_reason": "resignation", "exit_details": "...", "last_working_day": "2025-03-31" }
  */
  
  -- Effective date (month/year)
  effective_month INTEGER NOT NULL,
  effective_year INTEGER NOT NULL,
  
  -- Overall status
  status TEXT NOT NULL DEFAULT 'pending', 
  -- 'pending', 'pending_hr', 'approved', 'rejected', 'cancelled'
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  request_notes TEXT,
  
  -- Director approval (required for all)
  director_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  director_approved_by UUID REFERENCES users(id),
  director_approved_at TIMESTAMPTZ,
  director_notes TEXT,
  
  -- HR approval (required for employee_exit only)
  hr_required BOOLEAN DEFAULT FALSE,
  hr_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'not_required'
  hr_approved_by UUID REFERENCES users(id),
  hr_approved_at TIMESTAMPTZ,
  hr_notes TEXT,
  
  -- Rejection
  rejection_reason TEXT,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate reference_id
CREATE OR REPLACE FUNCTION generate_approval_request_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM approval_requests 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'APR-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_approval_request_reference_id ON approval_requests;
CREATE TRIGGER set_approval_request_reference_id
  BEFORE INSERT ON approval_requests
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_approval_request_reference_id();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_approval_requests_consultant ON approval_requests(consultant_id);
CREATE INDEX idx_approval_requests_type ON approval_requests(request_type);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_director_status ON approval_requests(director_status);
CREATE INDEX idx_approval_requests_hr_status ON approval_requests(hr_status);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);

-- RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read approval requests" ON approval_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create approval requests" ON approval_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update approval requests" ON approval_requests FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- CONSULTANT EXIT RECORDS
-- ============================================
-- When an exit is fully approved, record here

CREATE TABLE IF NOT EXISTS consultant_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Exit details
  exit_reason TEXT NOT NULL, -- 'resignation', 'redundancy', 'end_of_contract', 'dismissal', 'mutual_agreement', 'retirement'
  exit_details TEXT,
  last_working_day DATE NOT NULL,
  
  -- Link to approval
  approval_request_id UUID REFERENCES approval_requests(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_consultant_exits_consultant ON consultant_exits(consultant_id);

-- RLS
ALTER TABLE consultant_exits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read consultant exits" ON consultant_exits FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create consultant exits" ON consultant_exits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add foreign key back to salary_history and bonus_payments
ALTER TABLE salary_history ADD CONSTRAINT fk_salary_history_approval 
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);
ALTER TABLE bonus_payments ADD CONSTRAINT fk_bonus_payments_approval 
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);

COMMENT ON TABLE approval_requests IS 'Generic approval workflow for HR processes';
COMMENT ON COLUMN approval_requests.request_type IS 'salary_increase, bonus_payment, employee_exit';
COMMENT ON COLUMN approval_requests.status IS 'pending, pending_hr, approved, rejected, cancelled';
-- ============================================
-- CONSOLIDATED FIX MIGRATION
-- Run this AFTER all existing migrations
-- This fixes naming issues and adds missing tables
-- ============================================

-- ============================================
-- STEP 1: Create customers table (alias/copy of companies structure)
-- The app uses 'customers' but we have 'companies'
-- ============================================

-- Option A: Create view (simpler, but some operations may not work)
-- CREATE OR REPLACE VIEW customers AS SELECT * FROM companies;

-- Option B: Create actual customers table (recommended)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255),
  companies_house_number VARCHAR(20),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  parent_company_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United Kingdom',
  main_phone VARCHAR(50),
  main_email VARCHAR(255),
  website VARCHAR(255),
  status VARCHAR(50) DEFAULT 'prospect',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_parent ON customers(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Managers can insert customers" ON customers;
DROP POLICY IF EXISTS "Managers can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

CREATE POLICY "Users can view customers" ON customers
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert customers" ON customers
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update customers" ON customers
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete customers" ON customers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- ============================================
-- STEP 2: Create customer_contacts table
-- ============================================

CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(255),
  department VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  linkedin_url VARCHAR(500),
  is_primary_contact BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view customer_contacts" ON customer_contacts;
DROP POLICY IF EXISTS "Users can manage customer_contacts" ON customer_contacts;

CREATE POLICY "Users can view customer_contacts" ON customer_contacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage customer_contacts" ON customer_contacts
FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 3: Consultants table
-- ============================================

CREATE TABLE IF NOT EXISTS consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE,
  
  -- Link to original candidate
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  
  -- Personal info (copied from candidate at conversion)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  linkedin_url VARCHAR(500),
  
  -- Employment details
  job_title VARCHAR(255),
  contract_type VARCHAR(50), -- permanent, contract
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Financials
  salary_amount DECIMAL(10,2),
  salary_currency VARCHAR(10) DEFAULT 'GBP',
  day_rate DECIMAL(10,2),
  
  -- Skills and clearance
  skills TEXT[],
  security_vetting VARCHAR(50),
  nationalities TEXT[],
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'bench', -- bench, in_mission, on_leave, terminated
  
  -- Termination (if applicable)
  terminated_at DATE,
  termination_reason TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Auto-generate reference_id for consultants
CREATE OR REPLACE FUNCTION generate_consultant_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM consultants 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'CON-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_consultant_reference_id ON consultants;
CREATE TRIGGER set_consultant_reference_id
  BEFORE INSERT ON consultants
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_consultant_reference_id();

CREATE INDEX IF NOT EXISTS idx_consultants_candidate ON consultants(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consultants_status ON consultants(status);
CREATE INDEX IF NOT EXISTS idx_consultants_deleted ON consultants(deleted_at);

ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read consultants" ON consultants;
DROP POLICY IF EXISTS "Authenticated users can create consultants" ON consultants;
DROP POLICY IF EXISTS "Authenticated users can update consultants" ON consultants;

CREATE POLICY "Users can read consultants" ON consultants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create consultants" ON consultants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update consultants" ON consultants
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 4: Missions table
-- ============================================

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE,
  name TEXT NOT NULL,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sold_daily_rate DECIMAL(10,2) NOT NULL,
  location TEXT,
  work_mode TEXT NOT NULL DEFAULT 'hybrid',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Auto-generate reference_id for missions
CREATE OR REPLACE FUNCTION generate_mission_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM missions 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'MISS-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mission_reference_id ON missions;
CREATE TRIGGER set_mission_reference_id
  BEFORE INSERT ON missions
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_mission_reference_id();

CREATE INDEX IF NOT EXISTS idx_missions_requirement ON missions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_missions_customer ON missions(customer_id);
CREATE INDEX IF NOT EXISTS idx_missions_consultant ON missions(consultant_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(start_date, end_date);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read missions" ON missions;
DROP POLICY IF EXISTS "Authenticated users can manage missions" ON missions;

CREATE POLICY "Users can read missions" ON missions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage missions" ON missions FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 5: Consultant Meetings table
-- ============================================

CREATE TABLE IF NOT EXISTS consultant_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled',
  completed_at TIMESTAMPTZ,
  conducted_by UUID REFERENCES users(id),
  general_comments TEXT,
  risks_identified TEXT,
  consultant_requests TEXT,
  induction_checklist JSONB,
  quarterly_feedback JSONB,
  appraisal_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_consultant_meetings_consultant ON consultant_meetings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_status ON consultant_meetings(status);

ALTER TABLE consultant_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read consultant_meetings" ON consultant_meetings;
DROP POLICY IF EXISTS "Users can manage consultant_meetings" ON consultant_meetings;

CREATE POLICY "Users can read consultant_meetings" ON consultant_meetings FOR SELECT USING (true);
CREATE POLICY "Users can manage consultant_meetings" ON consultant_meetings FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 6: Approval System
-- ============================================

-- Salary History
CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  salary_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  effective_month INTEGER NOT NULL,
  effective_year INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  change_reason TEXT,
  approval_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_salary_history_consultant ON salary_history(consultant_id);
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_salary" ON salary_history;
DROP POLICY IF EXISTS "manage_salary" ON salary_history;

CREATE POLICY "read_salary" ON salary_history FOR SELECT USING (true);
CREATE POLICY "manage_salary" ON salary_history FOR ALL USING (auth.uid() IS NOT NULL);

-- Bonus Payments
CREATE TABLE IF NOT EXISTS bonus_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  bonus_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  payment_month INTEGER NOT NULL,
  payment_year INTEGER NOT NULL,
  approval_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_payments_consultant ON bonus_payments(consultant_id);
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_bonus" ON bonus_payments;
DROP POLICY IF EXISTS "manage_bonus" ON bonus_payments;

CREATE POLICY "read_bonus" ON bonus_payments FOR SELECT USING (true);
CREATE POLICY "manage_bonus" ON bonus_payments FOR ALL USING (auth.uid() IS NOT NULL);

-- Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE,
  request_type TEXT NOT NULL,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  request_data JSONB NOT NULL,
  effective_month INTEGER NOT NULL,
  effective_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  request_notes TEXT,
  director_status TEXT DEFAULT 'pending',
  director_approved_by UUID REFERENCES users(id),
  director_approved_at TIMESTAMPTZ,
  director_notes TEXT,
  hr_required BOOLEAN DEFAULT FALSE,
  hr_status TEXT DEFAULT 'pending',
  hr_approved_by UUID REFERENCES users(id),
  hr_approved_at TIMESTAMPTZ,
  hr_notes TEXT,
  rejection_reason TEXT,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_approval_request_reference_id()
RETURNS TRIGGER AS $$ 
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 INTO next_num FROM approval_requests WHERE reference_id IS NOT NULL;
  NEW.reference_id := 'APR-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_approval_request_reference_id ON approval_requests;
CREATE TRIGGER set_approval_request_reference_id BEFORE INSERT ON approval_requests FOR EACH ROW WHEN (NEW.reference_id IS NULL) EXECUTE FUNCTION generate_approval_request_reference_id();

CREATE INDEX IF NOT EXISTS idx_approval_requests_consultant ON approval_requests(consultant_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_approvals" ON approval_requests;
DROP POLICY IF EXISTS "manage_approvals" ON approval_requests;

CREATE POLICY "read_approvals" ON approval_requests FOR SELECT USING (true);
CREATE POLICY "manage_approvals" ON approval_requests FOR ALL USING (auth.uid() IS NOT NULL);

-- Consultant Exits
CREATE TABLE IF NOT EXISTS consultant_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  exit_reason TEXT NOT NULL,
  exit_details TEXT,
  last_working_day DATE NOT NULL,
  approval_request_id UUID REFERENCES approval_requests(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_consultant_exits_consultant ON consultant_exits(consultant_id);
ALTER TABLE consultant_exits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_exits" ON consultant_exits;
DROP POLICY IF EXISTS "manage_exits" ON consultant_exits;

CREATE POLICY "read_exits" ON consultant_exits FOR SELECT USING (true);
CREATE POLICY "manage_exits" ON consultant_exits FOR ALL USING (auth.uid() IS NOT NULL);

-- HR Tickets
CREATE TABLE IF NOT EXISTS hr_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE,
  ticket_type TEXT NOT NULL,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  ticket_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE OR REPLACE FUNCTION generate_hr_ticket_reference_id()
RETURNS TRIGGER AS $$ 
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 INTO next_num FROM hr_tickets WHERE reference_id IS NOT NULL;
  NEW.reference_id := 'HRT-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_hr_ticket_reference_id ON hr_tickets;
CREATE TRIGGER set_hr_ticket_reference_id BEFORE INSERT ON hr_tickets FOR EACH ROW WHEN (NEW.reference_id IS NULL) EXECUTE FUNCTION generate_hr_ticket_reference_id();

CREATE INDEX IF NOT EXISTS idx_hr_tickets_status ON hr_tickets(status);
ALTER TABLE hr_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_hr_tickets" ON hr_tickets;
DROP POLICY IF EXISTS "manage_hr_tickets" ON hr_tickets;

CREATE POLICY "read_hr_tickets" ON hr_tickets FOR SELECT USING (true);
CREATE POLICY "manage_hr_tickets" ON hr_tickets FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 7: Add foreign keys for approval links
-- ============================================
ALTER TABLE salary_history DROP CONSTRAINT IF EXISTS fk_salary_history_approval;
ALTER TABLE salary_history ADD CONSTRAINT fk_salary_history_approval FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);

ALTER TABLE bonus_payments DROP CONSTRAINT IF EXISTS fk_bonus_payments_approval;
ALTER TABLE bonus_payments ADD CONSTRAINT fk_bonus_payments_approval FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);

-- ============================================
-- STEP 8: Add winning_candidate_id to requirements if missing
-- ============================================
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS winning_candidate_id UUID REFERENCES candidates(id);

-- ============================================
-- Done!
-- ============================================
-- Consultant career meetings table
-- Stores induction, quarterly reviews, and annual appraisals
CREATE TABLE IF NOT EXISTS consultant_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Meeting type
  meeting_type TEXT NOT NULL, -- induction, quarterly_review, annual_appraisal
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
  completed_at TIMESTAMPTZ,
  
  -- Who conducted the meeting
  conducted_by UUID REFERENCES users(id),
  
  -- Common fields
  general_comments TEXT,
  risks_identified TEXT,
  consultant_requests TEXT,
  
  -- Induction specific (checklist stored as JSONB)
  induction_checklist JSONB,
  -- Example: {"induction_pack_presented": true, "risk_assessment_presented": true, ...}
  
  -- Quarterly Review specific (ratings/feedback stored as JSONB)
  quarterly_feedback JSONB,
  -- Example: {"customer_satisfaction": 4, "mission_satisfaction": 5, "company_satisfaction": 4, ...}
  
  -- Annual Appraisal specific (full appraisal data as JSONB)
  appraisal_data JSONB,
  -- Example: {"performance_rating": 4, "goals_achieved": [...], "development_areas": [...], ...}
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_consultant_meetings_updated_at ON consultant_meetings;
CREATE TRIGGER update_consultant_meetings_updated_at
  BEFORE UPDATE ON consultant_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_consultant ON consultant_meetings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_type ON consultant_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_status ON consultant_meetings(status);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_date ON consultant_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_deleted ON consultant_meetings(deleted_at);

-- RLS
ALTER TABLE consultant_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read consultant meetings" ON consultant_meetings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create consultant meetings" ON consultant_meetings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update consultant meetings" ON consultant_meetings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE consultant_meetings IS 'Career management meetings with consultants';
COMMENT ON COLUMN consultant_meetings.meeting_type IS 'induction, quarterly_review, annual_appraisal';
COMMENT ON COLUMN consultant_meetings.status IS 'scheduled, completed, cancelled';
-- Consultants table - for candidates who have signed contracts and are now active consultants
CREATE TABLE IF NOT EXISTS consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- CONS-0001
  
  -- Link to original candidate record
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  
  -- Basic info (copied from candidate at conversion time, can be updated)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  
  -- Professional info
  job_title TEXT, -- From the offer
  skills TEXT[] DEFAULT '{}',
  security_vetting TEXT,
  nationalities TEXT[],
  
  -- Contract details (from the offer)
  contract_type TEXT, -- permanent, contract, fixed_term
  salary_amount DECIMAL(12,2),
  day_rate DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE, -- For fixed term
  
  -- Status
  status TEXT NOT NULL DEFAULT 'bench', -- bench, in_mission, on_leave, terminated
  
  -- Documents (from offer)
  id_document_url TEXT,
  right_to_work_document_url TEXT,
  
  -- Assignment
  assigned_manager_id UUID REFERENCES users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT
);

-- Auto-generate reference_id
CREATE OR REPLACE FUNCTION generate_consultant_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM consultants 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'CONS-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_consultant_reference_id
  BEFORE INSERT ON consultants
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_consultant_reference_id();

-- Update timestamp trigger
CREATE TRIGGER update_consultants_updated_at
  BEFORE UPDATE ON consultants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultants_candidate ON consultants(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consultants_status ON consultants(status);
CREATE INDEX IF NOT EXISTS idx_consultants_reference_id ON consultants(reference_id);

-- RLS
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read consultants" ON consultants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create consultants" ON consultants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update consultants" ON consultants
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Add consultant_id to applications table so consultants can be linked to requirements
ALTER TABLE applications ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE;

-- Make candidate_id nullable since we can now have consultant applications
ALTER TABLE applications ALTER COLUMN candidate_id DROP NOT NULL;

-- Add constraint to ensure either candidate_id or consultant_id is set
ALTER TABLE applications ADD CONSTRAINT applications_candidate_or_consultant 
  CHECK (candidate_id IS NOT NULL OR consultant_id IS NOT NULL);

COMMENT ON TABLE consultants IS 'Active consultants who have signed contracts';
COMMENT ON COLUMN consultants.status IS 'bench = available, in_mission = assigned to client, on_leave = temporary leave, terminated = no longer with company';
-- ============================================
-- HR TICKETS TABLE
-- ============================================
-- Tracks actionable items for HR to process
-- Tickets are created automatically when approvals complete
-- HR must complete the ticket to finalise the process

CREATE TABLE IF NOT EXISTS hr_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- HRT-0001
  
  -- Ticket type
  ticket_type TEXT NOT NULL, 
  -- 'contract_send', 'contract_signed', 'salary_increase', 'bonus_payment', 'employee_exit'
  
  -- Subject
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Related records
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  
  -- Ticket details (type-specific data)
  ticket_data JSONB,
  /*
    For contract_send: { "contract_type": "permanent", "start_date": "..." }
    For salary_increase: { "new_salary": 55000, "effective_date": "Feb 2025" }
    For employee_exit: { "exit_reason": "resignation", "last_day": "..." }
  */
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Due date (optional)
  due_date DATE,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Progress notes
  notes TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Auto-generate reference_id
CREATE OR REPLACE FUNCTION generate_hr_ticket_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM hr_tickets 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'HRT-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_hr_ticket_reference_id ON hr_tickets;
CREATE TRIGGER set_hr_ticket_reference_id
  BEFORE INSERT ON hr_tickets
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_hr_ticket_reference_id();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_hr_tickets_updated_at ON hr_tickets;
CREATE TRIGGER update_hr_tickets_updated_at
  BEFORE UPDATE ON hr_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_tickets_status ON hr_tickets(status);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_type ON hr_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_consultant ON hr_tickets(consultant_id);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_candidate ON hr_tickets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_assigned ON hr_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_due ON hr_tickets(due_date);

-- RLS
ALTER TABLE hr_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read hr tickets" ON hr_tickets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create hr tickets" ON hr_tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update hr tickets" ON hr_tickets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE hr_tickets IS 'Actionable tickets for HR to process';
COMMENT ON COLUMN hr_tickets.ticket_type IS 'contract_send, contract_signed, salary_increase, bonus_payment, employee_exit';
COMMENT ON COLUMN hr_tickets.status IS 'pending, in_progress, completed, cancelled';
-- Missions table - active engagements of consultants at customer sites
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- MISS-0001
  
  -- Name format: Company Name - Skills - Consultant Name
  name TEXT NOT NULL,
  
  -- Links
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Commercial
  sold_daily_rate DECIMAL(10,2) NOT NULL,
  
  -- Location
  location TEXT,
  work_mode TEXT NOT NULL DEFAULT 'hybrid', -- full_onsite, hybrid, remote
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled, on_hold
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Auto-generate reference_id
CREATE OR REPLACE FUNCTION generate_mission_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM missions 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'MISS-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mission_reference_id ON missions;
CREATE TRIGGER set_mission_reference_id
  BEFORE INSERT ON missions
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_mission_reference_id();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;
CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_missions_requirement ON missions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_missions_customer ON missions(customer_id);
CREATE INDEX IF NOT EXISTS idx_missions_consultant ON missions(consultant_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_missions_deleted ON missions(deleted_at);

-- RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read missions" ON missions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create missions" ON missions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update missions" ON missions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE missions IS 'Active consultant engagements at customer sites';
COMMENT ON COLUMN missions.work_mode IS 'full_onsite, hybrid, remote';
COMMENT ON COLUMN missions.status IS 'active, completed, cancelled, on_hold';
-- Add soft delete to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Add soft delete to consultants table (if not already there)
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_offers_deleted_at ON offers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_consultants_deleted_at ON consultants(deleted_at);

COMMENT ON COLUMN offers.deleted_at IS 'Soft delete timestamp - null means active';
COMMENT ON COLUMN consultants.deleted_at IS 'Soft delete timestamp - null means active';
