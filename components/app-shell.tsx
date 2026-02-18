"use client"

import React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  Award,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  UserCog,
  Calendar,
  BarChart3,
} from "lucide-react"

// Pages
import { AdminDashboard } from "@/components/pages/admin-dashboard"
import { StudentManagement } from "@/components/pages/student-management"
import { TeacherManagement } from "@/components/pages/teacher-management"
import { ClassManagement } from "@/components/pages/class-management"
import { TemplateManagement } from "@/components/pages/template-management"
import { AttendancePage } from "@/components/pages/attendance-page"
import { GradesPage } from "@/components/pages/grades-page"
import { ReportsPage } from "@/components/pages/reports-page"
import { ProfilePage } from "@/components/pages/profile-page"
import { TeacherDashboard } from "@/components/pages/teacher-dashboard"

type PageKey =
  | "dashboard"
  | "students"
  | "teachers"
  | "classes"
  | "templates"
  | "attendance"
  | "grades"
  | "reports"
  | "profile"

interface NavItem {
  key: PageKey
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  teacherOnly?: boolean
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { key: "students", label: "Students", icon: <Users className="h-5 w-5" />, adminOnly: true },
  { key: "teachers", label: "Teachers", icon: <UserCog className="h-5 w-5" />, adminOnly: true },
  { key: "classes", label: "Classes & Subjects", icon: <BookOpen className="h-5 w-5" />, adminOnly: true },
  { key: "templates", label: "Templates", icon: <FileText className="h-5 w-5" />, adminOnly: true },
  { key: "attendance", label: "Attendance", icon: <Calendar className="h-5 w-5" /> },
  { key: "grades", label: "Grades", icon: <BarChart3 className="h-5 w-5" /> },
  { key: "reports", label: "Reports & Certs", icon: <Award className="h-5 w-5" /> },
  { key: "profile", label: "Profile", icon: <Settings className="h-5 w-5" /> },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const [activePage, setActivePage] = useState<PageKey>("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return null

  const filteredNav = navItems.filter((item) => {
    if (user.role === "admin") return !item.teacherOnly
    if (user.role === "teacher") return !item.adminOnly
    return true
  })

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return user!.role === "admin" ? <AdminDashboard /> : <TeacherDashboard />
      case "students":
        return <StudentManagement />
      case "teachers":
        return <TeacherManagement />
      case "classes":
        return <ClassManagement />
      case "templates":
        return <TemplateManagement />
      case "attendance":
        return <AttendancePage />
      case "grades":
        return <GradesPage />
      case "reports":
        return <ReportsPage />
      case "profile":
        return <ProfilePage />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
            <GraduationCap className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">School SMS</span>
            <span className="text-xs text-sidebar-foreground/70 capitalize">{user.role} Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="flex flex-col gap-1">
            {filteredNav.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setActivePage(item.key)
                  setSidebarOpen(false)
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activePage === item.key
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
            </div>
            <button
              onClick={logout}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">
            {filteredNav.find((n) => n.key === activePage)?.label || "Dashboard"}
          </h1>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
