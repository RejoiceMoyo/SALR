"use client"

import { useState, useEffect } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { StudentsStore, TeachersStore, ClassesStore, GradesStore } from "@/lib/store"
import type { Teacher, SchoolClass, Student, Grade } from "@/lib/store"
import { studentFullName } from "@/lib/utils"

export function TeacherDashboard() {
  const { user } = useAuth()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [myClasses, setMyClasses] = useState<SchoolClass[]>([])
  const [myStudents, setMyStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      setLoading(true)
      try {
        const teachers = await TeachersStore.getAll()
        const t = teachers.find((t) => t.userId === user.id)
        if (t) {
          setTeacher(t)
          const allClasses = await ClassesStore.getAll()
          const assigned = allClasses.filter((c) => t.assignedClasses.includes(c.id))
          setMyClasses(assigned)

          const students = await StudentsStore.getAll()
          const classStudents = students.filter((s) => t.assignedClasses.includes(s.classId))
          setMyStudents(classStudents)

          const allGrades = await GradesStore.getAll()
          setGrades(allGrades)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground text-balance">
          Welcome, {teacher?.name || user?.name || "Teacher"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Your assigned classes and students</p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">My Classes</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="font-semibold text-foreground">Class</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myClasses.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No classes assigned yet</TableCell></TableRow>
              ) : myClasses.map((cls) => {
                const count = myStudents.filter((s) => s.classId === cls.id).length
                return (
                  <TableRow key={cls.id} className="border-b last:border-b-0">
                    <TableCell className="font-medium text-foreground">{cls.name}</TableCell>
                    <TableCell className="text-right text-foreground">{count}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">My Students</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="font-semibold text-foreground">Student No</TableHead>
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Class</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Gender</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Avg Grade</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myStudents.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No students in your classes</TableCell></TableRow>
              ) : myStudents.map((student) => {
                const cls = myClasses.find((c) => c.id === student.classId)
                const studentGrades = grades.filter((g) => g.studentId === student.id)
                const avg = studentGrades.length > 0 ? Math.round(studentGrades.reduce((s, g) => s + g.marks, 0) / studentGrades.length) : null
                return (
                  <TableRow key={student.id} className="border-b last:border-b-0">
                    <TableCell className="font-medium text-foreground">{student.studentNumber}</TableCell>
                    <TableCell className="text-foreground">{studentFullName(student)}</TableCell>
                    <TableCell className="text-foreground">{cls?.name || "N/A"}</TableCell>
                    <TableCell className="hidden md:table-cell text-foreground">{student.gender}</TableCell>
                    <TableCell className="hidden md:table-cell text-foreground">{avg !== null ? `${avg}%` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>{student.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
