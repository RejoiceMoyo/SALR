"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog"
import {
  StudentsStore,
  ClassesStore,
  GradesStore,
  AttendanceStore,
  SubjectsStore,
  TemplatesStore,
  ReportsStore,
} from "@/lib/store"
import type {
  Student,
  SchoolClass,
  StudentContact,
  Grade,
  Attendance,
  Subject,
  Template,
  TermReportRecord,
} from "@/lib/store"
import { studentFullName } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Plus, Pencil, Search, Eye, FileText, Printer, Loader2, Download, Calendar, BookOpen, ClipboardList } from "lucide-react"

interface StudentFormState {
  studentNumber: string
  firstName: string
  lastName: string
  classId: string
  dob: string
  gender: string
  address: string
  allergies: string
  medicalNotes: string
  parentFullName: string
  parentRelationship: string
  parentPhone: string
  parentEmail: string
  guardianFullName: string
  guardianRelationship: string
  guardianPhone: string
  guardianEmail: string
  status: "active" | "inactive" | "archived"
}

function createEmptyFormState(): StudentFormState {
  return {
    studentNumber: "",
    firstName: "",
    lastName: "",
    classId: "",
    dob: "",
    gender: "",
    address: "",
    allergies: "",
    medicalNotes: "",
    parentFullName: "",
    parentRelationship: "Parent",
    parentPhone: "",
    parentEmail: "",
    guardianFullName: "",
    guardianRelationship: "Guardian",
    guardianPhone: "",
    guardianEmail: "",
    status: "active",
  }
}

function hasGuardianDetails(state: StudentFormState) {
  return Boolean(state.guardianFullName || state.guardianPhone || state.guardianEmail)
}

function mapFormStateToStudentPayload(state: StudentFormState): Omit<Student, "id"> {
  const parentContact: StudentContact = {
    fullName: state.parentFullName,
    relationship: state.parentRelationship || "Parent",
    phone: state.parentPhone,
    email: state.parentEmail || undefined,
  }

  const guardianContact: StudentContact | undefined = hasGuardianDetails(state)
    ? {
        fullName: state.guardianFullName,
        relationship: state.guardianRelationship || "Guardian",
        phone: state.guardianPhone,
        email: state.guardianEmail || undefined,
      }
    : undefined

  return {
    studentNumber: state.studentNumber,
    firstName: state.firstName,
    lastName: state.lastName,
    classId: state.classId,
    dob: state.dob,
    gender: state.gender,
    address: state.address,
    allergies: state.allergies || undefined,
    medicalNotes: state.medicalNotes || undefined,
    parentContact,
    guardianContact,
    status: state.status,
  }
}

function mapStudentToFormState(student: Student): StudentFormState {
  return {
    studentNumber: student.studentNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    classId: student.classId,
    dob: student.dob,
    gender: student.gender,
    address: student.address,
    allergies: student.allergies || "",
    medicalNotes: student.medicalNotes || "",
    parentFullName: student.parentContact.fullName,
    parentRelationship: student.parentContact.relationship,
    parentPhone: student.parentContact.phone,
    parentEmail: student.parentContact.email || "",
    guardianFullName: student.guardianContact?.fullName || "",
    guardianRelationship: student.guardianContact?.relationship || "Guardian",
    guardianPhone: student.guardianContact?.phone || "",
    guardianEmail: student.guardianContact?.email || "",
    status: student.status,
  }
}

export function StudentManagement() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterClass, setFilterClass] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const [showEditPasswordDialog, setShowEditPasswordDialog] = useState(false)
  const [pendingEditStudent, setPendingEditStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<StudentFormState>(createEmptyFormState())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [studentsData, classesData] = await Promise.all([
        StudentsStore.getAll(),
        ClassesStore.getAll()
      ])
      setStudents(studentsData)
      setClasses(classesData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredStudents = students.filter((s) => {
    const search = searchQuery.toLowerCase()
    const fullName = `${s.firstName} ${s.lastName}`.trim().toLowerCase()
    const parentPhone = (s.parentContact.phone || "").toLowerCase()
    const guardianPhone = s.guardianContact?.phone ? s.guardianContact.phone.toLowerCase() : ""
    const matchesSearch =
      fullName.includes(search) ||
      s.studentNumber.toLowerCase().includes(search) ||
      s.parentContact.fullName.toLowerCase().includes(search) ||
      (s.guardianContact?.fullName?.toLowerCase().includes(search) ?? false) ||
      parentPhone.includes(search) ||
      guardianPhone.includes(search)
    const matchesClass = filterClass === "all" || s.classId === filterClass
    return matchesSearch && matchesClass
  })

  function resetForm() {
    setFormData(createEmptyFormState())
  }

  function handleAdd() {
    resetForm()
    setShowAddDialog(true)
  }

  async function handleSubmitAdd() {
    if (!formData.firstName || !formData.lastName || !formData.studentNumber || !formData.classId || !formData.parentFullName || !formData.parentPhone) {
      toast.error("Please fill in all required fields")
      return
    }
    // Check for duplicate student number
    const duplicate = students.find((s) => s.studentNumber.toLowerCase() === formData.studentNumber.toLowerCase())
    if (duplicate) {
      toast.error(`Student No "${formData.studentNumber}" is already in use by ${duplicate.firstName} ${duplicate.lastName}`)
      return
    }
    setSaving(true)
    try {
      const payload = mapFormStateToStudentPayload(formData)
      await StudentsStore.add(payload)
      toast.success("Student added successfully")
      setShowAddDialog(false)
      resetForm()
      loadData()
    } catch (error) {
      toast.error("Failed to add student")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  function handleEditClick(student: Student) {
    setPendingEditStudent(student)
    setShowEditPasswordDialog(true)
  }

  function handleEditPasswordConfirmed() {
    if (pendingEditStudent) {
      setSelectedStudent(pendingEditStudent)
      setFormData(mapStudentToFormState(pendingEditStudent))
      setShowEditDialog(true)
    }
    setPendingEditStudent(null)
  }

  async function handleSubmitEdit() {
    if (!selectedStudent || !formData.firstName || !formData.lastName || !formData.studentNumber || !formData.classId || !formData.parentFullName || !formData.parentPhone) {
      toast.error("Please fill in all required fields")
      return
    }
    // Check for duplicate student number (only if changed)
    if (formData.studentNumber !== selectedStudent.studentNumber) {
      const duplicate = students.find((s) => s.id !== selectedStudent.id && s.studentNumber.toLowerCase() === formData.studentNumber.toLowerCase())
      if (duplicate) {
        toast.error(`Student No "${formData.studentNumber}" is already in use by ${duplicate.firstName} ${duplicate.lastName}`)
        return
      }
    }
    setSaving(true)
    try {
      const payload = mapFormStateToStudentPayload(formData)
      await StudentsStore.update(selectedStudent.id, payload)
      toast.success("Student updated successfully")
      setShowEditDialog(false)
      setSelectedStudent(null)
      resetForm()
      loadData()
    } catch (error) {
      toast.error("Failed to update student")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  function handleView(student: Student) {
    setSelectedStudent(student)
    setShowViewDialog(true)
  }

  function getClassName(classId: string) {
    return classes.find((c) => c.id === classId)?.name || "Unassigned"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Students</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Manage student records. Editing requires password confirmation." : "View student information including allergies and emergency contacts."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="font-semibold text-foreground">Student No</TableHead>
              <TableHead className="font-semibold text-foreground">Name</TableHead>
              <TableHead className="font-semibold text-foreground">Class</TableHead>
              <TableHead className="font-semibold text-foreground hidden md:table-cell">Parent Contact</TableHead>
              <TableHead className="font-semibold text-foreground hidden lg:table-cell">Allergies</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => {
                return (
                  <TableRow key={student.id} className="border-b last:border-b-0">
                    <TableCell className="font-medium text-foreground">{student.studentNumber}</TableCell>
                    <TableCell className="text-foreground">{studentFullName(student)}</TableCell>
                    <TableCell className="text-foreground">{getClassName(student.classId)}</TableCell>
                    <TableCell className="hidden md:table-cell text-foreground">
                      <div className="flex flex-col">
                        <span>{student.parentContact.fullName}</span>
                        <span className="text-xs text-muted-foreground">{student.parentContact.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-foreground">
                      {student.allergies ? student.allergies : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(student)} aria-label="View student">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)} aria-label="Edit student">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PasswordConfirmDialog
        open={showEditPasswordDialog}
        onOpenChange={setShowEditPasswordDialog}
        onConfirm={handleEditPasswordConfirmed}
        title="Confirm Edit Student"
        description={`Enter a password to edit "${pendingEditStudent ? studentFullName(pendingEditStudent) : "this student"}".`}
      />

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Fill in the details below to add a new student.</DialogDescription>
          </DialogHeader>
          <StudentForm formData={formData} setFormData={setFormData} classes={classes} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={
                saving ||
                !formData.studentNumber ||
                !formData.firstName ||
                !formData.lastName ||
                !formData.classId ||
                !formData.parentFullName ||
                !formData.parentPhone
              }
            >
              {saving ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update the student details below.</DialogDescription>
          </DialogHeader>
          <StudentForm formData={formData} setFormData={setFormData} classes={classes} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={
                saving ||
                !formData.studentNumber ||
                !formData.firstName ||
                !formData.lastName ||
                !formData.classId ||
                !formData.parentFullName ||
                !formData.parentPhone
              }
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              {isAdmin ? "Full student profile, academic records, and reports." : "View student health & safety information."}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <StudentViewDetails student={selectedStudent} classes={classes} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentViewDetails({ student, classes }: { student: Student; classes: SchoolClass[] }) {
  const cls = classes.find((c) => c.id === student.classId)
  const guardian = student.guardianContact
  const { user } = useAuth()
  const isTeacher = user?.role === "teacher"

  // --- Grades tab state ---
  const [grades, setGrades] = useState<Grade[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradesLoading, setGradesLoading] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState<string>("all")

  // --- Attendance tab state ---
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  // --- Reports tab state ---
  const [reportTemplates, setReportTemplates] = useState<Template[]>([])
  const [pastReports, setPastReports] = useState<TermReportRecord[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [reportTerm, setReportTerm] = useState<string>("")
  const [previewHtml, setPreviewHtml] = useState<string>("")

  // Load grades + subjects
  const loadGrades = useCallback(async () => {
    setGradesLoading(true)
    try {
      const [g, s] = await Promise.all([
        GradesStore.getByStudent(student.id),
        SubjectsStore.getAll(),
      ])
      setGrades(g)
      setSubjects(s)
    } catch {
      toast.error("Failed to load grades")
    } finally {
      setGradesLoading(false)
    }
  }, [student.id])

  // Load attendance
  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    try {
      const a = await AttendanceStore.getByStudent(student.id)
      setAttendance(a)
    } catch {
      toast.error("Failed to load attendance")
    } finally {
      setAttendanceLoading(false)
    }
  }, [student.id])

  // Load report templates + past reports
  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    try {
      const [templates, reports] = await Promise.all([
        TemplatesStore.getByType("report"),
        ReportsStore.getByStudent(student.id),
      ])
      setReportTemplates(templates)
      setPastReports(reports)
    } catch {
      toast.error("Failed to load reports")
    } finally {
      setReportsLoading(false)
    }
  }, [student.id])

  // Helper: subject name lookup
  const subjectName = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.name || "Unknown"

  // Group grades by term
  const terms = Array.from(new Set(grades.map((g) => g.term))).sort()
  const filteredGrades = selectedTerm === "all" ? grades : grades.filter((g) => g.term === selectedTerm)

  // Group filtered grades by term for display
  const gradesByTerm: Record<string, Grade[]> = {}
  for (const g of filteredGrades) {
    if (!gradesByTerm[g.term]) gradesByTerm[g.term] = []
    gradesByTerm[g.term].push(g)
  }

  // Attendance summary
  const attendanceSummary = {
    total: attendance.length,
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    late: attendance.filter((a) => a.status === "late").length,
    excused: attendance.filter((a) => a.status === "excused").length,
  }
  const attendanceRate = attendanceSummary.total > 0
    ? Math.round(((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total) * 100)
    : 0

  // Generate report from template
  const handleGenerateReport = async () => {
    if (!selectedTemplateId || !reportTerm) {
      toast.error("Select a template and term")
      return
    }
    setGenerating(true)
    try {
      const template = reportTemplates.find((t) => t.id === selectedTemplateId)
      if (!template) throw new Error("Template not found")

      // Fetch grades for selected term
      const termGrades = await GradesStore.getByStudentAndTerm(student.id, reportTerm)
      const allSubjects = subjects.length > 0 ? subjects : await SubjectsStore.getAll()

      // Build grades table HTML
      const gradesTableRows = termGrades
        .map((g) => {
          const sn = allSubjects.find((s) => s.id === g.subjectId)?.name || "Unknown"
          return `<tr><td style="padding:6px 12px;border:1px solid #ddd">${sn}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${g.marks}</td><td style="padding:6px 12px;border:1px solid #ddd">${g.comment || "-"}</td></tr>`
        })
        .join("")

      const gradesTableHtml = termGrades.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr><th style="padding:6px 12px;border:1px solid #ddd;text-align:left;background:#f5f5f5">Subject</th><th style="padding:6px 12px;border:1px solid #ddd;text-align:center;background:#f5f5f5">Marks</th><th style="padding:6px 12px;border:1px solid #ddd;text-align:left;background:#f5f5f5">Comment</th></tr></thead><tbody>${gradesTableRows}</tbody></table>`
        : `<p><em>No grades recorded for this term.</em></p>`

      const avgMarks = termGrades.length > 0
        ? (termGrades.reduce((s, g) => s + g.marks, 0) / termGrades.length).toFixed(1)
        : "N/A"

      // Attendance for this student (all records)
      const attRate = `${attendanceRate}%`

      // Replace template placeholders
      let rendered = template.content
        .replace(/\{\{StudentName\}\}/g, studentFullName(student))
        .replace(/\{\{StudentNumber\}\}/g, student.studentNumber)
        .replace(/\{\{Class\}\}/g, cls?.name || "Unassigned")
        .replace(/\{\{Term\}\}/g, reportTerm)
        .replace(/\{\{DateOfBirth\}\}/g, student.dob || "N/A")
        .replace(/\{\{Gender\}\}/g, student.gender || "N/A")
        .replace(/\{\{GradesTable\}\}/g, gradesTableHtml)
        .replace(/\{\{AverageMarks\}\}/g, avgMarks)
        .replace(/\{\{AttendanceRate\}\}/g, attRate)
        .replace(/\{\{TotalPresent\}\}/g, String(attendanceSummary.present))
        .replace(/\{\{TotalAbsent\}\}/g, String(attendanceSummary.absent))
        .replace(/\{\{GeneratedDate\}\}/g, new Date().toLocaleDateString())
        .replace(/\{\{ParentName\}\}/g, student.parentContact.fullName)

      setPreviewHtml(rendered)

      // Save the report record
      await ReportsStore.add({
        studentId: student.id,
        classId: student.classId,
        term: reportTerm,
        templateId: selectedTemplateId,
        generatedDate: new Date().toISOString().split("T")[0],
        generatedBy: user?.name || "System",
        content: rendered,
        comments: "",
      })

      // Refresh past reports
      const freshReports = await ReportsStore.getByStudent(student.id)
      setPastReports(freshReports)

      toast.success("Report generated successfully")
    } catch {
      toast.error("Failed to generate report")
    } finally {
      setGenerating(false)
    }
  }

  // Print preview
  const handlePrint = () => {
    if (!previewHtml) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Pop-up blocked — please allow pop-ups to print")
      return
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Report — ${studentFullName(student)}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#222}@media print{body{padding:20px}}</style></head><body>${previewHtml}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  // View a past report
  const handleViewPastReport = (report: TermReportRecord) => {
    setPreviewHtml(report.content)
  }

  // Teacher view - simplified, safety info only
  if (isTeacher) {
    return (
      <ScrollArea className="h-[55vh]">
        <div className="flex flex-col gap-5 pr-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Student Name</p>
              <p className="text-sm font-medium text-foreground">{studentFullName(student)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Student No</p>
              <p className="text-sm font-medium text-foreground">{student.studentNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Class</p>
              <p className="text-sm font-medium text-foreground">{cls?.name || "Unassigned"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="text-sm font-medium text-foreground">{student.dob || "N/A"}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">HEALTH & SAFETY</p>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 p-3">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Allergies</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{student.allergies || "None reported"}</p>
              </div>
              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-3">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Medical Notes</p>
                <p className="text-sm text-blue-800 dark:text-blue-300">{student.medicalNotes || "No medical notes on file"}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">EMERGENCY CONTACTS</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Parent</p>
                <p className="text-sm font-semibold text-foreground">{student.parentContact.fullName}</p>
                <p className="text-xs text-muted-foreground">{student.parentContact.relationship}</p>
                <p className="text-xs text-muted-foreground mt-2">📞 {student.parentContact.phone || "N/A"}</p>
                {student.parentContact.email && (
                  <p className="text-xs text-muted-foreground">📧 {student.parentContact.email}</p>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Guardian</p>
                {guardian ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">{guardian.fullName}</p>
                    <p className="text-xs text-muted-foreground">{guardian.relationship}</p>
                    <p className="text-xs text-muted-foreground mt-2">📞 {guardian.phone || "N/A"}</p>
                    {guardian.email && (
                      <p className="text-xs text-muted-foreground">📧 {guardian.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No guardian on record</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  // Admin/Full view - all tabs
  return (
    <Tabs defaultValue="profile" className="flex flex-col min-h-0 flex-1">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile" onClick={() => {}}>
          <Eye className="h-3.5 w-3.5 mr-1.5" />Profile
        </TabsTrigger>
        <TabsTrigger value="grades" onClick={loadGrades}>
          <BookOpen className="h-3.5 w-3.5 mr-1.5" />Grades
        </TabsTrigger>
        <TabsTrigger value="attendance" onClick={loadAttendance}>
          <ClipboardList className="h-3.5 w-3.5 mr-1.5" />Attendance
        </TabsTrigger>
        <TabsTrigger value="reports" onClick={loadReports}>
          <FileText className="h-3.5 w-3.5 mr-1.5" />Reports
        </TabsTrigger>
      </TabsList>

      {/* ============ PROFILE TAB ============ */}
      <TabsContent value="profile">
        <ScrollArea className="h-[55vh]">
          <div className="flex flex-col gap-5 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Student Name</p>
                <p className="text-sm font-medium text-foreground">{studentFullName(student)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Student No</p>
                <p className="text-sm font-medium text-foreground">{student.studentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Class</p>
                <p className="text-sm font-medium text-foreground">{cls?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium text-foreground">{student.dob || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="text-sm font-medium text-foreground">{student.gender || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium text-foreground">{student.address || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Allergies</p>
                <p className="text-sm font-medium text-foreground">{student.allergies || "None reported"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Medical Notes</p>
                <p className="text-sm font-medium text-foreground">{student.medicalNotes || "N/A"}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">CONTACTS</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Parent</p>
                  <p className="text-sm font-semibold text-foreground">{student.parentContact.fullName}</p>
                  <p className="text-xs text-muted-foreground">{student.parentContact.relationship}</p>
                  <p className="text-xs text-muted-foreground mt-1">Phone: {student.parentContact.phone || "N/A"}</p>
                  {student.parentContact.email && (
                    <p className="text-xs text-muted-foreground">Email: {student.parentContact.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guardian</p>
                  {guardian ? (
                    <>
                      <p className="text-sm font-semibold text-foreground">{guardian.fullName}</p>
                      <p className="text-xs text-muted-foreground">{guardian.relationship}</p>
                      <p className="text-xs text-muted-foreground mt-1">Phone: {guardian.phone || "N/A"}</p>
                      {guardian.email && (
                        <p className="text-xs text-muted-foreground">Email: {guardian.email}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-medium text-foreground">No guardian on record</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ============ GRADES TAB ============ */}
      <TabsContent value="grades">
        <ScrollArea className="h-[55vh]">
          <div className="flex flex-col gap-4 pr-4">
            {gradesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading grades…</span>
              </div>
            ) : grades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No grades recorded for this student yet.</p>
            ) : (
              <>
                {/* Term filter */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Filter by term:</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Terms</SelectItem>
                      {terms.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grades grouped by term */}
                {Object.entries(gradesByTerm)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([term, termGrades]) => {
                    const avg = (termGrades.reduce((s, g) => s + g.marks, 0) / termGrades.length).toFixed(1)
                    return (
                      <div key={term} className="border rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-t-lg">
                          <span className="text-sm font-semibold">{term}</span>
                          <Badge variant="secondary" className="text-xs">Avg: {avg}%</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Subject</TableHead>
                              <TableHead className="text-xs text-center w-[80px]">Marks</TableHead>
                              <TableHead className="text-xs">Comment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {termGrades.map((g) => (
                              <TableRow key={g.id}>
                                <TableCell className="text-sm">{subjectName(g.subjectId)}</TableCell>
                                <TableCell className="text-sm text-center font-medium">{g.marks}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{g.comment || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  })}
              </>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ============ ATTENDANCE TAB ============ */}
      <TabsContent value="attendance">
        <ScrollArea className="h-[55vh]">
          <div className="flex flex-col gap-4 pr-4">
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading attendance…</span>
              </div>
            ) : attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No attendance records found.</p>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Days</p>
                    <p className="text-lg font-bold">{attendanceSummary.total}</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-green-50 dark:bg-green-950/20">
                    <p className="text-xs text-green-700 dark:text-green-400">Present</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{attendanceSummary.present}</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-red-50 dark:bg-red-950/20">
                    <p className="text-xs text-red-700 dark:text-red-400">Absent</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{attendanceSummary.absent}</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-yellow-50 dark:bg-yellow-950/20">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">Late</p>
                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{attendanceSummary.late}</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-xs text-blue-700 dark:text-blue-400">Excused</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{attendanceSummary.excused}</p>
                  </div>
                </div>

                {/* Attendance rate bar */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Attendance Rate</span>
                    <span className="text-sm font-semibold">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        attendanceRate >= 80 ? "bg-green-500" : attendanceRate >= 60 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>

                {/* Register table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 50).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">{a.date}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                a.status === "present" ? "default" :
                                a.status === "absent" ? "destructive" :
                                a.status === "late" ? "secondary" : "outline"
                              }
                              className="text-xs capitalize"
                            >
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.comment || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {attendance.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Showing 50 of {attendance.length} records
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ============ REPORTS TAB ============ */}
      <TabsContent value="reports">
        <ScrollArea className="h-[55vh]">
          <div className="flex flex-col gap-4 pr-4">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
              </div>
            ) : (
              <>
                {/* Generate new report */}
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-semibold mb-3">Generate Report</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Template</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Term</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. Term 1 2025"
                        value={reportTerm}
                        onChange={(e) => setReportTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleGenerateReport}
                        disabled={generating || !selectedTemplateId || !reportTerm}
                      >
                        {generating ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Generating…</>
                        ) : (
                          <><FileText className="h-3.5 w-3.5 mr-1.5" />Generate</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {reportTemplates.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">No report templates found. Create one in Template Management first.</p>
                  )}
                </div>

                {/* Report preview */}
                {previewHtml && (
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-t-lg">
                      <span className="text-sm font-semibold">Report Preview</span>
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-3.5 w-3.5 mr-1.5" />Print
                      </Button>
                    </div>
                    <div
                      className="p-4 prose prose-sm max-w-none dark:prose-invert text-sm"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                )}

                {/* Past reports */}
                {pastReports.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="px-4 py-2.5 bg-muted/50 rounded-t-lg">
                      <span className="text-sm font-semibold">Previous Reports</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Term</TableHead>
                          <TableHead className="text-xs">Generated</TableHead>
                          <TableHead className="text-xs">By</TableHead>
                          <TableHead className="text-xs text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastReports.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm font-medium">{r.term}</TableCell>
                            <TableCell className="text-sm">{r.generatedDate}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.generatedBy}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleViewPastReport(r)}>
                                <Eye className="h-3.5 w-3.5 mr-1" />View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}

function StudentForm({
  formData,
  setFormData,
  classes,
}: {
  formData: StudentFormState
  setFormData: React.Dispatch<React.SetStateAction<StudentFormState>>
  classes: SchoolClass[]
}) {
  function update<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-number">Student No *</Label>
          <Input
            id="student-number"
            value={formData.studentNumber}
            onChange={(e) => update("studentNumber", e.target.value)}
            placeholder="e.g. STU-010"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-first-name">First Name *</Label>
          <Input
            id="student-first-name"
            value={formData.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="Enter first name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-last-name">Surname *</Label>
          <Input
            id="student-last-name"
            value={formData.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Enter surname"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-class">Class *</Label>
          <Select value={formData.classId} onValueChange={(v) => update("classId", v)}>
            <SelectTrigger id="student-class"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(v) => update("gender", v)}>
            <SelectTrigger id="student-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-dob">Date of Birth</Label>
          <Input
            id="student-dob"
            type="date"
            value={formData.dob}
            onChange={(e) => update("dob", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="student-address">Home Address</Label>
        <Textarea
          id="student-address"
          value={formData.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="Street, suburb, town"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-allergies">Allergies</Label>
          <Input
            id="student-allergies"
            value={formData.allergies}
            onChange={(e) => update("allergies", e.target.value)}
            placeholder="List any known allergies"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-medical-notes">Medical Notes</Label>
          <Textarea
            id="student-medical-notes"
            value={formData.medicalNotes}
            onChange={(e) => update("medicalNotes", e.target.value)}
            placeholder="Medications, instructions, etc."
            rows={2}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-foreground mb-3">Parent Contact *</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent-full-name">Full Name *</Label>
            <Input
              id="parent-full-name"
              value={formData.parentFullName}
              onChange={(e) => update("parentFullName", e.target.value)}
              placeholder="Parent name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent-relationship">Relationship</Label>
            <Input
              id="parent-relationship"
              value={formData.parentRelationship}
              onChange={(e) => update("parentRelationship", e.target.value)}
              placeholder="e.g. Mother"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent-phone">Phone *</Label>
            <Input
              id="parent-phone"
              value={formData.parentPhone}
              onChange={(e) => update("parentPhone", e.target.value)}
              placeholder="Primary phone number"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent-email">Email</Label>
            <Input
              id="parent-email"
              value={formData.parentEmail}
              onChange={(e) => update("parentEmail", e.target.value)}
              placeholder="Optional email"
              type="email"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-foreground mb-3">Guardian (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="guardian-full-name">Full Name</Label>
            <Input
              id="guardian-full-name"
              value={formData.guardianFullName}
              onChange={(e) => update("guardianFullName", e.target.value)}
              placeholder="Guardian name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="guardian-relationship">Relationship</Label>
            <Input
              id="guardian-relationship"
              value={formData.guardianRelationship}
              onChange={(e) => update("guardianRelationship", e.target.value)}
              placeholder="e.g. Aunt"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="guardian-phone">Phone</Label>
            <Input
              id="guardian-phone"
              value={formData.guardianPhone}
              onChange={(e) => update("guardianPhone", e.target.value)}
              placeholder="Contact number"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="guardian-email">Email</Label>
            <Input
              id="guardian-email"
              value={formData.guardianEmail}
              onChange={(e) => update("guardianEmail", e.target.value)}
              placeholder="Optional email"
              type="email"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="student-status">Status</Label>
        <Select value={formData.status} onValueChange={(v) => update("status", v as "active" | "inactive") }>
          <SelectTrigger id="student-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
