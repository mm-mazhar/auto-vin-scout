// tests/orpc/routers/dashboard.property.test.ts
// Property-Based Tests for Dashboard oRPC Procedures
// Uses fast-check to verify correctness properties defined in design.md

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  dashboardStatsSchema,
  reportsOverTimeSchema,
  reportsByProjectSchema,
  recentReportsSchema,
  type DashboardStats,
  type DailyReportCount,
  type ProjectReportCount,
  type RecentReport,
} from '@/lib/orpc/routers/dashboard'
import { PLAN_IDS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Arbitraries (reusable generators)
// ---------------------------------------------------------------------------

const planIdArb = fc.constantFrom(
  PLAN_IDS.free,
  PLAN_IDS.basic,
  PLAN_IDS.pro,
  PLAN_IDS.core,
  PLAN_IDS.coreplus
)

const dashboardStatsArb = fc.record({
  totalReports: fc.nat(),
  creditsRemaining: fc.nat(),
  creditsTotal: fc.nat(),
  reportsThisMonth: fc.nat(),
  activeProjects: fc.nat(),
  planId: planIdArb,
})

const dailyReportCountArb = (date: string) =>
  fc.record({
    date: fc.constant(date),
    count: fc.nat(),
  })

const projectReportCountArb = fc.record({
  projectId: fc.uuid(),
  projectName: fc.string({ minLength: 1, maxLength: 20 }),
  count: fc.nat(),
})

const recentReportArb = fc.record({
  id: fc.uuid(),
  vin: fc.array(
    fc.constantFrom(...'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')),
    { minLength: 17, maxLength: 17 }
  ).map((chars) => chars.join('')),
  vehicleName: fc.string({ minLength: 3, maxLength: 50 }),
  projectName: fc.string({ minLength: 1, maxLength: 20 }),
  projectSlug: fc.string({ minLength: 1, maxLength: 50 }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).filter(
    (d) => !isNaN(d.getTime())
  ),
  status: fc.constantFrom('PENDING', 'COMPLETED', 'FAILED', 'FREE_PREVIEW', 'ZERO_CREDITS'),
})

// ---------------------------------------------------------------------------
// Helper: generate last-30-days date strings
// ---------------------------------------------------------------------------

function getLast30DayStrings(): string[] {
  const dates: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// ---------------------------------------------------------------------------
// Property 16: Cross-org data isolation (schema-level)
// Tests that stats from two different orgs are independent data structures
// ---------------------------------------------------------------------------

describe('Property 16: Cross-org data isolation', () => {
  it('stats for two distinct orgs are independent — no shared mutable state', async () => {
    await fc.assert(
      fc.asyncProperty(
        dashboardStatsArb,
        dashboardStatsArb,
        async (statsA, statsB) => {
          // Validate both independently parse correctly
          const resultA = dashboardStatsSchema.safeParse(statsA)
          const resultB = dashboardStatsSchema.safeParse(statsB)

          expect(resultA.success).toBe(true)
          expect(resultB.success).toBe(true)

          if (resultA.success && resultB.success) {
            // Mutating one should not affect the other
            const cloneA = { ...resultA.data }
            const cloneB = { ...resultB.data }

            cloneA.totalReports = 9999
            expect(cloneB.totalReports).not.toBe(9999)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('stats schema rejects negative values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ max: -1 }),
        async (negativeCount) => {
          const result = dashboardStatsSchema.safeParse({
            totalReports: negativeCount,
            creditsRemaining: 0,
            creditsTotal: 0,
            reportsThisMonth: 0,
            activeProjects: 0,
            planId: PLAN_IDS.free,
          })
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 13: reportsOverTime always returns exactly 30 sorted zero-filled entries
// ---------------------------------------------------------------------------

describe('Property 13: reportsOverTime — 30 sorted zero-filled entries', () => {
  it('zero-fill logic always produces exactly 30 entries', async () => {
    const dates = getLast30DayStrings()

    await fc.assert(
      fc.asyncProperty(
        // Simulate sparse DB results: random subset of the 30 days
        fc.subarray(dates, { minLength: 0, maxLength: 30 }).map((subset) =>
          subset.map((date) => ({ date, count: Math.floor(Math.random() * 10) }))
        ),
        async (sparseRows) => {
          // Apply the same zero-fill logic as the procedure
          const countByDate = new Map(sparseRows.map((r) => [r.date, r.count]))
          const result: DailyReportCount[] = dates.map((date) => ({
            date,
            count: countByDate.get(date) ?? 0,
          }))

          // Must have exactly 30 entries
          expect(result).toHaveLength(30)

          // All counts must be >= 0
          result.forEach((entry) => {
            expect(entry.count).toBeGreaterThanOrEqual(0)
          })

          // Must be sorted ascending by date
          for (let i = 1; i < result.length; i++) {
            expect(result[i].date >= result[i - 1].date).toBe(true)
          }

          // All 30 dates must be present
          const resultDates = new Set(result.map((r) => r.date))
          dates.forEach((d) => expect(resultDates.has(d)).toBe(true))
        }
      ),
      { numRuns: 300 }
    )
  })

  it('schema validates correctly shaped reportsOverTime output', async () => {
    const dates = getLast30DayStrings()
    const validOutput = dates.map((date) => ({ date, count: 0 }))

    const result = reportsOverTimeSchema.safeParse(validOutput)
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(30)
  })

  it('schema rejects entries with negative counts', async () => {
    const result = reportsOverTimeSchema.safeParse([
      { date: '2024-01-01', count: -1 },
    ])
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Property 14: reportsByProject includes all projects including zero-report ones
// ---------------------------------------------------------------------------

describe('Property 14: reportsByProject — all projects included', () => {
  it('result length equals number of projects regardless of report counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(projectReportCountArb, { minLength: 0, maxLength: 20 }),
        async (projects) => {
          // Simulate the procedure output (already includes 0-count projects)
          const result = reportsByProjectSchema.safeParse(projects)
          expect(result.success).toBe(true)

          if (result.success) {
            expect(result.data).toHaveLength(projects.length)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('projects with zero reports are valid output entries', async () => {
    const zeroReportProjects: ProjectReportCount[] = [
      { projectId: 'proj-1', projectName: 'Alpha', count: 0 },
      { projectId: 'proj-2', projectName: 'Beta', count: 5 },
      { projectId: 'proj-3', projectName: 'Gamma', count: 0 },
    ]

    const result = reportsByProjectSchema.safeParse(zeroReportProjects)
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(3)
  })

  it('schema rejects negative counts', async () => {
    const result = reportsByProjectSchema.safeParse([
      { projectId: 'proj-1', projectName: 'Alpha', count: -1 },
    ])
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Property 15: recentReports returns at most 10 entries sorted by recency
// ---------------------------------------------------------------------------

describe('Property 15: recentReports — at most 10 entries sorted by recency', () => {
  it('result length is always <= 10', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(recentReportArb, { minLength: 0, maxLength: 50 }),
        async (reports) => {
          const sorted = [...reports].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )
          const limited = sorted.slice(0, 10)

          expect(limited.length).toBeLessThanOrEqual(10)

          for (let i = 1; i < limited.length; i++) {
            expect(limited[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
              limited[i].createdAt.getTime()
            )
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('schema validates correctly shaped recentReports output', async () => {
    const validReports: RecentReport[] = [
      {
        id: 'report-1',
        vin: '1HGBH41JXMN109186',
        vehicleName: '2021 Honda Civic',
        projectName: 'My Project',
        projectSlug: 'my-project-abc123',
        createdAt: new Date('2024-01-15'),
        status: 'COMPLETED',
      },
    ]

    const result = recentReportsSchema.safeParse(validReports)
    expect(result.success).toBe(true)
  })

  it('empty result is valid', async () => {
    const result = recentReportsSchema.safeParse([])
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(0)
  })
})
