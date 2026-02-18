"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { UsersStore } from "@/lib/store"
import type { User } from "@/lib/store"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  verifyPassword: (password: string) => boolean
  updatePassword: (newPassword: string) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const savedUserId = typeof window !== "undefined" ? sessionStorage.getItem("sms_current_user") : null
      if (savedUserId) {
        const foundUser = await UsersStore.getById(savedUserId)
        if (foundUser) {
          setUser(foundUser)
        }
      }
      setIsLoading(false)
    }
    loadUser()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const foundUser = await UsersStore.getByEmail(email)
    if (!foundUser) {
      return { success: false, error: "User not found" }
    }
    if (foundUser.password !== password) {
      return { success: false, error: "Invalid password" }
    }
    if (foundUser.status !== "active") {
      return { success: false, error: "Account is inactive" }
    }
    setUser(foundUser)
    sessionStorage.setItem("sms_current_user", foundUser.id)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem("sms_current_user")
  }, [])

  const verifyPassword = useCallback(
    (password: string) => {
      if (!user) return false
      return user.password === password
    },
    [user]
  )

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!user) return
      await UsersStore.update(user.id, { password: newPassword })
      setUser({ ...user, password: newPassword })
    },
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, login, logout, verifyPassword, updatePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
