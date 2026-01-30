-- Offers table for contract workflow
-- This stores offer requests that need approval before becoming contracts

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  
  -- Offer details
  job_title TEXT NOT NULL,
  salary_amount DECIMAL(12,2),
  salary_currency TEXT DEFAULT 'GBP',
  contract_type TEXT NOT NULL DEFAULT 'permanent', -- permanent, contract, fixed_term
  day_rate DECIMAL(10,2), -- For contractors
  start_date DATE NOT NULL,
  end_date DATE, -- For fixed term contracts
  work_location TEXT,
  
  -- Candidate document details
  candidate_full_name TEXT NOT NULL, -- Full legal name for contract
  candidate_address TEXT,
  candidate_nationality TEXT,
  
  -- Document uploads (store file paths/URLs)
  id_document_url TEXT, -- Passport or British ID
  right_to_work_document_url TEXT, -- RTW proof if non-British
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending_approval', 
  -- pending_approval, approved, rejected, contract_sent, contract_signed, withdrawn
  
  requested_by UUID REFERENCES users(id),
  approver_id UUID REFERENCES users(id), -- The director who needs to approve
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Contract tracking
  contract_sent_at TIMESTAMPTZ,
  contract_sent_by UUID REFERENCES users(id),
  contract_signed_at TIMESTAMPTZ,
  contract_signed_confirmed_by UUID REFERENCES users(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_requirement ON offers(requirement_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_approver ON offers(approver_id);
CREATE INDEX IF NOT EXISTS idx_offers_requested_by ON offers(requested_by);

-- RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Everyone can read offers (we'll restrict in UI based on role)
CREATE POLICY "Users can read offers" ON offers
  FOR SELECT USING (true);

-- Authenticated users can create offers
CREATE POLICY "Authenticated users can create offers" ON offers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update offers they're involved with
CREATE POLICY "Users can update relevant offers" ON offers
  FOR UPDATE USING (
    auth.uid() = requested_by OR 
    auth.uid() = approver_id OR
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

-- Comments for documentation
COMMENT ON TABLE offers IS 'Stores job offers pending approval and contract workflow status';
COMMENT ON COLUMN offers.status IS 'pending_approval, approved, rejected, contract_sent, contract_signed, withdrawn';
COMMENT ON COLUMN offers.approver_id IS 'The director (from org hierarchy) who needs to approve this offer';
