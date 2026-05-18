// tests/integration/vin-router-transaction.test.ts

// Mock Next.js server functions before any imports that use them
import '../setup/next-server-mock'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testDb, TestUtils } from './setup'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import { ORPCError } from '@/lib/orpc/server'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'
import { vi } from 'vitest'

describe('VIN Router - Database Transaction (Task 4.3)', () => {
  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>
  let testOrg: Awaited<ReturnType<typeof testDb.organization.create>>
  let testProject: Awaited<ReturnType<typeof testDb.project.create>>

  beforeEach(async () => {
    // Create test user
    testUser = await TestUtils.createTestUser()

    // Create test organization with credits
    testOrg = await testDb.organization.create({
      data: {
        name: 'Test Org',
        slug: TestUtils.generateUniqueSlug('test-org'),
        credits: 10,
        members: {
          create: {
            userId: testUser.id,
            role: 'OWNER',
          },
        },
      },
    })

    // Create test project
    testProject = await testDb.project.create({
      data: {
        name: 'Test Project',
        slug: 'test-project',
        organizationId: testOrg.id,
      },
    })

    // Mock NHTSA decoder to return valid vehicle data
    vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      trim: 'EX-L',
      engine: '4-cylinder 1.5L Turbo',
      driveType: 'FWD',
      vehicleType: 'Sedan',
      manufacturer: 'Honda Motor Company',
      plantCity: 'Marysville',
      plantCountry: 'USA',
      engineModel: '1.5L',
      engineCylinders: '4',
      fuelInjectionType: 'Turbo',
      fuelTypePrimary: 'Gasoline',
      fuelTypeSecondary: null,
      electrificationLevel: null,
    })

    // Mock MarketCheck to prevent real API calls — PAID tier triggers MarketCheck
    // without this mock the real API is called on every analyze, burning quota
    vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
  }, 30000)

  afterEach(async () => {
    // Guard against beforeEach partial failure leaving testOrg undefined
    if (!testOrg) return

    // Clean up in reverse order of creation - scoped to test org only
    await testDb.recall.deleteMany({})
    // Delete ALL reports for this vehicle (across all orgs) before deleting the vehicle
    // to avoid FK violations from reports created by other test runs
    const vehicle = await testDb.vehicle.findUnique({ where: { vin: '1HGBH41JXMN109186' } })
    if (vehicle) {
      await testDb.report.deleteMany({ where: { vehicleId: vehicle.id } })
      await testDb.vehicle.deleteMany({ where: { vin: '1HGBH41JXMN109186' } })
    }
    await testDb.project.deleteMany({
      where: { id: testProject.id },
    })
    await TestUtils.cleanupOrganization(testOrg.id)
    await TestUtils.cleanupUser(testUser.id)

    vi.restoreAllMocks()
  }, 30000)

  describe('Atomic Transaction Operations', () => {
    it('should create vehicle, report, and decrement credits atomically', async () => {
      // #given: Organization with 10 credits, valid VIN, and project
      const initialCredits = testOrg.credits

      // #when: Analyze VIN is called
      const context = {
        db: testDb,
        user: testUser as any,
        orgId: testOrg.id,
        role: 'OWNER' as const,
      }

      // Create router client with context
      const client = createRouterClient({ vin: vinRouter }, { context })

      const result = await client.vin.analyze({
        vin: '1HGBH41JXMN109186',
        projectId: testProject.id,
      })

      // #then: Vehicle record should be created
      const vehicle = await testDb.vehicle.findUnique({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicle).toBeDefined()
      expect(vehicle?.make).toBe('Honda')
      expect(vehicle?.model).toBe('Accord')
      expect(vehicle?.year).toBe(2021)

      // #then: Report record should be created with PENDING status
      expect(result.reportId).toBeDefined()
      expect(result.reportId).not.toBeNull()
      const report = await testDb.report.findUnique({
        where: { id: result.reportId! },
      })
      expect(report).toBeDefined()
      expect(report?.status).toBe('PENDING')
      expect(report?.organizationId).toBe(testOrg.id)
      expect(report?.projectId).toBe(testProject.id)
      expect(report?.vehicleId).toBe(vehicle?.id)

      // #then: Organization credits should be decremented by 1
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: testOrg.id },
      })
      expect(updatedOrg?.credits).toBe(initialCredits - 1)
    })

    it('should upsert vehicle when analyzing same VIN twice', async () => {
      // Ensure clean state — previous test may have left a vehicle if its beforeEach timed out
      const staleVehicle = await testDb.vehicle.findUnique({ where: { vin: '1HGBH41JXMN109186' } })
      if (staleVehicle) {
        await testDb.report.deleteMany({ where: { vehicleId: staleVehicle.id } })
        await testDb.vehicle.deleteMany({ where: { vin: '1HGBH41JXMN109186' } })
      }

      // #given: First analysis creates vehicle
      const context = {
        db: testDb,
        user: testUser as any,
        orgId: testOrg.id,
        role: 'OWNER' as const,
      }

      // Create router client with context
      const client = createRouterClient({ vin: vinRouter }, { context })

      await client.vin.analyze({
        vin: '1HGBH41JXMN109186',
        projectId: testProject.id,
      })

      const vehicleCountAfterFirst = await testDb.vehicle.count({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicleCountAfterFirst).toBe(1)

      // #when: Same VIN is analyzed again with updated data
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
        trim: 'Sport', // Updated trim
        engine: '4-cylinder 1.5L Turbo',
        driveType: 'FWD',
        vehicleType: 'Sedan',
        manufacturer: 'Honda Motor Company',
        plantCity: 'Marysville',
        plantCountry: 'USA',
        engineModel: '1.5L',
        engineCylinders: '4',
        fuelInjectionType: 'Turbo',
        fuelTypePrimary: 'Gasoline',
        fuelTypeSecondary: null,
        electrificationLevel: null,
      })

      await client.vin.analyze({
        vin: '1HGBH41JXMN109186',
        projectId: testProject.id,
      })

      // #then: Only one vehicle record should exist (upserted)
      const vehicleCountAfterSecond = await testDb.vehicle.count({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicleCountAfterSecond).toBe(1)

      // #then: Vehicle should have updated data
      const vehicle = await testDb.vehicle.findUnique({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicle?.trim).toBe('Sport')

      // #then: Two separate reports should exist
      const reportCount = await testDb.report.count({
        where: {
          vehicleId: vehicle?.id,
          organizationId: testOrg.id,
        },
      })
      expect(reportCount).toBe(2)
    })

    it.skip('should rollback transaction if report creation fails', async () => {
      // NOTE: This test is skipped because mocking Prisma transaction operations is not reliable
      // The mock on testDb.report.create doesn't affect tx.report.create inside the transaction
      // To properly test transaction rollback, we would need to:
      // 1. Use real database constraints that cause failures, or
      // 2. Refactor the code to make transactions more testable
      
      // #given: Organization with 10 credits
      const initialCredits = testOrg.credits

      // Mock report creation to fail
      const originalCreate = testDb.report.create
      vi.spyOn(testDb.report, 'create').mockRejectedValueOnce(
        new Error('Database error')
      )

      const context = {
        db: testDb,
        user: testUser as any,
        orgId: testOrg.id,
        role: 'OWNER' as const,
      }

      // Create router client with context
      const client = createRouterClient({ vin: vinRouter }, { context })

      // #when: Analyze VIN is called and fails
      await expect(
        client.vin.analyze({
          vin: '1HGBH41JXMN109186',
          projectId: testProject.id,
        })
      ).rejects.toThrow()

      // #then: Credits should remain unchanged (transaction rolled back)
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: testOrg.id },
      })
      expect(updatedOrg?.credits).toBe(initialCredits)

      // #then: Vehicle should not be created (transaction rolled back)
      const vehicle = await testDb.vehicle.findUnique({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicle).toBeNull()

      // Restore original function
      testDb.report.create = originalCreate
    })

    it.skip('should rollback transaction if credit decrement fails', async () => {
      // NOTE: This test is skipped because mocking Prisma transaction operations is not reliable
      // The mock on testDb.organization.update doesn't affect tx.organization.update inside the transaction
      // To properly test transaction rollback, we would need to:
      // 1. Use real database constraints that cause failures, or
      // 2. Refactor the code to make transactions more testable
      
      // #given: Organization with 10 credits
      const initialCredits = testOrg.credits

      // Mock organization update to fail
      const originalUpdate = testDb.organization.update
      vi.spyOn(testDb.organization, 'update').mockRejectedValueOnce(
        new Error('Database error')
      )

      const context = {
        db: testDb,
        user: testUser as any,
        orgId: testOrg.id,
        role: 'OWNER' as const,
      }

      // Create router client with context
      const client = createRouterClient({ vin: vinRouter }, { context })

      // #when: Analyze VIN is called and fails
      await expect(
        client.vin.analyze({
          vin: '1HGBH41JXMN109186',
          projectId: testProject.id,
        })
      ).rejects.toThrow()

      // #then: Credits should remain unchanged
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: testOrg.id },
      })
      expect(updatedOrg?.credits).toBe(initialCredits)

      // #then: Vehicle should not be created (transaction rolled back)
      const vehicle = await testDb.vehicle.findUnique({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicle).toBeNull()

      // #then: Report should not be created (transaction rolled back)
      const reportCount = await testDb.report.count({
        where: { organizationId: testOrg.id },
      })
      expect(reportCount).toBe(0)

      // Restore original function
      testDb.organization.update = originalUpdate
    })
  })

  describe('Foreign Key Relationships', () => {
    it('should create report with valid foreign key relationships', async () => {
      // #given: Valid organization, project, and VIN
      const context = {
        db: testDb,
        user: testUser as any,
        orgId: testOrg.id,
        role: 'OWNER' as const,
      }

      // Create router client with context
      const client = createRouterClient({ vin: vinRouter }, { context })

      // #when: Analyze VIN is called
      const result = await client.vin.analyze({
        vin: '1HGBH41JXMN109186',
        projectId: testProject.id,
      })

      // #then: Report should have valid foreign key relationships
      expect(result.reportId).toBeDefined()
      expect(result.reportId).not.toBeNull()
      const report = await testDb.report.findUnique({
        where: { id: result.reportId! },
        include: {
          vehicle: true,
          organization: true,
          project: true,
        },
      })

      expect(report).toBeDefined()
      expect(report?.vehicle?.vin).toBe('1HGBH41JXMN109186')
      expect(report?.organization?.id).toBe(testOrg.id)
      expect(report?.project?.id).toBe(testProject.id)
    })
  })

  describe('Timestamp Recording', () => {
    it('should record creation and update timestamps for vehicle and report', async () => {
      // #given: Valid VIN and project (ensure vehicle doesn't exist yet)
      const existingVehicle = await testDb.vehicle.findUnique({ where: { vin: '1HGBH41JXMN109186' } })
      if (existingVehicle) {
        await testDb.report.deleteMany({ where: { vehicleId: existingVehicle.id } })
        await testDb.vehicle.deleteMany({ where: { vin: '1HGBH41JXMN109186' } })
      }

      const context = {
        db: testDb,
        user: testUser as any,
        orgId: testOrg.id,
        role: 'OWNER' as const,
      }

      const beforeTime = new Date()

      // Create router client with context
      const client = createRouterClient({ vin: vinRouter }, { context })

      // #when: Analyze VIN is called
      const result = await client.vin.analyze({
        vin: '1HGBH41JXMN109186',
        projectId: testProject.id,
      })

      const afterTime = new Date()

      // #then: Vehicle should have valid timestamps
      const vehicle = await testDb.vehicle.findUnique({
        where: { vin: '1HGBH41JXMN109186' },
      })
      expect(vehicle?.createdAt).toBeDefined()
      expect(vehicle?.updatedAt).toBeDefined()
      expect(vehicle?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(vehicle?.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())

      // #then: Report should have valid timestamps
      expect(result.reportId).toBeDefined()
      expect(result.reportId).not.toBeNull()
      const report = await testDb.report.findUnique({
        where: { id: result.reportId! },
      })
      expect(report?.createdAt).toBeDefined()
      expect(report?.updatedAt).toBeDefined()
      expect(report?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(report?.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })
})
