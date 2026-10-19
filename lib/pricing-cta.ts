// lib/pricing-cta.ts

import { PLAN_IDS, type PlanId, type PricingPlan } from '@/lib/constants'

export interface PlanCta {
  href: string
  label: string
}

/** Where a marketing-page plan button leads, given who is looking. */
export function marketingPlanCta(
  plan: PricingPlan,
  { isAuthenticated, currentPlanId }: { isAuthenticated: boolean; currentPlanId: PlanId | null }
): PlanCta {
  if (!isAuthenticated) {
    const label = plan.id === PLAN_IDS.basic ? `Buy ${plan.credits} reports` : 'Subscribe'
    return { href: '/get-started?next=/dashboard/billing', label }
  }
  if (currentPlanId === plan.id) {
    return { href: '/dashboard/billing', label: 'Current Plan' }
  }
  if ((currentPlanId === null || currentPlanId === PLAN_IDS.free) && plan.id === PLAN_IDS.basic) {
    return { href: '/dashboard/billing', label: 'Purchase, go to Billing' }
  }
  return { href: '/dashboard/billing', label: 'Upgrade, go to Billing' }
}
