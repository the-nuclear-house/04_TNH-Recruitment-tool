-- Fix script for offers table RLS policy
-- Run this if you already have the offers table but are getting permission errors

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update relevant offers" ON offers;

-- Create simpler update policy
CREATE POLICY "Authenticated users can update offers" ON offers
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create delete policy if not exists
DROP POLICY IF EXISTS "Authenticated users can delete offers" ON offers;
CREATE POLICY "Authenticated users can delete offers" ON offers
  FOR DELETE USING (auth.uid() IS NOT NULL);
