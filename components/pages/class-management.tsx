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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClassesStore, TeachersStore, SubjectsStore, StudentsStore } from "@/lib/store"
import type { SchoolClass, Teacher, Subject, Student } from "@/lib/store"
import { Plus, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

export function ClassManagement() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddClassDialog, setShowAddClassDialog] = useState(false)
  const [showEditClassDialog, setShowEditClassDialog] = useState(false)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [classForm, setClassForm] = useState({ name: "" })

  const [showAddSubjectDialog, setShowAddSubjectDialog] = useState(false)
  const [showEditSubjectDialog, setShowEditSubjectDialog] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [subjectForm, setSubjectForm] = useState({ name: "", classId: "", teacherId: "" })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classesData, teachersData, subjectsData, studentsData] = await Promise.all([
        ClassesStore.getAll(),
        TeachersStore.getAll(),
        SubjectsStore.getAll(),
        StudentsStore.getAll()
      ])
      setClasses(classesData)
      setTeachers(teachersData)
      setSubjects(subjectsData)
      setStudents(studentsData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleAddClass() {
    if (!classForm.name) {
      toast.error("Please enter a class name")
      return
    }
    setSaving(true)
    try {
      await ClassesStore.add({ name: classForm.name })
      toast.success("Class added successfully")
      setShowAddClassDialog(false)
      setClassForm({ name: "" })
      loadData()
    } catch (error) {
      toast.error("Failed to add class")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleEditClass() {
    if (!selectedClass || !classForm.name) {
      toast.error("Please enter a class name")
      return
    }
    setSaving(true)
    try {
      await ClassesStore.update(selectedClass.id, { name: classForm.name })
      toast.success("Class updated successfully")
      setShowEditClassDialog(false)
      setSelectedClass(null)
      setClassForm({ name: "" })
      loadData()
    } catch (error) {
      toast.error("Failed to update class")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSubject() {
    if (!subjectForm.name || !subjectForm.classId) {
      toast.error("Please fill in all required fields")
      return
    }
    setSaving(true)
    try {
      await SubjectsStore.add({ name: subjectForm.name, classId: subjectForm.classId, teacherId: subjectForm.teacherId })
      toast.success("Subject added successfully")
      setShowAddSubjectDialog(false)
      setSubjectForm({ name: "", classId: "", teacherId: "" })
      loadData()
    } catch (error) {
      toast.error("Failed to add subject")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSubject() {
    if (!selectedSubject || !subjectForm.name || !subjectForm.classId) {
      toast.error("Please fill in all required fields")
      return
    }
    setSaving(true)
    try {
      await SubjectsStore.update(selectedSubject.id, { name: subjectForm.name, classId: subjectForm.classId, teacherId: subjectForm.teacherId })
      toast.success("Subject updated successfully")
      setShowEditSubjectDialog(false)
      setSelectedSubject(null)
      setSubjectForm({ name: "", classId: "", teacherId: "" })
      loadData()
    } catch (error) {
      toast.error("Failed to update subject")
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
      <h2 className="text-2xl font-bold text-foreground">Classes & Subjects</h2>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="flex flex-col gap-4 mt-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => { setClassForm({ name: "" }); setShowAddClassDialog(true) }} className="gap-2">
                <Plus className="h-4 w-4" />Add Class
              </Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text-foreground">Class Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Assigned Teacher</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Students</TableHead>
                  {isAdmin && <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">No classes found</TableCell></TableRow>
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
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedClass(cls); setClassForm({ name: cls.name }); setShowEditClassDialog(true) }} aria-label="Edit class"><Pencil className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="flex flex-col gap-4 mt-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => { setSubjectForm({ name: "", classId: "", teacherId: "" }); setShowAddSubjectDialog(true) }} className="gap-2">
                <Plus className="h-4 w-4" />Add Subject
              </Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text-foreground">Subject Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Class</TableHead>
                  <TableHead className="font-semibold text-foreground">Teacher</TableHead>
                  {isAdmin && <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">No subjects found</TableCell></TableRow>
                ) : subjects.map((sub) => {
                  const cls = classes.find((c) => c.id === sub.classId)
                  const teacher = teachers.find((t) => t.id === sub.teacherId || t.userId === sub.teacherId)
                  return (
                    <TableRow key={sub.id} className="border-b last:border-b-0">
                      <TableCell className="font-medium text-foreground">{sub.name}</TableCell>
                      <TableCell className="text-foreground">{cls?.name || "N/A"}</TableCell>
                      <TableCell className="text-foreground">{teacher?.name || "N/A"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedSubject(sub); setSubjectForm({ name: sub.name, classId: sub.classId, teacherId: sub.teacherId }); setShowEditSubjectDialog(true) }} aria-label="Edit subject"><Pencil className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddClassDialog} onOpenChange={setShowAddClassDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Class</DialogTitle><DialogDescription>Create a new class. Teachers can be assigned via Teacher Management.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Class Name *</Label><Input value={classForm.name} onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Grade 1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddClassDialog(false)}>Cancel</Button><Button onClick={handleAddClass} disabled={saving || !classForm.name}>{saving ? "Adding..." : "Add Class"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditClassDialog} onOpenChange={setShowEditClassDialog}>
        <DialogContent><DialogHeader><DialogTitle>Edit Class</DialogTitle><DialogDescription>Update class details. Teachers can be assigned via Teacher Management.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Class Name *</Label><Input value={classForm.name} onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEditClassDialog(false)}>Cancel</Button><Button onClick={handleEditClass} disabled={saving || !classForm.name}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubjectDialog} onOpenChange={setShowAddSubjectDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Subject</DialogTitle><DialogDescription>Create a new subject.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Subject Name *</Label><Input value={subjectForm.name} onChange={(e) => setSubjectForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics" /></div>
            <div className="flex flex-col gap-2"><Label>Class *</Label>
              <Select value={subjectForm.classId} onValueChange={(v) => setSubjectForm((p) => ({ ...p, classId: v, teacherId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2"><Label>Teacher</Label>
              <Select value={subjectForm.teacherId} onValueChange={(v) => setSubjectForm((p) => ({ ...p, teacherId: v }))} disabled={!subjectForm.classId}>
                <SelectTrigger><SelectValue placeholder={subjectForm.classId ? "Select teacher" : "Select class first"} /></SelectTrigger>
                <SelectContent>{teachers.filter(t => t.assignedClasses.includes(subjectForm.classId)).map((t) => <SelectItem key={t.id} value={t.userId || t.id}>{t.name}</SelectItem>)}
                {subjectForm.classId && teachers.filter(t => t.assignedClasses.includes(subjectForm.classId)).length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No teachers assigned to this class</div>
                )}
                </SelectContent>
              </Select>
              {subjectForm.classId && <p className="text-xs text-muted-foreground">Only teachers assigned to this class are shown</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddSubjectDialog(false)}>Cancel</Button><Button onClick={handleAddSubject} disabled={saving || !subjectForm.name || !subjectForm.classId}>{saving ? "Adding..." : "Add Subject"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditSubjectDialog} onOpenChange={setShowEditSubjectDialog}>
        <DialogContent><DialogHeader><DialogTitle>Edit Subject</DialogTitle><DialogDescription>Update subject details.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Subject Name *</Label><Input value={subjectForm.name} onChange={(e) => setSubjectForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="flex flex-col gap-2"><Label>Class *</Label>
              <Select value={subjectForm.classId} onValueChange={(v) => setSubjectForm((p) => ({ ...p, classId: v, teacherId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2"><Label>Teacher</Label>
              <Select value={subjectForm.teacherId} onValueChange={(v) => setSubjectForm((p) => ({ ...p, teacherId: v }))} disabled={!subjectForm.classId}>
                <SelectTrigger><SelectValue placeholder={subjectForm.classId ? "Select teacher" : "Select class first"} /></SelectTrigger>
                <SelectContent>{teachers.filter(t => t.assignedClasses.includes(subjectForm.classId)).map((t) => <SelectItem key={t.id} value={t.userId || t.id}>{t.name}</SelectItem>)}
                {subjectForm.classId && teachers.filter(t => t.assignedClasses.includes(subjectForm.classId)).length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No teachers assigned to this class</div>
                )}
                </SelectContent>
              </Select>
              {subjectForm.classId && <p className="text-xs text-muted-foreground">Only teachers assigned to this class are shown</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEditSubjectDialog(false)}>Cancel</Button><Button onClick={handleEditSubject} disabled={saving || !subjectForm.name || !subjectForm.classId}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
