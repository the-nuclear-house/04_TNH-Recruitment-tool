-- ============================================
-- HR TICKETS TABLE
-- ============================================
-- Tracks actionable items for HR to process
-- Tickets are created automatically when approvals complete
-- HR must complete the ticket to finalise the process

CREATE TABLE IF NOT EXISTS hr_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- HRT-0001
  
  -- Ticket type
  ticket_type TEXT NOT NULL, 
  -- 'contract_send', 'contract_signed', 'salary_increase', 'bonus_payment', 'employee_exit'
  
  -- Subject
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Related records
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  
  -- Ticket details (type-specific data)
  ticket_data JSONB,
  /*
    For contract_send: { "contract_type": "permanent", "start_date": "..." }
    For salary_increase: { "new_salary": 55000, "effective_date": "Feb 2025" }
    For employee_exit: { "exit_reason": "resignation", "last_day": "..." }
  */
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Due date (optional)
  due_date DATE,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Progress notes
  notes TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Auto-generate reference_id
CREATE OR REPLACE FUNCTION generate_hr_ticket_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM hr_tickets 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'HRT-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_hr_ticket_reference_id ON hr_tickets;
CREATE TRIGGER set_hr_ticket_reference_id
  BEFORE INSERT ON hr_tickets
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_hr_ticket_reference_id();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_hr_tickets_updated_at ON hr_tickets;
CREATE TRIGGER update_hr_tickets_updated_at
  BEFORE UPDATE ON hr_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_tickets_status ON hr_tickets(status);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_type ON hr_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_consultant ON hr_tickets(consultant_id);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_candidate ON hr_tickets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_assigned ON hr_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hr_tickets_due ON hr_tickets(due_date);

-- RLS
ALTER TABLE hr_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read hr tickets" ON hr_tickets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create hr tickets" ON hr_tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update hr tickets" ON hr_tickets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE hr_tickets IS 'Actionable tickets for HR to process';
COMMENT ON COLUMN hr_tickets.ticket_type IS 'contract_send, contract_signed, salary_increase, bonus_payment, employee_exit';
COMMENT ON COLUMN hr_tickets.status IS 'pending, in_progress, completed, cancelled';
