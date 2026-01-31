-- ============================================
-- ADD SUPERADMIN TO ALL RLS POLICIES
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- COMPANIES
DROP POLICY IF EXISTS "Managers can insert companies" ON companies;
DROP POLICY IF EXISTS "Managers can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

CREATE POLICY "Managers can insert companies" ON companies
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update companies" ON companies
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete companies" ON companies
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CONTACTS
DROP POLICY IF EXISTS "Managers can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Managers can update contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON contacts;

CREATE POLICY "Managers can insert contacts" ON contacts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update contacts" ON contacts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete contacts" ON contacts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Managers can insert customers" ON customers;
DROP POLICY IF EXISTS "Managers can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

CREATE POLICY "Managers can insert customers" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customers" ON customers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customers" ON customers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMER_CONTACTS
DROP POLICY IF EXISTS "Managers can insert customer_contacts" ON customer_contacts;
DROP POLICY IF EXISTS "Managers can update customer_contacts" ON customer_contacts;
DROP POLICY IF EXISTS "Admins can delete customer_contacts" ON customer_contacts;

CREATE POLICY "Managers can insert customer_contacts" ON customer_contacts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_contacts" ON customer_contacts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_contacts" ON customer_contacts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMER_MEETINGS
DROP POLICY IF EXISTS "Managers can insert customer_meetings" ON customer_meetings;
DROP POLICY IF EXISTS "Managers can update customer_meetings" ON customer_meetings;
DROP POLICY IF EXISTS "Admins can delete customer_meetings" ON customer_meetings;

CREATE POLICY "Managers can insert customer_meetings" ON customer_meetings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_meetings" ON customer_meetings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_meetings" ON customer_meetings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CUSTOMER_ASSESSMENTS
DROP POLICY IF EXISTS "Managers can insert customer_assessments" ON customer_assessments;
DROP POLICY IF EXISTS "Managers can update customer_assessments" ON customer_assessments;
DROP POLICY IF EXISTS "Admins can delete customer_assessments" ON customer_assessments;

CREATE POLICY "Managers can insert customer_assessments" ON customer_assessments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update customer_assessments" ON customer_assessments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete customer_assessments" ON customer_assessments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CONSULTANTS
DROP POLICY IF EXISTS "Managers can insert consultants" ON consultants;
DROP POLICY IF EXISTS "Managers can update consultants" ON consultants;
DROP POLICY IF EXISTS "Admins can delete consultants" ON consultants;

CREATE POLICY "Managers can insert consultants" ON consultants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update consultants" ON consultants
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete consultants" ON consultants
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- MISSIONS
DROP POLICY IF EXISTS "Managers can insert missions" ON missions;
DROP POLICY IF EXISTS "Managers can update missions" ON missions;
DROP POLICY IF EXISTS "Admins can delete missions" ON missions;

CREATE POLICY "Managers can insert missions" ON missions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update missions" ON missions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete missions" ON missions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- CONSULTANT_MEETINGS
DROP POLICY IF EXISTS "Managers can insert consultant_meetings" ON consultant_meetings;
DROP POLICY IF EXISTS "Managers can update consultant_meetings" ON consultant_meetings;
DROP POLICY IF EXISTS "Admins can delete consultant_meetings" ON consultant_meetings;

CREATE POLICY "Managers can insert consultant_meetings" ON consultant_meetings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Managers can update consultant_meetings" ON consultant_meetings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Admins can delete consultant_meetings" ON consultant_meetings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- APPROVAL_REQUESTS
DROP POLICY IF EXISTS "Managers can insert approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Directors can update approval_requests" ON approval_requests;

CREATE POLICY "Managers can insert approval_requests" ON approval_requests
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Directors can update approval_requests" ON approval_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'hr'])
  )
);

-- SALARY_HISTORY
DROP POLICY IF EXISTS "Managers can insert salary_history" ON salary_history;
DROP POLICY IF EXISTS "Managers can update salary_history" ON salary_history;

CREATE POLICY "Managers can insert salary_history" ON salary_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

CREATE POLICY "Managers can update salary_history" ON salary_history
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

-- BONUS_PAYMENTS
DROP POLICY IF EXISTS "Managers can insert bonus_payments" ON bonus_payments;
DROP POLICY IF EXISTS "Managers can update bonus_payments" ON bonus_payments;

CREATE POLICY "Managers can insert bonus_payments" ON bonus_payments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

CREATE POLICY "Managers can update bonus_payments" ON bonus_payments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager', 'hr'])
  )
);

-- CONSULTANT_EXITS
DROP POLICY IF EXISTS "Managers can insert consultant_exits" ON consultant_exits;
DROP POLICY IF EXISTS "Directors can update consultant_exits" ON consultant_exits;

CREATE POLICY "Managers can insert consultant_exits" ON consultant_exits
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'manager'])
  )
);

CREATE POLICY "Directors can update consultant_exits" ON consultant_exits
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'director', 'hr'])
  )
);

-- HR_TICKETS
DROP POLICY IF EXISTS "HR can manage tickets" ON hr_tickets;

CREATE POLICY "HR can manage tickets" ON hr_tickets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin', 'hr'])
  )
);

-- USERS (for creating new users)
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

CREATE POLICY "Admins can insert users" ON users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

CREATE POLICY "Admins can update users" ON users
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['superadmin', 'admin'])
  )
);

-- Verify superadmin role is working
SELECT email, roles FROM users WHERE 'superadmin' = ANY(roles);
