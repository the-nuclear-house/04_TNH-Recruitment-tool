-- Consultant career meetings table
-- Stores induction, quarterly reviews, and annual appraisals
CREATE TABLE IF NOT EXISTS consultant_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Meeting type
  meeting_type TEXT NOT NULL, -- induction, quarterly_review, annual_appraisal
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
  completed_at TIMESTAMPTZ,
  
  -- Who conducted the meeting
  conducted_by UUID REFERENCES users(id),
  
  -- Common fields
  general_comments TEXT,
  risks_identified TEXT,
  consultant_requests TEXT,
  
  -- Induction specific (checklist stored as JSONB)
  induction_checklist JSONB,
  -- Example: {"induction_pack_presented": true, "risk_assessment_presented": true, ...}
  
  -- Quarterly Review specific (ratings/feedback stored as JSONB)
  quarterly_feedback JSONB,
  -- Example: {"customer_satisfaction": 4, "mission_satisfaction": 5, "company_satisfaction": 4, ...}
  
  -- Annual Appraisal specific (full appraisal data as JSONB)
  appraisal_data JSONB,
  -- Example: {"performance_rating": 4, "goals_achieved": [...], "development_areas": [...], ...}
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_consultant_meetings_updated_at ON consultant_meetings;
CREATE TRIGGER update_consultant_meetings_updated_at
  BEFORE UPDATE ON consultant_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_consultant ON consultant_meetings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_type ON consultant_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_status ON consultant_meetings(status);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_date ON consultant_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_consultant_meetings_deleted ON consultant_meetings(deleted_at);

-- RLS
ALTER TABLE consultant_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read consultant meetings" ON consultant_meetings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create consultant meetings" ON consultant_meetings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update consultant meetings" ON consultant_meetings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE consultant_meetings IS 'Career management meetings with consultants';
COMMENT ON COLUMN consultant_meetings.meeting_type IS 'induction, quarterly_review, annual_appraisal';
COMMENT ON COLUMN consultant_meetings.status IS 'scheduled, completed, cancelled';
