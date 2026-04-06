// app/actions/cookie-actions.ts
// Server actions that require cookie manipulation (cannot be done via oRPC)

'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Switch the current organization context
 * Sets the current-org-id cookie and redirects to dashboard
 */
export async function switchOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-org-id', orgId)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * Set the current organization without redirecting
 * Use this when you want to handle navigation client-side
 */
export async function setCurrentOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-org-id', orgId)
  revalidatePath('/dashboard')
}

/**
 * Switch the current project context
 * Sets the current-project-id cookie and redirects to dashboard
 */
export async function switchProject(projectId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-project-id', projectId)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * Set the current project without redirecting
 * Use this when you want to handle navigation client-side
 */
export async function setCurrentProject(projectId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-project-id', projectId)
  revalidatePath('/dashboard')
}
