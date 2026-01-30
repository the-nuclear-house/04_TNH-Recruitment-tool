-- Add reference_id columns for human-readable IDs
-- These will be auto-generated using triggers

-- Add reference_id and deleted_at to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add reference_id and deleted_at to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add reference_id and deleted_at to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add reference_id, title and deleted_at to requirements
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS reference_id TEXT UNIQUE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for soft delete queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_candidates_deleted_at ON candidates(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requirements_deleted_at ON requirements(deleted_at) WHERE deleted_at IS NULL;

-- Create sequences for auto-generating reference IDs
CREATE SEQUENCE IF NOT EXISTS candidate_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS company_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contact_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS requirement_ref_seq START 1;

-- Function to generate candidate reference ID
CREATE OR REPLACE FUNCTION generate_candidate_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'CAND-' || LPAD(nextval('candidate_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate company reference ID
CREATE OR REPLACE FUNCTION generate_company_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'CUST-' || LPAD(nextval('company_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate contact reference ID
CREATE OR REPLACE FUNCTION generate_contact_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'CON-' || LPAD(nextval('contact_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate requirement reference ID
CREATE OR REPLACE FUNCTION generate_requirement_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'REQ-' || LPAD(nextval('requirement_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS set_candidate_reference_id ON candidates;
CREATE TRIGGER set_candidate_reference_id
  BEFORE INSERT ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION generate_candidate_reference_id();

DROP TRIGGER IF EXISTS set_company_reference_id ON companies;
CREATE TRIGGER set_company_reference_id
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION generate_company_reference_id();

DROP TRIGGER IF EXISTS set_contact_reference_id ON contacts;
CREATE TRIGGER set_contact_reference_id
  BEFORE INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION generate_contact_reference_id();

DROP TRIGGER IF EXISTS set_requirement_reference_id ON requirements;
CREATE TRIGGER set_requirement_reference_id
  BEFORE INSERT ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION generate_requirement_reference_id();

-- Backfill existing records with reference IDs
UPDATE candidates SET reference_id = 'CAND-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') 
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM candidates WHERE reference_id IS NULL) sub 
WHERE candidates.id = sub.id AND candidates.reference_id IS NULL;

UPDATE companies SET reference_id = 'CUST-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM companies WHERE reference_id IS NULL) sub
WHERE companies.id = sub.id AND companies.reference_id IS NULL;

UPDATE contacts SET reference_id = 'CON-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM contacts WHERE reference_id IS NULL) sub
WHERE contacts.id = sub.id AND contacts.reference_id IS NULL;

UPDATE requirements SET reference_id = 'REQ-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM requirements WHERE reference_id IS NULL) sub
WHERE requirements.id = sub.id AND requirements.reference_id IS NULL;

-- Reset sequences to max value + 1
SELECT setval('candidate_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)) FROM candidates WHERE reference_id LIKE 'CAND-%'), 0) + 1);
SELECT setval('company_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 6) AS INTEGER)) FROM companies WHERE reference_id LIKE 'CUST-%'), 0) + 1);
SELECT setval('contact_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)) FROM contacts WHERE reference_id LIKE 'CON-%'), 0) + 1);
SELECT setval('requirement_ref_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(reference_id FROM 5) AS INTEGER)) FROM requirements WHERE reference_id LIKE 'REQ-%'), 0) + 1);
