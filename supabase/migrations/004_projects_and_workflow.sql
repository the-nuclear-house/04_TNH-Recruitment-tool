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
