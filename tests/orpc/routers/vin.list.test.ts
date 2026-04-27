// tests/orpc/routers/vin.list.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { vinRouter } from '@/lib/orpc/routers/vin'
import { createRouterClient } from '@orpc/server'
import prisma from '@/app/lib/db'

const db = prisma

describe('VIN Router - List Procedure', () => {
  let testOrgId: string
  let testProjectId: string
  let testVehicleId: string
  let testUserId: string

  beforeEach(async () => {
    // Clean up any existing test data first (in correct order)
    await db.report.deleteMany({
      where: {
        vehicle: {
          vin: '1HGBH41JXMN109186',
        },
      },
    })
    await db.vehicle.deleteMany({
      where: { vin: '1HGBH41JXMN109186' },
    })

    // #given: A test organization, project, and vehicle exist
    const testUser = await db.user.create({
      data: {
        id: `test-user-${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    })
    testUserId = testUser.id

    const testOrg = await db.organization.create({
      data: {
        name: 'Test Org',
        slug: `test-org-${Date.now()}`,
        credits: 10,
      },
    })
    testOrgId = testOrg.id

    await db.organizationMember.create({
      data: {
        organizationId: testOrgId,
        userId: testUserId,
        role: 'OWNER',
      },
    })

    const testProject = await db.project.create({
      data: {
        name: 'Test Project',
        slug: `test-project-${Date.now()}`,
        organizationId: testOrgId,
      },
    })
    testProjectId = testProject.id

    const testVehicle = await db.vehicle.upsert({
      where: { vin: '1HGBH41JXMN109186' },
      create: {
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
      },
      update: {
        make: 'Honda',
        model: 'Accord',
        year: 2021,
      },
    })
    testVehicleId = testVehicle.id
  })

  it('should return empty array when no reports exist', async () => {
    // #given: No reports exist for the project
    const context = {
      user: { id: testUserId } as any,
      db,
      orgId: testOrgId,
      role: 'OWNER' as const,
    }

    // Create router client with context
    const client = createRouterClient({ vin: vinRouter }, { context })

    // #when: List procedure is called
    const result = await client.vin.list({ projectId: testProjectId })

    // #then: Empty array is returned
    expect(result).toEqual([])
  })

  it('should return all reports for a project with vehicle details', async () => {
    // #given: Multiple reports exist for the project
    const report1 = await db.report.create({
      data: {
        status: 'PENDING',
        organizationId: testOrgId,
        projectId: testProjectId,
        vehicleId: testVehicleId,
      },
    })

    const report2 = await db.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrgId,
        projectId: testProjectId,
        vehicleId: testVehicleId,
        riskScore: 75,
        riskLabel: 'Elevated',
        riskNarrative: 'Test narrative',
        isAiFallback: false,
      },
    })

    const context = {
      user: { id: testUserId } as any,
      db,
      orgId: testOrgId,
      role: 'OWNER' as const,
    }

    // Create router client with context
    const client = createRouterClient({ vin: vinRouter }, { context })

    // #when: List procedure is called
    const result = await client.vin.list({ projectId: testProjectId })

    // #then: All reports are returned with vehicle details
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(report2.id) // Most recent first
    expect(result[1].id).toBe(report1.id)
    expect(result[0].vehicle).toBeDefined()
    expect(result[0].vehicle.vin).toBe('1HGBH41JXMN109186')
    expect(result[0].vehicle.make).toBe('Honda')
  })

  it('should order reports by createdAt descending', async () => {
    // #given: Multiple reports with different creation times
    const report1 = await db.report.create({
      data: {
        status: 'PENDING',
        organizationId: testOrgId,
        projectId: testProjectId,
        vehicleId: testVehicleId,
      },
    })

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10))

    const report2 = await db.report.create({
      data: {
        status: 'COMPLETED',
        organizationId: testOrgId,
        projectId: testProjectId,
        vehicleId: testVehicleId,
      },
    })

    const context = {
      user: { id: testUserId } as any,
      db,
      orgId: testOrgId,
      role: 'OWNER' as const,
    }

    // Create router client with context
    const client = createRouterClient({ vin: vinRouter }, { context })

    // #when: List procedure is called
    const result = await client.vin.list({ projectId: testProjectId })

    // #then: Reports are ordered by createdAt descending (newest first)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(report2.id)
    expect(result[1].id).toBe(report1.id)
    expect(result[0].createdAt.getTime()).toBeGreaterThan(
      result[1].createdAt.getTime()
    )
  })

  it('should throw NOT_FOUND when project does not exist', async () => {
    // #given: A non-existent project ID
    const context = {
      user: { id: testUserId } as any,
      db,
      orgId: testOrgId,
      role: 'OWNER' as const,
    }

    // Create router client with context
    const client = createRouterClient({ vin: vinRouter }, { context })

    // #when: List procedure is called with invalid project ID
    // #then: NOT_FOUND error is thrown
    await expect(
      client.vin.list({ projectId: 'non-existent-project' })
    ).rejects.toThrow('Project not found')
  })

  it('should throw NOT_FOUND when project belongs to different organization', async () => {
    // #given: A project belonging to a different organization
    const otherOrg = await db.organization.create({
      data: {
        name: 'Other Org',
        slug: `other-org-${Date.now()}`,
        credits: 10,
      },
    })

    const otherProject = await db.project.create({
      data: {
        name: 'Other Project',
        slug: `other-project-${Date.now()}`,
        organizationId: otherOrg.id,
      },
    })

    const context = {
      user: { id: testUserId } as any,
      db,
      orgId: testOrgId,
      role: 'OWNER' as const,
    }

    // Create router client with context
    const client = createRouterClient({ vin: vinRouter }, { context })

    // #when: List procedure is called with project from different org
    // #then: NOT_FOUND error is thrown
    await expect(
      client.vin.list({ projectId: otherProject.id })
    ).rejects.toThrow('Project not found')
  })

  it('should only return reports for the specified project', async () => {
    // #given: Reports exist for multiple projects
    await db.report.create({
      data: {
        status: 'PENDING',
        organizationId: testOrgId,
        projectId: testProjectId,
        vehicleId: testVehicleId,
      },
    })

    const otherProject = await db.project.create({
      data: {
        name: 'Other Project',
        slug: `other-project-${Date.now()}`,
        organizationId: testOrgId,
      },
    })

    await db.report.create({
      data: {
        status: 'PENDING',
        organizationId: testOrgId,
        projectId: otherProject.id,
        vehicleId: testVehicleId,
      },
    })

    const context = {
      user: { id: testUserId } as any,
      db,
      orgId: testOrgId,
      role: 'OWNER' as const,
    }

    // Create router client with context
    const client = createRouterClient({ vin: vinRouter }, { context })

    // #when: List procedure is called for specific project
    const result = await client.vin.list({ projectId: testProjectId })

    // #then: Only reports for that project are returned
    expect(result).toHaveLength(1)
    expect(result[0].projectId).toBe(testProjectId)
  })
})
