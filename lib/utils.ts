import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { Student } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function studentFullName(student: Pick<Student, "firstName" | "lastName">) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ")
}
