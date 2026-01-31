-- ============================================
-- SET SUPERADMIN
-- ============================================
-- Run this in Supabase SQL Editor to make a user a superadmin
-- Replace 'your-email@example.com' with the actual email
-- ============================================

-- Option 1: Set by email
UPDATE users 
SET roles = ARRAY['superadmin']
WHERE email = 'your-email@example.com';

-- Option 2: Set by user ID
-- UPDATE users 
-- SET roles = ARRAY['superadmin']
-- WHERE id = 'your-user-uuid-here';

-- Verify the change
SELECT id, email, full_name, roles 
FROM users 
WHERE email = 'your-email@example.com';

-- ============================================
-- NOTES:
-- ============================================
-- Superadmin has these exclusive abilities:
-- 1. Can assign Admin role to other users
-- 2. Can hard delete records (permanent removal)
-- 3. Has all Admin permissions
--
-- Regular Admin can:
-- 1. Soft delete only (archive)
-- 2. Cannot create other admins
-- 3. Full system access otherwise
--
-- To add admin to an existing role (e.g., manager + admin):
-- UPDATE users 
-- SET roles = ARRAY['manager', 'admin']
-- WHERE email = 'manager@example.com';
