// tests/integration/dashboard.test.ts
// Integration tests for dashboard oRPC procedures
// Validates: Requirements 7.4, 7.5, 7.6, 7.7

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TestUtils, testDb } from './setup'
import { OrganizationService } from '@/lib/services/organization-service'
import { appRouter } from '@/lib/orpc/root'
import { createRouterClient } from '@orpc/server'
import type { OrganizationRole } from '@/lib/constants'
import type { User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildRpcCaller(userId: string, orgId: string, role: OrganizationRole = 'OWNER') {
  return createRouterClient(appRouter, {
    context: {
      user: { id: userId } as User,
      db: testDb,
      orgId,
      role,
    },
  })
}

async function createVehicle(vin: string) {
  return testDb.vehicle.upsert({
    where: { vin },
    update: {},
    create: {
      vin,
      make: 'Honda',
      model: 'Civic',
      year: 2021,
    },
  })
}

async function createReport(orgId: string, projectId: string, vehicleId: string, createdAt?: Date) {
  const report = await testDb.report.create({
    data: {
      status: 'COMPLETED',
      organizationId: orgId,
      projectId,
      vehicleId,
    },
  })

  if (createdAt) {
    await testDb.report.update({
      where: { id: report.id },
      data: { createdAt },
    })
  }

  return report
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Dashboard Integration Tests', () => {
  let userId: string
  let orgId: string
  let projectId: string
  let vehicleId: string

  beforeAll(async () => {
    const user = await TestUtils.createTestUser(
      TestUtils.generateUniqueEmail('dashboard-test')
    )
    userId = user.id

    const org = await OrganizationService.createOrganization(
      userId,
      'Dashboard Test Org',
      TestUtils.generateUniqueSlug('dashboard-test-org')
    )
    orgId = org.id

    const project = await testDb.project.create({
      data: {
        name: 'Test Project',
        slug: TestUtils.generateUniqueSlug('test-project'),
        organizationId: orgId,
      },
    })
    projectId = project.id

    const vehicle = await createVehicle(`1HGBH41JXMN${Date.now().toString().slice(-6)}`)
    vehicleId = vehicle.id
  })

  afterAll(async () => {
    await testDb.report.deleteMany({ where: { organizationId: orgId } })
    await testDb.vehicle.deleteMany({ where: { id: vehicleId } })
    await TestUtils.cleanupUser(userId)
  })

  // -------------------------------------------------------------------------
  // Task 2.3: dashboard.stats integration test
  // Validates: Requirement 7.4
  // -------------------------------------------------------------------------

  describe('dashboard.stats', () => {
    it('returns correct counts after inserting known test data', async () => {
      const rpc = buildRpcCaller(userId, orgId)
      const now = new Date()

      for (let i = 0; i < 3; i++) {
        const v = await createVehicle(`STATS${i}${Date.now().toString().slice(-8)}`)
        await createReport(orgId, projectId, v.id, now)
      }

      const stats = await rpc.dashboard.stats()

      expect(stats.totalReports).toBeGreaterThanOrEqual(3)
      expect(stats.reportsThisMonth).toBeGreaterThanOrEqual(3)
      expect(stats.activeProjects).toBeGreaterThanOrEqual(1)
      expect(stats.creditsRemaining).toBeGreaterThanOrEqual(0)
      expect(typeof stats.planId).toBe('string')
    })

    it('does not include reports from a different org', async () => {
      const user2 = await TestUtils.createTestUser(
        TestUtils.generateUniqueEmail('dashboard-isolation')
      )
      const org2 = await OrganizationService.createOrganization(
        user2.id,
        'Other Org',
        TestUtils.generateUniqueSlug('other-org')
      )
      const project2 = await testDb.project.create({
        data: {
          name: 'Other Project',
          slug: TestUtils.generateUniqueSlug('other-project'),
          organizationId: org2.id,
        },
      })
      const v2 = await createVehicle(`ISOL${Date.now().toString().slice(-9)}`)
      await createReport(org2.id, project2.id, v2.id)

      const rpc1 = buildRpcCaller(userId, orgId)
      const rpc2 = buildRpcCaller(user2.id, org2.id)

      const stats1 = await rpc1.dashboard.stats()
      const stats2 = await rpc2.dashboard.stats()

      // The two orgs should have independent counts
      expect(stats1.totalReports).not.toBe(stats1.totalReports + stats2.totalReports)

      await testDb.report.deleteMany({ where: { organizationId: org2.id } })
      await testDb.vehicle.deleteMany({ where: { id: v2.id } })
      await TestUtils.cleanupUser(user2.id)
    })
  })

  // -------------------------------------------------------------------------
  // Task 3.3: dashboard.reportsOverTime integration test
  // Validates: Requirement 7.5
  // -------------------------------------------------------------------------

  describe('dashboard.reportsOverTime', () => {
    it('always returns exactly 30 entries', async () => {
      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.reportsOverTime()

      expect(result).toHaveLength(30)
    })

    it('zero-fills days with no reports', async () => {
      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.reportsOverTime()

      result.forEach((entry) => {
        expect(entry.count).toBeGreaterThanOrEqual(0)
      })

      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true)
      }
    })

    it('reflects reports inserted on specific dates', async () => {
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setUTCHours(12, 0, 0, 0)
      fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5)
      const targetDate = fiveDaysAgo.toISOString().slice(0, 10)

      const v = await createVehicle(`TIME${Date.now().toString().slice(-9)}`)
      await createReport(orgId, projectId, v.id, fiveDaysAgo)

      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.reportsOverTime()

      const entry = result.find((r) => r.date === targetDate)
      expect(entry).toBeDefined()
      expect(entry!.count).toBeGreaterThanOrEqual(1)

      await testDb.report.deleteMany({ where: { vehicleId: v.id } })
      await testDb.vehicle.deleteMany({ where: { id: v.id } })
    })
  })

  // -------------------------------------------------------------------------
  // Task 4.3: dashboard.reportsByProject integration test
  // Validates: Requirement 7.6
  // -------------------------------------------------------------------------

  describe('dashboard.reportsByProject', () => {
    it('includes all projects including those with 0 reports', async () => {
      const emptyProject = await testDb.project.create({
        data: {
          name: 'Empty Project',
          slug: TestUtils.generateUniqueSlug('empty-project'),
          organizationId: orgId,
        },
      })

      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.reportsByProject()

      const projectIds = result.map((r) => r.projectId)
      expect(projectIds).toContain(emptyProject.id)

      const emptyEntry = result.find((r) => r.projectId === emptyProject.id)
      expect(emptyEntry?.count).toBe(0)

      await testDb.project.delete({ where: { id: emptyProject.id } })
    })

    it('returns correct counts for projects with reports', async () => {
      const v = await createVehicle(`PROJ${Date.now().toString().slice(-9)}`)
      await createReport(orgId, projectId, v.id)

      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.reportsByProject()

      const entry = result.find((r) => r.projectId === projectId)
      expect(entry).toBeDefined()
      expect(entry!.count).toBeGreaterThanOrEqual(1)

      await testDb.report.deleteMany({ where: { vehicleId: v.id } })
      await testDb.vehicle.deleteMany({ where: { id: v.id } })
    })
  })

  // -------------------------------------------------------------------------
  // Task 5.3: dashboard.recentReports integration test
  // Validates: Requirement 7.7
  // -------------------------------------------------------------------------

  describe('dashboard.recentReports', () => {
    it('returns at most 10 reports', async () => {
      const vehicles: string[] = []
      await Promise.all(
        Array.from({ length: 15 }, async (_, i) => {
          const v = await createVehicle(`RCNT${i}${Date.now().toString().slice(-7)}`)
          vehicles.push(v.id)
          await createReport(orgId, projectId, v.id)
        })
      )

      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.recentReports()

      expect(result.length).toBeLessThanOrEqual(10)

      await testDb.report.deleteMany({ where: { vehicleId: { in: vehicles } } })
      await testDb.vehicle.deleteMany({ where: { id: { in: vehicles } } })
    }, 60000)

    it('returns reports ordered by createdAt descending', async () => {
      const dates = [
        new Date('2024-03-01'),
        new Date('2024-03-05'),
        new Date('2024-03-10'),
      ]
      const vehicles: string[] = []
      for (const date of dates) {
        const v = await createVehicle(`ORD${date.getDate()}${Date.now().toString().slice(-7)}`)
        vehicles.push(v.id)
        await createReport(orgId, projectId, v.id, date)
      }

      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.recentReports()

      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i].createdAt).getTime()
        )
      }

      await testDb.report.deleteMany({ where: { vehicleId: { in: vehicles } } })
      await testDb.vehicle.deleteMany({ where: { id: { in: vehicles } } })
    })

    it('includes vehicleName in "{year} {make} {model}" format', async () => {
      const v = await createVehicle(`FMT${Date.now().toString().slice(-10)}`)
      await createReport(orgId, projectId, v.id)

      const rpc = buildRpcCaller(userId, orgId)
      const result = await rpc.dashboard.recentReports()

      const entry = result.find((r) => r.vin === v.vin)
      expect(entry).toBeDefined()
      expect(entry!.vehicleName).toMatch(/^\d{4} \w+ \w+/)

      await testDb.report.deleteMany({ where: { vehicleId: v.id } })
      await testDb.vehicle.deleteMany({ where: { id: v.id } })
    })
  })
})
