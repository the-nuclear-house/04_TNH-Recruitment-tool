-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
CREATE POLICY "Users can view all applications" ON applications
  FOR SELECT USING (true);

CREATE POLICY "Users can create applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update applications" ON applications
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete applications" ON applications
  FOR DELETE USING (true);
