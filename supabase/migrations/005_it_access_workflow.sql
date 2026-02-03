-- Migration 005: IT Access workflow step for HR tickets
-- This documents the new it_access_created status for hr_tickets

-- ============================================
-- 1. UPDATE HR_TICKETS STATUS COMMENT
-- ============================================

-- The hr_tickets.status column now supports these values:
-- pending, in_progress, contract_sent, contract_signed, it_access_created, completed, cancelled
COMMENT ON COLUMN hr_tickets.status IS 'Workflow status: pending, in_progress, contract_sent, contract_signed, it_access_created, completed, cancelled';

-- ============================================
-- 2. ADD IT ACCESS FIELDS TO HR_TICKETS (if tracking separately)
-- ============================================

-- Track when IT access was created (in addition to offer tracking)
ALTER TABLE hr_tickets ADD COLUMN IF NOT EXISTS it_access_created_at TIMESTAMPTZ;
ALTER TABLE hr_tickets ADD COLUMN IF NOT EXISTS it_access_created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 3. UPDATE MISSIONS SELECT TO INCLUDE PROJECT
-- ============================================

-- The missions.project_id was already added in migration 004
-- This just ensures the join includes project data

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON COLUMN hr_tickets.it_access_created_at IS 'Timestamp when IT access credentials were created';
COMMENT ON COLUMN hr_tickets.it_access_created_by IS 'User who confirmed IT access was created';
