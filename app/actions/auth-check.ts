// app/actions/auth-check.ts

'use server'

import { isDisposableEmail } from '@/lib/email-validator'
import { CHECK_DISPOSABLE_EMAILS } from '@/lib/constants'

export async function validateEmail(email: string) {
  if (!CHECK_DISPOSABLE_EMAILS) return { valid: true }
  
  const isDisposable = isDisposableEmail(email)
  
  if (isDisposable) {
    return { 
      valid: false, 
      message: 'Please use a permanent email address (e.g., Gmail, Outlook, or work email).' 
    }
  }
  
  return { valid: true }
}