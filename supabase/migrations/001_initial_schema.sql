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
