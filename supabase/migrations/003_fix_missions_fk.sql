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
