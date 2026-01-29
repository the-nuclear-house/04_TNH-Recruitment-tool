-- Create customer_assessments table
CREATE TABLE IF NOT EXISTS customer_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  customer_contact TEXT,
  location TEXT,
  notes TEXT,
  outcome TEXT CHECK (outcome IN ('pending', 'go', 'nogo')),
  outcome_notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_assessments_application_id ON customer_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_customer_assessments_scheduled_date ON customer_assessments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_customer_assessments_outcome ON customer_assessments(outcome);

-- Enable RLS
ALTER TABLE customer_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all customer assessments" ON customer_assessments
  FOR SELECT USING (true);

CREATE POLICY "Users can create customer assessments" ON customer_assessments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customer assessments" ON customer_assessments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete customer assessments" ON customer_assessments
  FOR DELETE USING (true);
