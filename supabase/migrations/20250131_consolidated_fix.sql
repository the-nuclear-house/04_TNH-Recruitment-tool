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
