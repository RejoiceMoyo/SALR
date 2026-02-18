-- Seed Data for SM ASP School System
-- Run this AFTER running database-schema.sql

-- First, get the user IDs that were created
-- Admin: will be the first UUID
-- Teacher: will be the second UUID

-- For simplicity, we'll use specific UUIDs to reference
-- You may need to adjust these based on your actual user IDs from the previous insert

-- Create variables (these will need to be replaced with actual UUIDs from your users table)
-- To get your actual UUIDs, run: SELECT id, name, email FROM users;

-- For now, let's insert classes first (we'll update teacher assignments later)
INSERT INTO classes (name, assigned_teacher_id) VALUES
  ('Grade 1', (SELECT id FROM users WHERE email = 'teacher@school.com')),
  ('Grade 2', NULL);

-- Get class IDs we just created
DO $$
DECLARE
  admin_id UUID;
  teacher_user_id UUID;
  teacher_id UUID;
  class1_id UUID;
  class2_id UUID;
  student1_id UUID;
  student2_id UUID;
  student3_id UUID;
  subject1_id UUID;
  subject2_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO admin_id FROM users WHERE email = 'admin@school.com';
  SELECT id INTO teacher_user_id FROM users WHERE email = 'teacher@school.com';
  
  -- Get class IDs
  SELECT id INTO class1_id FROM classes WHERE name = 'Grade 1';
  SELECT id INTO class2_id FROM classes WHERE name = 'Grade 2';
  
  -- Insert teacher record
  INSERT INTO teachers (user_id, name, email, phone, status)
  VALUES (teacher_user_id, 'Rumbidzai Nyathi', 'teacher@school.com', NULL, 'active')
  RETURNING id INTO teacher_id;
  
  -- Assign teacher to class
  INSERT INTO teacher_classes (teacher_id, class_id) VALUES (teacher_id, class1_id);
  
  -- Insert students
  INSERT INTO students (
    student_number, first_name, last_name, class_id, dob, gender, address,
    allergies, medical_notes, parent_contact, guardian_contact, status
  ) VALUES
  (
    'STU-001',
    'Tendai',
    'Chirwa',
    class1_id,
    '2015-03-15',
    'Female',
    '15 Harare Drive',
    'Peanuts',
    'Carry epi-pen',
    '{"fullName": "Chiedza Chirwa", "relationship": "Parent", "phone": "077-123-4567", "email": "chiedza.chirwa@example.com"}'::jsonb,
    '{"fullName": "Tapiwa Chirwa", "relationship": "Guardian", "phone": "077-654-3210"}'::jsonb,
    'active'
  ),
  (
    'STU-002',
    'Kudakwashe',
    'Mutasa',
    class1_id,
    '2015-07-22',
    'Male',
    '42 Bulawayo Lane',
    NULL,
    NULL,
    '{"fullName": "Farai Mutasa", "relationship": "Parent", "phone": "077-234-5678", "email": "farai.mutasa@example.com"}'::jsonb,
    NULL,
    'active'
  ),
  (
    'STU-003',
    'Rutendo',
    'Sibanda',
    class2_id,
    '2014-11-08',
    'Male', 
    '8 Mutare Crescent',
    NULL,
    NULL,
    '{"fullName": "Nyasha Sibanda", "relationship": "Parent", "phone": "077-345-6789"}'::jsonb,
    NULL,
    'active'
  );
  
  -- Get student IDs
  SELECT id INTO student1_id FROM students WHERE student_number = 'STU-001';
  SELECT id INTO student2_id FROM students WHERE student_number = 'STU-002';
  SELECT id INTO student3_id FROM students WHERE student_number = 'STU-003';
  
  -- Insert subjects
  INSERT INTO subjects (name, class_id, teacher_id)
  VALUES
    ('Mathematics', class1_id, teacher_id),
    ('English', class1_id, teacher_id);
  
  -- Get subject IDs
  SELECT id INTO subject1_id FROM subjects WHERE name = 'Mathematics' AND class_id = class1_id;
  SELECT id INTO subject2_id FROM subjects WHERE name = 'English' AND class_id = class1_id;
  
  -- Insert grades
  INSERT INTO grades (student_id, subject_id, marks, term, comment)
  VALUES
    (student1_id, subject1_id, 85, 'Term 1', NULL),
    (student1_id, subject2_id, 92, 'Term 1', NULL),
    (student2_id, subject1_id, 78, 'Term 1', NULL),
    (student2_id, subject2_id, 88, 'Term 1', NULL);
  
  -- Insert fees
  INSERT INTO fees (student_id, term, amount_due, amount_paid, receipt_number, date, description)
  VALUES
    (student1_id, 'Term 1', 12500, 12500, 'RCP-001', '2025-01-15', NULL),
    (student2_id, 'Term 1', 12500, 8000, 'RCP-002', '2025-01-20', NULL);
  
  -- Insert templates
  INSERT INTO templates (type, name, content, created_by)
  VALUES
    (
      'report',
      'End of Term Report',
      E'SCHOOL NAME\n\nEND OF TERM REPORT\n\nStudent: {{StudentName}}\nClass: {{Class}}\nTerm: {{Term}}\n\n{{Grades}}\n\nTotal: {{Total}}\nAverage: {{Average}}\n\nTeacher Comment: {{TeacherComment}}\n\n{{TeacherSignature}}',
      admin_id
    ),
    (
      'certificate',
      'Certificate of Achievement',
      E'CERTIFICATE OF ACHIEVEMENT\n\nThis certifies that\n\n{{StudentName}}\n\nof {{Class}} has shown outstanding performance in {{Term}}\n\n{{TeacherSignature}}\nDate: {{Date}}',
      admin_id
    ),
    (
      'receipt',
      'Fee Receipt',
      E'FEE RECEIPT\n\nReceipt No: {{ReceiptNumber}}\nDate: {{Date}}\n\nStudent: {{StudentName}}\nClass: {{Class}}\nTerm: {{Term}}\n\nAmount Due: {{AmountDue}}\nAmount Paid: {{AmountPaid}}\nBalance: {{Balance}}\n\n{{TeacherSignature}}',
      admin_id
    ),
    (
      'indemnity',
      'Indemnity Form',
      E'INDEMNITY FORM\n\nI, the parent/guardian of {{StudentName}} of {{Class}}, hereby indemnify the school against any claims.\n\nParent/Guardian: {{ParentName}}\nDate: {{Date}}\n\n{{TeacherSignature}}',
      admin_id
    );
  
END $$;
