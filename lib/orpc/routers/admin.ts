// lib/orpc/routers/admin.ts

import * as z from 'zod'
import { superAdminProcedure } from '../procedures'
import { PRICING_PLANS, PLAN_IDS } from '@/lib/constants'

/**
 * Admin Router - Super Admin functionality for system-wide management
 * All procedures use superAdminProcedure for authorization
 */
export const adminRouter = {
  /**
   * Get dashboard statistics
   * Returns total users, organizations, active subscriptions, and revenue metrics
   */
  getDashboardStats: superAdminProcedure
    .route({
      method: 'GET',
      path: '/admin/stats',
      summary: 'Get dashboard stats',
      description: 'Returns system-wide statistics for super admin dashboard',
      tags: ['Admin'],
    })
    .handler(async ({ context }) => {
      const { db } = context
      // const now = new Date()
      
      // System health check
      const start = performance.now()
      let dbStatus: 'online' | 'degraded' | 'offline' = 'online'
      try { 
        await db.$queryRaw`SELECT 1` 
      } catch { 
        dbStatus = 'offline' 
      }
      const latency = Math.round(performance.now() - start)

      // Get pricing plans
      const proPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.pro)
      const proPlusPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.proplus)

      // Fetch counts in parallel
      const [totalUsers, totalOrgs, proSubCount, proPlusSubCount] = await Promise.all([
        db.user.count(),
        db.organization.count({ where: { deletedAt: null } }),
        proPlan 
          ? db.subscription.count({ 
              where: { status: 'active', planId: proPlan.stripePriceId } 
            })
          : Promise.resolve(0),
        proPlusPlan 
          ? db.subscription.count({ 
              where: { status: 'active', planId: proPlusPlan.stripePriceId } 
            })
          : Promise.resolve(0),
      ])

      // Calculate revenue
      const proRevenue = proSubCount * Number(proPlan?.price || 0)
      const proPlusRevenue = proPlusSubCount * Number(proPlusPlan?.price || 0)
      const totalRevenue = proRevenue + proPlusRevenue

      // Growth percentage (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const newUsersCount = await db.user.count({ 
        where: { createdAt: { gte: thirtyDaysAgo } } 
      })
      const growthPercentage = (totalUsers - newUsersCount) > 0 
        ? ((newUsersCount / (totalUsers - newUsersCount)) * 100).toFixed(1) 
        : '100'

      return {
        totalUsers,
        totalOrgs,
        activeProCount: proSubCount,
        activeProPlusCount: proPlusSubCount,
        proRevenue,
        proPlusRevenue,
        totalRevenue,
        growthPercentage,
        health: { database: dbStatus, latency },
      }
    }),

  /**
   * List users with pagination and search
   * Supports search by name or email
   */
  listUsers: superAdminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      query: z.string().optional(),
    }))
    .route({
      method: 'GET',
      path: '/admin/users',
      summary: 'List users',
      description: 'Returns paginated list of users with search',
      tags: ['Admin'],
    })
    .handler(async ({ input, context }) => {
      const { db } = context
      const { page, limit, query } = input
      const skip = (page - 1) * limit

      const whereClause = query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        db.user.findMany({
          where: whereClause,
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        }),
        db.user.count({ where: whereClause }),
      ])

      return {
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          colorScheme: u.colorScheme,
          createdAt: u.createdAt,
          membershipCount: u._count.memberships,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }),


  /**
   * List organizations with pagination and search
   * Returns orgs with member/project counts and subscription status
   */
  listOrganizations: superAdminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      query: z.string().optional(),
    }))
    .route({
      method: 'GET',
      path: '/admin/organizations',
      summary: 'List organizations',
      description: 'Returns paginated list of organizations',
      tags: ['Admin'],
    })
    .handler(async ({ input, context }) => {
      const { db } = context
      const { page, limit, query } = input
      const skip = (page - 1) * limit

      const whereClause = query 
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { slug: { contains: query, mode: 'insensitive' as const } },
            ],
            deletedAt: null,
          } 
        : { deletedAt: null }

      const [orgs, total] = await Promise.all([
        db.organization.findMany({
          where: whereClause,
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { members: true, projects: true } },
            subscription: { select: { planId: true, status: true } },
          },
        }),
        db.organization.count({ where: whereClause }),
      ])

      return {
        organizations: orgs.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          credits: org.credits,
          createdAt: org.createdAt,
          memberCount: org._count.members,
          projectCount: org._count.projects,
          subscription: org.subscription 
            ? { planId: org.subscription.planId, status: org.subscription.status }
            : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }),

  /**
   * Get organization details
   * Returns org with members, projects, subscription, and invoice history
   */
  getOrganizationDetails: superAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .route({
      method: 'GET',
      path: '/admin/organization/details',
      summary: 'Get organization details',
      description: 'Returns detailed organization information',
      tags: ['Admin'],
    })
    .handler(async ({ input, context }) => {
      const { db } = context
      
      const org = await db.organization.findUnique({
        where: { id: input.orgId },
        include: {
          subscription: true,
          members: { 
            include: { user: true },
            orderBy: { createdAt: 'asc' },
          },
          projects: { 
            orderBy: { createdAt: 'desc' }, 
            take: 10,
          },
          invites: { 
            where: { status: 'PENDING' },
          },
        },
      })

      if (!org) {
        const { ORPCError } = await import('../server')
        throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
      }

      // Fetch Stripe invoices if customer exists
      let invoices: Array<{
        id: string
        amountPaid: number
        currency: string
        status: string | null
        hostedInvoiceUrl: string | null
        number: string | null
        created: number | null
      }> = []

      if (org.stripeCustomerId) {
        try {
          const { stripe } = await import('@/app/lib/stripe')
          const list = await stripe.invoices.list({ 
            customer: org.stripeCustomerId, 
            limit: 12,
          })
          invoices = list.data.map((inv) => ({
            id: inv.id,
            amountPaid: typeof inv.amount_paid === 'number' ? inv.amount_paid : 0,
            currency: inv.currency || 'usd',
            status: inv.status || null,
            hostedInvoiceUrl: inv.hosted_invoice_url || null,
            number: (inv.number as string | null) || null,
            created: typeof inv.created === 'number' ? inv.created : null,
          }))
        } catch (error) {
          console.error('Failed to fetch Stripe invoices:', error)
        }
      }

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        credits: org.credits,
        stripeCustomerId: org.stripeCustomerId,
        createdAt: org.createdAt,
        members: org.members.map(m => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt,
          user: {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
          },
        })),
        projects: org.projects.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          createdAt: p.createdAt,
        })),
        subscription: org.subscription 
          ? {
              stripeSubscriptionId: org.subscription.stripeSubscriptionId,
              planId: org.subscription.planId,
              status: org.subscription.status,
              currentPeriodEnd: org.subscription.currentPeriodEnd,
              createdAt: org.subscription.createdAt,
            }
          : null,
        pendingInvites: org.invites.length,
        invoices,
      }
    }),


  /**
   * List subscriptions with pagination and search
   * Returns paginated subscriptions with organization details
   */
  listSubscriptions: superAdminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      query: z.string().optional(),
    }))
    .handler(async ({ input, context }) => {
      const { db } = context
      const { page, limit, query } = input
      const skip = (page - 1) * limit

      const whereClause = query
        ? {
            OR: [
              { organization: { name: { contains: query, mode: 'insensitive' as const } } },
              { planId: { contains: query, mode: 'insensitive' as const } },
              { status: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}

      const [subs, total] = await Promise.all([
        db.subscription.findMany({
          where: whereClause,
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        }),
        db.subscription.count({ where: whereClause }),
      ])

      return {
        subscriptions: subs.map(sub => ({
          stripeSubscriptionId: sub.stripeSubscriptionId,
          planId: sub.planId,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          createdAt: sub.createdAt,
          organization: sub.organization 
            ? { id: sub.organization.id, name: sub.organization.name }
            : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    }),

  /**
   * Get system health status
   * Returns database status and latency metrics
   */
  getSystemHealth: superAdminProcedure
    .handler(async ({ context }) => {
      const { db } = context
      
      const start = performance.now()
      let dbStatus: 'online' | 'degraded' | 'offline' = 'online'
      
      try { 
        await db.$queryRaw`SELECT 1` 
      } catch { 
        dbStatus = 'offline' 
      }
      
      const latency = Math.round(performance.now() - start)

      return {
        database: dbStatus,
        latency,
        timestamp: new Date().toISOString(),
      }
    }),

  /**
   * Get recent activity feed
   * Returns recent users, orgs, subscriptions, and projects
   */
  getRecentActivity: superAdminProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(20).default(6),
    }))
    .handler(async ({ input, context }) => {
      const { db } = context
      const { limit } = input

      const [newUsers, newOrgs, newSubs, newProjects] = await Promise.all([
        db.user.findMany({ 
          take: 4, 
          orderBy: { createdAt: 'desc' }, 
          select: { id: true, name: true, email: true, createdAt: true },
        }),
        db.organization.findMany({ 
          take: 4, 
          orderBy: { createdAt: 'desc' }, 
          where: { deletedAt: null }, 
          select: { id: true, name: true, createdAt: true },
        }),
        db.subscription.findMany({ 
          take: 4, 
          orderBy: { createdAt: 'desc' }, 
          where: { status: 'active' }, 
          select: { 
            stripeSubscriptionId: true, 
            planId: true, 
            createdAt: true, 
            organization: { select: { name: true } },
          },
        }),
        db.project.findMany({ 
          take: 4, 
          orderBy: { createdAt: 'desc' }, 
          select: { 
            id: true, 
            name: true, 
            createdAt: true, 
            organization: { select: { name: true } },
          },
        }),
      ])

      // Build activity items
      type ActivityItem = {
        id: string
        type: 'user_join' | 'org_create' | 'sub_new' | 'project_create'
        title: string
        description: string
        createdAt: Date
      }

      const activities: ActivityItem[] = []

      newUsers.forEach(u => activities.push({
        id: `u-${u.id}`,
        type: 'user_join',
        title: u.name || 'New User',
        description: u.email,
        createdAt: u.createdAt,
      }))

      newOrgs.forEach(o => activities.push({
        id: `o-${o.id}`,
        type: 'org_create',
        title: o.name,
        description: 'New Workspace created',
        createdAt: o.createdAt,
      }))

      newSubs.forEach(s => {
        const plan = PRICING_PLANS.find(p => p.stripePriceId === s.planId)
        activities.push({
          id: `s-${s.stripeSubscriptionId}`,
          type: 'sub_new',
          title: s.organization?.name || 'Unknown Org',
          description: `Upgraded to ${plan?.title || 'Pro'}`,
          createdAt: s.createdAt,
        })
      })

      newProjects.forEach(p => activities.push({
        id: `p-${p.id}`,
        type: 'project_create',
        title: p.name,
        description: `In ${p.organization?.name || 'Workspace'}`,
        createdAt: p.createdAt,
      }))

      // Sort by date and limit
      return activities
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
    }),

  /**
   * Get user and revenue chart data for the last 12 months
   */
  getChartData: superAdminProcedure
    .handler(async ({ context }) => {
      const { db } = context
      const now = new Date()
      
      // Timeline data (Last 12 Months)
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(now.getMonth() - 11)
      twelveMonthsAgo.setDate(1)

      const revenueData: Array<{ month: string; value: number }> = []
      const userData: Array<{ month: string; value: number }> = []
      const monthIndexMap: Record<string, number> = {}

      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStr = d.toLocaleString('default', { month: 'short' })
        const yearStr = d.getFullYear().toString().slice(-2)
        const label = `${monthStr} '${yearStr}`
        revenueData.unshift({ month: label, value: 0 })
        userData.unshift({ month: label, value: 0 })
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthIndexMap[key] = 11 - i
      }

      const proPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.pro)
      const proPlusPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.proplus)

      const [subRevenueRowsPro, subRevenueRowsProPlus, userGrowthRows] = await Promise.all([
        proPlan
          ? db.$queryRaw<{ month: Date; count: bigint }[]>`
              SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
              FROM "Subscription"
              WHERE "status" = 'active'
                AND "createdAt" >= ${twelveMonthsAgo}
                AND "planId" = ${proPlan.stripePriceId}
              GROUP BY month
              ORDER BY month
            `
          : Promise.resolve([] as { month: Date; count: bigint }[]),
        proPlusPlan
          ? db.$queryRaw<{ month: Date; count: bigint }[]>`
              SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
              FROM "Subscription"
              WHERE "status" = 'active'
                AND "createdAt" >= ${twelveMonthsAgo}
                AND "planId" = ${proPlusPlan.stripePriceId}
              GROUP BY month
              ORDER BY month
            `
          : Promise.resolve([] as { month: Date; count: bigint }[]),
        db.$queryRaw<{ month: Date; count: bigint }[]>`
          SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
          FROM "User"
          WHERE "createdAt" >= ${twelveMonthsAgo}
          GROUP BY month
          ORDER BY month
        `,
      ])

      subRevenueRowsPro.forEach(row => {
        const d = new Date(row.month)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const index = monthIndexMap[key]
        if (index === undefined) return
        const count = Number(row.count)
        if (proPlan) {
          revenueData[index].value += count * Number(proPlan.price)
        }
      })

      subRevenueRowsProPlus.forEach(row => {
        const d = new Date(row.month)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const index = monthIndexMap[key]
        if (index === undefined) return
        const count = Number(row.count)
        if (proPlusPlan) {
          revenueData[index].value += count * Number(proPlusPlan.price)
        }
      })

      userGrowthRows.forEach(row => {
        const d = new Date(row.month)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const index = monthIndexMap[key]
        if (index === undefined) return
        userData[index].value += Number(row.count)
      })

      return {
        revenueChart: revenueData,
        userChart: userData,
      }
    }),
}
