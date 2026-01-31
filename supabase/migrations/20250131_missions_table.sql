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
