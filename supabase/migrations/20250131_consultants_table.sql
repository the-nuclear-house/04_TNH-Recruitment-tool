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
