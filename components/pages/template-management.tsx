"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { TemplatesStore } from "@/lib/store"
import type { Template } from "@/lib/store"
import { Plus, Pencil, FileText } from "lucide-react"
import { toast } from "sonner"

export function TemplateManagement() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    type: "report" as Template["type"],
    content: "",
  })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const templatesData = await TemplatesStore.getAll()
      setTemplates(templatesData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleAdd() {
    setEditingTemplate(null)
    setFormData({ name: "", type: "report", content: "" })
    setShowDialog(true)
  }

  function handleEdit(template: Template) {
    setEditingTemplate(template)
    setFormData({ name: template.name, type: template.type, content: template.content })
    setShowDialog(true)
  }

  async function handleSave() {
    if (!formData.name || !formData.content) {
      toast.error("Please fill in all required fields")
      return
    }
    setSaving(true)
    try {
      if (editingTemplate) {
        await TemplatesStore.update(editingTemplate.id, formData)
        toast.success("Template updated successfully")
      } else {
        await TemplatesStore.add({ ...formData, createdBy: user?.id || "" })
        toast.success("Template added successfully")
      }
      setShowDialog(false)
      loadData()
    } catch (error) {
      toast.error(editingTemplate ? "Failed to update template" : "Failed to add template")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const typeColors: Record<string, string> = {
    report: "bg-primary/10 text-primary",
    certificate: "bg-accent/10 text-accent",
    indemnity: "bg-destructive/10 text-destructive",
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
          <h2 className="text-2xl font-bold text-foreground">Document Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {"Manage templates with placeholders like {{StudentName}}, {{Class}}, {{Term}}, etc."}
          </p>
        </div>
{user?.role === "admin" && <Button onClick={handleAdd} className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No templates found</TableCell></TableRow>
              ) : templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium text-foreground">{tpl.name}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeColors[tpl.type] || ""}`}>{tpl.type}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-xs truncate">{tpl.content.slice(0, 80)}...</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
{user?.role === "admin" && <Button variant="ghost" size="icon" onClick={() => handleEdit(tpl)} aria-label="Edit template"><Pencil className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>{"Use placeholders like {{StudentName}}, {{Class}}, {{Term}}, {{TeacherSignature}}, etc."}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2"><Label>Template Name *</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. End of Term Report" /></div>
              <div className="flex flex-col gap-2"><Label>Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v as Template["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="indemnity">Indemnity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2"><Label>Template Content *</Label><Textarea value={formData.content} onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))} rows={12} className="font-mono text-sm" placeholder={"SCHOOL NAME\n\n{{StudentName}}\n{{Class}}\n{{Term}}\n..."} /></div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Available placeholders:</p>
              <div className="flex flex-wrap gap-1">
                {["{{StudentName}}", "{{StudentNumber}}", "{{Class}}", "{{Term}}", "{{GradesTable}}", "{{AverageMarks}}", "{{AttendanceRate}}", "{{TeacherComment}}", "{{TeacherSignature}}", "{{TeacherName}}", "{{Date}}", "{{GeneratedDate}}", "{{ParentName}}", "{{ParentPhone}}", "{{GuardianName}}", "{{GuardianPhone}}", "{{Allergies}}", "{{MedicalNotes}}"].map((p) => (
                  <code key={p} className="rounded bg-background px-1.5 py-0.5 text-xs text-foreground">{p}</code>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !formData.name || !formData.content}>{saving ? "Saving..." : "Save Template"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
