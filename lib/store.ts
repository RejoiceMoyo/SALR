import { supabase } from "./supabase"

// Types
export interface User {
  id: string
  name: string
  role: "admin" | "teacher"
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

// Helper to convert snake_case DB columns to camelCase
function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(toCamelCase)
  
  const converted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    converted[camelKey] = value
  }
  return converted
}

// Helper to convert camelCase to snake_case for DB
function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  
  const converted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    converted[snakeKey] = value
  }
  return converted
}

// CRUD operations with Supabase
export const UsersStore = {
  getAll: async (): Promise<User[]> => {
    const { data, error } = await supabase.from("users").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getById: async (id: string): Promise<User | null> => {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single()
    if (error) return null
    return data ? toCamelCase(data) : null
  },
  
  getByEmail: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single()
    if (error) return null
    return data ? toCamelCase(data) : null
  },
  
  add: async (user: Omit<User, "id">): Promise<User> => {
    const { data, error } = await supabase
      .from("users")
      .insert([toSnakeCase(user)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<User>): Promise<void> => {
    const { error } = await supabase
      .from("users")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) throw error
  },
  
  verifyPassword: async (email: string, password: string): Promise<boolean> => {
    const user = await UsersStore.getByEmail(email)
    return user ? user.password === password : false
  },
}

export const StudentsStore = {
  getAll: async (): Promise<Student[]> => {
    const { data, error } = await supabase.from("students").select("*")
    if (error) throw error
    return (data || []).map(row => ({
      ...toCamelCase(row),
      parentContact: row.parent_contact,
      guardianContact: row.guardian_contact,
    }))
  },
  
  getById: async (id: string): Promise<Student | null> => {
    const { data, error } = await supabase.from("students").select("*").eq("id", id).single()
    if (error) return null
    return data ? {
      ...toCamelCase(data),
      parentContact: data.parent_contact,
      guardianContact: data.guardian_contact,
    } : null
  },
  
  getByClass: async (classId: string): Promise<Student[]> => {
    const { data, error } = await supabase.from("students").select("*").eq("class_id", classId)
    if (error) throw error
    return (data || []).map(row => ({
      ...toCamelCase(row),
      parentContact: row.parent_contact,
      guardianContact: row.guardian_contact,
    }))
  },
  
  add: async (student: Omit<Student, "id">): Promise<Student> => {
    const dbRow = {
      ...toSnakeCase(student),
      parent_contact: student.parentContact,
      guardian_contact: student.guardianContact,
    }
    delete dbRow.parent_contact_camel
    delete dbRow.guardian_contact_camel
    
    const { data, error } = await supabase
      .from("students")
      .insert([dbRow])
      .select()
      .single()
    if (error) throw error
    return {
      ...toCamelCase(data),
      parentContact: data.parent_contact,
      guardianContact: data.guardian_contact,
    }
  },
  
  update: async (id: string, updates: Partial<Student>): Promise<void> => {
    const dbUpdates: any = toSnakeCase(updates)
    if (updates.parentContact) dbUpdates.parent_contact = updates.parentContact
    if (updates.guardianContact) dbUpdates.guardian_contact = updates.guardianContact
    
    const { error } = await supabase
      .from("students")
      .update(dbUpdates)
      .eq("id", id)
    if (error) throw error
  },
  
  // Archive instead of hard delete (recommended)
  archive: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("students")
      .update({ status: "archived" })
      .eq("id", id)
    if (error) throw error
  },
  
  // Hard delete (use with caution - will fail if student has grades/attendance)
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("students").delete().eq("id", id)
    if (error) throw error
  },
}

export const TeachersStore = {
  getAll: async (): Promise<Teacher[]> => {
    // Join teachers with users to get name, email, status
    const { data, error } = await supabase
      .from("teachers")
      .select(`
        *,
        users!teachers_user_id_fkey (
          id,
          name,
          email,
          status
        )
      `)
    if (error) throw error
    
    // Get teacher_classes relationships (using user_id now)
    const teachers = data || []
    const teachersWithClasses = await Promise.all(
      teachers.map(async (t: any) => {
        const { data: classes } = await supabase
          .from("teacher_classes")
          .select("class_id")
          .eq("user_id", t.user_id)
        return {
          id: t.id,
          userId: t.user_id,
          name: t.users?.name || "",
          email: t.users?.email || "",
          status: t.users?.status || "active",
          phone: t.phone,
          signatureImage: t.signature_image,
          assignedClasses: (classes || []).map((c) => c.class_id),
        }
      })
    )
    return teachersWithClasses
  },
  
  getById: async (id: string): Promise<Teacher | null> => {
    const { data, error } = await supabase
      .from("teachers")
      .select(`
        *,
        users!teachers_user_id_fkey (
          id,
          name,
          email,
          status
        )
      `)
      .eq("id", id)
      .single()
    if (error) return null
    
    const { data: classes } = await supabase
      .from("teacher_classes")
      .select("class_id")
      .eq("user_id", data.user_id)
    
    return {
      id: data.id,
      userId: data.user_id,
      name: data.users?.name || "",
      email: data.users?.email || "",
      status: data.users?.status || "active",
      phone: data.phone,
      signatureImage: data.signature_image,
      assignedClasses: (classes || []).map((c) => c.class_id),
    }
  },
  
  getByUserId: async (userId: string): Promise<Teacher | null> => {
    const { data, error } = await supabase
      .from("teachers")
      .select(`
        *,
        users!teachers_user_id_fkey (
          id,
          name,
          email,
          status
        )
      `)
      .eq("user_id", userId)
      .single()
    if (error) return null
    
    const { data: classes } = await supabase
      .from("teacher_classes")
      .select("class_id")
      .eq("user_id", userId)
    
    return {
      id: data.id,
      userId: data.user_id,
      name: data.users?.name || "",
      email: data.users?.email || "",
      status: data.users?.status || "active",
      phone: data.phone,
      signatureImage: data.signature_image,
      assignedClasses: (classes || []).map((c) => c.class_id),
    }
  },
  
  add: async (teacher: Omit<Teacher, "id" | "name" | "email" | "status">): Promise<Teacher> => {
    const { assignedClasses, userId, phone, signatureImage } = teacher
    
    // Insert into teachers table (only teacher-specific data)
    const { data, error } = await supabase
      .from("teachers")
      .insert([{
        user_id: userId,
        phone: phone || null,
        signature_image: signatureImage || null,
      }])
      .select()
      .single()
    if (error) throw error
    
    // Add class assignments (using user_id now)
    if (assignedClasses && assignedClasses.length > 0) {
      await supabase.from("teacher_classes").insert(
        assignedClasses.map((classId) => ({
          user_id: userId,
          class_id: classId,
        }))
      )
    }
    
    // Get user data for return value
    const user = await UsersStore.getById(userId)
    
    return {
      id: data.id,
      userId: data.user_id,
      name: user?.name || "",
      email: user?.email || "",
      status: user?.status || "active",
      phone: data.phone,
      signatureImage: data.signature_image,
      assignedClasses: assignedClasses || [],
    }
  },
  
  update: async (id: string, updates: Partial<Teacher>): Promise<void> => {
    const { assignedClasses, name, email, status, userId, ...teacherUpdates } = updates
    
    // Update teachers table (only teacher-specific fields)
    if (Object.keys(teacherUpdates).length > 0) {
      const dbUpdates: any = {}
      if (teacherUpdates.phone !== undefined) dbUpdates.phone = teacherUpdates.phone
      if (teacherUpdates.signatureImage !== undefined) dbUpdates.signature_image = teacherUpdates.signatureImage
      
      const { error } = await supabase
        .from("teachers")
        .update(dbUpdates)
        .eq("id", id)
      if (error) throw error
    }
    
    // Update users table if name, email, or status changed
    if (name !== undefined || email !== undefined || status !== undefined) {
      const teacher = await TeachersStore.getById(id)
      if (teacher) {
        const userUpdates: any = {}
        if (name !== undefined) userUpdates.name = name
        if (email !== undefined) userUpdates.email = email
        if (status !== undefined) userUpdates.status = status
        
        await UsersStore.update(teacher.userId, userUpdates)
      }
    }
    
    // Update class assignments if provided
    if (assignedClasses !== undefined) {
      const teacher = await TeachersStore.getById(id)
      if (teacher) {
        // Delete existing assignments
        await supabase.from("teacher_classes").delete().eq("user_id", teacher.userId)
        
        // Add new assignments
        if (assignedClasses.length > 0) {
          await supabase.from("teacher_classes").insert(
            assignedClasses.map((classId) => ({
              user_id: teacher.userId,
              class_id: classId,
            }))
          )
        }
      }
    }
  },
  
  // Archive instead of hard delete
  archive: async (id: string): Promise<void> => {
    const teacher = await TeachersStore.getById(id)
    if (teacher) {
      await UsersStore.update(teacher.userId, { status: "archived" })
    }
  },
  
  // Hard delete (use with caution - will fail if teacher has records)
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("teachers").delete().eq("id", id)
    if (error) throw error
  },
}

export const ClassesStore = {
  getAll: async (): Promise<SchoolClass[]> => {
    const { data, error } = await supabase.from("classes").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getById: async (id: string): Promise<SchoolClass | null> => {
    const { data, error } = await supabase.from("classes").select("*").eq("id", id).single()
    if (error) return null
    return data ? toCamelCase(data) : null
  },
  
  add: async (cls: Omit<SchoolClass, "id">): Promise<SchoolClass> => {
    const { data, error } = await supabase
      .from("classes")
      .insert([toSnakeCase(cls)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<SchoolClass>): Promise<void> => {
    const { error } = await supabase
      .from("classes")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("classes").delete().eq("id", id)
    if (error) throw error
  },
  
  // Get teachers assigned to a class via teacher_classes junction table
  getTeachersForClass: async (classId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("teacher_classes")
      .select("user_id")
      .eq("class_id", classId)
    if (error) throw error
    return (data || []).map((row) => row.user_id)
  },
}

export const SubjectsStore = {
  getAll: async (): Promise<Subject[]> => {
    const { data, error } = await supabase.from("subjects").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByClass: async (classId: string): Promise<Subject[]> => {
    const { data, error } = await supabase.from("subjects").select("*").eq("class_id", classId)
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (subject: Omit<Subject, "id">): Promise<Subject> => {
    // Validation: If teacher is assigned, check if they teach this class
    if (subject.teacherId) {
      const { data: teacherClasses } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("user_id", subject.teacherId)
      
      const classIds = (teacherClasses || []).map((tc) => tc.class_id)
      if (!classIds.includes(subject.classId)) {
        throw new Error("This teacher is not assigned to teach this class. Please assign them to the class first in Teacher Management.")
      }
    }
    
    const { data, error } = await supabase
      .from("subjects")
      .insert([toSnakeCase(subject)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<Subject>): Promise<void> => {
    // Validation: If teacher is being updated, check if they teach this class
    if (updates.teacherId) {
      // Get the subject's class
      const { data: subject } = await supabase
        .from("subjects")
        .select("class_id")
        .eq("id", id)
        .single()
      
      if (subject) {
        const classId = updates.classId || subject.class_id
        const { data: teacherClasses } = await supabase
          .from("teacher_classes")
          .select("class_id")
          .eq("user_id", updates.teacherId)
        
        const classIds = (teacherClasses || []).map((tc) => tc.class_id)
        if (!classIds.includes(classId)) {
          throw new Error("This teacher is not assigned to teach this class. Please assign them to the class first in Teacher Management.")
        }
      }
    }
    
    const { error } = await supabase
      .from("subjects")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("subjects").delete().eq("id", id)
    if (error) throw error
  },
}

export const GradesStore = {
  getAll: async (): Promise<Grade[]> => {
    const { data, error } = await supabase.from("grades").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByStudent: async (studentId: string): Promise<Grade[]> => {
    const { data, error } = await supabase.from("grades").select("*").eq("student_id", studentId)
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByStudentAndTerm: async (studentId: string, term: string, academicYear?: number): Promise<Grade[]> => {
    let query = supabase
      .from("grades")
      .select("*")
      .eq("student_id", studentId)
      .eq("term", term)
    
    if (academicYear) {
      query = query.eq("academic_year", academicYear)
    }
    
    const { data, error } = await query
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (grade: Omit<Grade, "id">): Promise<Grade> => {
    // Validation 1: Check for duplicate grade (unique constraint in DB, but check here for better error message)
    const { data: existingGrades } = await supabase
      .from("grades")
      .select("*")
      .eq("student_id", grade.studentId)
      .eq("subject_id", grade.subjectId)
      .eq("term", grade.term)
      .eq("academic_year", grade.academicYear)
    
    if (existingGrades && existingGrades.length > 0) {
      throw new Error("A grade for this student, subject, and term already exists")
    }
    
    // Validation 2: Check if student is in the same class as the subject
    const { data: student } = await supabase
      .from("students")
      .select("class_id")
      .eq("id", grade.studentId)
      .single()
    
    const { data: subject } = await supabase
      .from("subjects")
      .select("class_id")
      .eq("id", grade.subjectId)
      .single()
    
    if (student && subject && student.class_id !== subject.class_id) {
      throw new Error("Student is not enrolled in the class for this subject")
    }
    
    const { data, error } = await supabase
      .from("grades")
      .insert([toSnakeCase(grade)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<Grade>): Promise<void> => {
    const { error } = await supabase
      .from("grades")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("grades").delete().eq("id", id)
    if (error) throw error
  },
}

export const AttendanceStore = {
  getAll: async (): Promise<Attendance[]> => {
    const { data, error } = await supabase.from("attendance").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByStudent: async (studentId: string): Promise<Attendance[]> => {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
    if (error) throw error
    return (data || []).map(toCamelCase)
  },

  getByClassAndDate: async (classId: string, date: string): Promise<Attendance[]> => {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("class_id", classId)
      .eq("date", date)
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (attendance: Omit<Attendance, "id">): Promise<Attendance> => {
    const { data, error } = await supabase
      .from("attendance")
      .insert([toSnakeCase(attendance)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<Attendance>): Promise<void> => {
    const { error } = await supabase
      .from("attendance")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  bulkUpsert: async (classId: string, date: string, records: Omit<Attendance, "id">[]): Promise<void> => {
    // Delete existing records for this class and date
    await supabase
      .from("attendance")
      .delete()
      .eq("class_id", classId)
      .eq("date", date)
    
    // Insert new records
    if (records.length > 0) {
      const { error } = await supabase
        .from("attendance")
        .insert(records.map(toSnakeCase))
      if (error) throw error
    }
  },
}

export const TemplatesStore = {
  getAll: async (): Promise<Template[]> => {
    const { data, error } = await supabase.from("templates").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getById: async (id: string): Promise<Template | null> => {
    const { data, error } = await supabase.from("templates").select("*").eq("id", id).single()
    if (error) return null
    return data ? toCamelCase(data) : null
  },
  
  getByType: async (type: Template["type"]): Promise<Template[]> => {
    const { data, error } = await supabase.from("templates").select("*").eq("type", type)
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (template: Omit<Template, "id">): Promise<Template> => {
    const { data, error } = await supabase
      .from("templates")
      .insert([toSnakeCase(template)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<Template>): Promise<void> => {
    const { error } = await supabase
      .from("templates")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("templates").delete().eq("id", id)
    if (error) throw error
  },
}

export const CertificatesStore = {
  getAll: async (): Promise<Certificate[]> => {
    const { data, error } = await supabase.from("certificates").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (cert: Omit<Certificate, "id">): Promise<Certificate> => {
    const { data, error } = await supabase
      .from("certificates")
      .insert([toSnakeCase(cert)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
}

export const IndemnityStore = {
  getAll: async (): Promise<IndemnityForm[]> => {
    const { data, error } = await supabase.from("indemnity_forms").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByStudent: async (studentId: string): Promise<IndemnityForm[]> => {
    const { data, error } = await supabase.from("indemnity_forms").select("*").eq("student_id", studentId)
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (form: Omit<IndemnityForm, "id">): Promise<IndemnityForm> => {
    const { data, error } = await supabase
      .from("indemnity_forms")
      .insert([toSnakeCase(form)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
}

export const ReportsStore = {
  getAll: async (): Promise<TermReportRecord[]> => {
    const { data, error } = await supabase.from("term_reports").select("*")
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByStudent: async (studentId: string): Promise<TermReportRecord[]> => {
    const { data, error } = await supabase.from("term_reports").select("*").eq("student_id", studentId)
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getByStudentAndTerm: async (studentId: string, term: string): Promise<TermReportRecord | null> => {
    const { data, error } = await supabase
      .from("term_reports")
      .select("*")
      .eq("student_id", studentId)
      .eq("term", term)
      .single()
    if (error) return null
    return data ? toCamelCase(data) : null
  },
  
  add: async (record: Omit<TermReportRecord, "id">): Promise<TermReportRecord> => {
    const { data, error } = await supabase
      .from("term_reports")
      .insert([toSnakeCase(record)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
}

export const AcademicTermsStore = {
  getAll: async (): Promise<AcademicTerm[]> => {
    const { data, error } = await supabase
      .from("academic_terms")
      .select("*")
      .order("year", { ascending: false })
      .order("term", { ascending: true })
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  getActiveTerm: async (): Promise<AcademicTerm | null> => {
    const { data, error } = await supabase
      .from("academic_terms")
      .select("*")
      .eq("is_active", true)
      .single()
    if (error) return null
    return data ? toCamelCase(data) : null
  },
  
  getByYear: async (year: number): Promise<AcademicTerm[]> => {
    const { data, error } = await supabase
      .from("academic_terms")
      .select("*")
      .eq("year", year)
      .order("term", { ascending: true })
    if (error) throw error
    return (data || []).map(toCamelCase)
  },
  
  add: async (term: Omit<AcademicTerm, "id">): Promise<AcademicTerm> => {
    const { data, error } = await supabase
      .from("academic_terms")
      .insert([toSnakeCase(term)])
      .select()
      .single()
    if (error) throw error
    return toCamelCase(data)
  },
  
  update: async (id: string, updates: Partial<AcademicTerm>): Promise<void> => {
    const { error } = await supabase
      .from("academic_terms")
      .update(toSnakeCase(updates))
      .eq("id", id)
    if (error) throw error
  },
  
  setActiveTerm: async (id: string): Promise<void> => {
    // First, deactivate all terms
    await supabase
      .from("academic_terms")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000") // Update all
    
    // Then activate the selected term
    const { error } = await supabase
      .from("academic_terms")
      .update({ is_active: true })
      .eq("id", id)
    if (error) throw error
  },
}

