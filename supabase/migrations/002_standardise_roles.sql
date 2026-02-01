-- ============================================
-- COCKPIT CRM - ROLE STANDARDISATION
-- ============================================
-- This migration documents the official role names used in Cockpit.
-- The roles array in the users table accepts any TEXT values,
-- but these are the official roles the application expects.
--
-- Run this after 001_complete_schema.sql

-- ============================================
-- OFFICIAL ROLE NAMES
-- ============================================
-- The application uses these 10 roles across 4 departments plus admin:
--
-- ADMIN (cross-department):
--   - superadmin    : Full system access, can create admins
--   - admin         : Full system access, cannot create other admins
--
-- RECRUITMENT DEPARTMENT:
--   - recruiter_manager : Manages recruiters, views department stats
--   - recruiter         : Adds/edits candidates, schedules interviews
--
-- TECHNICAL DEPARTMENT:
--   - technical_director : Approves technical decisions, views all feedback
--   - technical          : Conducts technical interviews
--
-- BUSINESS DEPARTMENT:
--   - business_director  : Approves contracts/requests, views all managers
--   - business_manager   : Manages requirements, customer relationships
--
-- HR DEPARTMENT:
--   - hr_manager : Approves HR requests, views department stats
--   - hr         : Processes tickets, manages consultant records

-- ============================================
-- HELPER FUNCTION TO CHECK VALID ROLES
-- ============================================
-- This function can be used to validate roles if needed

CREATE OR REPLACE FUNCTION is_valid_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN role_name IN (
    'superadmin',
    'admin',
    'business_director',
    'business_manager',
    'technical_director',
    'technical',
    'recruiter_manager',
    'recruiter',
    'hr_manager',
    'hr'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- COMMENT ON USERS TABLE
-- ============================================
COMMENT ON COLUMN users.roles IS 'Array of role names. Valid roles: superadmin, admin, business_director, business_manager, technical_director, technical, recruiter_manager, recruiter, hr_manager, hr';

-- ============================================
-- MIGRATE OLD ROLE NAMES (if any exist)
-- ============================================
-- This updates any users who might have old role names

UPDATE users 
SET roles = array_replace(roles, 'director', 'business_director')
WHERE 'director' = ANY(roles);

UPDATE users 
SET roles = array_replace(roles, 'manager', 'business_manager')
WHERE 'manager' = ANY(roles);

UPDATE users 
SET roles = array_replace(roles, 'interviewer', 'technical')
WHERE 'interviewer' = ANY(roles);

-- ============================================
-- VERIFY MIGRATION
-- ============================================
-- Run this to check current roles in the system:
-- SELECT DISTINCT unnest(roles) as role FROM users ORDER BY role;
