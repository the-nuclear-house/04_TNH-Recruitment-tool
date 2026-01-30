-- Fix interviews table to ensure all required columns exist
-- This migration reconciles differences between original and updated schema

-- Add candidate_id if it doesn't exist (newer schema uses this instead of application_id)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id);

-- Add deleted_at for soft deletes
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add requirement_id for linking to requirements
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES requirements(id);

-- Ensure warnings column exists
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS warnings TEXT;

-- Ensure contract_preference column exists
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS contract_preference VARCHAR(50);

-- Ensure salary_proposed exists (use NUMERIC to handle both number and decimal inputs)
-- First check if it exists as TEXT and needs conversion
DO $$
BEGIN
  -- Try to add as numeric type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'salary_proposed') THEN
    ALTER TABLE interviews ADD COLUMN salary_proposed NUMERIC(10,2);
  END IF;
END $$;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_interviews_deleted_at ON interviews(deleted_at);

-- Create index for candidate lookups  
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
