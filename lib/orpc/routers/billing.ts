// lib/orpc/routers/billing.ts

import * as z from 'zod'
import { adminProcedure } from '../procedures'
import { ORPCError } from '../server'
import { getStripeSession, stripe } from '@/app/lib/stripe'
import { 
  LOCAL_SITE_URL, 
  PLAN_IDS,
  PRICING_PLANS, 
  PRODUCTION_URL, 
  SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD,
} from '@/lib/constants'

/**
 * Plan ID validation schema - uses the actual PLAN_IDS values
 */
const planIdSchema = z.enum([PLAN_IDS.free, PLAN_IDS.pro, PLAN_IDS.proplus] as const)

export const billingRouter = {
  /**
   * Create a subscription checkout session
   * Returns Stripe checkout URL for redirect
   */
  createSubscription: adminProcedure
    .input(z.object({ planId: planIdSchema }))
    .route({
      method: 'POST',
      path: '/billing/subscription/create',
      summary: 'Create subscription',
      description: 'Creates a Stripe checkout session for subscription',
    })
    .handler(async ({ input, context }) => {
      const plan = PRICING_PLANS.find((p) => p.id === input.planId)
      
      if (!plan?.stripePriceId) {
        throw new ORPCError('BAD_REQUEST', { 
          message: 'Invalid plan selected' 
        })
      }

      const org = await context.db.organization.findUnique({
        where: { id: context.orgId },
      })

      if (!org) {
        throw new ORPCError('NOT_FOUND', { 
          message: 'Organization not found' 
        })
      }

      const origin = process.env.NODE_ENV === 'production' 
        ? PRODUCTION_URL 
        : LOCAL_SITE_URL

      const url = await getStripeSession({
        priceId: plan.stripePriceId,
        domainUrl: origin,
        customerId: org.stripeCustomerId ?? undefined,
        organizationId: context.orgId,
        userId: context.user.id,
        mode: 'subscription',
      })

      return { url }
    }),

  /**
   * Renew subscription early (when credits are low)
   * Only allowed when credits < SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD
   * Returns Stripe checkout URL for redirect
   */
  renewSubscription: adminProcedure
    .route({
      method: 'POST',
      path: '/billing/subscription/renew',
      summary: 'Renew subscription',
      description: 'Renews subscription early when credits are low',
    })
    .handler(async ({ context }) => {
      const org = await context.db.organization.findUnique({
        where: { id: context.orgId },
        include: { subscription: true },
      })

      if (!org) {
        throw new ORPCError('NOT_FOUND', { 
          message: 'Organization not found' 
        })
      }

      if (!org.subscription?.planId) {
        throw new ORPCError('PRECONDITION_FAILED', { 
          message: 'No active subscription found' 
        })
      }

      // Verify credits are below threshold
      if (org.credits >= SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD) {
        throw new ORPCError('PRECONDITION_FAILED', { 
          message: `Credits must be below ${SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD} to renew early` 
        })
      }

      // Find the price ID for the current plan
      const currentPlanId = org.subscription.planId
      const plan = PRICING_PLANS.find(
        (p) => p.stripePriceId === currentPlanId || p.id === currentPlanId
      )

      if (!plan?.stripePriceId) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', { 
          message: 'Could not resolve price ID for renewal' 
        })
      }

      const origin = process.env.NODE_ENV === 'production' 
        ? PRODUCTION_URL 
        : LOCAL_SITE_URL

      const url = await getStripeSession({
        priceId: plan.stripePriceId,
        domainUrl: origin,
        customerId: org.stripeCustomerId ?? undefined,
        organizationId: context.orgId,
        userId: context.user.id,
        mode: 'subscription',
      })

      return { url }
    }),

  /**
   * Create a Stripe customer portal session
   * Returns portal URL for redirect
   */
  createCustomerPortal: adminProcedure
    .route({
      method: 'POST',
      path: '/billing/portal',
      summary: 'Create customer portal',
      description: 'Creates a Stripe customer portal session',
    })
    .handler(async ({ context }) => {
      const org = await context.db.organization.findUnique({
        where: { id: context.orgId },
      })

      if (!org) {
        throw new ORPCError('NOT_FOUND', { 
          message: 'Organization not found' 
        })
      }

      if (!org.stripeCustomerId) {
        throw new ORPCError('PRECONDITION_FAILED', { 
          message: 'No Stripe customer found. Please subscribe to a plan first.' 
        })
      }

      const returnUrl = process.env.NODE_ENV === 'production' 
        ? PRODUCTION_URL 
        : `${LOCAL_SITE_URL}/dashboard`

      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: returnUrl,
      })

      return { url: session.url }
    }),
}
