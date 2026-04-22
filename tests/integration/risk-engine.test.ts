// tests/integration/risk-engine.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TestUtils, testDb } from './setup'
import { RiskEngineService } from '@/lib/services/risk-engine'
import type { User, Organization, Project, Vehicle, Report } from '@prisma/client'

// Mock OpenAI
vi.mock('openai', () => {
  const OpenAI = vi.fn()
  OpenAI.prototype.chat = {
    completions: {
      create: vi.fn(),
    },
  }
  return { default: OpenAI }
})

// Mock Google GenAI - create a factory that can be reconfigured per test
const mockGenerateContentFn = vi.fn()
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContentFn,
      }
    },
  }
})

describe('RiskEngineService', () => {
  let testUser: User
  let testOrg: Organization
  let testProject: Project
  let testVehicle: Vehicle
  let testReport: Report

  beforeEach(async () => {
    // Create test user
    testUser = await TestUtils.createTestUser()

    // Create test organization
    testOrg = await testDb.organization.create({
      data: {
        name: 'Test Org',
        slug: TestUtils.generateUniqueSlug('test-org'),
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
        slug: TestUtils.generateUniqueSlug('test-project'),
        organizationId: testOrg.id,
      },
    })

    // Create test vehicle
    testVehicle = await testDb.vehicle.create({
      data: {
        vin: `TEST${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        make: 'Toyota',
        model: 'Camry',
        year: 2015,
        trim: 'LE',
        engine: '2.5L I4',
        driveType: 'FWD',
      },
    })

    // Create test report
    testReport = await testDb.report.create({
      data: {
        organizationId: testOrg.id,
        projectId: testProject.id,
        vehicleId: testVehicle.id,
        status: 'PENDING',
      },
    })
  })

  afterEach(async () => {
    // Clean up in reverse order of creation
    if (testReport) {
      await testDb.report.deleteMany({ where: { id: testReport.id } })
    }
    if (testVehicle) {
      await testDb.vehicle.deleteMany({ where: { id: testVehicle.id } })
    }
    if (testProject) {
      await testDb.project.deleteMany({ where: { id: testProject.id } })
    }
    if (testOrg) {
      await TestUtils.cleanupOrganization(testOrg.id)
    }
    if (testUser) {
      await TestUtils.cleanupUser(testUser.id)
    }

    // Clear all mocks
    vi.clearAllMocks()
  })

  it('Test 1: Primary provider success flow', async () => {
    // Mock OpenAI to return a successful narrative
    const OpenAI = (await import('openai')).default
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: '• Bullet 1\n• Bullet 2\n• Bullet 3',
          },
        },
      ],
    })
    OpenAI.prototype.chat = {
      completions: {
        create: mockCreate,
      },
    } as any

    // Set environment variable for primary provider
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    // Execute the risk assessment
    await RiskEngineService.generateRiskAssessment(testReport.id)

    // Verify the report was updated to COMPLETED
    const updatedReport = await testDb.report.findUnique({
      where: { id: testReport.id },
    })

    expect(updatedReport).toBeDefined()
    expect(updatedReport?.status).toBe('COMPLETED')
    expect(updatedReport?.riskScore).toBeGreaterThanOrEqual(10)
    expect(updatedReport?.riskScore).toBeLessThanOrEqual(100)
    expect(updatedReport?.riskLabel).toMatch(/Low|Moderate|Elevated|High/)
    expect(updatedReport?.riskNarrative).toBe('• Bullet 1\n• Bullet 2\n• Bullet 3')

    // Verify OpenAI was called
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('Test 2: Primary failure → Fallback success', async () => {
    // Mock OpenAI to throw an error
    const OpenAI = (await import('openai')).default
    const mockCreate = vi.fn().mockRejectedValue(new Error('Primary provider failed'))
    OpenAI.prototype.chat = {
      completions: {
        create: mockCreate,
      },
    } as any

    // Configure the shared Google GenAI mock to return a successful narrative
    mockGenerateContentFn.mockResolvedValueOnce({
      text: '• Bullet 1\n• Bullet 2\n• Bullet 3',
    })

    // Set environment variables
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.GOOGLE_API_KEY = 'test-google-key'

    // Execute the risk assessment
    await RiskEngineService.generateRiskAssessment(testReport.id)

    // Verify the report was updated to COMPLETED
    const updatedReport = await testDb.report.findUnique({
      where: { id: testReport.id },
    })

    expect(updatedReport).toBeDefined()
    expect(updatedReport?.status).toBe('COMPLETED')
    expect(updatedReport?.riskNarrative).toBe('• Bullet 1\n• Bullet 2\n• Bullet 3')

    // Verify both providers were called
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockGenerateContentFn).toHaveBeenCalledOnce()
  })

  it('Test 3: Both providers fail → Rules-based narrative', async () => {
    // Mock OpenAI to throw an error
    const OpenAI = (await import('openai')).default
    const mockCreate = vi.fn().mockRejectedValue(new Error('Primary provider failed'))
    OpenAI.prototype.chat = {
      completions: {
        create: mockCreate,
      },
    } as any

    // Configure the shared Google GenAI mock to throw an error
    mockGenerateContentFn.mockRejectedValueOnce(new Error('Fallback provider failed'))

    // Set environment variables
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.GOOGLE_API_KEY = 'test-google-key'

    // Execute the risk assessment
    await RiskEngineService.generateRiskAssessment(testReport.id)

    // Verify the report was updated to COMPLETED with rules-based narrative
    const updatedReport = await testDb.report.findUnique({
      where: { id: testReport.id },
    })

    expect(updatedReport).toBeDefined()
    expect(updatedReport?.status).toBe('COMPLETED')
    expect(updatedReport?.riskNarrative).toBeDefined()
    expect(updatedReport?.riskNarrative).toContain('Vehicle age is')
    expect(updatedReport?.riskNarrative).toContain('•')

    // Verify both providers were attempted
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockGenerateContentFn).toHaveBeenCalledOnce()
  })

  it('Test 4: Missing report flow', async () => {
    // Use a non-existent report ID
    const invalidReportId = 'non-existent-report-id'

    // Execute the risk assessment (should not throw)
    await expect(
      RiskEngineService.generateRiskAssessment(invalidReportId)
    ).resolves.not.toThrow()

    // Verify no report was created or updated
    const report = await testDb.report.findUnique({
      where: { id: invalidReportId },
    })
    expect(report).toBeNull()
  })
})
