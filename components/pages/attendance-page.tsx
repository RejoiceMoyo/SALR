"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { ClassesStore, StudentsStore, AttendanceStore, TeachersStore } from "@/lib/store"
import type { SchoolClass, Student } from "@/lib/store"
import { studentFullName } from "@/lib/utils"
import { Save, Lock } from "lucide-react"
import { toast } from "sonner"

export function AttendancePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: "present" | "absent" | "late" | "excused"; comment: string }>>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)

  const isAdmin = user?.role === "admin"
  const loadClasses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const allClasses = await ClassesStore.getAll()
      if (user.role === "teacher") {
        const teachers = await TeachersStore.getAll()
        const teacher = teachers.find((t) => t.userId === user.id)
        if (teacher) {
          setClasses(allClasses.filter((c) => teacher.assignedClasses.includes(c.id)))
        }
      } else {
        setClasses(allClasses)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    async function loadClassData() {
      if (!selectedClassId) { setClassStudents([]); return }
      
      const [students, existing] = await Promise.all([
        StudentsStore.getAll(),
        AttendanceStore.getByClassAndDate(selectedClassId, selectedDate)
      ])
      
      const filteredStudents = students.filter((s) => s.classId === selectedClassId)
      setClassStudents(filteredStudents)

      // Lock for teachers if records already exist for this class+date
      const hasExistingRecords = existing.length > 0
      setLocked(!isAdmin && hasExistingRecords)

      const map: Record<string, { status: "present" | "absent" | "late" | "excused"; comment: string }> = {}
      for (const s of filteredStudents) {
        const record = existing.find((a) => a.studentId === s.id)
        map[s.id] = record ? { status: record.status, comment: record.comment || "" } : { status: "present", comment: "" }
      }
      setAttendanceMap(map)
      setSaved(false)
    }
    loadClassData()
  }, [selectedClassId, selectedDate])

  function handleStatusChange(studentId: string, status: "present" | "absent" | "late" | "excused") {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const records = classStudents.map((s) => ({
        studentId: s.id,
        classId: selectedClassId,
        date: selectedDate,
        status: attendanceMap[s.id]?.status || "present" as const,
        comment: attendanceMap[s.id]?.comment || "",
      }))
      await AttendanceStore.bulkUpsert(selectedClassId, selectedDate, records)
      toast.success("Attendance saved successfully")
      setSaved(true)
      // Lock for teachers after saving
      if (!isAdmin) setLocked(true)
    } catch (error) {
      toast.error("Failed to save attendance")
      console.error(error)
    } finally {
      setSaving(false)
    }
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
        <h2 className="text-2xl font-bold text-foreground">Attendance Register</h2>
        <p className="text-sm text-muted-foreground mt-1">Select a class and date, then mark each student</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2 flex-1">
          <Label>Class</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:w-[180px]">
          <Label>Date</Label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      {selectedClassId && classStudents.length > 0 && (() => {
        const counts = { present: 0, absent: 0, late: 0, excused: 0 }
        Object.values(attendanceMap).forEach((v) => { if (counts[v.status] !== undefined) counts[v.status]++ })
        return (
        <>
          {/* Locked banner */}
          {locked && (
            <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/50 px-4 py-2.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Attendance for this date has been submitted and is now locked.</p>
            </div>
          )}

          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-2.5 text-center">
              <p className="text-[11px] text-green-700 dark:text-green-400">Present</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{counts.present}</p>
            </div>
            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-2.5 text-center">
              <p className="text-[11px] text-red-700 dark:text-red-400">Absent</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">{counts.absent}</p>
            </div>
            <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-2.5 text-center">
              <p className="text-[11px] text-yellow-700 dark:text-yellow-400">Late</p>
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{counts.late}</p>
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
              <p className="text-[11px] text-blue-700 dark:text-blue-400">Excused</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{counts.excused}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text-foreground">Student</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((student) => (
                  <TableRow key={student.id} className="border-b last:border-b-0">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{studentFullName(student)}</span>
                        <span className="text-xs text-muted-foreground">No: {student.studentNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {(["present", "absent", "late", "excused"] as const).map((status) => (
                          <Button
                            key={status}
                            variant={attendanceMap[student.id]?.status === status ? "default" : "outline"}
                            size="sm"
                            disabled={locked}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={
                              attendanceMap[student.id]?.status === status
                                ? status === "present"
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : status === "absent"
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : status === "late"
                                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                                : "text-xs"
                            }
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!locked && (
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving..." : "Save Attendance"}
            </Button>
            {saved && <span className="text-sm text-green-600 font-medium">Saved successfully</span>}
          </div>
          )}
        </>
        )
      })()}

      {selectedClassId && classStudents.length === 0 && (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No students found in this class
        </div>
      )}
    </div>
  )
}
