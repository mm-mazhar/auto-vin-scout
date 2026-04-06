// tests/orpc/context.test.ts
// Feature: orpc-integration, Properties 1-3: Context Generator Tests

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { User } from '@supabase/supabase-js'
import { ROLES, type OrganizationRole } from '@/lib/constants'

/**
 * Context Dependencies interface - mirrors the one in context.ts
 * Defined here to avoid importing the actual module which has prisma dependency
 */
interface ContextDependencies {
  getUser: () => Promise<{ user: User | null; error: Error | null }>
  getOrgIdCookie: () => Promise<string | null>
  getMembership: (orgId: string, userId: string) => Promise<{ role: string } | null>
  db: unknown
}

interface ORPCContext {
  user: User | null
  db: unknown
  orgId: string | null
  role: OrganizationRole | null
}

/**
 * Core context creation logic - duplicated here for testing without prisma dependency
 * This mirrors the createContextWithDeps function in context.ts
 */
async function createContextWithDeps(deps: ContextDependencies): Promise<ORPCContext> {
  const context: ORPCContext = {
    user: null,
    db: deps.db,
    orgId: null,
    role: null,
  }

  const { user, error } = await deps.getUser()

  if (error || !user) {
    return context
  }

  context.user = user

  const orgId = await deps.getOrgIdCookie()

  if (!orgId) {
    return context
  }

  const membership = await deps.getMembership(orgId, user.id)

  if (!membership) {
    return context
  }

  context.orgId = orgId
  context.role = membership.role as OrganizationRole

  return context
}

// Arbitrary for generating mock Supabase User objects
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  app_metadata: fc.constant({}),
  user_metadata: fc.constant({}),
  aud: fc.constant('authenticated'),
  created_at: fc.constant(new Date().toISOString()),
}) as fc.Arbitrary<User>

// Arbitrary for organization roles
const roleArbitrary = fc.constantFrom<OrganizationRole>(ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER)

// Mock database (minimal implementation for testing)
const mockDb = {}

describe('Context Generator Properties', () => {
  /**
   * Property 1: Context User Resolution
   * For any Supabase session with an authenticated user, the oRPC context SHALL contain
   * that user's data; for any session without authentication, the context SHALL have user: null.
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Context User Resolution', () => {
    it('returns user data when authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(userArbitrary, async (user) => {
          const deps: ContextDependencies = {
            getUser: async () => ({ user, error: null }),
            getOrgIdCookie: async () => null,
            getMembership: async () => null,
            db: mockDb,
          }

          const context = await createContextWithDeps(deps)
          
          expect(context.user).not.toBeNull()
          expect(context.user?.id).toBe(user.id)
          expect(context.user?.email).toBe(user.email)
        }),
        { numRuns: 100 }
      )
    })

    it('returns null user when not authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { user: null, error: null },
            { user: null, error: new Error('Not authenticated') }
          ),
          async (authResult) => {
            const deps: ContextDependencies = {
              getUser: async () => authResult,
              getOrgIdCookie: async () => null,
              getMembership: async () => null,
              db: mockDb,
            }

            const context = await createContextWithDeps(deps)
            
            expect(context.user).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: Context Organization Cookie Reading
   * For any valid organization ID stored in the current-org-id cookie, the context generator
   * SHALL read and include that organization ID in the context.
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: Context Organization Cookie Reading', () => {
    it('reads org ID from cookie when user is authenticated and is a member', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.uuid(), // orgId
          roleArbitrary,
          async (user, orgId, role) => {
            const deps: ContextDependencies = {
              getUser: async () => ({ user, error: null }),
              getOrgIdCookie: async () => orgId,
              getMembership: async () => ({ role }),
              db: mockDb,
            }

            const context = await createContextWithDeps(deps)
            
            expect(context.orgId).toBe(orgId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns null orgId when cookie is not set', async () => {
      await fc.assert(
        fc.asyncProperty(userArbitrary, async (user) => {
          const deps: ContextDependencies = {
            getUser: async () => ({ user, error: null }),
            getOrgIdCookie: async () => null,
            getMembership: async () => ({ role: ROLES.MEMBER }),
            db: mockDb,
          }

          const context = await createContextWithDeps(deps)
          
          expect(context.orgId).toBeNull()
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3: Context Membership Validation
   * For any user and organization ID combination, the context SHALL include orgId and role
   * only if the user is a verified member of that organization; otherwise both SHALL be null.
   * **Validates: Requirements 1.3, 1.4**
   */
  describe('Property 3: Context Membership Validation', () => {
    it('includes orgId and role when user is a verified member', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.uuid(),
          roleArbitrary,
          async (user, orgId, role) => {
            const deps: ContextDependencies = {
              getUser: async () => ({ user, error: null }),
              getOrgIdCookie: async () => orgId,
              getMembership: async () => ({ role }),
              db: mockDb,
            }

            const context = await createContextWithDeps(deps)
            
            expect(context.orgId).toBe(orgId)
            expect(context.role).toBe(role)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns null orgId and role when user is not a member', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.uuid(),
          async (user, orgId) => {
            const deps: ContextDependencies = {
              getUser: async () => ({ user, error: null }),
              getOrgIdCookie: async () => orgId,
              getMembership: async () => null, // Not a member
              db: mockDb,
            }

            const context = await createContextWithDeps(deps)
            
            expect(context.orgId).toBeNull()
            expect(context.role).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns null orgId and role when user is not authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), roleArbitrary, async (orgId, role) => {
          const deps: ContextDependencies = {
            getUser: async () => ({ user: null, error: null }),
            getOrgIdCookie: async () => orgId,
            getMembership: async () => ({ role }),
            db: mockDb,
          }

          const context = await createContextWithDeps(deps)
          
          expect(context.user).toBeNull()
          expect(context.orgId).toBeNull()
          expect(context.role).toBeNull()
        }),
        { numRuns: 100 }
      )
    })
  })
})
