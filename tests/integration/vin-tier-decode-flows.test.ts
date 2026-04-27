// tests/integration/vin-tier-decode-flows.test.ts

// Mock Next.js server functions before any imports that use them
import '../setup/next-server-mock'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { testDb, TestUtils } from './setup'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'

const VALID_VIN = '1FTFW1E84MFA12345'

const mockNHTSAData = {
  vin: VALID_VIN,
  make: 'Ford',
  model: 'F-150',
  year: 2021,
  trim: 'XL',
  engine: '2.7L V6',
  driveType: '4WD',
  vehicleType: 'Truck',
  manufacturer: 'Ford Motor Company',
  plantCity: 'Dearborn',
  plantCountry: 'USA',
  engineModel: 'EcoBoost',
  engineCylinders: '6',
  fuelInjectionType: null,
  fuelTypePrimary: 'Gasoline',
  fuelTypeSecondary: null,
  electrificationLevel: null,
}

const mockMarketCheckData = {
  ...mockNHTSAData,
  bodySubtype: 'Crew',
  transmission: 'Automatic',
  doors: 4,
  engineSize: 2.7,
  cylinders: 6,
  overallHeight: 77.2,
  overallLength: 231.9,
  overallWidth: 79.9,
  stdSeating: 6,
  highwayMpg: 27,
  cityMpg: 24,
  powertrainType: 'Combustion',
  decoderSource: 'MARKETCHECK' as const,
}

describe('VIN Router - Tier-Based Decode Flows', () => {
  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>
  let testOrg: Awaited<ReturnType<typeof testDb.organization.create>>
  let testProject: Awaited<ReturnType<typeof testDb.project.create>>

  async function createContext(orgId: string) {
    return {
      db: testDb,
      user: testUser as any,
      orgId,
      role: 'OWNER' as const,
    }
  }

  beforeEach(async () => {
    testUser = await TestUtils.createTestUser()
    testProject = null as any
    testOrg = null as any
  })

  afterEach(async () => {
    await testDb.report.deleteMany({})
    await testDb.vehicle.deleteMany({ where: { vin: VALID_VIN } })
    if (testProject?.id) {
      await testDb.project.deleteMany({ where: { id: testProject.id } })
    }
    if (testOrg?.id) {
      await TestUtils.cleanupOrganization(testOrg.id)
    }
    await TestUtils.cleanupUser(testUser.id)
    vi.restoreAllMocks()
  })

  describe('FREE_TIER flow', () => {
    it('Test 1: FREE_TIER user receives NHTSA data without DB save', async () => {
      // #given: Organization with 0 credits and no subscription (FREE_TIER)
      testOrg = await testDb.organization.create({
        data: {
          name: 'Free Org',
          slug: TestUtils.generateUniqueSlug('free-org'),
          credits: 0,
          members: { create: { userId: testUser.id, role: 'OWNER' } },
        },
      })
      testProject = await testDb.project.create({
        data: { name: 'Free Proj', slug: 'free-proj', organizationId: testOrg.id },
      })

      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

      const client = createRouterClient({ vin: vinRouter }, { context: await createContext(testOrg.id) })

      // #when: Analyze VIN
      const result = await client.vin.analyze({ vin: VALID_VIN, projectId: testProject.id })

      // #then: Should return preview with no DB save
      expect(result.isPreview).toBe(true)
      expect(result.reportId).toBeNull()
      expect(result.status).toBe('FREE_PREVIEW')
      expect(result.vehicle.decoderSource).toBe('NHTSA')

      // #then: No vehicle or report saved to DB
      const vehicle = await testDb.vehicle.findUnique({ where: { vin: VALID_VIN } })
      expect(vehicle).toBeNull()

      // #then: MarketCheck was never called
      expect(marketcheckDecoder.decodeVinMarketCheck).not.toHaveBeenCalled()
    })
  })

  describe('PAID tier flow', () => {
    it('Test 2: PAID user receives MarketCheck data with DB save', async () => {
      // #given: Organization with credits > 0 (PAID tier)
      testOrg = await testDb.organization.create({
        data: {
          name: 'Paid Org',
          slug: TestUtils.generateUniqueSlug('paid-org'),
          credits: 5,
          members: { create: { userId: testUser.id, role: 'OWNER' } },
        },
      })
      testProject = await testDb.project.create({
        data: { name: 'Paid Proj', slug: 'paid-proj', organizationId: testOrg.id },
      })

      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckData)

      const client = createRouterClient({ vin: vinRouter }, { context: await createContext(testOrg.id) })

      // #when: Analyze VIN
      const result = await client.vin.analyze({ vin: VALID_VIN, projectId: testProject.id })

      // #then: Should return full report (not preview)
      expect(result.isPreview).toBe(false)
      expect(result.reportId).toBeDefined()
      expect(result.status).toBe('PENDING')

      // #then: Vehicle saved with premium fields
      const vehicle = await testDb.vehicle.findUnique({ where: { vin: VALID_VIN } })
      expect(vehicle).toBeDefined()
      expect(vehicle?.decoderSource).toBe('MARKETCHECK')
      expect(vehicle?.bodySubtype).toBe('Crew')
      expect(vehicle?.transmission).toBe('Automatic')
      expect(vehicle?.doors).toBe(4)
      expect(vehicle?.engineSize).toBe(2.7)
      expect(vehicle?.cylinders).toBe(6)
      expect(vehicle?.highwayMpg).toBe(27)
      expect(vehicle?.cityMpg).toBe(24)

      // #then: Credit deducted
      const updatedOrg = await testDb.organization.findUnique({ where: { id: testOrg.id } })
      expect(updatedOrg?.credits).toBe(4)
    })

    it('Test 3: PAID user receives NHTSA data when MarketCheck fails', async () => {
      // #given: Organization with credits > 0, MarketCheck fails
      testOrg = await testDb.organization.create({
        data: {
          name: 'Paid Org 2',
          slug: TestUtils.generateUniqueSlug('paid-org-2'),
          credits: 5,
          members: { create: { userId: testUser.id, role: 'OWNER' } },
        },
      })
      testProject = await testDb.project.create({
        data: { name: 'Paid Proj 2', slug: 'paid-proj-2', organizationId: testOrg.id },
      })

      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)

      const client = createRouterClient({ vin: vinRouter }, { context: await createContext(testOrg.id) })

      // #when: Analyze VIN
      const result = await client.vin.analyze({ vin: VALID_VIN, projectId: testProject.id })

      // #then: Should return full report with NHTSA fallback
      expect(result.isPreview).toBe(false)
      expect(result.reportId).toBeDefined()
      expect(result.vehicle.decoderSource).toBe('NHTSA_FALLBACK')

      // #then: Vehicle saved with NHTSA_FALLBACK source, premium fields null
      const vehicle = await testDb.vehicle.findUnique({ where: { vin: VALID_VIN } })
      expect(vehicle?.decoderSource).toBe('NHTSA_FALLBACK')
      expect(vehicle?.bodySubtype).toBeNull()
      expect(vehicle?.transmission).toBeNull()
      expect(vehicle?.doors).toBeNull()

      // #then: Credit still deducted (fallback still counts as a report)
      const updatedOrg = await testDb.organization.findUnique({ where: { id: testOrg.id } })
      expect(updatedOrg?.credits).toBe(4)
    })
  })

  describe('ZERO_CREDITS flow', () => {
    it('Test 4: ZERO_CREDITS user gets NHTSA data saved to DB', async () => {
      // #given: Organization with 0 credits but active subscription (ZERO_CREDITS)
      testOrg = await testDb.organization.create({
        data: {
          name: 'Zero Org',
          slug: TestUtils.generateUniqueSlug('zero-org'),
          credits: 0,
          members: { create: { userId: testUser.id, role: 'OWNER' } },
          subscription: {
            create: {
              stripeSubscriptionId: `sub_test_${Date.now()}`,
              interval: 'month',
              status: 'active',
              planId: 'pro_plan',
              currentPeriodStart: Math.floor(Date.now() / 1000),
              currentPeriodEnd: Math.floor(Date.now() / 1000) + 2592000,
            },
          },
        },
      })
      testProject = await testDb.project.create({
        data: { name: 'Zero Proj', slug: 'zero-proj', organizationId: testOrg.id },
      })

      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

      const client = createRouterClient({ vin: vinRouter }, { context: await createContext(testOrg.id) })

      // #when: Analyze VIN
      const result = await client.vin.analyze({ vin: VALID_VIN, projectId: testProject.id })

      // #then: Should save to DB with ZERO_CREDITS status
      expect(result.isPreview).toBe(true)
      expect(result.reportId).toBeDefined()
      expect(result.status).toBe('ZERO_CREDITS')
      expect(result.vehicle.decoderSource).toBe('NHTSA')

      // #then: Vehicle saved to DB
      const vehicle = await testDb.vehicle.findUnique({ where: { vin: VALID_VIN } })
      expect(vehicle).toBeDefined()
      expect(vehicle?.decoderSource).toBe('NHTSA')

      // #then: MarketCheck was never called
      expect(marketcheckDecoder.decodeVinMarketCheck).not.toHaveBeenCalled()

      // Cleanup subscription
      await testDb.subscription.deleteMany({ where: { organizationId: testOrg.id } })
    })
  })

  describe('Premium fields persistence', () => {
    it('Test 5: Premium fields correctly saved and retrieved from database', async () => {
      // #given: PAID tier org
      testOrg = await testDb.organization.create({
        data: {
          name: 'Premium Org',
          slug: TestUtils.generateUniqueSlug('premium-org'),
          credits: 5,
          members: { create: { userId: testUser.id, role: 'OWNER' } },
        },
      })
      testProject = await testDb.project.create({
        data: { name: 'Premium Proj', slug: 'premium-proj', organizationId: testOrg.id },
      })

      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckData)

      const client = createRouterClient({ vin: vinRouter }, { context: await createContext(testOrg.id) })
      await client.vin.analyze({ vin: VALID_VIN, projectId: testProject.id })

      // #when: Retrieve vehicle from DB
      const vehicle = await testDb.vehicle.findUnique({ where: { vin: VALID_VIN } })

      // #then: All premium fields should be persisted correctly
      expect(vehicle?.bodySubtype).toBe('Crew')
      expect(vehicle?.transmission).toBe('Automatic')
      expect(vehicle?.doors).toBe(4)
      expect(vehicle?.engineSize).toBe(2.7)
      expect(vehicle?.cylinders).toBe(6)
      expect(vehicle?.overallHeight).toBe(77.2)
      expect(vehicle?.overallLength).toBe(231.9)
      expect(vehicle?.overallWidth).toBe(79.9)
      expect(vehicle?.stdSeating).toBe(6)
      expect(vehicle?.highwayMpg).toBe(27)
      expect(vehicle?.cityMpg).toBe(24)
      expect(vehicle?.powertrainType).toBe('Combustion')
      expect(vehicle?.decoderSource).toBe('MARKETCHECK')
    })

    it('Test 6: Existing vehicle record updated with premium fields on re-decode', async () => {
      // #given: Vehicle already exists with NHTSA data
      const existingVehicle = await testDb.vehicle.create({
        data: {
          vin: VALID_VIN,
          make: 'Ford',
          model: 'F-150',
          year: 2021,
          decoderSource: 'NHTSA',
        },
      })

      testOrg = await testDb.organization.create({
        data: {
          name: 'Update Org',
          slug: TestUtils.generateUniqueSlug('update-org'),
          credits: 5,
          members: { create: { userId: testUser.id, role: 'OWNER' } },
        },
      })
      testProject = await testDb.project.create({
        data: { name: 'Update Proj', slug: 'update-proj', organizationId: testOrg.id },
      })

      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckData)

      const client = createRouterClient({ vin: vinRouter }, { context: await createContext(testOrg.id) })

      // #when: Re-analyze same VIN with PAID tier
      await client.vin.analyze({ vin: VALID_VIN, projectId: testProject.id })

      // #then: Vehicle should be updated with premium fields
      const updatedVehicle = await testDb.vehicle.findUnique({ where: { vin: VALID_VIN } })
      expect(updatedVehicle?.id).toBe(existingVehicle.id) // Same record
      expect(updatedVehicle?.decoderSource).toBe('MARKETCHECK')
      expect(updatedVehicle?.transmission).toBe('Automatic')
      expect(updatedVehicle?.doors).toBe(4)
    })
  })
})
