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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog"
import { TeachersStore, ClassesStore, UsersStore, StudentsStore } from "@/lib/store"
import type { Teacher, SchoolClass, Student } from "@/lib/store"
import { Plus, Pencil, Search, Eye, Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

function generateRandomPassword(length: number = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export function TeacherManagement() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)

  const [showEditPasswordDialog, setShowEditPasswordDialog] = useState(false)
  const [pendingEditTeacher, setPendingEditTeacher] = useState<Teacher | null>(null)

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string>("")
  const [generatedTeacherName, setGeneratedTeacherName] = useState<string>("")
  const [generatedTeacherEmail, setGeneratedTeacherEmail] = useState<string>("")
  const [passwordCopied, setPasswordCopied] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    assignedClasses: [] as string[],
    phone: "",
    status: "active" as "active" | "inactive" | "archived",
  })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teachersData, classesData, studentsData] = await Promise.all([
        TeachersStore.getAll(),
        ClassesStore.getAll(),
        StudentsStore.getAll()
      ])
      setTeachers(teachersData)
      setClasses(classesData)
      setStudents(studentsData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function resetForm() {
    setFormData({ name: "", email: "", assignedClasses: [], phone: "", status: "active" })
  }

  function handleAdd() { resetForm(); setShowAddDialog(true) }

  async function handleSubmitAdd() {
    if (!formData.name || !formData.email) {
      toast.error("Please fill in all required fields")
      return
    }
    
    // Check if email already exists
    const existingUser = await UsersStore.getByEmail(formData.email)
    if (existingUser) {
      toast.error("A user with this email already exists")
      return
    }
    
    setSaving(true)
    try {
      // Generate random password
      const randomPassword = generateRandomPassword(12)
      
      // Create user first
      const newUser = await UsersStore.add({ 
        name: formData.name, 
        email: formData.email, 
        password: randomPassword, 
        role: "teacher", 
        status: formData.status 
      })
      
      // Create teacher record with user_id
      await TeachersStore.add({ 
        userId: newUser.id, 
        phone: formData.phone || undefined,
        assignedClasses: formData.assignedClasses 
      })
      
      // Show password to admin
      setGeneratedPassword(randomPassword)
      setGeneratedTeacherName(formData.name)
      setGeneratedTeacherEmail(formData.email)
      setPasswordCopied(false)
      setShowPasswordDialog(true)
      
      toast.success("Teacher added successfully")
      setShowAddDialog(false)
      resetForm()
      loadData()
    } catch (error: any) {
      // Provide more specific error messages
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        toast.error("A user with this email already exists")
      } else {
        toast.error("Failed to add teacher. Please try again.")
      }
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  function handleEditClick(teacher: Teacher) {
    setPendingEditTeacher(teacher)
    setShowEditPasswordDialog(true)
  }

  function handleEditPasswordConfirmed() {
    if (pendingEditTeacher) {
      setSelectedTeacher(pendingEditTeacher)
      setFormData({
        name: pendingEditTeacher.name,
        email: pendingEditTeacher.email,
        assignedClasses: pendingEditTeacher.assignedClasses,
        phone: pendingEditTeacher.phone || "",
        status: pendingEditTeacher.status,
      })
      setShowEditDialog(true)
    }
    setPendingEditTeacher(null)
  }

  async function handleSubmitEdit() {
    if (!selectedTeacher || !formData.name || !formData.email) {
      toast.error("Please fill in all required fields")
      return
    }
    setSaving(true)
    try {
      // Update teacher record (includes user updates internally via TeachersStore.update)
      await TeachersStore.update(selectedTeacher.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        assignedClasses: formData.assignedClasses,
        status: formData.status,
      })
      toast.success("Teacher updated successfully")
      setShowEditDialog(false)
      setSelectedTeacher(null)
      resetForm()
      loadData()
    } catch (error) {
      toast.error("Failed to update teacher")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  function handleView(teacher: Teacher) {
    setSelectedTeacher(teacher)
    setShowViewDialog(true)
  }

  function toggleClass(classId: string) {
    setFormData((prev) => ({
      ...prev,
      assignedClasses: prev.assignedClasses.includes(classId)
        ? prev.assignedClasses.filter((c) => c !== classId)
        : [...prev.assignedClasses, classId],
    }))
  }

  function getStudentCount(teacher: Teacher) {
    const teacherClassIds = teacher.assignedClasses
    return students.filter((s) => teacherClassIds.includes(s.classId)).length
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
          <h2 className="text-2xl font-bold text-foreground">Teachers</h2>
          <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Manage teacher records. Editing requires password confirmation." : "View teacher records."}</p>
        </div>
        {isAdmin && <Button onClick={handleAdd} className="gap-2"><Plus className="h-4 w-4" />Add Teacher</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search teachers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="font-semibold text-foreground">Name</TableHead>
              <TableHead className="font-semibold text-foreground">Email</TableHead>
              <TableHead className="font-semibold text-foreground hidden md:table-cell">Classes</TableHead>
              <TableHead className="font-semibold text-foreground hidden lg:table-cell">Students</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No teachers found</TableCell></TableRow>
            ) : (
              filtered.map((teacher) => (
                <TableRow key={teacher.id} className="border-b last:border-b-0">
                  <TableCell className="font-medium text-foreground">{teacher.name}</TableCell>
                  <TableCell className="text-foreground">{teacher.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {teacher.assignedClasses.map((cId) => {
                        const cls = classes.find((c) => c.id === cId)
                        return cls ? <Badge key={cId} variant="secondary" className="text-xs">{cls.name}</Badge> : null
                      })}
                      {teacher.assignedClasses.length === 0 && <span className="text-muted-foreground text-sm">None</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-foreground">{getStudentCount(teacher)}</TableCell>
                  <TableCell><Badge variant={teacher.status === "active" ? "default" : "secondary"}>{teacher.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleView(teacher)} aria-label="View teacher"><Eye className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleEditClick(teacher)} aria-label="Edit teacher"><Pencil className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PasswordConfirmDialog
        open={showEditPasswordDialog}
        onOpenChange={setShowEditPasswordDialog}
        onConfirm={handleEditPasswordConfirmed}
        title="Confirm Edit Teacher"
        description={`Enter a password to edit "${pendingEditTeacher?.name || "this teacher"}".`}
      />

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Teacher</DialogTitle><DialogDescription>Fill in the details below.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Full Name *</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Teacher name" /></div>
            <div className="flex flex-col gap-2"><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="teacher@school.com" /></div>
            <div className="flex flex-col gap-2"><Label>Phone</Label><Input type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="+27 12 345 6789" /></div>
            <div className="flex flex-col gap-2">
              <Label>Assign Classes</Label>
              <div className="flex flex-col gap-2 rounded-md border p-3">
                {classes.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.assignedClasses.includes(cls.id)} onCheckedChange={() => toggleClass(cls.id)} />
                    <span className="text-sm text-foreground">{cls.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={saving || !formData.name || !formData.email}>{saving ? "Adding..." : "Add Teacher"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle><DialogDescription>Update teacher details.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2"><Label>Full Name *</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="flex flex-col gap-2"><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="flex flex-col gap-2"><Label>Phone</Label><Input type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="+27 12 345 6789" /></div>
            <div className="flex flex-col gap-2">
              <Label>Assign Classes</Label>
              <div className="flex flex-col gap-2 rounded-md border p-3">
                {classes.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.assignedClasses.includes(cls.id)} onCheckedChange={() => toggleClass(cls.id)} />
                    <span className="text-sm text-foreground">{cls.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={saving || !formData.name || !formData.email}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Teacher Created Successfully
            </DialogTitle>
            <DialogDescription>Share these login credentials with the teacher.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Teacher Name</p>
                  <p className="text-sm font-semibold text-foreground">{generatedTeacherName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email (Username)</p>
                  <p className="text-sm font-medium text-foreground">{generatedTeacherEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Password</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono font-semibold text-foreground border">
                      {generatedPassword}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword)
                        setPasswordCopied(true)
                        toast.success("Password copied to clipboard")
                        setTimeout(() => setPasswordCopied(false), 2000)
                      }}
                    >
                      {passwordCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> This password will only be shown once. Make sure to copy and share it with the teacher securely.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPasswordDialog(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Teacher Details</DialogTitle><DialogDescription>Complete teacher information.</DialogDescription></DialogHeader>
          {selectedTeacher && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm font-medium text-foreground">{selectedTeacher.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium text-foreground">{selectedTeacher.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium text-foreground">{selectedTeacher.phone || "Not provided"}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={selectedTeacher.status === "active" ? "default" : "secondary"}>{selectedTeacher.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Students</p><p className="text-sm font-medium text-foreground">{getStudentCount(selectedTeacher)}</p></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Assigned Classes</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTeacher.assignedClasses.map((cId) => {
                    const cls = classes.find((c) => c.id === cId)
                    return cls ? <Badge key={cId} variant="secondary">{cls.name}</Badge> : null
                  })}
                  {selectedTeacher.assignedClasses.length === 0 && <span className="text-sm text-muted-foreground">No classes assigned</span>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
