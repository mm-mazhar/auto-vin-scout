// tests/integration/inngest-event-schema.property.test.ts
// Property-based test for event payload schema completeness (Property 1)
//
// Validates: Requirements 2.1, 2.3
//
// Property: For any combination of valid reportId, orgId, vehicleId, vehicleMake,
// vehicleModel, and vehicleYear values, the constructed vin/report.analyze event
// payload SHALL satisfy the InngestEvents['vin/report.analyze'] schema — and any
// payload missing a required field or containing a field of the wrong type SHALL
// be rejected by the schema validator.

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { analyzeReportEventSchema, type AnalyzeReportEventData } from '@/lib/inngest/events'

describe('Property 1: Event Payload Schema Completeness', () => {
  // Generators for valid event payload fields
  const reportIdArb = fc.string({ minLength: 1, maxLength: 100 })
  const orgIdArb = fc.string({ minLength: 1, maxLength: 100 })
  const vehicleIdArb = fc.string({ minLength: 1, maxLength: 100 })
  const vehicleMakeArb = fc.string({ minLength: 1, maxLength: 50 })
  const vehicleModelArb = fc.string({ minLength: 1, maxLength: 50 })
  const vehicleYearArb = fc.integer({ min: 1900, max: 2100 })

  const validPayloadArb = fc.record({
    reportId: reportIdArb,
    orgId: orgIdArb,
    vehicleId: vehicleIdArb,
    vehicleMake: vehicleMakeArb,
    vehicleModel: vehicleModelArb,
    vehicleYear: vehicleYearArb,
  })

  it('should accept all valid payloads that satisfy the schema', () => {
    fc.assert(
      fc.property(validPayloadArb, (payload) => {
        const result = analyzeReportEventSchema.safeParse(payload)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(payload)
        }
      })
    )
  })

  it('should reject payloads with missing reportId', () => {
    fc.assert(
      fc.property(
        fc.record({
          orgId: orgIdArb,
          vehicleId: vehicleIdArb,
          vehicleMake: vehicleMakeArb,
          vehicleModel: vehicleModelArb,
          vehicleYear: vehicleYearArb,
        }),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with missing orgId', () => {
    fc.assert(
      fc.property(
        fc.record({
          reportId: reportIdArb,
          vehicleId: vehicleIdArb,
          vehicleMake: vehicleMakeArb,
          vehicleModel: vehicleModelArb,
          vehicleYear: vehicleYearArb,
        }),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with missing vehicleId', () => {
    fc.assert(
      fc.property(
        fc.record({
          reportId: reportIdArb,
          orgId: orgIdArb,
          vehicleMake: vehicleMakeArb,
          vehicleModel: vehicleModelArb,
          vehicleYear: vehicleYearArb,
        }),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with missing vehicleMake', () => {
    fc.assert(
      fc.property(
        fc.record({
          reportId: reportIdArb,
          orgId: orgIdArb,
          vehicleId: vehicleIdArb,
          vehicleModel: vehicleModelArb,
          vehicleYear: vehicleYearArb,
        }),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with missing vehicleModel', () => {
    fc.assert(
      fc.property(
        fc.record({
          reportId: reportIdArb,
          orgId: orgIdArb,
          vehicleId: vehicleIdArb,
          vehicleMake: vehicleMakeArb,
          vehicleYear: vehicleYearArb,
        }),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with missing vehicleYear', () => {
    fc.assert(
      fc.property(
        fc.record({
          reportId: reportIdArb,
          orgId: orgIdArb,
          vehicleId: vehicleIdArb,
          vehicleMake: vehicleMakeArb,
          vehicleModel: vehicleModelArb,
        }),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with empty string fields', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            reportId: fc.constant(''),
            orgId: orgIdArb,
            vehicleId: vehicleIdArb,
            vehicleMake: vehicleMakeArb,
            vehicleModel: vehicleModelArb,
            vehicleYear: vehicleYearArb,
          }),
          fc.record({
            reportId: reportIdArb,
            orgId: fc.constant(''),
            vehicleId: vehicleIdArb,
            vehicleMake: vehicleMakeArb,
            vehicleModel: vehicleModelArb,
            vehicleYear: vehicleYearArb,
          }),
          fc.record({
            reportId: reportIdArb,
            orgId: orgIdArb,
            vehicleId: fc.constant(''),
            vehicleMake: vehicleMakeArb,
            vehicleModel: vehicleModelArb,
            vehicleYear: vehicleYearArb,
          }),
          fc.record({
            reportId: reportIdArb,
            orgId: orgIdArb,
            vehicleId: vehicleIdArb,
            vehicleMake: fc.constant(''),
            vehicleModel: vehicleModelArb,
            vehicleYear: vehicleYearArb,
          }),
          fc.record({
            reportId: reportIdArb,
            orgId: orgIdArb,
            vehicleId: vehicleIdArb,
            vehicleMake: vehicleMakeArb,
            vehicleModel: fc.constant(''),
            vehicleYear: vehicleYearArb,
          })
        ),
        (payload) => {
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with vehicleYear outside valid range', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 1899 }),
          fc.integer({ min: 2101 })
        ),
        (invalidYear) => {
          const payload = {
            reportId: 'report-123',
            orgId: 'org-456',
            vehicleId: 'vehicle-789',
            vehicleMake: 'Honda',
            vehicleModel: 'Civic',
            vehicleYear: invalidYear,
          }
          const result = analyzeReportEventSchema.safeParse(payload)
          expect(result.success).toBe(false)
        }
      )
    )
  })

  it('should reject payloads with non-integer vehicleYear', () => {
    fc.assert(
      fc.property(fc.float(), (floatYear) => {
        // Skip if it's already an integer
        if (Number.isInteger(floatYear)) {
          return true
        }

        const payload = {
          reportId: 'report-123',
          orgId: 'org-456',
          vehicleId: 'vehicle-789',
          vehicleMake: 'Honda',
          vehicleModel: 'Civic',
          vehicleYear: floatYear,
        }
        const result = analyzeReportEventSchema.safeParse(payload)
        expect(result.success).toBe(false)
        return true
      })
    )
  })

  it('should reject payloads with wrong type for reportId', () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean()), (invalidReportId) => {
        const payload = {
          reportId: invalidReportId,
          orgId: 'org-456',
          vehicleId: 'vehicle-789',
          vehicleMake: 'Honda',
          vehicleModel: 'Civic',
          vehicleYear: 2020,
        }
        const result = analyzeReportEventSchema.safeParse(payload)
        expect(result.success).toBe(false)
        return true
      })
    )
  })

  it('should reject payloads with wrong type for vehicleYear', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.boolean()), (invalidYear) => {
        const payload = {
          reportId: 'report-123',
          orgId: 'org-456',
          vehicleId: 'vehicle-789',
          vehicleMake: 'Honda',
          vehicleModel: 'Civic',
          vehicleYear: invalidYear,
        }
        const result = analyzeReportEventSchema.safeParse(payload)
        expect(result.success).toBe(false)
        return true
      })
    )
  })
})
