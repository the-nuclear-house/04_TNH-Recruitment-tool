-- Add meeting status and outcome notes to customer_meetings
-- Status: planned, completed, cancelled
-- preparation_notes: notes before the meeting (what to prepare)
-- outcome_notes: notes after the meeting (takeaways) or cancellation reason

ALTER TABLE customer_meetings
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned',
ADD COLUMN IF NOT EXISTS preparation_notes TEXT,
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Add constraint for valid status values
-- Note: If constraint already exists, this will fail silently
DO $$
BEGIN
  ALTER TABLE customer_meetings
  ADD CONSTRAINT customer_meetings_status_check
  CHECK (status IN ('planned', 'completed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_customer_meetings_status ON customer_meetings(status);

-- Comment on columns for documentation
COMMENT ON COLUMN customer_meetings.status IS 'Meeting status: planned, completed, or cancelled';
COMMENT ON COLUMN customer_meetings.preparation_notes IS 'Notes for meeting preparation (before the meeting)';
COMMENT ON COLUMN customer_meetings.outcome_notes IS 'Notes about meeting outcome/takeaways or cancellation reason';
