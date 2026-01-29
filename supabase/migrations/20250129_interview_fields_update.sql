-- Add new interview fields
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS warnings TEXT,
ADD COLUMN IF NOT EXISTS contract_preference VARCHAR(50),
ADD COLUMN IF NOT EXISTS salary_proposed DECIMAL(10,2);

-- contract_preference values: 'contractor', 'permanent', 'open_to_both'
