-- Fix RLS Policies to allow anon access
-- Run this if you already ran database-schema.sql and are getting access errors

-- Drop old policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON teachers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON classes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON students;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON subjects;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON grades;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON fees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON templates;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON certificates;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON indemnity_forms;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON term_reports;

-- Create new policies that allow anon access
CREATE POLICY "Allow all for anon" ON users
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON teachers
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON classes
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON students
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON subjects
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON grades
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON attendance
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON fees
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON templates
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON certificates
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON indemnity_forms
  FOR ALL USING (true);

CREATE POLICY "Allow all for anon" ON term_reports
  FOR ALL USING (true);
