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
