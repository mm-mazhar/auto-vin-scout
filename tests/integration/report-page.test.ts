// tests/integration/report-page.test.ts

// Mock Next.js server functions before any imports that use them
import '../setup/next-server-mock'

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { testDb, TestUtils } from './setup'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import { vi } from 'vitest'
import type { ReportWithVehicle } from '@/lib/orpc/routers/vin'

describe('ReportPage Data Integration Tests (Task 13.3)', () => {
  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>
  let testOrg: Awaited<ReturnType<typeof testDb.organization.create>>
  let testProject: Awaited<ReturnType<typeof testDb.project.create>>
  let testVehicle: Awaited<ReturnType<typeof testDb.vehicle.create>>
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
  })

  afterEach(async () => {
    await testDb.report.deleteMany({ where: { organizationId: testOrg.id } })
    await testDb.vehicle.deleteMany({})
    await testDb.project.deleteMany({ where: { organizationId: testOrg.id } })
    await testDb.organizationInvite.deleteMany({ where: { organizationId: testOrg.id } })
    await testDb.organizationMember.deleteMany({ where: { organizationId: testOrg.id } })
    await testDb.organization.delete({ where: { id: testOrg.id } })
    await testDb.user.delete({ where: { id: testUser.id } })

    vi.restoreAllMocks()
  }, 30000)

  it('should fetch and structure vehicle information correctly for ReportPage', async () => {
    // #given - A vehicle and completed report with vehicle data
    const testVehicle = await testDb.vehicle.create({
      data: {
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        trim: 'EX',
        engineDesc: '2.0L 4-Cylinder',
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
      },
    })

    const report = await testDb.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: testVehicle.id,
        riskScore: 75,
        riskLabel: 'Elevated',
        riskNarrative: 'This vehicle shows elevated risk due to high mileage and previous accidents.',
        isAiFallback: false,
      },
    })

    // #when - Fetching reports via oRPC (simulating ReportPage data fetching)
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const fetchedReport = reports.find((r: any) => r.id === report.id)

    // #then - Report should contain all vehicle information needed for display
    expect(fetchedReport).toBeDefined()
    expect(fetchedReport!.vehicle.vin).toBe('1HGBH41JXMN109186')
    expect(fetchedReport!.vehicle.make).toBe('Honda')
    expect(fetchedReport!.vehicle.model).toBe('Civic')
    expect(fetchedReport!.vehicle.year).toBe(2023)
    expect(fetchedReport!.vehicle.trim).toBe('EX')

    // #then - Vehicle configuration data should be available
    expect(fetchedReport!.vehicle.engineDesc).toBe('2.0L 4-Cylinder')
    expect(fetchedReport!.vehicle.driveType).toBe('FWD')
    expect(fetchedReport!.vehicle.fuelTypePrimary).toBe('Gasoline')
    expect(fetchedReport!.vehicle.manufacturer).toBe('Honda Motor Co.')
    expect(fetchedReport!.vehicle.plantCity).toBe('Marysville')
    expect(fetchedReport!.vehicle.plantCountry).toBe('United States')

    // #then - Risk assessment data should be available
    expect(fetchedReport!.riskScore).toBe(75)
    expect(fetchedReport!.riskLabel).toBe('Elevated')
    expect(fetchedReport!.riskNarrative).toContain('elevated risk')
  })

  it('should handle PENDING report status correctly', async () => {
    // #given - A vehicle and pending report
    const testVehicle = await testDb.vehicle.create({
      data: {
        vin: '2HGBH41JXMN109187',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
      },
    })

    const report = await testDb.report.create({
      data: {
        status: 'PENDING',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: testVehicle.id,
      },
    })

    // #when - Fetching the report
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const fetchedReport = reports.find((r: any) => r.id === report.id)

    // #then - Report should have PENDING status and null risk fields
    expect(fetchedReport!.status).toBe('PENDING')
    expect(fetchedReport!.riskScore).toBeNull()
    expect(fetchedReport!.riskLabel).toBeNull()
    expect(fetchedReport!.riskNarrative).toBeNull()

    // #then - Vehicle data should still be available
    expect(fetchedReport!.vehicle.make).toBe('Honda')
    expect(fetchedReport!.vehicle.model).toBe('Civic')
  })

  it('should handle COMPLETED report with risk assessment', async () => {
    // #given - A vehicle and completed report with risk assessment
    const testVehicle = await testDb.vehicle.create({
      data: {
        vin: '3HGBH41JXMN109188',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
      },
    })

    const report = await testDb.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: testVehicle.id,
        riskScore: 85,
        riskLabel: 'High',
        riskNarrative: 'This vehicle presents high risk due to multiple safety recalls and poor maintenance history. Consider thorough inspection before purchase.',
        isAiFallback: false,
      },
    })

    // #when - Fetching the report
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const fetchedReport = reports.find((r: any) => r.id === report.id)

    // #then - Risk assessment should be complete
    expect(fetchedReport!.status).toBe('COMPLETED')
    expect(fetchedReport!.riskScore).toBe(85)
    expect(fetchedReport!.riskLabel).toBe('High')
    expect(fetchedReport!.riskNarrative).toContain('high risk')
    expect(fetchedReport!.riskNarrative).toContain('thorough inspection')
  })

  it('should handle FAILED report status correctly', async () => {
    // #given - A vehicle and failed report
    const testVehicle = await testDb.vehicle.create({
      data: {
        vin: '4HGBH41JXMN109189',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
      },
    })

    const report = await testDb.report.create({
      data: {
        status: 'FAILED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: testVehicle.id,
      },
    })

    // #when - Fetching the report
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const fetchedReport = reports.find((r: any) => r.id === report.id)

    // #then - Report should have FAILED status
    expect(fetchedReport!.status).toBe('FAILED')
    expect(fetchedReport!.riskScore).toBeNull()
    expect(fetchedReport!.riskLabel).toBeNull()
    expect(fetchedReport!.riskNarrative).toBeNull()
  })

  it('should include report metadata for display', async () => {
    // #given - A vehicle and report with specific creation date
    const testVehicle = await testDb.vehicle.create({
      data: {
        vin: '5HGBH41JXMN109190',
        make: 'Nissan',
        model: 'Altima',
        year: 2020,
      },
    })

    const createdAt = new Date('2024-01-15T10:30:00Z')
    const report = await testDb.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: testVehicle.id,
        createdAt,
      },
    })

    // #when - Fetching the report
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const fetchedReport = reports.find((r: any) => r.id === report.id)

    // #then - Metadata should be available for display
    expect(fetchedReport!.id).toBe(report.id)
    expect(fetchedReport!.createdAt).toEqual(createdAt)
    expect(fetchedReport!.organizationId).toBe(testOrg.id)
    expect(fetchedReport!.projectId).toBe(testProject.id)
  })

  it('should handle vehicles with minimal data (only required fields)', async () => {
    // #given - A vehicle with minimal data (only required fields)
    const minimalVehicle = await testDb.vehicle.create({
      data: {
        vin: '6HGBH41JXMN109191',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        // All optional fields are null
        trim: null,
        engineDesc: null,
        driveType: null,
        vehicleType: null,
        manufacturer: null,
        plantCity: null,
        plantCountry: null,
        engineModel: null,
        engineCylinders: null,
        fuelInjectionType: null,
        fuelTypePrimary: null,
        fuelTypeSecondary: null,
        electrificationLevel: null,
      },
    })

    const report = await testDb.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: minimalVehicle.id,
        riskScore: 50,
        riskLabel: 'Moderate',
        riskNarrative: 'Standard risk assessment.',
        isAiFallback: false,
      },
    })

    // #when - Fetching the report
    const reports = await rpcClient.vin.list({ projectId: testProject.id })
    const fetchedReport = reports.find((r: any) => r.id === report.id)

    // #then - Required fields should be available
    expect(fetchedReport!.vehicle.vin).toBe('6HGBH41JXMN109191')
    expect(fetchedReport!.vehicle.make).toBe('Toyota')
    expect(fetchedReport!.vehicle.model).toBe('Camry')
    expect(fetchedReport!.vehicle.year).toBe(2022)

    // #then - Optional fields should be null
    expect(fetchedReport!.vehicle.trim).toBeNull()
    expect(fetchedReport!.vehicle.engineDesc).toBeNull()
    expect(fetchedReport!.vehicle.driveType).toBeNull()
    expect(fetchedReport!.vehicle.manufacturer).toBeNull()
  })

  it('should validate risk level data types for ReportPage display logic', async () => {
    const riskLevels = [
      { label: 'Low' as const, score: 20, vin: '7HGBH41JXMN109192' },
      { label: 'Moderate' as const, score: 40, vin: '8HGBH41JXMN109193' },
      { label: 'Elevated' as const, score: 70, vin: '9HGBH41JXMN109194' },
      { label: 'High' as const, score: 90, vin: 'AHGBH41JXMN109195' },
    ]

    for (const { label, score, vin } of riskLevels) {
      // #given - A vehicle and report with specific risk level
      const testVehicle = await testDb.vehicle.create({
        data: {
          vin,
          make: 'Test',
          model: 'Vehicle',
          year: 2023,
        },
      })

      const report = await testDb.report.create({
        data: {
          status: 'COMPLETED',
          organizationId: testOrg.id,
          projectId: testProject.id,
          vehicleId: testVehicle.id,
          riskScore: score,
          riskLabel: label,
          riskNarrative: `${label} risk assessment.`,
          isAiFallback: false,
        },
      })

      // #when - Fetching the report
      const reports = await rpcClient.vin.list({ projectId: testProject.id })
      const fetchedReport = reports.find((r: any) => r.id === report.id)

      // #then - Risk data should be correctly typed and available
      expect(fetchedReport!.riskScore).toBe(score)
      expect(fetchedReport!.riskLabel).toBe(label)
      expect(fetchedReport!.riskNarrative).toContain(label)

      // #then - Risk score should be within valid range (0-100)
      expect(fetchedReport!.riskScore).toBeGreaterThanOrEqual(0)
      expect(fetchedReport!.riskScore).toBeLessThanOrEqual(100)
    }
  })

  it('should ensure report page route can find reports by ID', async () => {
    // #given - Multiple vehicles and reports in the project
    const vehicle1 = await testDb.vehicle.create({
      data: {
        vin: 'BHGBH41JXMN109196',
        make: 'Honda',
        model: 'Accord',
        year: 2023,
      },
    })

    const vehicle2 = await testDb.vehicle.create({
      data: {
        vin: 'CHGBH41JXMN109197',
        make: 'Toyota',
        model: 'Prius',
        year: 2022,
      },
    })

    const report1 = await testDb.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: vehicle1.id,
        riskScore: 30,
        riskLabel: 'Low',
        isAiFallback: false,
      },
    })

    const report2 = await testDb.report.create({
      data: {
        status: 'PENDING',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: vehicle2.id,
      },
    })

    // #when - Fetching all reports (simulating report page route logic)
    const allReports = await rpcClient.vin.list({ projectId: testProject.id })

    // #then - Should be able to find specific report by ID
    const foundReport1 = allReports.find((r: any) => r.id === report1.id)
    const foundReport2 = allReports.find((r: any) => r.id === report2.id)

    expect(foundReport1).toBeDefined()
    expect(foundReport1!.riskScore).toBe(30)
    expect(foundReport1!.status).toBe('COMPLETED')

    expect(foundReport2).toBeDefined()
    expect(foundReport2!.status).toBe('PENDING')

    // #then - Reports should be ordered by creation date descending
    expect(allReports[0].createdAt.getTime()).toBeGreaterThanOrEqual(allReports[1].createdAt.getTime())
  })

  it('should display fallback indicator when AI analysis fails', async () => {
    // #given - A vehicle and report with AI fallback
    const fallbackVehicle = await testDb.vehicle.create({
      data: {
        vin: '1HGBH41JXMN109999',
        make: 'Toyota',
        model: 'Camry',
        year: 2014,
        trim: 'LE',
        engineDesc: '2.5L 4-Cylinder',
        driveType: 'FWD',
        vehicleType: 'Passenger Car',
        manufacturer: 'Toyota Motor Co.',
        plantCity: 'Georgetown',
        plantCountry: 'United States',
        engineModel: '2AR-FE',
        engineCylinders: '4',
        fuelInjectionType: 'Port Injection',
        fuelTypePrimary: 'Gasoline',
        fuelTypeSecondary: null,
        electrificationLevel: 'None',
      },
    })

    const testReport = await testDb.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: fallbackVehicle.id,
        riskScore: 45,
        riskLabel: 'Moderate',
        riskNarrative: '• Vehicle age is 10 years, so inspect wear-related items carefully before purchase.\n• No recall signals were detected in the simulated check, but confirm recalls independently before buying.\n• Compare this vehicle with local listings to confirm the asking price is reasonable for its age and configuration.',
        isAiFallback: true,
      },
    })

    // #when - Fetching the report
    const fetchedReports = await rpcClient.vin.list({
      projectId: testProject.id,
    })

    // #then - Should include fallback flag
    const fallbackReport = fetchedReports.find((r: any) => r.id === testReport.id)
    expect(fallbackReport).toBeDefined()
    expect(fallbackReport!.isAiFallback).toBe(true)
    expect(fallbackReport!.riskNarrative).toContain('Vehicle age is')
  })
})