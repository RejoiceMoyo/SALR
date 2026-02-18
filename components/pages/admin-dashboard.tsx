"use client"

import { useState, useEffect } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StudentsStore, TeachersStore, ClassesStore, AttendanceStore, GradesStore, type Student, type Teacher, type SchoolClass, type Grade } from "@/lib/store"
import { studentFullName } from "@/lib/utils"

export function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, teachersData, classesData, gradesData] = await Promise.all([
          StudentsStore.getAll(),
          TeachersStore.getAll(),
          ClassesStore.getAll(),
          GradesStore.getAll(),
        ])
        setStudents(studentsData)
        setTeachers(teachersData)
        setClasses(classesData)
        setGrades(gradesData)
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  const recentStudents = students.slice(0, 8)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground text-balance">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of students, classes, and performance</p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Recent Students</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="font-semibold text-foreground">Student No</TableHead>
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Class</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Parent Contact</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Avg Grade</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentStudents.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No students yet</TableCell></TableRow>
              ) : recentStudents.map((student) => {
                const cls = classes.find((c) => c.id === student.classId)
                const studentGrades = grades.filter((g) => g.studentId === student.id)
                const avg = studentGrades.length > 0 ? Math.round(studentGrades.reduce((s, g) => s + g.marks, 0) / studentGrades.length) : null
                return (
                  <TableRow key={student.id} className="border-b last:border-b-0">
                      <TableCell className="font-medium text-foreground">{student.studentNumber}</TableCell>
                      <TableCell className="text-foreground">{studentFullName(student)}</TableCell>
                    <TableCell className="text-foreground">{cls?.name || "Unassigned"}</TableCell>
                      <TableCell className="hidden md:table-cell text-foreground">
                        <div className="flex flex-col">
                          <span>{student.parentContact.fullName}</span>
                          <span className="text-xs text-muted-foreground">{student.parentContact.phone}</span>
                        </div>
                      </TableCell>
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

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Classes Overview</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="font-semibold text-foreground">Class</TableHead>
                <TableHead className="font-semibold text-foreground">Teacher</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No classes yet</TableCell></TableRow>
              ) : classes.map((cls) => {
                // Get teachers assigned to this class via many-to-many relationship
                const classTeachers = teachers.filter((t) => t.assignedClasses.includes(cls.id))
                const studentCount = students.filter((s) => s.classId === cls.id).length
                return (
                  <TableRow key={cls.id} className="border-b last:border-b-0">
                    <TableCell className="font-medium text-foreground">{cls.name}</TableCell>
                    <TableCell className="text-foreground">
                      {classTeachers.length > 0 ? classTeachers.map(t => t.name).join(", ") : "No teachers assigned"}
                    </TableCell>
                    <TableCell className="text-right text-foreground">{studentCount}</TableCell>
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
