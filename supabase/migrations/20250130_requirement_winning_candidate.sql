-- Add winning_candidate_id to requirements
-- This is set when a Customer Assessment results in GO

ALTER TABLE requirements 
ADD COLUMN IF NOT EXISTS winning_candidate_id UUID REFERENCES candidates(id),
ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;

-- Add requirement_id to customer_assessments for direct linking
ALTER TABLE customer_assessments
ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES requirements(id);

-- Create index for winning candidate lookups
CREATE INDEX IF NOT EXISTS idx_requirements_winning_candidate ON requirements(winning_candidate_id);
CREATE INDEX IF NOT EXISTS idx_customer_assessments_requirement ON customer_assessments(requirement_id);

-- Comment on columns for documentation
COMMENT ON COLUMN requirements.winning_candidate_id IS 'The candidate who won this requirement (set when assessment = GO)';
COMMENT ON COLUMN requirements.won_at IS 'Timestamp when the requirement was won';
COMMENT ON COLUMN customer_assessments.requirement_id IS 'Direct link to requirement for easier querying';
