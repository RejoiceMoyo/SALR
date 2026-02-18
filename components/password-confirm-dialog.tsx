"use client"

import React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface PasswordConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!password.trim()) {
      setError("Password is required to proceed")
      return
    }

    if (password.trim().length < 3) {
      setError("Password must be at least 3 characters")
      return
    }

    onConfirm()
    setPassword("")
    setError("")
    onOpenChange(false)
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setPassword("")
      setError("")
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              Enter a password to confirm this action
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Enter any password to proceed"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              autoFocus
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!password.trim()}>
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
