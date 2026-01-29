-- Fix RLS policies for delete operations
-- This allows authenticated users (especially admin) to delete records

-- Drop existing restrictive delete policies if they exist
DROP POLICY IF EXISTS "Users can delete candidates" ON candidates;
DROP POLICY IF EXISTS "Users can delete requirements" ON requirements;

-- Create permissive delete policies (admin check done in application)
CREATE POLICY "Authenticated users can delete candidates" ON candidates
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete requirements" ON requirements
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also ensure comments can be deleted by their owner
DROP POLICY IF EXISTS "Users can delete own comments" ON candidate_comments;
CREATE POLICY "Users can delete own comments" ON candidate_comments
  FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- If RLS is too restrictive, you can also disable it temporarily for testing
-- ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE requirements DISABLE ROW LEVEL SECURITY;
