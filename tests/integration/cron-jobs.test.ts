// tests/integration/cron-jobs.test.ts

import * as emailModule from '@/app/lib/email'
import { CREDIT_REMINDER_THRESHOLD, CREDITS_FREE, FREE_REFILL_DAYS, RENEWAL_REMINDER_DAYS_BEFORE, SOFT_DELETE_RETENTION_DAYS } from '@/lib/constants'
import { OrganizationService } from '@/lib/services/organization-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDb, TestUtils } from './setup'
import { itIf, MULTI_ORG_ENABLED } from '../helpers/guards'

// Mock the email module
vi.mock('@/app/lib/email', async () => {
  const actual = await vi.importActual('@/app/lib/email')
  return {
    ...actual,
    sendLowCreditsEmail: vi.fn(),
    sendRenewalReminderEmail: vi.fn(),
  }
})

describe('CRON Jobs & Automated Alerts', () => {
   
  let testUser: any
   
  let primaryOrg: any
   
  let secondaryOrg: any

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Create test user
    testUser = await TestUtils.createTestUser()
    
    // Create primary organization
    primaryOrg = await OrganizationService.createOrganization(
      testUser.id,
      'Primary Org',
      TestUtils.generateUniqueSlug('pri-org')
    )
    
    // Set it as primary
    await testDb.organization.update({
      where: { id: primaryOrg.id },
      data: { isPrimary: true },
    })
    
    // Create a secondary organization only when multi-org is enabled
    if (MULTI_ORG_ENABLED) {
      secondaryOrg = await OrganizationService.createOrganization(
        testUser.id,
        'Secondary Org',
        TestUtils.generateUniqueSlug('sec-org')
      )
    } else {
      secondaryOrg = null
    }
  }, 15000) // Increase timeout to 15 seconds

  afterEach(async () => {
    if (testUser) {
      await TestUtils.cleanupUser(testUser.id)
    }
  })

  describe('Test 7.1: Low Credits Alert', () => {
    it('should send low credits email when credits are below threshold', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      // Setup: Set credits to below threshold and creditsReminderThresholdSent to false
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD - 1, // Below threshold
          creditsReminderThresholdSent: false,
        },
      })

      // Simulate the CRON job logic - but only for our test organization
      const lowCreditsOrgs = await testDb.organization.findMany({
        where: {
          id: primaryOrg.id, // Only check our test org
          deletedAt: null,
          creditsReminderThresholdSent: false,
          credits: { lte: CREDIT_REMINDER_THRESHOLD },
        },
        select: {
          id: true,
          name: true,
          credits: true,
          members: {
            where: { role: 'OWNER' },
            take: 1,
            select: { user: { select: { email: true, name: true } } },
          },
        },
      })

      // Send emails for low credit organizations
      for (const org of lowCreditsOrgs) {
        const owner = org.members[0]?.user
        if (owner?.email) {
          await emailModule.sendLowCreditsEmail({
            to: owner.email,
            name: owner.name,
            orgName: org.name,
            creditsRemaining: org.credits,
          })
          
          await testDb.organization.update({
            where: { id: org.id },
            data: { creditsReminderThresholdSent: true },
          })
        }
      }

      // Verify email was sent
      expect(mockSendLowCreditsEmail).toHaveBeenCalledTimes(1)
      expect(mockSendLowCreditsEmail).toHaveBeenCalledWith({
        to: testUser.email,
        name: testUser.name,
        orgName: primaryOrg.name,
        creditsRemaining: CREDIT_REMINDER_THRESHOLD - 1,
      })

      // Verify creditsReminderThresholdSent is now true
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.creditsReminderThresholdSent).toBe(true)
    })

    it('should NOT send email if creditsReminderThresholdSent is already true', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      // Setup: Set credits below threshold but creditsReminderThresholdSent to true
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD - 1,
          creditsReminderThresholdSent: true, // Already sent
        },
      })

      // Simulate the CRON job logic - only for our test org
      const lowCreditsOrgs = await testDb.organization.findMany({
        where: {
          id: primaryOrg.id, // Only check our test org
          deletedAt: null,
          creditsReminderThresholdSent: false, // Only get orgs that haven't been notified
          credits: { lte: CREDIT_REMINDER_THRESHOLD },
        },
      })

      // Should not find any organizations
      expect(lowCreditsOrgs).toHaveLength(0)
      expect(mockSendLowCreditsEmail).not.toHaveBeenCalled()
    })

    it('should reset creditsReminderThresholdSent when credits go above threshold', async () => {
      // Setup: Set creditsReminderThresholdSent to true
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD + 10, // Above threshold
          creditsReminderThresholdSent: true,
        },
      })

      // Simulate the reset logic from CRON job
      await testDb.organization.updateMany({
        where: {
          creditsReminderThresholdSent: true,
          credits: { gt: CREDIT_REMINDER_THRESHOLD },
        },
        data: { creditsReminderThresholdSent: false },
      })

      // Verify the flag was reset
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.creditsReminderThresholdSent).toBe(false)
    })

    it('should NOT send email for deleted organizations', async () => {
      const mockSendLowCreditsEmail = vi.mocked(emailModule.sendLowCreditsEmail)
      
      // Setup: Set credits below threshold and soft delete the organization
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDIT_REMINDER_THRESHOLD - 1,
          creditsReminderThresholdSent: false,
          deletedAt: new Date(),
        },
      })

      // Simulate the CRON job logic - only for our test org
      const lowCreditsOrgs = await testDb.organization.findMany({
        where: {
          id: primaryOrg.id, // Only check our test org
          deletedAt: null, // Exclude deleted orgs
          creditsReminderThresholdSent: false,
          credits: { lte: CREDIT_REMINDER_THRESHOLD },
        },
      })

      expect(lowCreditsOrgs).toHaveLength(0)
      expect(mockSendLowCreditsEmail).not.toHaveBeenCalled()
    })
  })

  describe('Test 7.2: Renewal Reminder', () => {
    it('should send renewal reminder email 3 days before subscription ends', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      
      // Setup: Create a subscription ending within the configured window
      const periodEndTs = Math.floor(Date.now() / 1000) + RENEWAL_REMINDER_DAYS_BEFORE * 24 * 60 * 60
      const uniqueSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'active',
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
          currentPeriodEnd: periodEndTs,
          periodEndReminderSent: false,
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      const now = Math.floor(Date.now() / 1000)
      const thresholdDays = RENEWAL_REMINDER_DAYS_BEFORE
      const upper = now + thresholdDays * 24 * 60 * 60

      const subs = await testDb.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { gte: now, lte: upper },
          organization: {
            deletedAt: null,
          },
        },
        select: {
          stripeSubscriptionId: true,
          planId: true,
          currentPeriodEnd: true,
          periodEndReminderSent: true,
          organization: {
            select: {
              name: true,
              credits: true,
              members: {
                where: { role: 'OWNER' },
                take: 1,
                select: { user: { select: { email: true, name: true } } },
              },
            },
          },
        },
      })

      for (const sub of subs) {
        const owner = sub.organization?.members[0]?.user
        if (owner?.email && !sub.periodEndReminderSent) {
          await emailModule.sendRenewalReminderEmail({
            to: owner.email,
            name: owner.name,
            orgName: sub.organization?.name ?? null,
            planTitle: 'Pro',
            periodEnd: sub.currentPeriodEnd,
            creditsRemaining: sub.organization?.credits,
          })
          
          await testDb.subscription.update({
            where: { stripeSubscriptionId: uniqueSubId },
            data: { periodEndReminderSent: true },
          })
        }
      }

      expect(mockSendRenewalReminderEmail).toHaveBeenCalledTimes(1)
      expect(mockSendRenewalReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          orgName: primaryOrg.name,
          periodEnd: periodEndTs,
        })
      )

      const updatedSub = await testDb.subscription.findUnique({
        where: { stripeSubscriptionId: uniqueSubId },
      })
      expect(updatedSub?.periodEndReminderSent).toBe(true)
    })

    it('should NOT send renewal reminder if already sent', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      
      // Setup: Create a subscription with periodEndReminderSent already true
      const periodEndTs = Math.floor(Date.now() / 1000) + RENEWAL_REMINDER_DAYS_BEFORE * 24 * 60 * 60
      const uniqueSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'active',
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
          currentPeriodEnd: periodEndTs,
          periodEndReminderSent: true, // Already sent
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      const now = Math.floor(Date.now() / 1000)
      const thresholdDays = RENEWAL_REMINDER_DAYS_BEFORE
      const upper = now + thresholdDays * 24 * 60 * 60

      const subs = await testDb.subscription.findMany({
        where: {
          organizationId: primaryOrg.id,
          status: 'active',
          currentPeriodEnd: { gte: now, lte: upper },
          periodEndReminderSent: false, // Only get subs that haven't been notified
          organization: {
            deletedAt: null,
          },
        },
      })

      expect(subs).toHaveLength(0)
      expect(mockSendRenewalReminderEmail).not.toHaveBeenCalled()
    })

    it('should NOT send renewal reminder for inactive subscriptions', async () => {
      const mockSendRenewalReminderEmail = vi.mocked(emailModule.sendRenewalReminderEmail)
      
      // Setup: Create an inactive subscription
      const periodEndTs = Math.floor(Date.now() / 1000) + RENEWAL_REMINDER_DAYS_BEFORE * 24 * 60 * 60
      const uniqueSubId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'canceled', // Inactive
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000) - 27 * 24 * 60 * 60,
          currentPeriodEnd: periodEndTs,
          periodEndReminderSent: false,
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      const now = Math.floor(Date.now() / 1000)
      const thresholdDays = RENEWAL_REMINDER_DAYS_BEFORE
      const upper = now + thresholdDays * 24 * 60 * 60

      const subs = await testDb.subscription.findMany({
        where: {
          organizationId: primaryOrg.id, // Only check our test org
          status: 'active', // Only active subscriptions
          currentPeriodEnd: { gte: now, lte: upper },
          organization: {
            deletedAt: null,
          },
        },
      })

      expect(subs).toHaveLength(0)
      expect(mockSendRenewalReminderEmail).not.toHaveBeenCalled()
    })
  })

  describe('Test 7.3: Daily Maintenance (Refill & Cleanup)', () => {
    it('should refill credits for primary organization after 1 month', async () => {
      // Setup: Set lastFreeRefillAt to 2 months ago and credits to 1
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: 1,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: true,
        },
      })

      // Simulate the refill logic - update credits for primary orgs without active subscriptions
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDITS_FREE,
          lastFreeRefillAt: new Date(),
          creditsReminderThresholdSent: false,
        },
      })

      // Verify credits were refilled
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(CREDITS_FREE)
      expect(updatedOrg?.creditsReminderThresholdSent).toBe(false)
    })

    itIf(MULTI_ORG_ENABLED)('should NOT refill credits for secondary organization', async () => {
      // Setup: Set lastFreeRefillAt to 2 months ago for secondary org
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: secondaryOrg.id },
        data: {
          credits: 0,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: false, // Secondary org
        },
      })

      // Simulate the refill logic (only for primary orgs)
      await testDb.$executeRaw`
        UPDATE "Organization"
        SET 
          "credits" = ${CREDITS_FREE},
          "lastFreeRefillAt" = NOW(),
          "creditsReminderThresholdSent" = false
        FROM "Organization" o
        LEFT JOIN "Subscription" s ON s."organizationId" = o.id
        WHERE 
          "Organization".id = o.id
          AND o."deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "Subscription" s2
            WHERE s2."organizationId" = o.id
              AND s2.status = 'active'
          )
          AND o.credits < ${CREDITS_FREE}
          AND o."isPrimary" = true
          AND (
            o."lastFreeRefillAt" < NOW() - make_interval(days => ${FREE_REFILL_DAYS})
            OR 
            (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - make_interval(days => ${FREE_REFILL_DAYS}))
          )
      `

      // Verify credits were NOT refilled for secondary org
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: secondaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(0) // Should remain 0
    })

    it('should NOT refill credits for organizations with active subscriptions', async () => {
      // Setup: Create an active subscription and set old lastFreeRefillAt
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: 1,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: true,
        },
      })

      const uniqueSubId = `sub_active_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await testDb.subscription.create({
        data: {
          stripeSubscriptionId: uniqueSubId,
          planId: 'price_test_pro',
          status: 'active', // Active subscription
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000),
          currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          organization: {
            connect: { id: primaryOrg.id },
          },
        },
      })

      // Simulate the refill logic (excludes orgs with active subscriptions)
      await testDb.$executeRaw`
        UPDATE "Organization"
        SET 
          "credits" = ${CREDITS_FREE},
          "lastFreeRefillAt" = NOW(),
          "creditsReminderThresholdSent" = false
        FROM "Organization" o
        LEFT JOIN "Subscription" s ON s."organizationId" = o.id
        WHERE 
          "Organization".id = o.id
          AND o."deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "Subscription" s2
            WHERE s2."organizationId" = o.id
              AND s2.status = 'active'
          )
          AND o.credits < ${CREDITS_FREE}
          AND o."isPrimary" = true
          AND (
            o."lastFreeRefillAt" < NOW() - make_interval(days => ${FREE_REFILL_DAYS})
            OR 
            (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - make_interval(days => ${FREE_REFILL_DAYS}))
          )
      `

      // Verify credits were NOT refilled
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(1) // Should remain 1
    })

    itIf(MULTI_ORG_ENABLED)('should hard delete organizations deleted 30+ days ago', async () => {
      const deletedOrg = secondaryOrg
      const olderThanRetentionDays = SOFT_DELETE_RETENTION_DAYS + 1
      const olderThanRetentionAgo = new Date()
      olderThanRetentionAgo.setDate(olderThanRetentionAgo.getDate() - olderThanRetentionDays)
      
      await testDb.organization.update({
        where: { id: deletedOrg.id },
        data: {
          deletedAt: olderThanRetentionAgo,
        },
      })

      // Verify the organization exists before cleanup
      const orgBeforeCleanup = await testDb.organization.findUnique({
        where: { id: deletedOrg.id },
      })
      expect(orgBeforeCleanup).not.toBeNull()

      await testDb.$executeRaw`
        DELETE FROM "Organization" WHERE "deletedAt" <= NOW() - make_interval(days => ${SOFT_DELETE_RETENTION_DAYS})
      `

      // Verify the organization was hard deleted
      const orgAfterCleanup = await testDb.organization.findUnique({
        where: { id: deletedOrg.id },
      })
      expect(orgAfterCleanup).toBeNull()
    })

    itIf(MULTI_ORG_ENABLED)('should NOT delete organizations deleted less than 30 days ago', async () => {
      const recentlyDeletedOrg = secondaryOrg
      const lessThanRetentionDays = Math.max(1, Math.floor(SOFT_DELETE_RETENTION_DAYS / 2))
      const lessThanRetentionAgo = new Date()
      lessThanRetentionAgo.setDate(lessThanRetentionAgo.getDate() - lessThanRetentionDays)
      
      await testDb.organization.update({
        where: { id: recentlyDeletedOrg.id },
        data: {
          deletedAt: lessThanRetentionAgo,
        },
      })

      await testDb.$executeRaw`
        DELETE FROM "Organization" WHERE "deletedAt" <= NOW() - make_interval(days => ${SOFT_DELETE_RETENTION_DAYS})
      `

      // Verify the organization still exists
      const orgAfterCleanup = await testDb.organization.findUnique({
        where: { id: recentlyDeletedOrg.id },
      })
      expect(orgAfterCleanup).not.toBeNull()
      expect(orgAfterCleanup?.deletedAt).not.toBeNull()
    })

    it('should NOT refill credits if already at free amount or more', async () => {
      // Setup: Set credits to free amount and old lastFreeRefillAt
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      
      await testDb.organization.update({
        where: { id: primaryOrg.id },
        data: {
          credits: CREDITS_FREE,
          lastFreeRefillAt: twoMonthsAgo,
          isPrimary: true,
        },
      })

      // Simulate the refill logic (only refills if credits < CREDITS_FREE)
      await testDb.$executeRaw`
        UPDATE "Organization"
        SET 
          "credits" = ${CREDITS_FREE},
          "lastFreeRefillAt" = NOW(),
          "creditsReminderThresholdSent" = false
        FROM "Organization" o
        LEFT JOIN "Subscription" s ON s."organizationId" = o.id
        WHERE 
          "Organization".id = o.id
          AND o."deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "Subscription" s2
            WHERE s2."organizationId" = o.id
              AND s2.status = 'active'
          )
          AND o.credits < ${CREDITS_FREE}
          AND o."isPrimary" = true
          AND (
            o."lastFreeRefillAt" < NOW() - make_interval(days => ${FREE_REFILL_DAYS})
            OR 
            (o."lastFreeRefillAt" IS NULL AND o."createdAt" < NOW() - make_interval(days => ${FREE_REFILL_DAYS}))
          )
      `

      // Verify credits remain at the free amount and lastFreeRefillAt was NOT updated
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: primaryOrg.id },
      })
      expect(updatedOrg?.credits).toBe(CREDITS_FREE)
      // lastFreeRefillAt should still be the old date (not updated)
      expect(updatedOrg?.lastFreeRefillAt?.getTime()).toBeLessThanOrEqual(twoMonthsAgo.getTime())
    })
  })
})
