// tests/orpc/routers/vin-upgrade-bug.test.ts

// Mock Next.js server functions before any imports that use them
import '../../setup/next-server-mock'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { testDb, TestUtils } from '../../integration/setup'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'
import type { MarketCheckVehicleData } from '@/lib/services/marketcheck-decoder'

/**
 * Bug Condition Exploration Property Test
 *
 * **Validates: Requirements 1.1, 2.1, 2.2**
 *
 * Property 1: Bug Condition — NHTSA-Exclusive Fields Null in Upgrade Path
 *
 * For any PAID user with a cached NHTSA-only record (needsMarketCheckUpgrade = true),
 * the upgrade path SHALL produce vehicle data with NHTSA-exclusive fields populated:
 * - manufacturer IS NOT NULL
 * - turbo IS NOT NULL
 * - plantCity IS NOT NULL
 * - engineModel IS NOT NULL
 *
 * EXPECTED: This test FAILS on unfixed code because the buggy upgrade path calls
 * decodeVinMarketCheck directly, which returns null for NHTSA-exclusive fields.
 */
describe('Bug Condition: NHTSA-Exclusive Fields in Upgrade Path', () => {
  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>
  let testOrg: Awaited<ReturnType<typeof testDb.organization.create>>
  let testProject: Awaited<ReturnType<typeof testDb.project.create>>

  // Valid VIN character set (no I, O, Q)
  const validVinChars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')

  // Generator for valid 17-character VINs
  const validVinArb = fc
    .array(fc.constantFrom(...validVinChars), { minLength: 17, maxLength: 17 })
    .map((chars) => chars.join(''))

  beforeEach(async () => {
    testUser = await TestUtils.createTestUser()

    testOrg = await testDb.organization.create({
      data: {
        name: 'Bug Test Org',
        slug: TestUtils.generateUniqueSlug('bug-test-org'),
        credits: 50,
        members: {
          create: {
            userId: testUser.id,
            role: 'OWNER',
          },
        },
        subscription: {
          create: {
            stripeSubscriptionId: `sub_test_${Date.now()}`,
            interval: 'month',
            status: 'active',
            planId: 'plan_test',
            currentPeriodStart: Math.floor(Date.now() / 1000),
            currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        },
      },
    })

    testProject = await testDb.project.create({
      data: {
        name: 'Bug Test Project',
        slug: TestUtils.generateUniqueSlug('bug-test-project'),
        organizationId: testOrg.id,
      },
    })
  })

  afterEach(async () => {
    vi.restoreAllMocks()

    // Clean up reports, vehicles, project, org, user
    await testDb.report.deleteMany({ where: { organizationId: testOrg.id } })
    await testDb.vehicle.deleteMany({
      where: {
        reports: { some: { organizationId: testOrg.id } },
      },
    })
    await testDb.project.deleteMany({ where: { id: testProject.id } })
    await TestUtils.cleanupOrganization(testOrg.id)
    await TestUtils.cleanupUser(testUser.id)
  })

  it('NHTSA-exclusive fields are non-null when upgrade path triggers (bug condition)', async () => {
    await fc.assert(
      fc.asyncProperty(validVinArb, async (vin) => {
        // --- Setup: seed a cached NHTSA-only vehicle record for this VIN ---
        await testDb.vehicle.upsert({
          where: { vin },
          update: {
            decoderSource: 'NHTSA',
            manufacturer: 'Honda',
            turbo: 'No',
            plantCity: 'Marysville',
            engineModel: 'K24W1',
          },
          create: {
            vin,
            make: 'Honda',
            model: 'Accord',
            year: 2021,
            decoderSource: 'NHTSA',
            manufacturer: 'Honda',
            turbo: 'No',
            plantCity: 'Marysville',
            plantCountry: 'USA',
            engineModel: 'K24W1',
            engineCylinders: '4',
            fuelInjectionType: 'Sequential MPI',
            fuelTypePrimary: 'Gasoline',
            fuelTypeSecondary: null,
            electrificationLevel: null,
          },
        })

        // Mock NHTSA decoder — returns full data including NHTSA-exclusive fields
        vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
          vin,
          make: 'Honda',
          model: 'Accord',
          year: 2021,
          trim: 'EX-L',
          engineDesc: '4-cylinder K24W1 Sequential MPI Gasoline',
          driveType: 'FWD',
          vehicleType: 'Sedan',
          manufacturer: 'Honda Motor Company',
          plantCity: 'Marysville',
          plantCountry: 'USA',
          engineModel: 'K24W1',
          engineCylinders: '4',
          fuelInjectionType: 'Sequential MPI',
          fuelTypePrimary: 'Gasoline',
          fuelTypeSecondary: null,
          electrificationLevel: null,
          turbo: 'No',
        })

        // Mock MarketCheck decoder — returns premium fields but NHTSA-exclusive fields are null
        // This is the REAL MarketCheck behavior: it does NOT provide manufacturer, plantCity, etc.
        vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue({
          vin,
          make: 'Honda',
          model: 'Accord',
          year: 2021,
          trim: 'EX-L',
          engineDesc: '2.0L I4',
          driveType: 'FWD',
          vehicleType: 'Sedan',
          // NHTSA-exclusive fields are NULL from MarketCheck
          manufacturer: null,
          plantCity: null,
          plantCountry: 'USA',
          engineModel: null,
          engineCylinders: '4',
          fuelInjectionType: null,
          fuelTypePrimary: 'Gasoline',
          fuelTypeSecondary: null,
          electrificationLevel: null,
          turbo: null,
          // Premium fields populated by MarketCheck
          bodyType: null,

          bodySubtype: 'Sedan',
          transmission: 'Automatic CVT',
          doors: 4,
          engineSize: 2.0,
          cylinders: 4,
          overallHeight: 57.1,
          overallLength: 192.2,
          overallWidth: 73.3,
          stdSeating: 5,
          highwayMpg: 34,
          cityMpg: 26,
          powertrainType: 'ICE',
          decoderSource: 'MARKETCHECK',
        } satisfies MarketCheckVehicleData)

        // Create router client with PAID user context
        const context = {
          db: testDb,
          user: testUser as any,
          orgId: testOrg.id,
          role: 'OWNER' as const,
        }
        const client = createRouterClient({ vin: vinRouter }, { context })

        // --- Act: invoke the analyze handler (triggers upgrade path) ---
        const result = await client.vin.analyze({
          vin,
          projectId: testProject.id,
        })

        // --- Assert: NHTSA-exclusive fields MUST be non-null ---
        // On unfixed code, these will be null because decodeVinMarketCheck is called directly
        expect(result.vehicle.manufacturer).not.toBeNull()
        expect(result.vehicle.turbo).not.toBeNull()
        expect(result.vehicle.plantCity).not.toBeNull()
        expect(result.vehicle.engineModel).not.toBeNull()

        // Cleanup for next iteration
        await testDb.report.deleteMany({ where: { vehicle: { vin } } })
        await testDb.vehicle.deleteMany({ where: { vin } })
      }),
      { numRuns: 2 } // 2 random VINs to demonstrate the bug
    )
  }, 60000)
})
