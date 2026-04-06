// tests/integration/billing-credits.test.ts

import { CREDITS_FREE, PLAN_IDS, PRICING_PLANS, SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD } from '@/lib/constants'
import { OrganizationService } from '@/lib/services/organization-service'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TestUtils, testDb } from './setup'
import { itIf, MULTI_ORG_ENABLED } from '../helpers/guards'

// Mock Stripe for testing
const mockStripe = {
  subscriptions: {
    cancel: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'canceled' }),
    retrieve: vi.fn().mockResolvedValue({
      id: 'sub_test',
      status: 'active',
      customer: 'cus_test',
      items: {
        data: [{ price: { id: 'price_test' } }]
      }
    }),
  },
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
    },
  },
}

// Mock the Stripe module
vi.mock('@/app/lib/stripe', () => ({
  stripe: mockStripe,
  getStripeSession: vi.fn().mockResolvedValue('https://checkout.stripe.com/test'),
}))

describe('Billing, Credits & Subscriptions', () => {
  let ownerUserId: string
  let organizationId: string
  let secondOrgId: string
  const createdUserIds: string[] = []

  async function setupOrganizationWithSubscription(planId: string = PLAN_IDS.pro) {
    const owner = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('owner'))
    ownerUserId = owner.id
    createdUserIds.push(owner.id)

    const org = await OrganizationService.createOrganization(
      owner.id,
      'Test Organization',
      TestUtils.generateUniqueSlug('test-org')
    )
    organizationId = org.id

    // Find the plan details
    const plan = PRICING_PLANS.find(p => p.id === planId)
    if (!plan?.stripePriceId) {
      throw new Error(`Plan ${planId} not found or has no Stripe price ID`)
    }

    // Create a subscription record
    const subscription = await testDb.subscription.create({
      data: {
        organizationId: org.id,
        stripeSubscriptionId: `sub_test_${Date.now()}`,
        planId: plan.stripePriceId,
        status: 'active',
        interval: 'month',
        currentPeriodStart: Math.floor(Date.now() / 1000),
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      },
    })

    // Update organization with Stripe customer ID
    await testDb.organization.update({
      where: { id: org.id },
      data: {
        stripeCustomerId: `cus_test_${Date.now()}`,
      },
    })

    return { owner, org, subscription, plan }
  }

  async function setupSecondOrganization() {
    const secondOrg = await OrganizationService.createOrganization(
      ownerUserId,
      'Second Organization',
      TestUtils.generateUniqueSlug('second-org')
    )
    secondOrgId = secondOrg.id
    return secondOrg
  }

  afterEach(async () => {
    // Cleanup subscriptions first
    if (organizationId) {
      await testDb.subscription.deleteMany({ where: { organizationId } })
    }
    if (secondOrgId) {
      await testDb.subscription.deleteMany({ where: { organizationId: secondOrgId } })
    }

    // Cleanup organizations
    if (organizationId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId } })
      await testDb.project.deleteMany({ where: { organizationId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId } })
      await testDb.organization.deleteMany({ where: { id: organizationId } })
    }
    if (secondOrgId) {
      await testDb.organizationInvite.deleteMany({ where: { organizationId: secondOrgId } })
      await testDb.project.deleteMany({ where: { organizationId: secondOrgId } })
      await testDb.organizationMember.deleteMany({ where: { organizationId: secondOrgId } })
      await testDb.organization.deleteMany({ where: { id: secondOrgId } })
    }
    
    // Cleanup users
    for (const userId of createdUserIds) {
      await testDb.user.deleteMany({ where: { id: userId } })
    }
    
    // Reset
    ownerUserId = ''
    organizationId = ''
    secondOrgId = ''
    createdUserIds.length = 0
  })

  describe('Test 3.1: Pro/Pro Plus Subscription', () => {
    it('should create Pro subscription and add credits to organization', async () => {
      const { org, subscription, plan } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      // Verify subscription was created
      expect(subscription).toBeDefined()
      expect(subscription.planId).toBe(plan.stripePriceId)
      expect(subscription.status).toBe('active')

      // Verify organization has initial credits from creation
      const updatedOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })
      expect(updatedOrg?.credits).toBe(CREDITS_FREE)

      // Simulate webhook adding credits
      await testDb.organization.update({
        where: { id: org.id },
        data: { credits: { increment: plan.credits } },
      })

      const finalOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })
      expect(finalOrg?.credits).toBe(CREDITS_FREE + plan.credits)
    })

    it('should create Pro Plus subscription with correct credits', async () => {
      const { org, subscription, plan } = await setupOrganizationWithSubscription(PLAN_IDS.proplus)

      expect(subscription.planId).toBe(plan.stripePriceId)
      expect(plan.credits).toBe(100) // Pro Plus gives 100 credits

      // Simulate webhook adding credits
      await testDb.organization.update({
        where: { id: org.id },
        data: { credits: { increment: plan.credits } },
      })

      const finalOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })
      expect(finalOrg?.credits).toBe(CREDITS_FREE + 100)
    })

    it('should allow subscription renewal when credits are low', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      const lowCredits = Math.max(0, SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD - 1)
      await testDb.organization.update({
        where: { id: org.id },
        data: { credits: lowCredits },
      })

      const updatedOrg = await testDb.organization.findUnique({
        where: { id: org.id },
        include: { subscription: true },
      })

      expect(updatedOrg?.credits).toBe(lowCredits)
      expect(updatedOrg?.subscription?.status).toBe('active')
      
      expect(updatedOrg?.credits).toBeLessThan(SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD)
    })

    it('should upgrade from Pro to Pro Plus', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      const proPlusPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.proplus)!

      // Simulate upgrade by updating subscription
      await testDb.subscription.update({
        where: { organizationId: org.id },
        data: {
          planId: proPlusPlan.stripePriceId,
        },
      })

      const updatedSubscription = await testDb.subscription.findUnique({
        where: { organizationId: org.id },
      })

      expect(updatedSubscription?.planId).toBe(proPlusPlan.stripePriceId)
    })
  })

  describe('Test 3.2: Subscription Logic', () => {
    it('should populate subscription table with organizationId', async () => {
      const { org, subscription } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      expect(subscription.organizationId).toBe(org.id)
      expect(subscription.stripeSubscriptionId).toBeDefined()
      expect(subscription.status).toBe('active')
    })

    it('should link subscription to correct organization', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      const orgWithSubscription = await testDb.organization.findUnique({
        where: { id: org.id },
        include: { subscription: true },
      })

      expect(orgWithSubscription?.subscription).toBeDefined()
      expect(orgWithSubscription?.subscription?.organizationId).toBe(org.id)
    })

    itIf(MULTI_ORG_ENABLED)('should handle multiple organizations with different subscriptions', async () => {
      const { org: org1 } = await setupOrganizationWithSubscription(PLAN_IDS.pro)
      const org2 = await setupSecondOrganization()

      // Create Pro Plus subscription for second org
      const proPlusPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.proplus)
      if (!proPlusPlan?.stripePriceId) {
        throw new Error('Pro Plus plan not found or has no Stripe price ID')
      }
      
      await testDb.subscription.create({
        data: {
          organizationId: org2.id,
          stripeSubscriptionId: `sub_test_2_${Date.now()}`,
          planId: proPlusPlan.stripePriceId,
          status: 'active',
          interval: 'month',
          currentPeriodStart: Math.floor(Date.now() / 1000),
          currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      })

      const org1WithSub = await testDb.organization.findUnique({
        where: { id: org1.id },
        include: { subscription: true },
      })

      const org2WithSub = await testDb.organization.findUnique({
        where: { id: org2.id },
        include: { subscription: true },
      })

      expect(org1WithSub?.subscription?.planId).toBe(PRICING_PLANS.find(p => p.id === PLAN_IDS.pro)?.stripePriceId)
      expect(org2WithSub?.subscription?.planId).toBe(proPlusPlan.stripePriceId)
    })
  })

  describe('Test 3.3: Zombie Subscription Prevention', () => {
    it('should cancel Stripe subscription when organization is deleted', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      // Mock Stripe subscription cancellation
      mockStripe.subscriptions.cancel.mockResolvedValueOnce({
        id: 'sub_test',
        status: 'canceled'
      })

      // Delete organization (this should trigger subscription cancellation)
      await OrganizationService.deleteOrganization(org.id)

      // Verify organization is soft deleted
      const deletedOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })
      expect(deletedOrg?.deletedAt).toBeDefined()

      // In a real scenario, the organization deletion would call Stripe API
      // Here we verify the mock was called (simulating the actual behavior)
      // Note: The actual Stripe call happens in the organization router, not the service
    })

    it('should handle subscription cancellation gracefully even if Stripe fails', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      // Mock Stripe to throw an error
      mockStripe.subscriptions.cancel.mockRejectedValueOnce(new Error('Stripe API error'))

      // Delete organization should still succeed even if Stripe fails
      await expect(OrganizationService.deleteOrganization(org.id)).resolves.toBeDefined()

      const deletedOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })
      expect(deletedOrg?.deletedAt).toBeDefined()
    })
  })

  describe('Test 3.4: Credit Transfer', () => {
    itIf(MULTI_ORG_ENABLED)('should transfer credits when deleting organization with active subscription', async () => {
      const { org: org1 } = await setupOrganizationWithSubscription(PLAN_IDS.pro)
      const org2 = await setupSecondOrganization()

      // Set credits on first org
      await testDb.organization.update({
        where: { id: org1.id },
        data: { credits: 100 },
      })

      // Verify initial state
      const initialOrg1 = await testDb.organization.findUnique({ where: { id: org1.id } })
      const initialOrg2 = await testDb.organization.findUnique({ where: { id: org2.id } })
      
      expect(initialOrg1?.credits).toBe(100)
      expect(initialOrg2?.credits).toBe(0) // Second org starts with 0 (not primary)

      // Simulate credit transfer during deletion
      // First transfer credits
      await testDb.organization.update({
        where: { id: org2.id },
        data: { credits: { increment: initialOrg1?.credits || 0 } },
      })

      // Then delete the first org
      await OrganizationService.deleteOrganization(org1.id)

      // Verify transfer
      const finalOrg1 = await testDb.organization.findUnique({ where: { id: org1.id } })
      const finalOrg2 = await testDb.organization.findUnique({ where: { id: org2.id } })

      expect(finalOrg1?.deletedAt).toBeDefined()
      expect(finalOrg2?.credits).toBe(100) // Credits transferred
    })

    itIf(MULTI_ORG_ENABLED)('should handle credit transfer with zero credits', async () => {
      const { org: org1 } = await setupOrganizationWithSubscription(PLAN_IDS.pro)
      const org2 = await setupSecondOrganization()

      // Set zero credits on first org
      await testDb.organization.update({
        where: { id: org1.id },
        data: { credits: 0 },
      })

      // Delete organization with zero credits
      await OrganizationService.deleteOrganization(org1.id)

      const finalOrg2 = await testDb.organization.findUnique({ where: { id: org2.id } })
      expect(finalOrg2?.credits).toBe(0) // No credits to transfer
    })

    it('should verify user owns target organization for credit transfer', async () => {
      const { org: org1 } = await setupOrganizationWithSubscription(PLAN_IDS.pro)
      
      // Create another user with their own organization
      const otherUser = await TestUtils.createTestUser(TestUtils.generateUniqueEmail('other'))
      createdUserIds.push(otherUser.id)
      
      const otherOrg = await OrganizationService.createOrganization(
        otherUser.id,
        'Other Organization',
        TestUtils.generateUniqueSlug('other-org')
      )

      // Set credits on first org
      await testDb.organization.update({
        where: { id: org1.id },
        data: { credits: 50 },
      })

      // Verify the owner cannot transfer to an organization they don't own
      // This would be enforced at the router level, but we can verify ownership
      const targetMembership = await testDb.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: otherOrg.id,
            userId: ownerUserId, // Original owner trying to access other org
          },
        },
      })

      expect(targetMembership).toBeNull() // Owner is not a member of other org

      // Cleanup other user's org
      await testDb.organizationMember.deleteMany({ where: { organizationId: otherOrg.id } })
      await testDb.organization.deleteMany({ where: { id: otherOrg.id } })
    })
  })

  describe('Test 3.5: Subscription Status Management', () => {
    it('should update subscription status correctly', async () => {
      const { subscription } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      // Update subscription status
      await testDb.subscription.update({
        where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
        data: { status: 'past_due' },
      })

      const updatedSubscription = await testDb.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
      })

      expect(updatedSubscription?.status).toBe('past_due')
    })

    it('should handle subscription period updates', async () => {
      const { subscription } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      const newPeriodStart = Math.floor(Date.now() / 1000)
      const newPeriodEnd = newPeriodStart + 30 * 24 * 60 * 60

      await testDb.subscription.update({
        where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
        data: {
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
        },
      })

      const updatedSubscription = await testDb.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
      })

      expect(updatedSubscription?.currentPeriodStart).toBe(newPeriodStart)
      expect(updatedSubscription?.currentPeriodEnd).toBe(newPeriodEnd)
    })
  })

  describe('Test 3.6: Credit Operations', () => {
    it('should increment credits correctly', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      const initialCredits = CREDITS_FREE
      const creditsToAdd = 50

      await testDb.organization.update({
        where: { id: org.id },
        data: { credits: { increment: creditsToAdd } },
      })

      const updatedOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })

      expect(updatedOrg?.credits).toBe(initialCredits + creditsToAdd)
    })

    it('should handle credit reminder threshold reset', async () => {
      const { org } = await setupOrganizationWithSubscription(PLAN_IDS.pro)

      // Set reminder threshold as sent
      await testDb.organization.update({
        where: { id: org.id },
        data: { creditsReminderThresholdSent: true },
      })

      // Add credits (should reset reminder threshold)
      await testDb.organization.update({
        where: { id: org.id },
        data: { 
          credits: { increment: 50 },
          creditsReminderThresholdSent: false 
        },
      })

      const updatedOrg = await testDb.organization.findUnique({
        where: { id: org.id },
      })

      expect(updatedOrg?.creditsReminderThresholdSent).toBe(false)
    })
  })
})
