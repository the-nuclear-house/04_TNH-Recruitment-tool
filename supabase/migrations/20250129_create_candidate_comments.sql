-- Create candidate_comments table for activity/discussion on candidates
CREATE TABLE IF NOT EXISTS candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_candidate_comments_candidate_id ON candidate_comments(candidate_id);
CREATE INDEX idx_candidate_comments_user_id ON candidate_comments(user_id);

-- Enable RLS
ALTER TABLE candidate_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view comments
CREATE POLICY "Users can view all comments" ON candidate_comments
  FOR SELECT USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments" ON candidate_comments
  FOR INSERT WITH CHECK (true);

-- Users can only update their own comments
CREATE POLICY "Users can update own comments" ON candidate_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own comments (or admin)
CREATE POLICY "Users can delete own comments" ON candidate_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Add created_by to requirements table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requirements' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE requirements ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;
