-- ============================================
-- CLEAN ALL DATA - START FRESH
-- ============================================
-- Run this script in Supabase SQL Editor to remove ALL data
-- This is irreversible!
-- ============================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = replica;

-- Delete in correct order (child tables first due to foreign keys)

-- HR and Approval related
DELETE FROM hr_tickets;
DELETE FROM consultant_exits;
DELETE FROM bonus_payments;
DELETE FROM salary_history;
DELETE FROM approval_requests;

-- Consultant related
DELETE FROM consultant_meetings;
DELETE FROM missions;
DELETE FROM consultants;

-- Customer related
DELETE FROM customer_contacts;
DELETE FROM customers;

-- Candidate related
DELETE FROM customer_assessments;
DELETE FROM candidate_comments;
DELETE FROM applications;
DELETE FROM offers;
DELETE FROM interviews;
DELETE FROM candidates;

-- Requirements
DELETE FROM requirements;

-- Meetings
DELETE FROM customer_meetings;

-- Companies and contacts (old tables if they exist)
DELETE FROM contacts;
DELETE FROM companies;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify all tables are empty
SELECT 'candidates' as table_name, COUNT(*) as row_count FROM candidates
UNION ALL SELECT 'requirements', COUNT(*) FROM requirements
UNION ALL SELECT 'interviews', COUNT(*) FROM interviews
UNION ALL SELECT 'offers', COUNT(*) FROM offers
UNION ALL SELECT 'consultants', COUNT(*) FROM consultants
UNION ALL SELECT 'missions', COUNT(*) FROM missions
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'customer_contacts', COUNT(*) FROM customer_contacts
UNION ALL SELECT 'customer_meetings', COUNT(*) FROM customer_meetings
UNION ALL SELECT 'approval_requests', COUNT(*) FROM approval_requests
UNION ALL SELECT 'hr_tickets', COUNT(*) FROM hr_tickets;

-- ============================================
-- ALTERNATIVE: Delete only soft-deleted records (clean up archived data)
-- ============================================
-- Uncomment below to ONLY remove archived/soft-deleted records

-- DELETE FROM candidates WHERE deleted_at IS NOT NULL;
-- DELETE FROM requirements WHERE deleted_at IS NOT NULL;
-- DELETE FROM interviews WHERE deleted_at IS NOT NULL;
-- DELETE FROM offers WHERE deleted_at IS NOT NULL;
-- DELETE FROM consultants WHERE deleted_at IS NOT NULL;
-- DELETE FROM missions WHERE deleted_at IS NOT NULL;

-- ============================================
-- RESET SEQUENCES (if you want reference IDs to start from 1 again)
-- ============================================
-- Note: This only works if the tables use sequences for reference_id generation.
-- The triggers auto-generate based on MAX, so they'll reset automatically when tables are empty.
