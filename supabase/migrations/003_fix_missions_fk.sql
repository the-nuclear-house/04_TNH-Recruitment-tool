-- Fix missions table to reference companies instead of customers
-- The app uses "companies" table for customer data, but missions was referencing "customers" table

-- Drop the existing foreign key constraint
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_customer_id_fkey;

-- Rename customer_id to company_id for clarity
ALTER TABLE missions RENAME COLUMN customer_id TO company_id;

-- Add the new foreign key constraint referencing companies
ALTER TABLE missions ADD CONSTRAINT missions_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Update the contact_id FK to use contacts instead of customer_contacts if needed
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_contact_id_fkey;
ALTER TABLE missions ADD CONSTRAINT missions_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
