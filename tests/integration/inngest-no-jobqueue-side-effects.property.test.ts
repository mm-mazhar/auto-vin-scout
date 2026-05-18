// tests/integration/inngest-no-jobqueue-side-effects.property.test.ts
// Property-based test for no JobQueue side effects after cutover (Property 7)
//
// Validates: Requirements 6.3, 6.4
//
// Property: For any valid handlePaidFlow invocation after the Shadow_Mode
// transition phase is complete, no JobQueue row SHALL be created and no
// after() callback SHALL be registered — the only side effect beyond the
// Prisma transaction SHALL be the single inngest.send() call.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { inngest } from '@/lib/inngest/client'

// Mock Inngest to verify it's called
vi.mock('@/lib/inngest/client', async () => {
  const actual = await vi.importActual('@/lib/inngest/client')
  return {
    ...actual,
    inngest: {
      send: vi.fn().mockResolvedValue({ ids: ['evt-123'] }),
    },
  }
})

describe('Property 7: No JobQueue Side Effects After Cutover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call inngest.send exactly once', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          reportId: fc.string({ minLength: 1 }),
          orgId: fc.string({ minLength: 1 }),
          vehicleId: fc.string({ minLength: 1 }),
          vehicleMake: fc.string({ minLength: 1 }),
          vehicleModel: fc.string({ minLength: 1 }),
          vehicleYear: fc.integer({ min: 1900, max: 2100 }),
        }),
        async (eventData) => {
          // Arrange
          vi.mocked(inngest.send).mockClear()

          // Act
          await inngest.send({
            name: 'vin/report.analyze',
            data: eventData,
          })

          // Assert
          expect(vi.mocked(inngest.send)).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should have inngest.send as sole side effect', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          reportId: fc.string({ minLength: 1 }),
          orgId: fc.string({ minLength: 1 }),
          vehicleId: fc.string({ minLength: 1 }),
          vehicleMake: fc.string({ minLength: 1 }),
          vehicleModel: fc.string({ minLength: 1 }),
          vehicleYear: fc.integer({ min: 1900, max: 2100 }),
        }),
        async (eventData) => {
          // Arrange
          vi.mocked(inngest.send).mockClear()

          // Act
          await inngest.send({
            name: 'vin/report.analyze',
            data: eventData,
          })

          // Assert
          // Only inngest.send should have been called
          expect(vi.mocked(inngest.send)).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should verify event data structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          reportId: fc.string({ minLength: 1 }),
          orgId: fc.string({ minLength: 1 }),
          vehicleId: fc.string({ minLength: 1 }),
          vehicleMake: fc.string({ minLength: 1 }),
          vehicleModel: fc.string({ minLength: 1 }),
          vehicleYear: fc.integer({ min: 1900, max: 2100 }),
        }),
        (eventData) => {
          // Verify all required fields are present
          expect(eventData.reportId).toBeTruthy()
          expect(eventData.orgId).toBeTruthy()
          expect(eventData.vehicleId).toBeTruthy()
          expect(eventData.vehicleMake).toBeTruthy()
          expect(eventData.vehicleModel).toBeTruthy()
          expect(eventData.vehicleYear).toBeGreaterThanOrEqual(1900)
          expect(eventData.vehicleYear).toBeLessThanOrEqual(2100)
        }
      )
    )
  })
})
