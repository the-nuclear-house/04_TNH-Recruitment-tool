-- Add assigned_recruiter_id to candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS assigned_recruiter_id UUID REFERENCES users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_candidates_assigned_recruiter ON candidates(assigned_recruiter_id);
