// lib/pricing-cta.ts

import { PLAN_IDS, type PlanId, type PricingPlan } from '@/lib/constants'

/** Where a plan's button leads from a marketing page, and what it says. */
export function marketingPlanCta(
  plan: PricingPlan,
  currentPlanId: PlanId | null,
  isAuthenticated: boolean,
): { href: string; label: string } {
  if (!isAuthenticated) return { href: '/get-started?next=/dashboard/billing', label: 'Subscribe' }
  if (currentPlanId === plan.id) return { href: '/dashboard/billing', label: 'Current Plan' }
  if (currentPlanId === null || currentPlanId === PLAN_IDS.free) {
    return {
      href: '/dashboard/billing',
      label: plan.id === PLAN_IDS.basic ? 'Purchase, go to Billing' : 'Upgrade, go to Billing',
    }
  }
  return { href: '/dashboard/billing', label: 'Upgrade, go to Billing' }
}
