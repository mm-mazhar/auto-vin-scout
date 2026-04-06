// lib/orpc/context.ts

import { cookies } from 'next/headers'
import { createClient } from '@/app/lib/supabase/server'
import prisma from '@/app/lib/db'
import type { User } from '@supabase/supabase-js'
import type { OrganizationRole } from '@/lib/constants'

/**
 * oRPC Context type containing authenticated user, database client,
 * organization ID, and user role within the organization.
 */
export interface ORPCContext {
  user: User | null
  db: typeof prisma
  orgId: string | null
  role: OrganizationRole | null
}

/**
 * Dependencies for context creation - allows injection for testing
 */
export interface ContextDependencies {
  getUser: () => Promise<{ user: User | null; error: Error | null }>
  getOrgIdCookie: () => Promise<string | null>
  getMembership: (orgId: string, userId: string) => Promise<{ role: string } | null>
  db: typeof prisma
}

/**
 * Core context creation logic - testable with injected dependencies
 */
export async function createContextWithDeps(deps: ContextDependencies): Promise<ORPCContext> {
  // Initialize default context
  const context: ORPCContext = {
    user: null,
    db: deps.db,
    orgId: null,
    role: null,
  }

  // Get authenticated user
  const { user, error } = await deps.getUser()

  if (error || !user) {
    return context
  }

  context.user = user

  // Read current-org-id cookie to determine active organization
  const orgId = await deps.getOrgIdCookie()

  if (!orgId) {
    return context
  }

  // Validate organization membership
  const membership = await deps.getMembership(orgId, user.id)

  if (!membership) {
    return context
  }

  // User is a verified member - include org context
  context.orgId = orgId
  context.role = membership.role as OrganizationRole

  return context
}

/**
 * Creates the execution context for all oRPC procedures.
 * Bridges Next.js, Supabase Auth, and tenant resolution.
 * 
 * @param req - Optional Request object (used in route handlers)
 * @returns Promise<ORPCContext> - The context object for procedure execution
 */
 
export async function createContext(_req?: Request): Promise<ORPCContext> {
  const deps: ContextDependencies = {
    getUser: async () => {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      return { user, error }
    },
    getOrgIdCookie: async () => {
      const cookieStore = await cookies()
      const orgIdCookie = cookieStore.get('current-org-id')
      return orgIdCookie?.value ?? null
    },
    getMembership: async (orgId: string, userId: string) => {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: userId,
          },
        },
        select: {
          role: true,
        },
      })
      return membership
    },
    db: prisma,
  }

  return createContextWithDeps(deps)
}
