-- Migration: Change role (single) to roles (array)
-- This allows users to have multiple roles

-- Step 1: Add new roles column as array
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['recruiter'];

-- Step 2: Migrate existing role data to roles array
UPDATE users SET roles = ARRAY[role] WHERE role IS NOT NULL AND (roles IS NULL OR roles = '{}');

-- Step 3: Drop the old role column (optional - can keep for backwards compatibility)
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Note: If you want to keep backwards compatibility during transition, 
-- keep the old 'role' column and update both when changing roles.
-- Once all code is updated, you can drop the old column.
