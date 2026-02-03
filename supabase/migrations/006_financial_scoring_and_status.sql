-- Migration: Add financial_scoring to companies and dormant status support
-- Date: 2026-02-03

-- Add financial_scoring column to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS financial_scoring VARCHAR(2);

-- Add comment explaining the field
COMMENT ON COLUMN companies.financial_scoring IS 'Financial scoring/credit rating for the company. Values: A (Excellent), B (Good), C (Satisfactory), D (Below Average), E (Poor), F (Very Poor/High Risk). Required before creating first project.';

-- Update status column comment to include dormant
COMMENT ON COLUMN companies.status IS 'Company status. prospect = new customer, active = has active projects, dormant = all projects closed, inactive = manually set, former = no longer a customer';
