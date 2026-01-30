-- Add org chart fields to contacts table
-- This adds role and direct report linking for org chart visualization

-- Add role field (e.g., "CEO", "Director", "Manager", etc.)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS role VARCHAR(100);

-- Add reports_to field (links to another contact who is their direct manager)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Create index for reports_to lookups
CREATE INDEX IF NOT EXISTS idx_contacts_reports_to ON contacts(reports_to_id);

-- Update requirements table to also link to a contact (the person who raised the requirement)
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requirements_contact ON requirements(contact_id);
