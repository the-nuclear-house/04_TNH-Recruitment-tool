-- ============================================
-- SALARY HISTORY TABLE
-- ============================================
-- Tracks all salary changes for consultants

CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Salary details
  salary_type TEXT NOT NULL, -- 'annual_salary' or 'day_rate'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  
  -- Effective date (month/year)
  effective_month INTEGER NOT NULL, -- 1-12
  effective_year INTEGER NOT NULL,
  
  -- Change reason
  change_type TEXT NOT NULL, -- 'initial', 'increase', 'decrease', 'adjustment'
  change_reason TEXT,
  
  -- Link to approval if applicable
  approval_request_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_salary_history_consultant ON salary_history(consultant_id);
CREATE INDEX idx_salary_history_effective ON salary_history(effective_year, effective_month);

-- RLS
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read salary history" ON salary_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create salary history" ON salary_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- BONUS PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bonus_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Bonus details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  bonus_type TEXT NOT NULL, -- 'performance', 'retention', 'project', 'referral', 'other'
  reason TEXT NOT NULL,
  
  -- Payment date (month/year)
  payment_month INTEGER NOT NULL,
  payment_year INTEGER NOT NULL,
  
  -- Link to approval
  approval_request_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_bonus_payments_consultant ON bonus_payments(consultant_id);

-- RLS
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read bonus payments" ON bonus_payments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create bonus payments" ON bonus_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- APPROVAL REQUESTS TABLE
-- ============================================
-- Generic approval workflow for various HR processes

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE, -- APR-0001
  
  -- Request type
  request_type TEXT NOT NULL, -- 'salary_increase', 'bonus_payment', 'employee_exit'
  
  -- Subject (consultant this relates to)
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Request details (type-specific data stored as JSONB)
  request_data JSONB NOT NULL,
  /*
    For salary_increase:
    { "current_salary": 50000, "new_salary": 55000, "salary_type": "annual_salary", "reason": "..." }
    
    For bonus_payment:
    { "amount": 2000, "bonus_type": "performance", "reason": "..." }
    
    For employee_exit:
    { "exit_reason": "resignation", "exit_details": "...", "last_working_day": "2025-03-31" }
  */
  
  -- Effective date (month/year)
  effective_month INTEGER NOT NULL,
  effective_year INTEGER NOT NULL,
  
  -- Overall status
  status TEXT NOT NULL DEFAULT 'pending', 
  -- 'pending', 'pending_hr', 'approved', 'rejected', 'cancelled'
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  request_notes TEXT,
  
  -- Director approval (required for all)
  director_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  director_approved_by UUID REFERENCES users(id),
  director_approved_at TIMESTAMPTZ,
  director_notes TEXT,
  
  -- HR approval (required for employee_exit only)
  hr_required BOOLEAN DEFAULT FALSE,
  hr_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'not_required'
  hr_approved_by UUID REFERENCES users(id),
  hr_approved_at TIMESTAMPTZ,
  hr_notes TEXT,
  
  -- Rejection
  rejection_reason TEXT,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate reference_id
CREATE OR REPLACE FUNCTION generate_approval_request_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM approval_requests 
  WHERE reference_id IS NOT NULL;
  
  NEW.reference_id := 'APR-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_approval_request_reference_id ON approval_requests;
CREATE TRIGGER set_approval_request_reference_id
  BEFORE INSERT ON approval_requests
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_approval_request_reference_id();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_approval_requests_consultant ON approval_requests(consultant_id);
CREATE INDEX idx_approval_requests_type ON approval_requests(request_type);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_director_status ON approval_requests(director_status);
CREATE INDEX idx_approval_requests_hr_status ON approval_requests(hr_status);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);

-- RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read approval requests" ON approval_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create approval requests" ON approval_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update approval requests" ON approval_requests FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- CONSULTANT EXIT RECORDS
-- ============================================
-- When an exit is fully approved, record here

CREATE TABLE IF NOT EXISTS consultant_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  
  -- Exit details
  exit_reason TEXT NOT NULL, -- 'resignation', 'redundancy', 'end_of_contract', 'dismissal', 'mutual_agreement', 'retirement'
  exit_details TEXT,
  last_working_day DATE NOT NULL,
  
  -- Link to approval
  approval_request_id UUID REFERENCES approval_requests(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_consultant_exits_consultant ON consultant_exits(consultant_id);

-- RLS
ALTER TABLE consultant_exits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read consultant exits" ON consultant_exits FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create consultant exits" ON consultant_exits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add foreign key back to salary_history and bonus_payments
ALTER TABLE salary_history ADD CONSTRAINT fk_salary_history_approval 
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);
ALTER TABLE bonus_payments ADD CONSTRAINT fk_bonus_payments_approval 
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id);

COMMENT ON TABLE approval_requests IS 'Generic approval workflow for HR processes';
COMMENT ON COLUMN approval_requests.request_type IS 'salary_increase, bonus_payment, employee_exit';
COMMENT ON COLUMN approval_requests.status IS 'pending, pending_hr, approved, rejected, cancelled';
