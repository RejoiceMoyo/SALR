"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { ClassesStore, StudentsStore, SubjectsStore, GradesStore, TeachersStore, AcademicTermsStore } from "@/lib/store"
import type { SchoolClass, Student, Subject, Grade, AcademicTerm } from "@/lib/store"
import { studentFullName } from "@/lib/utils"
import { Plus } from "lucide-react"
import { toast } from "sonner"

export function GradesPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("Term 1")
  const [academicYear, setAcademicYear] = useState(2026)
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null)
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [classSubjects, setClassSubjects] = useState<Subject[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formData, setFormData] = useState({ studentId: "", subjectId: "", marks: "", comment: "" })
  const [saving, setSaving] = useState(false)

  const loadClasses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const allClasses = await ClassesStore.getAll()
      if (user.role === "teacher") {
        const teachers = await TeachersStore.getAll()
        const teacher = teachers.find((t) => t.userId === user.id)
        if (teacher) setClasses(allClasses.filter((c) => teacher.assignedClasses.includes(c.id)))
      } else {
        setClasses(allClasses)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    async function loadActiveTerm() {
      const term = await AcademicTermsStore.getActiveTerm()
      if (term) {
        setActiveTerm(term)
        setAcademicYear(term.year)
        setSelectedTerm(term.name)
      }
    }
    loadActiveTerm()
  }, [])

  const reloadGrades = useCallback(async () => {
    if (!selectedClassId) return
    const [allGrades, allStudents] = await Promise.all([
      GradesStore.getAll(),
      StudentsStore.getAll()
    ])
    const filteredGrades = allGrades.filter((g) => {
      const student = allStudents.find((s) => s.id === g.studentId)
      return student?.classId === selectedClassId && g.term === selectedTerm && g.academicYear === academicYear
    })
    setGrades(filteredGrades)
  }, [selectedClassId, selectedTerm, academicYear])

  useEffect(() => {
    async function loadClassData() {
      if (!selectedClassId) return
      const [students, subjects] = await Promise.all([
        StudentsStore.getAll(),
        SubjectsStore.getByClass(selectedClassId)
      ])
      setClassStudents(students.filter((s) => s.classId === selectedClassId))
      setClassSubjects(subjects)
      await reloadGrades()
    }
    loadClassData()
  }, [selectedClassId, selectedTerm, reloadGrades])

  async function handleAddGrade() {
    if (!formData.studentId || !formData.subjectId || !formData.marks) {
      toast.error("Please fill in all required fields")
      return
    }
    setSaving(true)
    try {
      await GradesStore.add({
        studentId: formData.studentId,
        subjectId: formData.subjectId,
        marks: Number(formData.marks),
        term: selectedTerm,
        academicYear: academicYear,
        comment: formData.comment,
      })
      toast.success("Grade added successfully")
      setShowAddDialog(false)
      setFormData({ studentId: "", subjectId: "", marks: "", comment: "" })
      reloadGrades()
    } catch (error: any) {
      toast.error(error?.message || "Failed to add grade")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  function getGrade(studentId: string, subjectId: string) {
    return grades.find((g) => g.studentId === studentId && g.subjectId === subjectId)
  }

  function getStudentTotal(studentId: string) {
    return grades.filter((g) => g.studentId === studentId).reduce((s, g) => s + g.marks, 0)
  }

  function getStudentAverage(studentId: string) {
    const studentGrades = grades.filter((g) => g.studentId === studentId)
    if (studentGrades.length === 0) return 0
    return Math.round(getStudentTotal(studentId) / studentGrades.length)
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
      <div>
        <h2 className="text-2xl font-bold text-foreground">Grades / Marks</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter and view student grades per class and term
          {activeTerm && <span className="ml-2 text-primary font-medium">• Academic Year: {academicYear} • Active Term: {activeTerm.name}</span>}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">\n        <div className="flex flex-col gap-2 flex-1">\n          <Label>Class</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Term 1">Term 1</SelectItem>
              <SelectItem value="Term 2">Term 2</SelectItem>
              <SelectItem value="Term 3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedClassId && (
          <div className="flex items-end">
            <Button onClick={() => { setFormData({ studentId: "", subjectId: "", marks: "", comment: "" }); setShowAddDialog(true) }} className="gap-2">
              <Plus className="h-4 w-4" />Add Grade
            </Button>
          </div>
        )}
      </div>

      {selectedClassId && classStudents.length > 0 && classSubjects.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="font-semibold text-foreground sticky left-0 bg-background z-10">Student</TableHead>
                {classSubjects.map((sub) => (
                  <TableHead key={sub.id} className="font-semibold text-foreground text-center">{sub.name}</TableHead>
                ))}
                <TableHead className="font-semibold text-foreground text-center">Total</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classStudents.map((student) => (
                <TableRow key={student.id} className="border-b last:border-b-0">
                  <TableCell className="font-medium text-foreground sticky left-0 bg-background z-10">
                    <div className="flex flex-col">
                      <span>{studentFullName(student)}</span>
                      <span className="text-xs text-muted-foreground">#{student.studentNumber}</span>
                    </div>
                  </TableCell>
                  {classSubjects.map((sub) => {
                    const grade = getGrade(student.id, sub.id)
                    return (
                      <TableCell key={sub.id} className="text-center text-foreground">
                        {grade ? grade.marks : "-"}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-medium text-foreground">{getStudentTotal(student.id) || "-"}</TableCell>
                  <TableCell className="text-center font-medium text-foreground">{getStudentAverage(student.id) || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedClassId && (classStudents.length === 0 || classSubjects.length === 0) && (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          {classStudents.length === 0 ? "No students in this class" : "No subjects assigned to this class"}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Grade</DialogTitle><DialogDescription>Enter a grade for a student.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Student *</Label>
              <Select value={formData.studentId} onValueChange={(v) => setFormData((p) => ({ ...p, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{classStudents.map((s) => <SelectItem key={s.id} value={s.id}>{studentFullName(s)} — #{s.studentNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2"><Label>Subject *</Label>
              <Select value={formData.subjectId} onValueChange={(v) => setFormData((p) => ({ ...p, subjectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{classSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2"><Label>Marks * (0-100)</Label><Input type="number" min={0} max={100} value={formData.marks} onChange={(e) => setFormData((p) => ({ ...p, marks: e.target.value }))} placeholder="85" /></div>
            <div className="flex flex-col gap-2"><Label>Comment</Label><Input value={formData.comment} onChange={(e) => setFormData((p) => ({ ...p, comment: e.target.value }))} placeholder="Optional comment" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button><Button onClick={handleAddGrade} disabled={saving || !formData.studentId || !formData.subjectId || !formData.marks}>{saving ? "Saving..." : "Save Grade"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
