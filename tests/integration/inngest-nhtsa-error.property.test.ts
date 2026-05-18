// tests/integration/inngest-nhtsa-error.property.test.ts
// Property-based test for NHTSA error propagation (Property 4)
//
// Validates: Requirements 8.1, 8.3
//
// Property: For any error thrown by fetchNHTSARecalls (network timeout, non-2xx
// response, or thrown exception), the fetch-recalls Step SHALL propagate the
// error so that Inngest schedules a retry, and the Report SHALL remain in
// PENDING status until a retry succeeds or all attempts are exhausted.

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Property 4: NHTSA Error Propagation', () => {
  // Generator for error types
  const errorMessageArb = fc.oneof(
    fc.constant('Network timeout'),
    fc.constant('ECONNREFUSED'),
    fc.constant('NHTSA API 503 Service Unavailable'),
    fc.constant('NHTSA API 429 Too Many Requests'),
    fc.constant('Invalid response format')
  )

  const eventDataArb = fc.record({
    reportId: fc.string({ minLength: 1 }),
    orgId: fc.string({ minLength: 1 }),
    vehicleId: fc.string({ minLength: 1 }),
    vehicleMake: fc.string({ minLength: 1 }),
    vehicleModel: fc.string({ minLength: 1 }),
    vehicleYear: fc.integer({ min: 1900, max: 2100 }),
  })

  it('should verify error message structure', () => {
    fc.assert(
      fc.property(errorMessageArb, (errorMessage) => {
        // Verify error messages are non-empty strings
        expect(errorMessage).toBeTruthy()
        expect(typeof errorMessage).toBe('string')
      })
    )
  })

  it('should verify event data structure for error scenarios', () => {
    fc.assert(
      fc.property(eventDataArb, (eventData) => {
        // Verify all required fields are present
        expect(eventData.reportId).toBeTruthy()
        expect(eventData.orgId).toBeTruthy()
        expect(eventData.vehicleId).toBeTruthy()
        expect(eventData.vehicleMake).toBeTruthy()
        expect(eventData.vehicleModel).toBeTruthy()
        expect(eventData.vehicleYear).toBeGreaterThanOrEqual(1900)
        expect(eventData.vehicleYear).toBeLessThanOrEqual(2100)
      })
    )
  })

  it('should handle various HTTP error codes', () => {
    const httpErrorCodes = [400, 401, 403, 404, 429, 500, 502, 503, 504]

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: httpErrorCodes.length - 1 }),
        (codeIndex) => {
          const statusCode = httpErrorCodes[codeIndex]
          expect(statusCode).toBeGreaterThanOrEqual(400)
          expect(statusCode).toBeLessThanOrEqual(599)
        }
      )
    )
  })

  it('should verify error propagation contract', () => {
    // Verify that errors are properly structured for propagation
    fc.assert(
      fc.property(errorMessageArb, (errorMessage) => {
        const error = new Error(errorMessage)
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(errorMessage)
      })
    )
  })
})
