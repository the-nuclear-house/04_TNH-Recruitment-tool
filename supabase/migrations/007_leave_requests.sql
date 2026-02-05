-- Leave Requests table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'unpaid')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancellation_pending', 'cancelled')),
  dates TEXT[] NOT NULL, -- Array of date strings 'YYYY-MM-DD'
  total_days NUMERIC NOT NULL,
  notes TEXT,
  -- Approval
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Cancellation
  cancellation_requested_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancellation_approved_by UUID REFERENCES users(id),
  cancellation_approved_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE USING (true);
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE USING (true);

-- Add annual_leave_allowance to consultants (defaults to 24)
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS annual_leave_allowance INTEGER NOT NULL DEFAULT 24;
