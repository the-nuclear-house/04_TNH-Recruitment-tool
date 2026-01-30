-- ============================================================
-- RESET SCRIPT: Run this when ready to go live
-- This will permanently delete all test data and reset IDs
-- ============================================================
-- 
-- WARNING: This script permanently deletes data!
-- Make sure you have backups before running.
--
-- Options:
-- 1. Run SECTION A only: Just permanently delete soft-deleted records
-- 2. Run SECTION A + B: Delete soft-deleted + reset ID sequences
-- 3. Run ALL SECTIONS: Complete reset (delete ALL data, reset everything)
--

-- ============================================================
-- SECTION A: Permanently delete soft-deleted records
-- (Safe to run - only removes already "deleted" items)
-- ============================================================

-- Delete soft-deleted candidates
DELETE FROM candidates WHERE deleted_at IS NOT NULL;

-- Delete soft-deleted companies (and their related data)
-- First delete contacts of deleted companies
DELETE FROM contacts WHERE company_id IN (SELECT id FROM companies WHERE deleted_at IS NOT NULL);
-- Then delete the companies
DELETE FROM companies WHERE deleted_at IS NOT NULL;

-- Delete soft-deleted contacts
DELETE FROM contacts WHERE deleted_at IS NOT NULL;

-- Delete soft-deleted requirements
DELETE FROM requirements WHERE deleted_at IS NOT NULL;

-- ============================================================
-- SECTION B: Reset ID sequences to continue from current max
-- (Run after Section A if you want clean sequence numbers)
-- ============================================================

-- Reset sequences to max value + 1 (fills in gaps from deleted records)
SELECT setval('candidate_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)) FROM candidates WHERE reference_id LIKE 'CAND-%'), 0) + 1);
SELECT setval('company_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)) FROM companies WHERE reference_id LIKE 'CUST-%'), 0) + 1);
SELECT setval('contact_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)) FROM contacts WHERE reference_id LIKE 'CON-%'), 0) + 1);
SELECT setval('requirement_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)) FROM requirements WHERE reference_id LIKE 'REQ-%'), 0) + 1);

-- ============================================================
-- SECTION C: COMPLETE RESET - Delete ALL data and start fresh
-- ============================================================
-- DANGER: This deletes EVERYTHING! Only run when going live.
-- Uncomment the lines below to execute.

-- -- Delete all application/interview data first (foreign key dependencies)
-- DELETE FROM interviews;
-- DELETE FROM applications;
-- DELETE FROM customer_meetings;
-- DELETE FROM customer_assessments;

-- -- Delete all main records
-- DELETE FROM candidates;
-- DELETE FROM contacts;
-- DELETE FROM requirements;
-- DELETE FROM companies;

-- -- Reset all sequences to 1
-- SELECT setval('candidate_ref_seq', 1, false);
-- SELECT setval('company_ref_seq', 1, false);
-- SELECT setval('contact_ref_seq', 1, false);
-- SELECT setval('requirement_ref_seq', 1, false);

-- ============================================================
-- VERIFICATION: Check current state
-- ============================================================

-- Show current counts
SELECT 'Candidates' as table_name, 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted
FROM candidates
UNION ALL
SELECT 'Companies', COUNT(*), COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
FROM companies
UNION ALL
SELECT 'Contacts', COUNT(*), COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
FROM contacts
UNION ALL
SELECT 'Requirements', COUNT(*), COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
FROM requirements;

-- Show current sequence values
SELECT 'candidate_ref_seq' as sequence_name, last_value FROM candidate_ref_seq
UNION ALL
SELECT 'company_ref_seq', last_value FROM company_ref_seq
UNION ALL
SELECT 'contact_ref_seq', last_value FROM contact_ref_seq
UNION ALL
SELECT 'requirement_ref_seq', last_value FROM requirement_ref_seq;
