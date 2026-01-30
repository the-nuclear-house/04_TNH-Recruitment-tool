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
