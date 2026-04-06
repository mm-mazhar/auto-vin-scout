// lib/project-helper.ts

import { cookies } from 'next/headers'
import type { ProjectListOutput } from '@/lib/orpc/types'

/**
 * Get the active project ID based on cookie or default to the first project
 * @param projects List of available projects
 * @returns The active project ID or undefined if no projects exist
 */
export async function getActiveProjectId(projects: ProjectListOutput): Promise<string | undefined> {
  if (!projects || projects.length === 0) {
    return undefined
  }

  const cookieStore = await cookies()
  const activeProjectId = cookieStore.get('current-project-id')?.value

  // If cookie exists and matches a project, return it
  if (activeProjectId && projects.some((p) => p.id === activeProjectId)) {
    return activeProjectId
  }

  // Default to the first project
  return projects[0].id
}
