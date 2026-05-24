// tests/orpc/routers/vin-upgrade-preservation.test.ts

// Mock Next.js server functions before any imports that use them
import '../../setup/next-server-mock'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { testDb, TestUtils } from '../../integration/setup'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'
import * as vinDecoder from '@/lib/services/vin-decoder'

/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * Property 2: Preservation — Non-Upgrade Paths Unchanged
 *
 * For any input where the bug condition does NOT hold (needsMarketCheckUpgrade returns false),
 * the code SHALL produce the expected behavior for each non-upgrade path:
 * - FREE_TIER/ZERO_CREDITS users always use decodeVinForTier(vin, tier) and never call decodeVinMarketCheck directly
 * - PAID users with existing MARKETCHECK records get cached data without calling any decoder
 * - PAID users with no cached record call decodeVinForTier(vin, 'PAID') for fresh decode
 *
 * EXPECTED: These tests PASS on unfixed code (non-upgrade paths are already correct)
 */
describe('Preservation: Non-Upgrade Paths Unchanged', () => {
  // Valid VIN character set (no I, O, Q)
  const validVinChars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')

  // Generator for valid 17-character VINs
  const validVinArb = fc
    .array(fc.constantFrom(...validVinChars), { minLength: 17, maxLength: 17 })
    .map((chars) => chars.join(''))

  // Generator for non-paid tiers
  const nonPaidTierArb = fc.constantFrom('FREE_TIER' as const, 'ZERO_CREDITS' as const)

  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>

  beforeEach(async () => {
    testUser = await TestUtils.createTestUser()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await TestUtils.cleanupUser(testUser.id)
  })

  /**
   * Property A: For all tier ∈ {FREE_TIER, ZERO_CREDITS} and any valid VIN,
   * the handler calls decodeVinForTier(vin, tier) and never calls decodeVinMarketCheck directly.
   *
   * **Validates: Requirements 3.2, 3.4**
   */
  describe('Property A: FREE_TIER/ZERO_CREDITS use decodeVinForTier, never decodeVinMarketCheck', () => {
    let freeOrg: Awaited<ReturnType<typeof testDb.organization.create>>
    let freeProject: Awaited<ReturnType<typeof testDb.project.create>>
    let zeroCreditsOrg: Awaited<ReturnType<typeof testDb.organization.create>>
    let zeroCreditsProject: Awaited<ReturnType<typeof testDb.project.create>>

    beforeEach(async () => {
      // FREE_TIER org: no credits, no subscription
      freeOrg = await testDb.organization.create({
        data: {
          name: 'Free Tier Org',
          slug: TestUtils.generateUniqueSlug('free-tier-org'),
          credits: 0,
          members: {
            create: {
              userId: testUser.id,
              role: 'OWNER',
            },
          },
        },
      })

      freeProject = await testDb.project.create({
        data: {
          name: 'Free Project',
          slug: TestUtils.generateUniqueSlug('free-project'),
          organizationId: freeOrg.id,
        },
      })

      // ZERO_CREDITS org: no credits, but has subscription history
      zeroCreditsOrg = await testDb.organization.create({
        data: {
          name: 'Zero Credits Org',
          slug: TestUtils.generateUniqueSlug('zero-credits-org'),
          credits: 0,
          members: {
            create: {
              userId: testUser.id,
              role: 'OWNER',
            },
          },
          subscription: {
            create: {
              stripeSubscriptionId: `sub_zero_${Date.now()}`,
              interval: 'month',
              status: 'active',
              planId: 'plan_test',
              currentPeriodStart: Math.floor(Date.now() / 1000),
              currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          },
        },
      })

      zeroCreditsProject = await testDb.project.create({
        data: {
          name: 'Zero Credits Project',
          slug: TestUtils.generateUniqueSlug('zero-credits-project'),
          organizationId: zeroCreditsOrg.id,
        },
      })
    })

    afterEach(async () => {
      // Clean up reports and vehicles
      await testDb.report.deleteMany({ where: { organizationId: freeOrg.id } })
      await testDb.report.deleteMany({ where: { organizationId: zeroCreditsOrg.id } })
      await testDb.project.deleteMany({ where: { organizationId: freeOrg.id } })
      await testDb.project.deleteMany({ where: { organizationId: zeroCreditsOrg.id } })
      await TestUtils.cleanupOrganization(freeOrg.id)
      await TestUtils.cleanupOrganization(zeroCreditsOrg.id)
    })

    it('FREE_TIER users call decodeVinForTier and never decodeVinMarketCheck directly', async () => {
      await fc.assert(
        fc.asyncProperty(validVinArb, async (vin) => {
          // Mock NHTSA decoder to return valid data
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
            vin,
            make: 'Toyota',
            model: 'Camry',
            year: 2022,
            trim: 'SE',
            engineDesc: '4-cylinder 2.5L',
            driveType: 'FWD',
            vehicleType: 'Sedan',
            manufacturer: 'Toyota Motor Corp',
            plantCity: 'Georgetown',
            plantCountry: 'USA',
            engineModel: 'A25A-FKS',
            engineCylinders: '4',
            fuelInjectionType: 'Direct Injection',
            fuelTypePrimary: 'Gasoline',
            fuelTypeSecondary: null,
            electrificationLevel: null,
            turbo: 'No',
          })

          // Spy on decodeVinMarketCheck to verify it's NOT called
          const marketCheckSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

          // Spy on decodeVinForTier to verify it IS called
          const decodeForTierSpy = vi.spyOn(vinDecoder, 'decodeVinForTier')

          // Ensure no cached vehicle exists for this VIN
          await testDb.vehicle.deleteMany({ where: { vin } })

          const context = {
            db: testDb,
            user: testUser as any,
            orgId: freeOrg.id,
            role: 'OWNER' as const,
          }
          const client = createRouterClient({ vin: vinRouter }, { context })

          const result = await client.vin.analyze({ vin, projectId: freeProject.id })

          // Assert: decodeVinForTier was called with the correct tier
          expect(decodeForTierSpy).toHaveBeenCalledWith(vin, 'FREE_TIER')

          // Assert: decodeVinMarketCheck was NOT called directly by the router
          expect(marketCheckSpy).not.toHaveBeenCalled()

          // Assert: result has NHTSA-only data
          expect(result.vehicle.decoderSource).toBe('NHTSA')
          expect(result.status).toBe('FREE_PREVIEW')

          // Cleanup for next iteration
          vi.clearAllMocks()
        }),
        { numRuns: 2 }
      )
    }, 60000)

    it('ZERO_CREDITS users call decodeVinForTier and never decodeVinMarketCheck directly', async () => {
      await fc.assert(
        fc.asyncProperty(validVinArb, async (vin) => {
          // Mock NHTSA decoder to return valid data
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
            vin,
            make: 'Ford',
            model: 'F-150',
            year: 2023,
            trim: 'XLT',
            engineDesc: 'V6 3.5L EcoBoost',
            driveType: '4WD',
            vehicleType: 'Truck',
            manufacturer: 'Ford Motor Company',
            plantCity: 'Dearborn',
            plantCountry: 'USA',
            engineModel: 'EcoBoost 3.5',
            engineCylinders: '6',
            fuelInjectionType: 'Turbocharged Direct Injection',
            fuelTypePrimary: 'Gasoline',
            fuelTypeSecondary: null,
            electrificationLevel: null,
            turbo: 'Yes',
          })

          // Spy on decodeVinMarketCheck to verify it's NOT called
          const marketCheckSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

          // Spy on decodeVinForTier to verify it IS called
          const decodeForTierSpy = vi.spyOn(vinDecoder, 'decodeVinForTier')

          // Ensure no cached vehicle exists for this VIN
          await testDb.vehicle.deleteMany({ where: { vin } })

          const context = {
            db: testDb,
            user: testUser as any,
            orgId: zeroCreditsOrg.id,
            role: 'OWNER' as const,
          }
          const client = createRouterClient({ vin: vinRouter }, { context })

          const result = await client.vin.analyze({ vin, projectId: zeroCreditsProject.id })

          // Assert: decodeVinForTier was called with the correct tier
          expect(decodeForTierSpy).toHaveBeenCalledWith(vin, 'ZERO_CREDITS')

          // Assert: decodeVinMarketCheck was NOT called directly by the router
          expect(marketCheckSpy).not.toHaveBeenCalled()

          // Assert: result has NHTSA-only data
          expect(result.vehicle.decoderSource).toBe('NHTSA')

          // Cleanup for next iteration
          await testDb.report.deleteMany({ where: { vehicle: { vin } } })
          await testDb.vehicle.deleteMany({ where: { vin } })
          vi.clearAllMocks()
        }),
        { numRuns: 2 }
      )
    }, 60000)
  })

  /**
   * Property B: For all PAID users with existingVehicle.decoderSource = 'MARKETCHECK',
   * the handler returns cached vehicle data without calling any decoder function.
   *
   * **Validates: Requirements 3.1**
   */
  describe('Property B: PAID users with MARKETCHECK cache hit skip all decoders', () => {
    let paidOrg: Awaited<ReturnType<typeof testDb.organization.create>>
    let paidProject: Awaited<ReturnType<typeof testDb.project.create>>

    beforeEach(async () => {
      paidOrg = await testDb.organization.create({
        data: {
          name: 'Paid Org Cache Hit',
          slug: TestUtils.generateUniqueSlug('paid-org-cache'),
          credits: 50,
          members: {
            create: {
              userId: testUser.id,
              role: 'OWNER',
            },
          },
          subscription: {
            create: {
              stripeSubscriptionId: `sub_paid_cache_${Date.now()}`,
              interval: 'month',
              status: 'active',
              planId: 'plan_test',
              currentPeriodStart: Math.floor(Date.now() / 1000),
              currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          },
        },
      })

      paidProject = await testDb.project.create({
        data: {
          name: 'Paid Cache Project',
          slug: TestUtils.generateUniqueSlug('paid-cache-project'),
          organizationId: paidOrg.id,
        },
      })
    })

    afterEach(async () => {
      await testDb.report.deleteMany({ where: { organizationId: paidOrg.id } })
      await testDb.project.deleteMany({ where: { organizationId: paidOrg.id } })
      await TestUtils.cleanupOrganization(paidOrg.id)
    })

    it('PAID users with existing MARKETCHECK record return cached data without calling decoders', async () => {
      await fc.assert(
        fc.asyncProperty(validVinArb, async (vin) => {
          // Seed a cached MARKETCHECK vehicle record
          await testDb.vehicle.upsert({
            where: { vin },
            update: {
              decoderSource: 'MARKETCHECK',
              make: 'BMW',
              model: 'X5',
              year: 2023,
            },
            create: {
              vin,
              make: 'BMW',
              model: 'X5',
              year: 2023,
              trim: 'xDrive40i',
              engineDesc: 'I6 3.0L Turbo',
              driveType: 'AWD',
              vehicleType: 'SUV',
              manufacturer: 'BMW AG',
              plantCity: 'Spartanburg',
              plantCountry: 'USA',
              engineModel: 'B58B30',
              engineCylinders: '6',
              fuelInjectionType: 'Direct Injection',
              fuelTypePrimary: 'Gasoline',
              fuelTypeSecondary: null,
              electrificationLevel: null,
              turbo: 'Yes',
              bodyType: null,

              bodySubtype: 'SUV',
              transmission: 'Automatic 8-Speed',
              doors: 4,
              engineSize: 3.0,
              cylinders: 6,
              overallHeight: 68.7,
              overallLength: 194.3,
              overallWidth: 78.9,
              stdSeating: 5,
              highwayMpg: 27,
              cityMpg: 21,
              powertrainType: 'ICE',
              decoderSource: 'MARKETCHECK',
            },
          })

          // Spy on decoders to verify they are NOT called
          const nhtsaSpy = vi.spyOn(nhtsaDecoder, 'decodeVin')
          const marketCheckSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')
          const decodeForTierSpy = vi.spyOn(vinDecoder, 'decodeVinForTier')

          const context = {
            db: testDb,
            user: testUser as any,
            orgId: paidOrg.id,
            role: 'OWNER' as const,
          }
          const client = createRouterClient({ vin: vinRouter }, { context })

          const result = await client.vin.analyze({ vin, projectId: paidProject.id })

          // Assert: no decoder functions were called (cache hit)
          expect(nhtsaSpy).not.toHaveBeenCalled()
          expect(marketCheckSpy).not.toHaveBeenCalled()
          expect(decodeForTierSpy).not.toHaveBeenCalled()

          // Assert: result uses cached MARKETCHECK data
          expect(result.vehicle.decoderSource).toBe('MARKETCHECK')
          expect(result.vehicle.make).toBe('BMW')
          expect(result.vehicle.model).toBe('X5')

          // Cleanup for next iteration
          await testDb.report.deleteMany({ where: { vehicle: { vin } } })
          await testDb.vehicle.deleteMany({ where: { vin } })
          vi.clearAllMocks()
        }),
        { numRuns: 2 }
      )
    }, 60000)
  })

  /**
   * Property C: For all PAID users with existingVehicle = null (no cached record),
   * the handler calls decodeVinForTier(vin, 'PAID') for a fresh decode.
   *
   * **Validates: Requirements 3.3**
   */
  describe('Property C: PAID users with no cached record call decodeVinForTier(vin, PAID)', () => {
    let paidOrg: Awaited<ReturnType<typeof testDb.organization.create>>
    let paidProject: Awaited<ReturnType<typeof testDb.project.create>>

    beforeEach(async () => {
      paidOrg = await testDb.organization.create({
        data: {
          name: 'Paid Org Fresh',
          slug: TestUtils.generateUniqueSlug('paid-org-fresh'),
          credits: 50,
          members: {
            create: {
              userId: testUser.id,
              role: 'OWNER',
            },
          },
          subscription: {
            create: {
              stripeSubscriptionId: `sub_paid_fresh_${Date.now()}`,
              interval: 'month',
              status: 'active',
              planId: 'plan_test',
              currentPeriodStart: Math.floor(Date.now() / 1000),
              currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          },
        },
      })

      paidProject = await testDb.project.create({
        data: {
          name: 'Paid Fresh Project',
          slug: TestUtils.generateUniqueSlug('paid-fresh-project'),
          organizationId: paidOrg.id,
        },
      })
    })

    afterEach(async () => {
      await testDb.report.deleteMany({ where: { organizationId: paidOrg.id } })
      await testDb.project.deleteMany({ where: { organizationId: paidOrg.id } })
      await TestUtils.cleanupOrganization(paidOrg.id)
    })

    it('PAID users with no cached record call decodeVinForTier(vin, PAID)', async () => {
      await fc.assert(
        fc.asyncProperty(validVinArb, async (vin) => {
          // Ensure no cached vehicle exists for this VIN
          await testDb.report.deleteMany({ where: { vehicle: { vin } } })
          await testDb.vehicle.deleteMany({ where: { vin } })

          // Mock NHTSA decoder (called internally by decodeVinForTier)
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
            vin,
            make: 'Tesla',
            model: 'Model 3',
            year: 2024,
            trim: 'Long Range',
            engineDesc: 'Electric Motor',
            driveType: 'AWD',
            vehicleType: 'Sedan',
            manufacturer: 'Tesla Inc',
            plantCity: 'Fremont',
            plantCountry: 'USA',
            engineModel: 'Electric',
            engineCylinders: null,
            fuelInjectionType: null,
            fuelTypePrimary: 'Electric',
            fuelTypeSecondary: null,
            electrificationLevel: 'BEV',
            turbo: null,
          })

          // Mock MarketCheck decoder (called internally by decodeVinForTier for PAID tier)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue({
            vin,
            make: 'Tesla',
            model: 'Model 3',
            year: 2024,
            trim: 'Long Range',
            engineDesc: 'Electric Motor',
            driveType: 'AWD',
            vehicleType: 'Sedan',
            manufacturer: null,
            plantCity: null,
            plantCountry: 'USA',
            engineModel: null,
            engineCylinders: null,
            fuelInjectionType: null,
            fuelTypePrimary: 'Electric',
            fuelTypeSecondary: null,
            electrificationLevel: null,
            turbo: null,
            bodyType: null,

            bodySubtype: 'Sedan',
            transmission: 'Single-Speed',
            doors: 4,
            engineSize: null,
            cylinders: null,
            overallHeight: 56.8,
            overallLength: 184.8,
            overallWidth: 72.8,
            stdSeating: 5,
            highwayMpg: 132,
            cityMpg: 138,
            powertrainType: 'BEV',
            decoderSource: 'MARKETCHECK',
          })

          // Spy on decodeVinForTier to verify it IS called with 'PAID'
          const decodeForTierSpy = vi.spyOn(vinDecoder, 'decodeVinForTier')

          const context = {
            db: testDb,
            user: testUser as any,
            orgId: paidOrg.id,
            role: 'OWNER' as const,
          }
          const client = createRouterClient({ vin: vinRouter }, { context })

          const result = await client.vin.analyze({ vin, projectId: paidProject.id })

          // Assert: decodeVinForTier was called with 'PAID'
          expect(decodeForTierSpy).toHaveBeenCalledWith(vin, 'PAID')

          // Assert: result has merged data (NHTSA base + MarketCheck premium)
          expect(result.vehicle.decoderSource).toBe('MARKETCHECK')
          // NHTSA-exclusive fields should be populated (from NHTSA via decodeVinForTier)
          expect(result.vehicle.manufacturer).toBe('Tesla Inc')
          expect(result.vehicle.plantCity).toBe('Fremont')
          expect(result.vehicle.engineModel).toBe('Electric')

          // Cleanup for next iteration
          await testDb.report.deleteMany({ where: { vehicle: { vin } } })
          await testDb.vehicle.deleteMany({ where: { vin } })
          vi.clearAllMocks()
        }),
        { numRuns: 2 }
      )
    }, 60000)
  })
})
