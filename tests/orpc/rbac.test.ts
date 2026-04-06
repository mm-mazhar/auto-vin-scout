// tests/orpc/rbac.test.ts
// Unit tests for oRPC RBAC authorization logic

import { describe, it, expect } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { ROLES, type OrganizationRole } from '@/lib/constants'

/**
 * Mock context type for testing
 */
interface MockContext {
  user: User | null
  orgId: string | null
  role: OrganizationRole | null
}

/**
 * Mock context generator for testing different roles
 */
function createMockContext(options: {
  authenticated?: boolean
  userId?: string
  email?: string
  orgId?: string | null
  role?: OrganizationRole | null
}): MockContext {
  const {
    authenticated = false,
    userId = 'test-user-id',
    email = 'test@example.com',
    orgId = null,
    role = null,
  } = options

  // Create a minimal user object that satisfies the type
  const mockUser = authenticated ? {
    id: userId,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User : null

  return {
    user: mockUser,
    orgId,
    role,
  }
}

/**
 * Authorization logic functions for testing
 */
function checkPublicAccess(): boolean {
  return true // Always allows access
}

function checkProtectedAccess(user: User | null): { allowed: boolean; error?: string } {
  if (!user) {
    return { allowed: false, error: 'UNAUTHORIZED' }
  }
  return { allowed: true }
}

function checkOrgAccess(
  user: User | null, 
  orgId: string | null, 
  role: OrganizationRole | null
): { allowed: boolean; error?: string } {
  if (!user) {
    return { allowed: false, error: 'UNAUTHORIZED' }
  }
  if (!orgId || !role) {
    return { allowed: false, error: 'FORBIDDEN' }
  }
  return { allowed: true }
}

function checkAdminAccess(
  user: User | null, 
  orgId: string | null, 
  role: OrganizationRole | null
): { allowed: boolean; error?: string } {
  const orgCheck = checkOrgAccess(user, orgId, role)
  if (!orgCheck.allowed) {
    return orgCheck
  }
  if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
    return { allowed: false, error: 'FORBIDDEN' }
  }
  return { allowed: true }
}

function checkOwnerAccess(
  user: User | null, 
  orgId: string | null, 
  role: OrganizationRole | null
): { allowed: boolean; error?: string } {
  const orgCheck = checkOrgAccess(user, orgId, role)
  if (!orgCheck.allowed) {
    return orgCheck
  }
  if (role !== ROLES.OWNER) {
    return { allowed: false, error: 'FORBIDDEN' }
  }
  return { allowed: true }
}

function checkSuperAdminAccess(
  user: User | null,
  superAdminEmails: string[]
): { allowed: boolean; error?: string } {
  if (!user) {
    return { allowed: false, error: 'UNAUTHORIZED' }
  }
  if (!user.email || !superAdminEmails.includes(user.email)) {
    return { allowed: false, error: 'FORBIDDEN' }
  }
  return { allowed: true }
}

describe('oRPC RBAC Authorization Logic', () => {
  describe('Public Access', () => {
    it('should allow public access for any context', () => {
      const result = checkPublicAccess()
      expect(result).toBe(true)
    })
  })

  describe('Protected Access', () => {
    it('should allow access when user is authenticated', () => {
      const context = createMockContext({ authenticated: true })
      const result = checkProtectedAccess(context.user)
      expect(result.allowed).toBe(true)
    })

    it('should deny access when user is not authenticated', () => {
      const context = createMockContext({ authenticated: false })
      const result = checkProtectedAccess(context.user)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('UNAUTHORIZED')
    })
  })

  describe('Organization Access', () => {
    it('should allow access when user has org context', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.MEMBER 
      })
      const result = checkOrgAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(true)
    })

    it('should deny access when orgId is missing', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: null, 
        role: ROLES.MEMBER 
      })
      const result = checkOrgAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })

    it('should deny access when role is missing', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: null 
      })
      const result = checkOrgAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })
  })

  describe('Admin Access', () => {
    it('should allow access for ADMIN role', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.ADMIN 
      })
      const result = checkAdminAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(true)
    })

    it('should allow access for OWNER role', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.OWNER 
      })
      const result = checkAdminAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(true)
    })

    it('should deny access for MEMBER role', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.MEMBER 
      })
      const result = checkAdminAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })
  })

  describe('Owner Access', () => {
    it('should allow access for OWNER role', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.OWNER 
      })
      const result = checkOwnerAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(true)
    })

    it('should deny access for ADMIN role', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.ADMIN 
      })
      const result = checkOwnerAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })

    it('should deny access for MEMBER role', () => {
      const context = createMockContext({ 
        authenticated: true, 
        orgId: 'test-org', 
        role: ROLES.MEMBER 
      })
      const result = checkOwnerAccess(context.user, context.orgId, context.role)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })
  })

  describe('Super Admin Access', () => {
    it('should allow access when email is in super admin list', () => {
      const context = createMockContext({ 
        authenticated: true, 
        email: 'admin@example.com' 
      })
      const superAdminEmails = ['admin@example.com']
      const result = checkSuperAdminAccess(context.user, superAdminEmails)
      expect(result.allowed).toBe(true)
    })

    it('should deny access when email is not in super admin list', () => {
      const context = createMockContext({ 
        authenticated: true, 
        email: 'user@example.com' 
      })
      const superAdminEmails = ['admin@example.com']
      const result = checkSuperAdminAccess(context.user, superAdminEmails)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })

    it('should deny access when user has no email', () => {
      const context = createMockContext({ 
        authenticated: true, 
        email: undefined 
      })
      // Override the email to be undefined
      if (context.user) {
        context.user.email = undefined
      }
      const superAdminEmails = ['admin@example.com']
      const result = checkSuperAdminAccess(context.user, superAdminEmails)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('FORBIDDEN')
    })

    it('should deny access when user is not authenticated', () => {
      const context = createMockContext({ authenticated: false })
      const superAdminEmails = ['admin@example.com']
      const result = checkSuperAdminAccess(context.user, superAdminEmails)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('UNAUTHORIZED')
    })
  })
})
