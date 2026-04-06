// tests/orpc/server.test.ts
// Feature: orpc-integration, Property 4: Domain Error Mapping

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mapDomainError } from '@/lib/orpc/server'

describe('Server Procedure Builder Properties', () => {
  /**
   * Property 4: Domain Error Mapping
   * For any error message containing "Limit reached", the error middleware SHALL map it to
   * PRECONDITION_FAILED; for any error containing "Unauthorized", it SHALL map to UNAUTHORIZED.
   * **Validates: Requirements 1.6**
   */
  describe('Property 4: Domain Error Mapping', () => {
    it('maps "Limit reached" errors to PRECONDITION_FAILED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(), // prefix
          fc.string(), // suffix
          async (prefix, suffix) => {
            const errorMessage = `${prefix}Limit reached${suffix}`
            const error = new Error(errorMessage)
            
            const mappedCode = mapDomainError(error)
            
            expect(mappedCode).toBe('PRECONDITION_FAILED')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('maps "limit reached" (lowercase) errors to PRECONDITION_FAILED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string(),
          async (prefix, suffix) => {
            const errorMessage = `${prefix}limit reached${suffix}`
            const error = new Error(errorMessage)
            
            const mappedCode = mapDomainError(error)
            
            expect(mappedCode).toBe('PRECONDITION_FAILED')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('maps "Unauthorized" errors to UNAUTHORIZED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string(),
          async (prefix, suffix) => {
            const errorMessage = `${prefix}Unauthorized${suffix}`
            const error = new Error(errorMessage)
            
            const mappedCode = mapDomainError(error)
            
            expect(mappedCode).toBe('UNAUTHORIZED')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('maps "unauthorized" (lowercase) errors to UNAUTHORIZED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string(),
          async (prefix, suffix) => {
            const errorMessage = `${prefix}unauthorized${suffix}`
            const error = new Error(errorMessage)
            
            const mappedCode = mapDomainError(error)
            
            expect(mappedCode).toBe('UNAUTHORIZED')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('maps "Not a member" errors to FORBIDDEN', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string(),
          async (prefix, suffix) => {
            const errorMessage = `${prefix}Not a member${suffix}`
            const error = new Error(errorMessage)
            
            const mappedCode = mapDomainError(error)
            
            expect(mappedCode).toBe('FORBIDDEN')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('maps "Not found" errors to NOT_FOUND', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string(),
          async (prefix, suffix) => {
            const errorMessage = `${prefix}Not found${suffix}`
            const error = new Error(errorMessage)
            
            const mappedCode = mapDomainError(error)
            
            expect(mappedCode).toBe('NOT_FOUND')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns null for errors without known patterns', async () => {
      // Generate strings that don't contain any of the known error patterns
      const safeStringArb = fc.string().filter(s => 
        !s.includes('Limit reached') &&
        !s.includes('limit reached') &&
        !s.includes('Unauthorized') &&
        !s.includes('unauthorized') &&
        !s.includes('Not a member') &&
        !s.includes('not a member') &&
        !s.includes('Not found') &&
        !s.includes('not found')
      )

      await fc.assert(
        fc.asyncProperty(safeStringArb, async (errorMessage) => {
          const error = new Error(errorMessage)
          
          const mappedCode = mapDomainError(error)
          
          expect(mappedCode).toBeNull()
        }),
        { numRuns: 100 }
      )
    })
  })
})
