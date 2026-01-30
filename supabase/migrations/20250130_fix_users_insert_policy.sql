-- Fix RLS policy for users table to allow admins to create new users
-- The issue is the check was too restrictive

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

-- Create a more permissive policy
-- Allow authenticated users to insert if:
-- 1. They are inserting their own record (for initial setup / self-registration)
-- 2. They have admin role (can create any user)
CREATE POLICY "Users can insert" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow self-insert (user creating their own profile after auth signup)
  auth.uid() = id
  OR
  -- Allow admins to insert any user
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- Also ensure admins can delete users
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);
