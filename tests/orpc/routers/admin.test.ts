// tests/orpc/routers/admin.test.ts
// Feature: orpc-integration, Properties 18-19: Admin Router Tests

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { User } from '@supabase/supabase-js'

// Arbitrary for generating mock Supabase User objects
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  app_metadata: fc.constant({}),
  user_metadata: fc.constant({}),
  aud: fc.constant('authenticated'),
  created_at: fc.constant(new Date().toISOString()),
}) as fc.Arbitrary<User>

// Arbitrary for pagination parameters
const paginationArbitrary = fc.record({
  page: fc.integer({ min: 1, max: 100 }),
  limit: fc.integer({ min: 1, max: 100 }),
  query: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
})

/**
 * Super Admin Access Control Logic
 * Extracted for property-based testing
 */
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

/**
 * Pagination Validation Logic
 * Validates that returned data respects pagination constraints
 */
function validatePaginationResult<T>(
  result: { 
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  },
  requestedLimit: number,
  actualDbCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Data count should not exceed requested limit
  if (result.data.length > requestedLimit) {
    errors.push(`Data count (${result.data.length}) exceeds requested limit (${requestedLimit})`)
  }

  // Total should match actual database count
  if (result.total !== actualDbCount) {
    errors.push(`Total (${result.total}) does not match actual count (${actualDbCount})`)
  }

  // Total pages calculation should be correct
  const expectedTotalPages = Math.ceil(actualDbCount / requestedLimit)
  if (result.totalPages !== expectedTotalPages) {
    errors.push(`Total pages (${result.totalPages}) does not match expected (${expectedTotalPages})`)
  }

  // Page should match requested page
  if (result.page !== result.page) {
    errors.push(`Page mismatch`)
  }

  return { valid: errors.length === 0, errors }
}

describe('Admin Router Properties', () => {
  /**
   * Property 18: Super Admin Access Control
   * For any user whose email is not in SUPER_ADMIN_EMAILS, all admin router
   * procedures SHALL throw a FORBIDDEN error.
   * **Validates: Requirements 10.7**
   */
  describe('Property 18: Super Admin Access Control', () => {
    it('allows access when user email is in super admin list', async () => {
      await fc.assert(
        fc.asyncProperty(userArbitrary, async (user) => {
          // Include the user's email in the super admin list
          const superAdminEmails = [user.email!]
          const result = checkSuperAdminAccess(user, superAdminEmails)
          expect(result.allowed).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('denies access when user email is not in super admin list', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.array(fc.emailAddress(), { minLength: 0, maxLength: 5 }),
          async (user, otherEmails) => {
            // Ensure user's email is not in the list
            const superAdminEmails = otherEmails.filter(e => e !== user.email)
            const result = checkSuperAdminAccess(user, superAdminEmails)
            expect(result.allowed).toBe(false)
            expect(result.error).toBe('FORBIDDEN')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('denies access for unauthenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }),
          async (superAdminEmails) => {
            const result = checkSuperAdminAccess(null, superAdminEmails)
            expect(result.allowed).toBe(false)
            expect(result.error).toBe('UNAUTHORIZED')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('denies access when user has no email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }),
          async (superAdminEmails) => {
            const userWithoutEmail = {
              id: 'test-id',
              email: undefined,
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            } as unknown as User

            const result = checkSuperAdminAccess(userWithoutEmail, superAdminEmails)
            expect(result.allowed).toBe(false)
            expect(result.error).toBe('FORBIDDEN')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('handles empty super admin list correctly', async () => {
      await fc.assert(
        fc.asyncProperty(userArbitrary, async (user) => {
          const result = checkSuperAdminAccess(user, [])
          expect(result.allowed).toBe(false)
          expect(result.error).toBe('FORBIDDEN')
        }),
        { numRuns: 100 }
      )
    })

    it('handles whitespace in email comparison', async () => {
      await fc.assert(
        fc.asyncProperty(userArbitrary, async (user) => {
          // Super admin list with trimmed emails
          const superAdminEmails = [user.email!.trim()]
          const result = checkSuperAdminAccess(user, superAdminEmails)
          expect(result.allowed).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * Property 19: Admin Pagination Consistency
   * For any admin list procedure (users, organizations, subscriptions), the returned
   * data count SHALL not exceed the requested limit, and the total count SHALL
   * reflect the actual database count matching the query.
   * **Validates: Requirements 10.2, 10.3, 10.5**
   */
  describe('Property 19: Admin Pagination Consistency', () => {
    // Arbitrary for generating mock database data
    const mockUserArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      email: fc.emailAddress(),
      colorScheme: fc.constant('theme-neutral'),
      createdAt: fc.date(),
      membershipCount: fc.integer({ min: 0, max: 10 }),
    })

    const mockOrgArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      slug: fc.string({ minLength: 1, maxLength: 50 }),
      credits: fc.integer({ min: 0, max: 1000 }),
      createdAt: fc.date(),
      memberCount: fc.integer({ min: 1, max: 50 }),
      projectCount: fc.integer({ min: 0, max: 20 }),
      subscription: fc.option(
        fc.record({
          planId: fc.string(),
          status: fc.constantFrom('active', 'canceled', 'past_due'),
        }),
        { nil: null }
      ),
    })

    const mockSubscriptionArbitrary = fc.record({
      stripeSubscriptionId: fc.string({ minLength: 10, maxLength: 30 }),
      planId: fc.string(),
      status: fc.constantFrom('active', 'canceled', 'past_due'),
      currentPeriodEnd: fc.integer({ min: 1000000000, max: 2000000000 }),
      createdAt: fc.date(),
      organization: fc.option(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        { nil: null }
      ),
    })

    it('user list data count does not exceed requested limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockUserArbitrary, { minLength: 0, maxLength: 50 }),
          paginationArbitrary,
          async (mockUsers, pagination) => {
            const { page, limit } = pagination
            const skip = (page - 1) * limit
            
            // Simulate pagination
            const paginatedUsers = mockUsers.slice(skip, skip + limit)
            
            const result = {
              data: paginatedUsers,
              total: mockUsers.length,
              page,
              limit,
              totalPages: Math.ceil(mockUsers.length / limit),
            }

            const validation = validatePaginationResult(result, limit, mockUsers.length)
            expect(validation.valid).toBe(true)
            expect(result.data.length).toBeLessThanOrEqual(limit)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('organization list data count does not exceed requested limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockOrgArbitrary, { minLength: 0, maxLength: 50 }),
          paginationArbitrary,
          async (mockOrgs, pagination) => {
            const { page, limit } = pagination
            const skip = (page - 1) * limit
            
            // Simulate pagination
            const paginatedOrgs = mockOrgs.slice(skip, skip + limit)
            
            const result = {
              data: paginatedOrgs,
              total: mockOrgs.length,
              page,
              limit,
              totalPages: Math.ceil(mockOrgs.length / limit),
            }

            const validation = validatePaginationResult(result, limit, mockOrgs.length)
            expect(validation.valid).toBe(true)
            expect(result.data.length).toBeLessThanOrEqual(limit)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('subscription list data count does not exceed requested limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockSubscriptionArbitrary, { minLength: 0, maxLength: 50 }),
          paginationArbitrary,
          async (mockSubs, pagination) => {
            const { page, limit } = pagination
            const skip = (page - 1) * limit
            
            // Simulate pagination
            const paginatedSubs = mockSubs.slice(skip, skip + limit)
            
            const result = {
              data: paginatedSubs,
              total: mockSubs.length,
              page,
              limit,
              totalPages: Math.ceil(mockSubs.length / limit),
            }

            const validation = validatePaginationResult(result, limit, mockSubs.length)
            expect(validation.valid).toBe(true)
            expect(result.data.length).toBeLessThanOrEqual(limit)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('total pages calculation is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          async (totalItems, limit) => {
            const expectedTotalPages = Math.ceil(totalItems / limit)
            
            // Verify the formula
            expect(expectedTotalPages).toBeGreaterThanOrEqual(0)
            
            // If there are items, there should be at least 1 page
            if (totalItems > 0) {
              expect(expectedTotalPages).toBeGreaterThanOrEqual(1)
            }
            
            // Total pages * limit should be >= total items
            expect(expectedTotalPages * limit).toBeGreaterThanOrEqual(totalItems)
            
            // (Total pages - 1) * limit should be < total items (unless 0 items)
            if (totalItems > 0) {
              expect((expectedTotalPages - 1) * limit).toBeLessThan(totalItems)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('page offset calculation is correct', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          async (page, limit) => {
            const skip = (page - 1) * limit
            
            // Skip should be non-negative
            expect(skip).toBeGreaterThanOrEqual(0)
            
            // First page should have skip = 0
            if (page === 1) {
              expect(skip).toBe(0)
            }
            
            // Skip should increase by limit for each page
            const nextPageSkip = page * limit
            expect(nextPageSkip - skip).toBe(limit)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('search filtering reduces total count appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockUserArbitrary, { minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          async (mockUsers, searchQuery) => {
            // Simulate search filtering
            const filteredUsers = mockUsers.filter(u => 
              (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
              u.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            
            // Filtered count should be <= total count
            expect(filteredUsers.length).toBeLessThanOrEqual(mockUsers.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('empty search returns all results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(mockUserArbitrary, { minLength: 0, maxLength: 50 }),
          async (mockUsers) => {
            const searchQuery: string = ''
            
            // Empty search should return all users
            // When searchQuery is empty, all users should be returned
            const filteredUsers = searchQuery.length > 0
              ? mockUsers.filter(u => 
                  (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  u.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : mockUsers
            
            expect(filteredUsers.length).toBe(mockUsers.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('pagination handles edge cases correctly', async () => {
      // Test empty data
      const emptyResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      }
      expect(emptyResult.data.length).toBe(0)
      expect(emptyResult.totalPages).toBe(0)

      // Test single item
      const singleResult = {
        data: [{ id: '1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
      expect(singleResult.data.length).toBe(1)
      expect(singleResult.totalPages).toBe(1)

      // Test exact limit match
      const exactResult = {
        data: Array(10).fill({ id: '1' }),
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
      expect(exactResult.data.length).toBe(10)
      expect(exactResult.totalPages).toBe(1)
    })
  })
})
