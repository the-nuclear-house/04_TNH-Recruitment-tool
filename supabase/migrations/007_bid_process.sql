-- Migration: Bid Process fields for MEDDPICC qualification and proposal workflow
-- Date: 2026-02-03

-- MEDDPICC Scoring (each field 1-5 scale, null = not assessed)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_metrics INTEGER CHECK (meddpicc_metrics BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_economic_buyer INTEGER CHECK (meddpicc_economic_buyer BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_decision_criteria INTEGER CHECK (meddpicc_decision_criteria BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_decision_process INTEGER CHECK (meddpicc_decision_process BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_identify_pain INTEGER CHECK (meddpicc_identify_pain BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_paper_process INTEGER CHECK (meddpicc_paper_process BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_champion INTEGER CHECK (meddpicc_champion BETWEEN 1 AND 5);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_competition INTEGER CHECK (meddpicc_competition BETWEEN 1 AND 5);

-- MEDDPICC notes for each category
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS meddpicc_notes JSONB DEFAULT '{}';

-- Go/No-Go decision
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS go_nogo_decision VARCHAR(10) CHECK (go_nogo_decision IN ('go', 'nogo', null));
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS go_nogo_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS go_nogo_decided_by UUID REFERENCES profiles(id);

-- Proposal stage fields
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_due_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_submitted_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_value DECIMAL(12,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_cost DECIMAL(12,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_margin_percent DECIMAL(5,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS proposal_documents JSONB DEFAULT '[]';

-- Outcome fields
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome VARCHAR(20) CHECK (bid_outcome IN ('won', 'lost', 'no_decision', 'withdrawn', null));
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome_reason VARCHAR(100);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_outcome_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS bid_lessons_learned TEXT;

-- Comments for documentation
COMMENT ON COLUMN requirements.meddpicc_metrics IS 'MEDDPICC: Quantifiable business goals/KPIs (1-5)';
COMMENT ON COLUMN requirements.meddpicc_economic_buyer IS 'MEDDPICC: Access to budget holder (1-5)';
COMMENT ON COLUMN requirements.meddpicc_decision_criteria IS 'MEDDPICC: Understanding of decision factors (1-5)';
COMMENT ON COLUMN requirements.meddpicc_decision_process IS 'MEDDPICC: Clarity of approval process (1-5)';
COMMENT ON COLUMN requirements.meddpicc_identify_pain IS 'MEDDPICC: Understanding of business problem (1-5)';
COMMENT ON COLUMN requirements.meddpicc_paper_process IS 'MEDDPICC: Procurement/contract process clarity (1-5)';
COMMENT ON COLUMN requirements.meddpicc_champion IS 'MEDDPICC: Internal advocate strength (1-5)';
COMMENT ON COLUMN requirements.meddpicc_competition IS 'MEDDPICC: Competitive position understanding (1-5)';
COMMENT ON COLUMN requirements.bid_status IS 'Bid stage: qualifying, proposal, submitted, won, lost';
