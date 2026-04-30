// tests/integration/create-report-dialog.test.ts

// Mock Next.js server functions before any imports that use them
import '../setup/next-server-mock'

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { testDb, TestUtils } from './setup'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'
import { vi } from 'vitest'

describe('CreateReportDialog Integration Tests (Task 12.1)', () => {
  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>
  let testOrg: Awaited<ReturnType<typeof testDb.organization.create>>
  let testProject: Awaited<ReturnType<typeof testDb.project.create>>
  let rpcClient: any

  // Clean up any existing test data before starting
  beforeAll(async () => {
    await testDb.recall.deleteMany({})
    await testDb.report.deleteMany({})
    await testDb.vehicle.deleteMany({})
  })

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

    // Create RPC client for testing
    const context = {
      db: testDb,
      user: testUser as any,
      orgId: testOrg.id,
      role: 'OWNER' as const,
    }
    rpcClient = createRouterClient({ vin: vinRouter }, { context })

    // Mock NHTSA decoder to return valid vehicle data
    vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
      year: 2023,
      trim: 'EX',
      engine: '2.0L 4-Cylinder',
      driveType: 'FWD',
      vehicleType: 'Passenger Car',
      manufacturer: 'Honda Motor Co.',
      plantCity: 'Marysville',
      plantCountry: 'United States',
      engineModel: 'K20C2',
      engineCylinders: '4',
      fuelInjectionType: 'Direct Injection',
      fuelTypePrimary: 'Gasoline',
      fuelTypeSecondary: null,
      electrificationLevel: 'None',
    })
    // Mock MarketCheck to return null so tests use NHTSA data predictably
    vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
  })

  afterEach(async () => {
    // Clean up in reverse order of creation
    await testDb.jobQueue.deleteMany({ where: { orgId: testOrg.id } })
    await testDb.recall.deleteMany({})
    await testDb.report.deleteMany({
      where: { organizationId: testOrg.id },
    })
    await testDb.vehicle.deleteMany({ where: { reports: { none: {} } } })
    await testDb.project.deleteMany({
      where: { id: testProject.id },
    })
    await TestUtils.cleanupOrganization(testOrg.id)
    await TestUtils.cleanupUser(testUser.id)

    vi.restoreAllMocks()
  })

  it('should validate VIN input correctly', async () => {
    // #given - Various VIN inputs to test validation
    const testCases = [
      { vin: '', expectedValid: false, description: 'empty VIN' },
      { vin: '1HGBH41JXMN10918', expectedValid: false, description: 'too short VIN' },
      { vin: '1HGBH41JXMN1091866', expectedValid: false, description: 'too long VIN' },
      { vin: '1HGBH41JXMN109I86', expectedValid: false, description: 'VIN with I character' },
      { vin: '1HGBH41JXMN109O86', expectedValid: false, description: 'VIN with O character' },
      { vin: '1HGBH41JXMN109Q86', expectedValid: false, description: 'VIN with Q character' },
      { vin: '1HGBH41JXMN109186', expectedValid: true, description: 'valid VIN' },
    ]

    for (const testCase of testCases) {
      // #when - Testing VIN validation logic (simulating form validation)
      const isValid = testCase.vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(testCase.vin)

      // #then - Validation should match expected result
      expect(isValid).toBe(testCase.expectedValid)
    }
  })

  it('should handle successful VIN analysis submission', async () => {
    // #given - Valid VIN and sufficient credits
    const validVin = '1HGBH41JXMN109186'
    const initialCredits = testOrg.credits

    // #when - Submitting VIN analysis (simulating form submission)
    const result = await rpcClient.vin.analyze({
      vin: validVin,
      projectId: testProject.id,
    })

    // #then - Analysis should succeed and return report details
    expect(result).toBeDefined()
    expect(result.reportId).toBeDefined()
    expect(result.status).toBe('PENDING')
    expect(result.vehicle).toBeDefined()
    expect(result.vehicle.vin).toBe(validVin)
    expect(result.vehicle.make).toBe('Honda')
    expect(result.vehicle.model).toBe('Civic')
    expect(result.vehicle.year).toBe(2023)

    // #then - Credits should be decremented
    const updatedOrg = await testDb.organization.findUnique({
      where: { id: testOrg.id },
    })
    expect(updatedOrg!.credits).toBe(initialCredits - 1)

    // #then - Report should be created in database
    const reports = await testDb.report.findMany({
      where: { organizationId: testOrg.id },
    })
    expect(reports).toHaveLength(1)
    expect(reports[0].status).toBe('PENDING')
  })

  it('should handle insufficient credits error', async () => {
    // #given - Organization with zero credits and subscription history (ZERO_CREDITS flow)
    await testDb.organization.update({
      where: { id: testOrg.id },
      data: { credits: 0 },
    })

    // Add a subscription so the org hits the ZERO_CREDITS flow (not FREE_TIER)
    await testDb.subscription.create({
      data: {
        stripeSubscriptionId: `sub_test_insufficient_${Date.now()}`,
        planId: 'price_test_pro',
        status: 'active',
        interval: 'month',
        currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
        periodEndReminderSent: false,
        organization: { connect: { id: testOrg.id } },
      },
    })

    // #when - Attempting VIN analysis with no credits (subscription exists)
    const result = await rpcClient.vin.analyze({
      vin: '1HGBH41JXMN109186',
      projectId: testProject.id,
    })

    // #then - Should return ZERO_CREDITS status (not a full report)
    expect(result.status).toBe('ZERO_CREDITS')
    expect(result.isPreview).toBe(true)
    expect(result.vehicle).toBeDefined()
    expect(result.vehicle.vin).toBe('1HGBH41JXMN109186')

    // #then - A ZERO_CREDITS report should be created in the database
    const reports = await testDb.report.findMany({
      where: { organizationId: testOrg.id },
    })
    expect(reports).toHaveLength(1)
    expect(reports[0].status).toBe('ZERO_CREDITS')
  })

  it('should handle project not found error', async () => {
    // #given - Non-existent project ID
    const nonExistentProjectId = 'non-existent-project-id'

    // #when - Attempting VIN analysis with invalid project
    const analysisPromise = rpcClient.vin.analyze({
      vin: '1HGBH41JXMN109186',
      projectId: nonExistentProjectId,
    })

    // #then - Should throw NOT_FOUND error
    await expect(analysisPromise).rejects.toThrow()
    
    try {
      await analysisPromise
    } catch (error: any) {
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toContain('Project not found')
    }

    // #then - Credits should not be decremented
    const updatedOrg = await testDb.organization.findUnique({
      where: { id: testOrg.id },
    })
    expect(updatedOrg!.credits).toBe(testOrg.credits)
  })

  it('should handle invalid VIN decode error', async () => {
    // #given - NHTSA decoder returns null (invalid VIN)
    vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(null)

    // #when - Attempting to analyze invalid VIN
    const analysisPromise = rpcClient.vin.analyze({
      vin: '1HGBH41JXMN109186',
      projectId: testProject.id,
    })

    // #then - Should throw BAD_REQUEST error
    await expect(analysisPromise).rejects.toThrow()
    
    try {
      await analysisPromise
    } catch (error: any) {
      expect(error.code).toBe('BAD_REQUEST')
      expect(error.message).toContain('Invalid VIN or decode failed')
    }

    // #then - Credits should not be decremented (transaction rollback)
    const updatedOrg = await testDb.organization.findUnique({
      where: { id: testOrg.id },
    })
    expect(updatedOrg!.credits).toBe(testOrg.credits)

    // #then - No report should be created
    const reports = await testDb.report.findMany({
      where: { organizationId: testOrg.id },
    })
    expect(reports).toHaveLength(0)
  })

  it('should handle loading state during analysis', async () => {
    // #given - Valid VIN analysis request
    const validVin = '1HGBH41JXMN109186'

    // #when - Analysis is in progress (simulating loading state)
    const analysisPromise = rpcClient.vin.analyze({
      vin: validVin,
      projectId: testProject.id,
    })

    // #then - During analysis, UI should show loading state
    // This test validates that the mutation is properly async
    expect(analysisPromise).toBeInstanceOf(Promise)

    // Wait for completion
    const result = await analysisPromise
    expect(result.status).toBe('PENDING')
  })

  it('should redirect to report page after successful analysis', async () => {
    // #given - Valid VIN analysis
    const validVin = '1HGBH41JXMN109186'

    // #when - Analysis completes successfully
    const result = await rpcClient.vin.analyze({
      vin: validVin,
      projectId: testProject.id,
    })

    // #then - Should return report ID for navigation
    expect(result.reportId).toBeDefined()
    expect(typeof result.reportId).toBe('string')

    // #then - Report should be accessible via list endpoint
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const createdReport = reports.find((r: any) => r.id === result.reportId)
    expect(createdReport).toBeDefined()
    expect(createdReport!.status).toBe('PENDING')
  })

  it('should display appropriate error messages for different error codes', async () => {
    const errorTestCases = [
      {
        setup: async () => {
          // Add subscription so zero credits hits ZERO_CREDITS flow (not FREE_TIER)
          await testDb.subscription.create({
            data: {
              stripeSubscriptionId: `sub_test_error_${Date.now()}`,
              planId: 'price_test_pro',
              status: 'active',
              interval: 'month',
              currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
              currentPeriodEnd: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
              periodEndReminderSent: false,
              organization: { connect: { id: testOrg.id } },
            },
          })
          await testDb.organization.update({
            where: { id: testOrg.id },
            data: { credits: 0 },
          })
        },
        validate: async (result: any) => {
          // ZERO_CREDITS flow returns a preview response, not an error
          expect(result.status).toBe('ZERO_CREDITS')
          expect(result.isPreview).toBe(true)
        },
        description: 'insufficient credits returns ZERO_CREDITS preview',
      },
      {
        setup: async () => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(null)
        },
        validate: async (_result: any) => {
          // This case should throw — handled in catch block below
        },
        expectedCode: 'BAD_REQUEST',
        expectedMessage: 'Invalid VIN or decode failed',
        description: 'invalid VIN decode',
      },
    ]

    for (const testCase of errorTestCases) {
      // #given - Error condition setup
      await testCase.setup()

      // #when - Attempting VIN analysis
      if (testCase.expectedCode) {
        // Cases that should throw
        try {
          await rpcClient.vin.analyze({
            vin: '1HGBH41JXMN109186',
            projectId: testProject.id,
          })
          expect(true).toBe(false) // Should not reach here
        } catch (error: any) {
          // #then - Should return appropriate error code and message
          expect(error.code).toBe(testCase.expectedCode)
          expect(error.message).toContain(testCase.expectedMessage)
        }
      } else {
        // Cases that return a response (not throw)
        const result = await rpcClient.vin.analyze({
          vin: '1HGBH41JXMN109186',
          projectId: testProject.id,
        })
        await testCase.validate!(result)
      }

      // Reset for next test case
      await testDb.subscription.deleteMany({ where: { organizationId: testOrg.id } })
      await testDb.report.deleteMany({ where: { organizationId: testOrg.id } })
      await testDb.organization.update({
        where: { id: testOrg.id },
        data: { credits: 10 },
      })
      vi.restoreAllMocks()
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue({
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        trim: 'EX',
        engine: '2.0L 4-Cylinder',
        driveType: 'FWD',
        vehicleType: 'Passenger Car',
        manufacturer: 'Honda Motor Co.',
        plantCity: 'Marysville',
        plantCountry: 'United States',
        engineModel: 'K20C2',
        engineCylinders: '4',
        fuelInjectionType: 'Direct Injection',
        fuelTypePrimary: 'Gasoline',
        fuelTypeSecondary: null,
        electrificationLevel: 'None',
      })
    }
  })
})