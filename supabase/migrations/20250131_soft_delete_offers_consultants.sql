-- Add soft delete to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Add soft delete to consultants table (if not already there)
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_offers_deleted_at ON offers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_consultants_deleted_at ON consultants(deleted_at);

COMMENT ON COLUMN offers.deleted_at IS 'Soft delete timestamp - null means active';
COMMENT ON COLUMN consultants.deleted_at IS 'Soft delete timestamp - null means active';
