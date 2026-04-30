// tests/integration/job-queue.property.test.ts
// Property-Based Tests for JobQueueService

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { testDb, TestUtils } from './setup'
import {
  enqueueReportJob,
  acquireJobSlot,
  completeJob,
  failJob,
  retryStaleJobs,
} from '@/lib/services/job-queue'

describe('Property 5: Job Serialization', () => {
  let testUser: Awaited<ReturnType<typeof TestUtils.createTestUser>>
  let testOrg: Awaited<ReturnType<typeof testDb.organization.create>>
  let testProject: Awaited<ReturnType<typeof testDb.project.create>>

  beforeEach(async () => {
    testUser = await TestUtils.createTestUser()
    testOrg = await testDb.organization.create({
      data: {
        name: 'Test Org',
        slug: TestUtils.generateUniqueSlug('jq-test'),
        credits: 10,
        members: { create: { userId: testUser.id, role: 'OWNER' } },
      },
    })
    testProject = await testDb.project.create({
      data: {
        name: 'Test Project',
        slug: TestUtils.generateUniqueSlug('jq-proj'),
        organizationId: testOrg.id,
      },
    })
  })

  afterEach(async () => {
    await testDb.jobQueue.deleteMany({ where: { orgId: testOrg.id } })
    await testDb.report.deleteMany({ where: { organizationId: testOrg.id } })
    await testDb.recall.deleteMany({})
    // Only delete vehicles that have no remaining reports (safe cleanup)
    await testDb.vehicle.deleteMany({
      where: { reports: { none: {} } },
    })
    await testDb.project.deleteMany({ where: { id: testProject.id } })
    await TestUtils.cleanupOrganization(testOrg.id)
    await TestUtils.cleanupUser(testUser.id)
  })

  it('at most one job reaches PROCESSING for any org at any time', async () => {
    // #given: 2-5 jobs submitted for the same org
    const numJobsArb = fc.integer({ min: 2, max: 5 })

    await fc.assert(
      fc.asyncProperty(numJobsArb, async (numJobs) => {
        const jobIds: string[] = []
        const vehicleIds: string[] = []

        for (let i = 0; i < numJobs; i++) {
          const { vehicle, report } = await testDb.$transaction(async (tx) => {
            const vehicle = await tx.vehicle.create({
              data: {
                vin: `JQTEST${Date.now()}${Math.random().toString(36).slice(2, 7)}${i}`,
                make: 'Toyota',
                model: 'Camry',
                year: 2020,
              },
            })
            const report = await tx.report.create({
              data: {
                status: 'PENDING',
                organizationId: testOrg.id,
                projectId: testProject.id,
                vehicleId: vehicle.id,
              },
            })
            return { vehicle, report }
          })
          vehicleIds.push(vehicle.id)
          const jobId = await enqueueReportJob(report.id, testOrg.id)
          jobIds.push(jobId)
        }

        // #when: jobs attempt to acquire the slot sequentially
        // (mirrors the real production pattern — after() callbacks run one at a time)
        const results: boolean[] = []
        for (const jobId of jobIds) {
          results.push(await acquireJobSlot(testOrg.id, jobId))
        }

        // #then: exactly one job acquired the slot
        const acquiredCount = results.filter(Boolean).length
        expect(acquiredCount).toBeLessThanOrEqual(1)

        // Verify DB state matches
        const processingJobs = await testDb.jobQueue.count({
          where: { orgId: testOrg.id, status: 'PROCESSING' },
        })
        expect(processingJobs).toBeLessThanOrEqual(1)

        // Cleanup for next iteration — order matters: children before parents
        await testDb.jobQueue.deleteMany({ where: { orgId: testOrg.id } })
        await testDb.report.deleteMany({ where: { organizationId: testOrg.id } })
        await testDb.recall.deleteMany({})
        await testDb.vehicle.deleteMany({ where: { id: { in: vehicleIds } } })
      }),
      { numRuns: 5 }
    )
  }, 60000)

  it('completeJob sets status to COMPLETED', async () => {
    // #given: a job in PROCESSING state
    const { vehicle, report } = await testDb.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: { vin: `JQCOMPLETE${Date.now()}`, make: 'Ford', model: 'F-150', year: 2021 },
      })
      const report = await tx.report.create({
        data: {
          status: 'PENDING',
          organizationId: testOrg.id,
          projectId: testProject.id,
          vehicleId: vehicle.id,
        },
      })
      return { vehicle, report }
    })
    const jobId = await enqueueReportJob(report.id, testOrg.id)
    await acquireJobSlot(testOrg.id, jobId)

    // #when: job completes
    await completeJob(jobId)

    // #then: status is COMPLETED with completedAt set
    const job = await testDb.jobQueue.findUnique({ where: { id: jobId } })
    expect(job?.status).toBe('COMPLETED')
    expect(job?.completedAt).not.toBeNull()
  })

  it('failJob sets status to FAILED with error message', async () => {
    // #given: a job in PROCESSING state
    const { report } = await testDb.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: { vin: `JQFAIL${Date.now()}`, make: 'Ford', model: 'F-150', year: 2021 },
      })
      const report = await tx.report.create({
        data: {
          status: 'PENDING',
          organizationId: testOrg.id,
          projectId: testProject.id,
          vehicleId: vehicle.id,
        },
      })
      return { report }
    })
    const jobId = await enqueueReportJob(report.id, testOrg.id)
    await acquireJobSlot(testOrg.id, jobId)

    // #when: job fails
    await failJob(jobId, 'Something went wrong')

    // #then: status is FAILED with error message
    const job = await testDb.jobQueue.findUnique({ where: { id: jobId } })
    expect(job?.status).toBe('FAILED')
    expect(job?.errorMsg).toBe('Something went wrong')
  })

  it('retryStaleJobs resets PROCESSING jobs older than 5 minutes to PENDING', async () => {
    // #given: a job stuck in PROCESSING for > 5 minutes
    const { report } = await testDb.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: { vin: `JQSTALE${Date.now()}`, make: 'Ford', model: 'F-150', year: 2021 },
      })
      const report = await tx.report.create({
        data: {
          status: 'PENDING',
          organizationId: testOrg.id,
          projectId: testProject.id,
          vehicleId: vehicle.id,
        },
      })
      return { report }
    })
    const jobId = await enqueueReportJob(report.id, testOrg.id)

    // Manually set to PROCESSING with a stale startedAt
    const staleTime = new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago
    await testDb.jobQueue.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: staleTime },
    })

    // #when: retryStaleJobs runs
    await retryStaleJobs()

    // #then: job is reset to PENDING
    const job = await testDb.jobQueue.findUnique({ where: { id: jobId } })
    expect(job?.status).toBe('PENDING')
    expect(job?.startedAt).toBeNull()
  })
})
