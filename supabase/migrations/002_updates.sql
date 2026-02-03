-- ============================================
-- COCKPIT CRM - ROLE STANDARDISATION
-- ============================================
-- This migration documents the official role names used in Cockpit.
-- The roles array in the users table accepts any TEXT values,
-- but these are the official roles the application expects.
--
-- Run this after 001_complete_schema.sql

-- ============================================
-- OFFICIAL ROLE NAMES
-- ============================================
-- The application uses these 10 roles across 4 departments plus admin:
--
-- ADMIN (cross-department):
--   - superadmin    : Full system access, can create admins
--   - admin         : Full system access, cannot create other admins
--
-- RECRUITMENT DEPARTMENT:
--   - recruiter_manager : Manages recruiters, views department stats
--   - recruiter         : Adds/edits candidates, schedules interviews
--
-- TECHNICAL DEPARTMENT:
--   - technical_director : Approves technical decisions, views all feedback
--   - technical          : Conducts technical interviews
--
-- BUSINESS DEPARTMENT:
--   - business_director  : Approves contracts/requests, views all managers
--   - business_manager   : Manages requirements, customer relationships
--
-- HR DEPARTMENT:
--   - hr_manager : Approves HR requests, views department stats
--   - hr         : Processes tickets, manages consultant records

-- ============================================
-- HELPER FUNCTION TO CHECK VALID ROLES
-- ============================================
-- This function can be used to validate roles if needed

CREATE OR REPLACE FUNCTION is_valid_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN role_name IN (
    'superadmin',
    'admin',
    'business_director',
    'business_manager',
    'technical_director',
    'technical',
    'recruiter_manager',
    'recruiter',
    'hr_manager',
    'hr'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- COMMENT ON USERS TABLE
-- ============================================
COMMENT ON COLUMN users.roles IS 'Array of role names. Valid roles: superadmin, admin, business_director, business_manager, technical_director, technical, recruiter_manager, recruiter, hr_manager, hr';

-- ============================================
-- MIGRATE OLD ROLE NAMES (if any exist)
-- ============================================
-- This updates any users who might have old role names

UPDATE users 
SET roles = array_replace(roles, 'director', 'business_director')
WHERE 'director' = ANY(roles);

UPDATE users 
SET roles = array_replace(roles, 'manager', 'business_manager')
WHERE 'manager' = ANY(roles);

UPDATE users 
SET roles = array_replace(roles, 'interviewer', 'technical')
WHERE 'interviewer' = ANY(roles);

-- ============================================
-- VERIFY MIGRATION
-- ============================================
-- Run this to check current roles in the system:
-- SELECT DISTINCT unnest(roles) as role FROM users ORDER BY role;
-- Missions table already has company_id column pointing to companies table
-- Just ensure the FK and policies are correct

-- Ensure FK to companies exists
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_company_id_fkey;
ALTER TABLE missions ADD CONSTRAINT missions_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Ensure FK to contacts exists  
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_contact_id_fkey;
ALTER TABLE missions ADD CONSTRAINT missions_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- Fix winning_candidate_id FK to allow deletion
ALTER TABLE requirements DROP CONSTRAINT IF EXISTS requirements_winning_candidate_id_fkey;
ALTER TABLE requirements ADD CONSTRAINT requirements_winning_candidate_id_fkey
  FOREIGN KEY (winning_candidate_id) REFERENCES candidates(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DROP POLICY IF EXISTS "Users can view missions" ON missions;
CREATE POLICY "Users can view missions" ON missions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can insert missions" ON missions;
CREATE POLICY "Managers can insert missions" ON missions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Managers can update missions" ON missions;
CREATE POLICY "Managers can update missions" ON missions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete missions" ON missions;
CREATE POLICY "Admins can delete missions" ON missions FOR DELETE USING (true);
-- Migration: Add Projects, update Consultants, Requirements, Missions, and Companies
-- This supports the new T&M vs Fixed Price workflow

-- ============================================
-- 1. UPDATE COMPANIES TABLE - Parent company restriction
-- ============================================

-- Add is_parent flag to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false;

-- ============================================
-- 2. UPDATE CONSULTANTS TABLE - Ownership fields
-- ============================================

-- Account Manager owns the consultant commercially
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Centre of Competence Director for technical development
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS coc_director_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Company email for SSO login
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS company_email TEXT UNIQUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consultants_account_manager ON consultants(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_consultants_coc_director ON consultants(coc_director_id);

-- ============================================
-- 3. CREATE PROJECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- PROJ-0001
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Customer link
  customer_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Ownership
  account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  technical_director_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Type and status
  type TEXT NOT NULL DEFAULT 'T&M', -- 'T&M' or 'Fixed_Price'
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, on_hold, cancelled
  
  -- Link to bid that won this project (for FP projects)
  won_bid_requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Auto-generate reference_id for projects
CREATE OR REPLACE FUNCTION generate_project_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM projects
  WHERE reference_id LIKE 'PROJ-%';
  
  NEW.reference_id := 'PROJ-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_reference_id ON projects;
CREATE TRIGGER set_project_reference_id
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_project_reference_id();

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_customer_contact ON projects(customer_contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_account_manager ON projects(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_technical_director ON projects(technical_director_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can insert projects" ON projects;
CREATE POLICY "Managers can insert projects" ON projects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Managers can update projects" ON projects;
CREATE POLICY "Managers can update projects" ON projects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete projects" ON projects;
CREATE POLICY "Admins can delete projects" ON projects FOR DELETE USING (true);

-- ============================================
-- 4. UPDATE REQUIREMENTS TABLE
-- ============================================

-- Add project type field
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'T&M'; -- 'T&M' or 'Fixed_Price'

-- Link to existing project (if staffing for existing project)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Is this a bid (FP requirement without project)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS is_bid BOOLEAN DEFAULT false;

-- Bid-specific status (only used when is_bid = true)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_status TEXT; -- qualifying, proposal, submitted, won, lost

-- Create index
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project_type ON requirements(project_type);
CREATE INDEX IF NOT EXISTS idx_requirements_is_bid ON requirements(is_bid);

-- ============================================
-- 5. UPDATE MISSIONS TABLE
-- ============================================

-- Link mission to project (required)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_missions_project ON missions(project_id);

-- ============================================
-- 6. UPDATE OFFERS TABLE - IT Access step
-- ============================================

ALTER TABLE offers ADD COLUMN IF NOT EXISTS it_access_created BOOLEAN DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS it_access_created_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS it_access_created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON COLUMN companies.is_parent IS 'If true, this is a parent company that cannot have direct contacts - contacts go to subsidiaries';
COMMENT ON COLUMN consultants.account_manager_id IS 'The account manager who owns this consultant commercially (P&L, utilisation, timesheets)';
COMMENT ON COLUMN consultants.coc_director_id IS 'The Centre of Competence director responsible for technical development';
COMMENT ON COLUMN consultants.company_email IS 'Company email address, used for SSO login';
COMMENT ON TABLE projects IS 'Commercial grouping of missions - one project can have multiple consultants/missions';
COMMENT ON COLUMN projects.type IS 'T&M = Time and Materials, Fixed_Price = Work Package/Fixed Price';
COMMENT ON COLUMN projects.won_bid_requirement_id IS 'For FP projects, links to the bid requirement that was won';
COMMENT ON COLUMN requirements.project_type IS 'T&M or Fixed_Price - determines the workflow';
COMMENT ON COLUMN requirements.project_id IS 'If staffing for existing project, links here';
COMMENT ON COLUMN requirements.is_bid IS 'True if this is a Fixed Price bid (not staffing)';
COMMENT ON COLUMN requirements.bid_status IS 'Bid pipeline status: qualifying, proposal, submitted, won, lost';
COMMENT ON COLUMN missions.project_id IS 'The project this mission belongs to';
COMMENT ON COLUMN offers.it_access_created IS 'HR confirms IT credentials have been created';
-- Migration 005: IT Access workflow step for HR tickets
-- This documents the new it_access_created status for hr_tickets

-- ============================================
-- 1. UPDATE HR_TICKETS STATUS COMMENT
-- ============================================

-- The hr_tickets.status column now supports these values:
-- pending, in_progress, contract_sent, contract_signed, it_access_created, completed, cancelled
COMMENT ON COLUMN hr_tickets.status IS 'Workflow status: pending, in_progress, contract_sent, contract_signed, it_access_created, completed, cancelled';

-- ============================================
-- 2. ADD IT ACCESS FIELDS TO HR_TICKETS (if tracking separately)
-- ============================================

-- Track when IT access was created (in addition to offer tracking)
ALTER TABLE hr_tickets ADD COLUMN IF NOT EXISTS it_access_created_at TIMESTAMPTZ;
ALTER TABLE hr_tickets ADD COLUMN IF NOT EXISTS it_access_created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 3. UPDATE MISSIONS SELECT TO INCLUDE PROJECT
-- ============================================

-- The missions.project_id was already added in migration 004
-- This just ensures the join includes project data

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON COLUMN hr_tickets.it_access_created_at IS 'Timestamp when IT access credentials were created';
COMMENT ON COLUMN hr_tickets.it_access_created_by IS 'User who confirmed IT access was created';
-- Migration: Add financial_scoring to companies and dormant status support
-- Date: 2026-02-03

-- Add financial_scoring column to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS financial_scoring VARCHAR(2);

-- Add comment explaining the field
COMMENT ON COLUMN companies.financial_scoring IS 'Financial scoring/credit rating for the company. Values: A (Excellent), B (Good), C (Satisfactory), D (Below Average), E (Poor), F (Very Poor/High Risk). Required before creating first project.';

-- Update status column comment to include dormant
COMMENT ON COLUMN companies.status IS 'Company status. prospect = new customer, active = has active projects, dormant = all projects closed, inactive = manually set, former = no longer a customer';
-- Migration: Bid Process fields for MEDDPICC qualification and proposal workflow
-- Date: 2026-02-03

-- MEDDPICC Scoring (each field 1-5 scale, null = not assessed)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_metrics INTEGER CHECK (meddpicc_metrics BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_economic_buyer INTEGER CHECK (meddpicc_economic_buyer BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_decision_criteria INTEGER CHECK (meddpicc_decision_criteria BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_decision_process INTEGER CHECK (meddpicc_decision_process BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_identify_pain INTEGER CHECK (meddpicc_identify_pain BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_paper_process INTEGER CHECK (meddpicc_paper_process BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_champion INTEGER CHECK (meddpicc_champion BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_competition INTEGER CHECK (meddpicc_competition BETWEEN 1 AND 5);

-- MEDDPICC notes for each category
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_notes JSONB DEFAULT '{}';

-- Go/No-Go decision
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS go_nogo_decision VARCHAR(10) CHECK (go_nogo_decision IN ('go', 'nogo', null));
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS go_nogo_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS go_nogo_decided_by UUID REFERENCES public.users(id);

-- Proposal stage fields
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_due_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_submitted_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_value DECIMAL(12,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_cost DECIMAL(12,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_margin_percent DECIMAL(5,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_documents JSONB DEFAULT '[]';

-- Outcome fields
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome VARCHAR(20) CHECK (bid_outcome IN ('won', 'lost', 'no_decision', 'withdrawn', null));
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome_reason VARCHAR(100);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_lessons_learned TEXT;

-- Comments for documentation
COMMENT ON COLUMN requirements.meddpicc_metrics IS 'MEDDPICC: Quantifiable business goals/KPIs (1-5)';
COMMENT ON COLUMN requirements.meddpicc_economic_buyer IS 'MEDDPICC: Access to budget holder (1-5)';
COMMENT ON COLUMN requirements.meddpicc_decision_criteria IS 'MEDDPICC: Understanding of decision factors (1-5)';
COMMENT ON COLUMN requirements.meddpicc_decision_process IS 'MEDDPICC: Clarity of approval process (1-5)';
COMMENT ON COLUMN requirements.meddpicc_identify_pain IS 'MEDDPICC: Understanding of business problem (1-5)';
COMMENT ON COLUMN requirements.meddpicc_paper_process IS 'MEDDPICC: Procurement/contract process clarity (1-5)';
COMMENT ON COLUMN requirements.meddpicc_champion IS 'MEDDPICC: Internal advocate strength (1-5)';
COMMENT ON COLUMN requirements.meddpicc_competition IS 'MEDDPICC: Competitive position understanding (1-5)';
COMMENT ON COLUMN requirements.bid_status IS 'Bid stage: qualifying, proposal, submitted, won, lost';

-- ============================================
-- BID APPROVAL WORKFLOW AND RISK ASSESSMENT
-- ============================================

-- Technical Director for requirement (mandatory for bids)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS technical_director_id UUID REFERENCES public.users(id);

-- Bid estimates
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_estimated_fte DECIMAL(5,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_estimated_revenue DECIMAL(12,2);

-- Risk Assessment scores (1-5 scale, higher = lower risk)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_technical_complexity INTEGER CHECK (risk_technical_complexity BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_resource_availability INTEGER CHECK (risk_resource_availability BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_timeline_feasibility INTEGER CHECK (risk_timeline_feasibility BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_scope_clarity INTEGER CHECK (risk_scope_clarity BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_customer_fp_experience INTEGER CHECK (risk_customer_fp_experience BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_notes TEXT;

-- Go/No-Go Approvals (TD and BD must both approve for Go)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_td_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_td_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_td_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_td_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_td_notes TEXT;

ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_bd_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_bd_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_bd_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_bd_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS gonogo_bd_notes TEXT;

-- Business Director (manager's reports_to)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS business_director_id UUID REFERENCES public.users(id);

-- Offer Review Approvals
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_td_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_td_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_td_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_td_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_td_notes TEXT;

ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_bd_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_bd_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_bd_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_bd_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS offer_bd_notes TEXT;

-- Proposal Documents (stored in Supabase storage, URLs here)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_offer_document_url TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_offer_document_name TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_financial_calc_url TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_financial_calc_name TEXT;

-- Comments
COMMENT ON COLUMN requirements.technical_director_id IS 'Technical Director who approves Go/No-Go and Offer';
COMMENT ON COLUMN requirements.business_director_id IS 'Business Director (manager reports_to) who approves Go/No-Go and Offer';
COMMENT ON COLUMN requirements.risk_technical_complexity IS 'Risk: Technical complexity (1=high risk, 5=low risk)';
COMMENT ON COLUMN requirements.risk_resource_availability IS 'Risk: Resource availability (1=high risk, 5=low risk)';
COMMENT ON COLUMN requirements.risk_timeline_feasibility IS 'Risk: Timeline feasibility (1=high risk, 5=low risk)';
COMMENT ON COLUMN requirements.risk_scope_clarity IS 'Risk: Scope clarity (1=high risk, 5=low risk)';
COMMENT ON COLUMN requirements.risk_customer_fp_experience IS 'Risk: Customer fixed price experience (1=high risk, 5=low risk)';

-- Create storage bucket for bid documents (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bid-documents', 'bid-documents', false);
