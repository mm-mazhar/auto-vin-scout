// lib/orpc/procedures.ts

import { baseProcedure, ORPCError } from './server'
import { ROLES, type OrganizationRole } from '@/lib/constants'
import type { User } from '@supabase/supabase-js'

/**
 * Context with guaranteed authenticated user
 */
export interface AuthenticatedContext {
  user: User
  db: typeof import('@/app/lib/db').default
  orgId: string | null
  role: OrganizationRole | null
}

/**
 * Context with guaranteed organization membership
 */
export interface OrgContext extends AuthenticatedContext {
  orgId: string
  role: OrganizationRole
}

/**
 * Public procedure - no authentication required
 * Allows execution without any authentication check
 */
export const publicProcedure = baseProcedure

/**
 * Protected procedure - requires authenticated user
 * Throws UNAUTHORIZED if user is not authenticated
 */
export const protectedProcedure = baseProcedure.use(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED', { 
      message: 'Authentication required' 
    })
  }
  
  return next({
    context: {
      ...context,
      user: context.user,
    } as AuthenticatedContext,
  })
})

/**
 * Org procedure - requires organization context
 * Throws FORBIDDEN if user is not in an organization context
 */
export const orgProcedure = protectedProcedure.use(async ({ context, next }) => {
  if (!context.orgId || !context.role) {
    throw new ORPCError('FORBIDDEN', { 
      message: 'Organization context required' 
    })
  }
  
  return next({
    context: {
      ...context,
      orgId: context.orgId,
      role: context.role,
    } as OrgContext,
  })
})

/**
 * Admin procedure - requires ADMIN or OWNER role
 * Throws FORBIDDEN if user's role is not ADMIN or OWNER
 */
export const adminProcedure = orgProcedure.use(async ({ context, next }) => {
  if (context.role !== ROLES.ADMIN && context.role !== ROLES.OWNER) {
    throw new ORPCError('FORBIDDEN', { 
      message: 'Admin access required' 
    })
  }
  
  return next()
})

/**
 * Owner procedure - requires OWNER role
 * Throws FORBIDDEN if user's role is not OWNER
 */
export const ownerProcedure = orgProcedure.use(async ({ context, next }) => {
  if (context.role !== ROLES.OWNER) {
    throw new ORPCError('FORBIDDEN', { 
      message: 'Owner access required' 
    })
  }
  
  return next()
})

/**
 * Super Admin procedure - requires email in SUPER_ADMIN_EMAILS
 * Throws FORBIDDEN if user's email is not in the super admin list
 */
export const superAdminProcedure = protectedProcedure.use(async ({ context, next }) => {
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) ?? []
  
  if (!context.user.email || !superAdminEmails.includes(context.user.email)) {
    throw new ORPCError('FORBIDDEN', { 
      message: 'Administrative access required' 
    })
  }
  
  return next()
})
