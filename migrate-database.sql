-- SAMSP Database Migration Script
-- This will drop all existing tables and recreate them with the new schema
-- WARNING: This will delete all existing data!
-- Make sure you have a backup if you have important data

-- Drop all existing tables (CASCADE removes foreign key dependencies)
DROP TABLE IF EXISTS term_reports CASCADE;
DROP TABLE IF EXISTS indemnity_forms CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teacher_classes CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (includes both admin and teacher users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers table (stores additional teacher-specific data only)
-- Name and email are in users table - always join to get full teacher info
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  phone TEXT,
  signature_image TEXT,
  additional_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher-Class assignments (many-to-many)
-- References users.id directly (not teachers.id) for consistency
CREATE TABLE teacher_classes (
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, class_id)
);

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_number TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  dob DATE NOT NULL,
  gender TEXT NOT NULL,
  address TEXT,
  allergies TEXT,
  medical_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Parent contact (embedded JSON)
  parent_contact JSONB NOT NULL,
  
  -- Guardian contact (optional, embedded JSON)
  guardian_contact JSONB,
  
  additional_info JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
-- References users.id for teacher (not teachers.id) for consistency
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic terms table
-- Tracks school terms and years for proper data organization
CREATE TABLE academic_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3, 4)),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, term)
);

-- Grades table
-- Keep historical records - prevent deletion of students/subjects with grades
-- Added academic_year and unique constraint to prevent duplicate grades
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE RESTRICT,
  subject_id UUID REFERENCES subjects(id) ON DELETE RESTRICT,
  marks NUMERIC NOT NULL,
  term TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term, academic_year)
);

-- Attendance table
-- Keep historical records - prevent deletion of students with attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE RESTRICT,
  class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Fees table
-- Keep historical records - prevent deletion of students with fee records
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE RESTRICT,
  term TEXT NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  receipt_number TEXT,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('report', 'certificate', 'receipt', 'indemnity')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates table
-- Keep historical records - student/template can be archived but certificate stays
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  generated_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indemnity forms table
-- Keep historical records
CREATE TABLE indemnity_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  signed_by TEXT,
  generated_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Term reports table
-- Keep historical records - preserve who generated report even if user archived
CREATE TABLE term_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE RESTRICT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  term TEXT NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  comments TEXT,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject_id ON grades(subject_id);
CREATE INDEX idx_grades_term_year ON grades(term, academic_year);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_fees_student_id ON fees(student_id);
CREATE INDEX idx_subjects_class_id ON subjects(class_id);
CREATE INDEX idx_subjects_teacher_id ON subjects(teacher_id);
CREATE INDEX idx_teacher_classes_user_id ON teacher_classes(user_id);
CREATE INDEX idx_teacher_classes_class_id ON teacher_classes(class_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_academic_terms_year ON academic_terms(year);
CREATE INDEX idx_academic_terms_active ON academic_terms(is_active) WHERE is_active = true;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE indemnity_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for anon since we handle auth in the app)
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON teachers FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON classes FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON grades FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON fees FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON templates FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON certificates FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON indemnity_forms FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON term_reports FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON teacher_classes FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON academic_terms FOR ALL USING (true);

-- Insert seed data
INSERT INTO users (name, role, email, password, status) VALUES
  ('Tatenda Moyo', 'admin', 'admin@school.com', 'admin123', 'active'),
  ('Rumbidzai Nyathi', 'teacher', 'teacher@school.com', 'teacher123', 'active');

-- Insert 2026 academic terms (South African school calendar)
INSERT INTO academic_terms (year, term, name, start_date, end_date, is_active) VALUES
  (2026, 1, 'Term 1', '2026-01-14', '2026-03-27', true),
  (2026, 2, 'Term 2', '2026-04-08', '2026-06-26', false),
  (2026, 3, 'Term 3', '2026-07-21', '2026-09-23', false),
  (2026, 4, 'Term 4', '2026-10-06', '2026-12-09', false);

-- Migration complete!
-- You can now log in with:
-- Admin: admin@school.com / admin123
-- Teacher: teacher@school.com / teacher123
