// lib/orpc/routers/dashboard.ts

import * as z from 'zod'
import { orgProcedure } from '../procedures'
import { PLAN_IDS, PRICING_PLANS, CREDITS_BASIC, type PlanId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const dashboardStatsSchema = z.object({
  totalReports: z.number().int().min(0),
  creditsRemaining: z.number().int().min(0),
  creditsTotal: z.number().int().min(0),
  reportsThisMonth: z.number().int().min(0),
  activeProjects: z.number().int().min(0),
  planId: z.string(),
})

export const dailyReportCountSchema = z.object({
  date: z.string(), // "YYYY-MM-DD"
  count: z.number().int().min(0),
})

export const reportsOverTimeSchema = z.array(dailyReportCountSchema)

export const projectReportCountSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  count: z.number().int().min(0),
})

export const reportsByProjectSchema = z.array(projectReportCountSchema)

export const recentReportSchema = z.object({
  id: z.string(),
  vin: z.string(),
  vehicleName: z.string(),
  projectName: z.string(),
  projectSlug: z.string(),
  createdAt: z.date(),
  status: z.string(),
})

export const recentReportsSchema = z.array(recentReportSchema)

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type DashboardStats = z.infer<typeof dashboardStatsSchema>
export type DailyReportCount = z.infer<typeof dailyReportCountSchema>
export type ProjectReportCount = z.infer<typeof projectReportCountSchema>
export type RecentReport = z.infer<typeof recentReportSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive planId and creditsTotal from org subscription record.
 * When no subscription exists but org has credits, it's a one-time Basic Report purchase.
 */
function resolvePlan(
  subscription: { planId: string } | null,
  orgCredits: number
): {
  planId: PlanId
  creditsTotal: number
} {
  if (!subscription) {
    // One-time Basic Report purchase: credits are on the org directly, no subscription row
    if (orgCredits > 0) {
      return { planId: PLAN_IDS.basic, creditsTotal: CREDITS_BASIC }
    }
    return { planId: PLAN_IDS.free, creditsTotal: 0 }
  }

  const matchedPlan = PRICING_PLANS.find(
    (p) => p.id === subscription.planId || p.stripePriceId === subscription.planId
  )

  return {
    planId: (matchedPlan?.id ?? PLAN_IDS.free) as PlanId,
    creditsTotal: matchedPlan?.credits ?? 0,
  }
}

/**
 * Zero-fill a date range so every day in the last N days is represented.
 * Returns exactly N entries sorted ascending by date.
 */
function zeroFillDays(
  rows: { date: string; count: number }[],
  days: number
): DailyReportCount[] {
  const countByDate = new Map(rows.map((r) => [r.date, r.count]))
  const result: DailyReportCount[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    result.push({ date: dateStr, count: countByDate.get(dateStr) ?? 0 })
  }

  return result
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const dashboardRouter = {
  /**
   * Returns org-scoped KPI stats: total reports, credits, projects, plan info.
   * Requirements: 7.4, 11.1, 11.2
   */
  stats: orgProcedure
    .output(dashboardStatsSchema)
    .handler(async ({ context }) => {
      const { db, orgId } = context

      const now = new Date()
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

      const [totalReports, reportsThisMonth, activeProjects, org] = await Promise.all([
        db.report.count({ where: { organizationId: orgId } }),
        db.report.count({
          where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
        }),
        db.project.count({ where: { organizationId: orgId } }),
        db.organization.findUnique({
          where: { id: orgId },
          select: { credits: true, subscription: { select: { planId: true } } },
        }),
      ])

      const { planId, creditsTotal } = resolvePlan(org?.subscription ?? null, org?.credits ?? 0)
      const creditsRemaining = Math.max(0, org?.credits ?? 0)

      return {
        totalReports,
        creditsRemaining,
        creditsTotal,
        reportsThisMonth,
        activeProjects,
        planId,
      }
    }),

  /**
   * Returns report counts for each of the last N days, zero-filled.
   * Accepts optional `days` input (default 30, max 90).
   * Requirements: 7.5, 11.2
   */
  reportsOverTime: orgProcedure
    .input(z.object({ days: z.number().int().min(7).max(90).default(30) }).optional())
    .output(reportsOverTimeSchema)
    .handler(async ({ context, input }) => {
      const { db, orgId } = context
      const days = input?.days ?? 30

      const startDate = new Date()
      startDate.setUTCHours(0, 0, 0, 0)
      startDate.setUTCDate(startDate.getUTCDate() - (days - 1))

      const rows = await db.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COUNT(*)::bigint AS count
        FROM "Report"
        WHERE "organizationId" = ${orgId}
          AND "createdAt" >= ${startDate}
        GROUP BY date
        ORDER BY date ASC
      `

      const normalized = rows.map((r) => ({
        date: r.date,
        count: Number(r.count),
      }))

      return zeroFillDays(normalized, days)
    }),

  /**
   * Returns report counts grouped by project (includes projects with 0 reports).
   * Requirements: 7.6, 11.2
   */
  reportsByProject: orgProcedure
    .output(reportsByProjectSchema)
    .handler(async ({ context }) => {
      const { db, orgId } = context

      const projects = await db.project.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          _count: { select: { reports: true } },
        },
        orderBy: { createdAt: 'asc' },
      })

      return projects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        count: p._count.reports,
      }))
    }),

  /**
   * Returns the 10 most recent reports for the org.
   * Requirements: 7.7, 11.2
   */
  recentReports: orgProcedure
    .output(recentReportsSchema)
    .handler(async ({ context }) => {
      const { db, orgId } = context

      const reports = await db.report.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
          vehicle: { select: { vin: true, year: true, make: true, model: true } },
          project: { select: { name: true, slug: true } },
        },
      })

      return reports.map((r) => ({
        id: r.id,
        vin: r.vehicle.vin,
        vehicleName: `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`,
        projectName: r.project.name,
        projectSlug: r.project.slug,
        createdAt: r.createdAt,
        status: r.status,
      }))
    }),
}
