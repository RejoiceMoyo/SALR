export type Role = "admin" | "teacher"

export interface User {
  id: string
  name: string
  role: Role
  email: string
  password: string
  status: "active" | "inactive" | "archived"
}

export interface StudentContact {
  fullName: string
  relationship: string
  phone: string
  email?: string
}

export interface Student {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
  classId: string
  dob: string
  gender: string
  address: string
  allergies?: string
  medicalNotes?: string
  parentContact: StudentContact
  guardianContact?: StudentContact
  status: "active" | "inactive" | "archived"
}

// Teacher combines data from users + teachers tables
export interface Teacher {
  id: string // teachers.id
  userId: string // teachers.user_id (references users.id)
  name: string // from users.name
  email: string // from users.email
  phone?: string // from teachers.phone
  assignedClasses: string[] // from teacher_classes junction
  status: "active" | "inactive" | "archived" // from users.status
  signatureImage?: string // from teachers.signature_image
}

export interface SchoolClass {
  id: string
  name: string
}

export interface Subject {
  id: string
  name: string
  classId: string
  teacherId: string
}

export interface Grade {
  id: string
  studentId: string
  subjectId: string
  marks: number
  term: string
  academicYear: number
  comment?: string
}

export interface AcademicTerm {
  id: string
  year: number
  term: number
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

export interface Attendance {
  id: string
  studentId: string
  classId: string
  date: string
  status: "present" | "absent" | "late" | "excused"
  comment?: string
}

export interface Template {
  id: string
  type: "report" | "certificate" | "indemnity"
  name: string
  content: string
  createdBy: string
}

export interface Certificate {
  id: string
  studentId: string
  type: string
  templateId: string
  generatedDate: string
}

export interface IndemnityForm {
  id: string
  studentId: string
  templateId: string
  generatedDate: string
  content: string
  signedBy?: string
}

export interface TermReportRecord {
  id: string
  studentId: string
  classId: string
  term: string
  templateId: string
  generatedDate: string
  generatedBy: string
  content: string
  comments: string
}
