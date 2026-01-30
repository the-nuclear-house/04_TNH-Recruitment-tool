-- Customers and Contacts tables for CRM functionality

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(50), -- e.g., '1-10', '11-50', '51-200', '201-500', '500+'
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'United Kingdom',
  status VARCHAR(50) DEFAULT 'prospect', -- prospect, active, inactive
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer_id to requirements (link requirements to customers)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view customers" ON customers
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and above can create customers" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers and above can update customers" ON customers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customers" ON customers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- Customer contacts policies
CREATE POLICY "Users can view customer contacts" ON customer_contacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and above can manage contacts" ON customer_contacts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'director', 'manager'])
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_requirements_customer ON requirements(customer_id);
