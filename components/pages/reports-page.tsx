"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import {
  ClassesStore,
  StudentsStore,
  SubjectsStore,
  GradesStore,
  TemplatesStore,
  TeachersStore,
  ReportsStore,
  IndemnityStore,
} from "@/lib/store"
import type { SchoolClass, Student, Template, TermReportRecord, IndemnityForm } from "@/lib/store"
import { studentFullName } from "@/lib/utils"
import { FileText, Award, Printer } from "lucide-react"

export function ReportsPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("Term 1")
  const [teacherComment, setTeacherComment] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [generatedTitle, setGeneratedTitle] = useState("")
  const [reportHistory, setReportHistory] = useState<TermReportRecord[]>([])
  const [indemnityHistory, setIndemnityHistory] = useState<IndemnityForm[]>([])
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)

  const printRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [allClasses, templatesData] = await Promise.all([
        ClassesStore.getAll(),
        TemplatesStore.getAll()
      ])
      if (user.role === "teacher") {
        const teachers = await TeachersStore.getAll()
        const teacher = teachers.find((t) => t.userId === user.id)
        if (teacher) setClasses(allClasses.filter((c) => teacher.assignedClasses.includes(c.id)))
      } else {
        setClasses(allClasses)
      }
      setTemplates(templatesData)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) { setStudents([]); return }
      const allStudents = await StudentsStore.getAll()
      setStudents(allStudents.filter((s) => s.classId === selectedClassId))
    }
    loadStudents()
  }, [selectedClassId])

  useEffect(() => {
    async function loadStudentHistory() {
      if (!selectedStudentId) {
        setReportHistory([])
        setIndemnityHistory([])
        setCurrentStudent(null)
        return
      }

      const [student, reports, indemnities] = await Promise.all([
        StudentsStore.getById(selectedStudentId),
        ReportsStore.getByStudent(selectedStudentId),
        IndemnityStore.getByStudent(selectedStudentId)
      ])

      setCurrentStudent(student)
      setReportHistory(reports.slice().sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()))
      setIndemnityHistory(indemnities.slice().sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()))
    }
    loadStudentHistory()
  }, [selectedStudentId])

  async function generateReport() {
    const [student, cls] = await Promise.all([
      StudentsStore.getById(selectedStudentId),
      ClassesStore.getById(selectedClassId)
    ])
    if (!student || !cls) return

    const [studentGrades, subjects] = await Promise.all([
      GradesStore.getByStudentAndTerm(selectedStudentId, selectedTerm),
      SubjectsStore.getAll()
    ])
    const guardian = student.guardianContact

    let gradesTable = ""
    let total = 0
    for (const g of studentGrades) {
      const sub = subjects.find((s) => s.id === g.subjectId)
      const grade = g.marks >= 80 ? "A" : g.marks >= 60 ? "B" : g.marks >= 40 ? "C" : "D"
      gradesTable += `${sub?.name || "Unknown"}: ${g.marks} (${grade})\n`
      total += g.marks
    }
    const average = studentGrades.length > 0 ? Math.round(total / studentGrades.length) : 0

    const template = templates.find((t) => t.type === "report")
    let content = template?.content || "No report template found. Please create one in Templates."
    const now = new Date()

    content = content
      .replace(/\{\{StudentName\}\}/g, studentFullName(student))
      .replace(/\{\{StudentNumber\}\}/g, student.studentNumber)
      .replace(/\{\{Class\}\}/g, cls.name)
      .replace(/\{\{Term\}\}/g, selectedTerm)
      .replace(/\{\{Grades\}\}/g, gradesTable || "No grades recorded")
      .replace(/\{\{GradesTable\}\}/g, gradesTable || "No grades recorded")
      .replace(/\{\{Total\}\}/g, String(total))
      .replace(/\{\{Average\}\}/g, String(average))
      .replace(/\{\{TeacherComment\}\}/g, teacherComment || "No comment")
      .replace(/\{\{ParentName\}\}/g, student.parentContact.fullName)
      .replace(/\{\{ParentPhone\}\}/g, student.parentContact.phone)
      .replace(/\{\{GuardianName\}\}/g, guardian?.fullName || "N/A")
      .replace(/\{\{GuardianPhone\}\}/g, guardian?.phone || "N/A")
      .replace(/\{\{Allergies\}\}/g, student.allergies || "None reported")
      .replace(/\{\{MedicalNotes\}\}/g, student.medicalNotes || "N/A")
      .replace(/\{\{TeacherName\}\}/g, user?.name || "Class Teacher")
      .replace(/\{\{TeacherSignature\}\}/g, "______________________")
      .replace(/\{\{Date\}\}/g, now.toLocaleDateString())

    const record = await ReportsStore.add({
      studentId: selectedStudentId,
      classId: selectedClassId,
      term: selectedTerm,
      templateId: template?.id || "",
      generatedDate: now.toISOString(),
      generatedBy: user?.id || "system",
      content,
      comments: teacherComment,
    })

    setReportHistory((prev) => {
      const next = [record, ...prev.filter((r) => r.id !== record.id)]
      return next.sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime())
    })
    setGeneratedTitle(`${studentFullName(student)} — ${selectedTerm} Report`)
    setGeneratedContent(content)
  }

  async function generateCertificate() {
    const [student, cls] = await Promise.all([
      StudentsStore.getById(selectedStudentId),
      ClassesStore.getById(selectedClassId)
    ])
    if (!student || !cls) return

    const template = templates.find((t) => t.type === "certificate")
    let content = template?.content || "No certificate template found."
    const now = new Date()

    content = content
      .replace(/\{\{StudentName\}\}/g, studentFullName(student))
      .replace(/\{\{StudentNumber\}\}/g, student.studentNumber)
      .replace(/\{\{Class\}\}/g, cls.name)
      .replace(/\{\{Term\}\}/g, selectedTerm)
      .replace(/\{\{Subject\}\}/g, "General Excellence")
      .replace(/\{\{TeacherName\}\}/g, user?.name || "Class Teacher")
      .replace(/\{\{TeacherSignature\}\}/g, "______________________")
      .replace(/\{\{Date\}\}/g, now.toLocaleDateString())

    setGeneratedTitle(`${studentFullName(student)} — Certificate`)
    setGeneratedContent(content)
  }

  async function generateIndemnityForm() {
    const [student, cls] = await Promise.all([
      StudentsStore.getById(selectedStudentId),
      ClassesStore.getById(selectedClassId)
    ])
    if (!student || !cls) return

    const template = templates.find((t) => t.type === "indemnity")
    let content = template?.content || "No indemnity template found."
    const guardian = student.guardianContact
    const now = new Date()

    content = content
      .replace(/\{\{StudentName\}\}/g, studentFullName(student))
      .replace(/\{\{StudentNumber\}\}/g, student.studentNumber)
      .replace(/\{\{Class\}\}/g, cls.name)
      .replace(/\{\{ParentName\}\}/g, student.parentContact.fullName)
      .replace(/\{\{ParentPhone\}\}/g, student.parentContact.phone)
      .replace(/\{\{GuardianName\}\}/g, guardian?.fullName || "N/A")
      .replace(/\{\{GuardianPhone\}\}/g, guardian?.phone || "N/A")
      .replace(/\{\{Allergies\}\}/g, student.allergies || "None reported")
      .replace(/\{\{MedicalNotes\}\}/g, student.medicalNotes || "N/A")
      .replace(/\{\{TeacherName\}\}/g, user?.name || "Class Teacher")
      .replace(/\{\{Date\}\}/g, now.toLocaleDateString())

    const form = await IndemnityStore.add({
      studentId: selectedStudentId,
      templateId: template?.id || "",
      generatedDate: now.toISOString(),
      content,
    })

    setIndemnityHistory((prev) => {
      const next = [form, ...prev.filter((f) => f.id !== form.id)]
      return next.sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime())
    })
    setGeneratedTitle(`${studentFullName(student)} — Indemnity Form`)
    setGeneratedContent(content)
  }

  function handlePrint() {
    if (!printRef.current) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Print</title>
      <style>body{font-family:monospace;white-space:pre-wrap;padding:40px;line-height:1.8;font-size:14px;}</style>
      </head><body>${printRef.current.innerText}</body></html>
    `)
    printWindow.document.close()
    printWindow.print()
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
      <h2 className="text-2xl font-bold text-foreground">Reports & Certificates</h2>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">End-of-Term Reports</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="indemnity">Indemnity Form</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentFullName(s)} — #{s.studentNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
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
          </div>

          <div className="flex flex-col gap-2">
            <Label>Teacher Comment</Label>
            <Textarea value={teacherComment} onChange={(e) => setTeacherComment(e.target.value)} placeholder="Enter your comment for this student..." rows={3} />
          </div>

          <div className="flex gap-3">
            <Button onClick={generateReport} disabled={!selectedStudentId} className="gap-2">
              <FileText className="h-4 w-4" />Generate Report
            </Button>
          </div>

          {selectedStudentId && reportHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saved Reports</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {reportHistory.map((record) => {
                  const displayName = currentStudent && currentStudent.id === record.studentId
                    ? studentFullName(currentStudent)
                    : "Student"
                  return (
                    <div key={record.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{record.term}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.generatedDate).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {displayName}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGeneratedContent(record.content)
                          setGeneratedTitle(`${displayName} — ${record.term} Report`)
                        }}
                      >
                        View
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentFullName(s)} — #{s.studentNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateCertificate} disabled={!selectedStudentId} className="gap-2 self-start">
            <Award className="h-4 w-4" />Generate Certificate
          </Button>
        </TabsContent>

        <TabsContent value="indemnity" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentFullName(s)} — #{s.studentNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateIndemnityForm} disabled={!selectedStudentId} className="gap-2 self-start">
            <FileText className="h-4 w-4" />Generate Indemnity
          </Button>

          {selectedStudentId && indemnityHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saved Indemnity Forms</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {indemnityHistory.map((record) => {
                  const displayName = currentStudent && currentStudent.id === record.studentId
                    ? studentFullName(currentStudent)
                    : "Student"
                  return (
                    <div key={record.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">Indemnity</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.generatedDate).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {displayName}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGeneratedContent(record.content)
                          setGeneratedTitle(`${displayName} — Indemnity Form`)
                        }}
                      >
                        View
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {generatedContent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{generatedTitle || "Generated Document"}</CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 bg-transparent">
              <Printer className="h-4 w-4" />Print
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="whitespace-pre-wrap rounded-lg border bg-card p-6 font-mono text-sm text-foreground leading-relaxed">
              {generatedContent}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
