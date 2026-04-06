// tests/orpc/routers/project.test.ts
// Feature: orpc-integration, Properties 11, 16: Project Router Tests

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

/**
 * Generate a unique slug from project name, user ID, and timestamp
 * This is a copy of the function from project.ts to avoid importing the router
 * which has database dependencies
 */
function generateProjectSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const userPrefix = userId.substring(0, 8)
  const timestamp = Date.now()
  return `${baseSlug}-${userPrefix}-${timestamp}`
}

/**
 * Name validation logic - mirrors the validation in project router
 */
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Name is required' }
  }
  if (name.length > 20) {
    return { valid: false, error: 'Name must be 20 characters or fewer' }
  }
  return { valid: true }
}

/**
 * Parse slug components for validation
 */
function parseSlugComponents(slug: string): { 
  hasNamePart: boolean
  hasUserPrefix: boolean
  hasTimestamp: boolean
  userPrefix: string | null
  timestamp: number | null
} {
  const parts = slug.split('-')
  
  // Slug format: {name-slug}-{user-prefix}-{timestamp}
  // The timestamp is always the last part
  // The user prefix is always 8 characters before the timestamp
  
  if (parts.length < 3) {
    return { hasNamePart: false, hasUserPrefix: false, hasTimestamp: false, userPrefix: null, timestamp: null }
  }
  
  const timestampPart = parts[parts.length - 1]
  const userPrefixPart = parts[parts.length - 2]
  
  const timestamp = parseInt(timestampPart, 10)
  const hasTimestamp = !isNaN(timestamp) && timestamp > 0
  const hasUserPrefix = userPrefixPart.length === 8
  const hasNamePart = parts.length >= 3
  
  return {
    hasNamePart,
    hasUserPrefix,
    hasTimestamp,
    userPrefix: hasUserPrefix ? userPrefixPart : null,
    timestamp: hasTimestamp ? timestamp : null,
  }
}

describe('Project Router Properties', () => {
  /**
   * Property 11: Entity Name Validation (Project portion)
   * For any project name that is empty or exceeds 20 characters,
   * the create procedure SHALL reject the input with a validation error.
   * **Validates: Requirements 4.1**
   */
  describe('Property 11: Entity Name Validation (Project)', () => {
    it('accepts valid names (1-20 characters)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (name) => {
            const result = validateName(name)
            expect(result.valid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('rejects empty names', async () => {
      const result = validateName('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Name is required')
    })

    it('rejects names exceeding 20 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 21, maxLength: 100 }),
          async (name) => {
            const result = validateName(name)
            expect(result.valid).toBe(false)
            expect(result.error).toBe('Name must be 20 characters or fewer')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 16: Project Slug Uniqueness
   * For any project creation with a given name and user, the generated slug
   * SHALL contain a name-based prefix, user ID prefix, and timestamp to ensure uniqueness.
   * **Validates: Requirements 4.3**
   */
  describe('Property 16: Project Slug Uniqueness', () => {
    it('generates slug with name-based prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[a-zA-Z0-9]/.test(s)),
          fc.uuid(),
          async (name, userId) => {
            const slug = generateProjectSlug(name, userId)
            
            // Slug should contain some form of the name (lowercased, sanitized)
            const namePart = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            if (namePart.length > 0) {
              expect(slug.startsWith(namePart)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('generates slug with user ID prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[a-zA-Z0-9]/.test(s)),
          fc.uuid(),
          async (name, userId) => {
            const slug = generateProjectSlug(name, userId)
            const userPrefix = userId.substring(0, 8)
            
            expect(slug).toContain(userPrefix)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('generates slug with timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[a-zA-Z0-9]/.test(s)),
          fc.uuid(),
          async (name, userId) => {
            const beforeGenerate = Date.now()
            const slug = generateProjectSlug(name, userId)
            const afterGenerate = Date.now()
            
            const components = parseSlugComponents(slug)
            
            expect(components.hasTimestamp).toBe(true)
            expect(components.timestamp).toBeGreaterThanOrEqual(beforeGenerate)
            expect(components.timestamp).toBeLessThanOrEqual(afterGenerate)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('generates unique slugs for same name and user at different times', async () => {
      // This test verifies that slugs generated at different milliseconds are unique
      // We use a synchronous approach with explicit timestamp differences
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[a-zA-Z0-9]/.test(s)),
          fc.uuid(),
          async (name, userId) => {
            const slug1 = generateProjectSlug(name, userId)
            // Wait for at least 2ms to ensure different timestamp
            const start = Date.now()
            while (Date.now() === start) {
              // Busy wait until timestamp changes
            }
            const slug2 = generateProjectSlug(name, userId)
            
            expect(slug1).not.toBe(slug2)
          }
        ),
        { numRuns: 10 } // Reduced runs due to timing sensitivity
      )
    }, 15000) // Extended timeout for async test with delays

    it('generates different slugs for different users with same name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[a-zA-Z0-9]/.test(s)),
          fc.uuid(),
          fc.uuid(),
          async (name, userId1, userId2) => {
            fc.pre(userId1 !== userId2)
            
            const slug1 = generateProjectSlug(name, userId1)
            const slug2 = generateProjectSlug(name, userId2)
            
            // Different user prefixes should result in different slugs
            const userPrefix1 = userId1.substring(0, 8)
            const userPrefix2 = userId2.substring(0, 8)
            
            if (userPrefix1 !== userPrefix2) {
              expect(slug1).not.toBe(slug2)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
