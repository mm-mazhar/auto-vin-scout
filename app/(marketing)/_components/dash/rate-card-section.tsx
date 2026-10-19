// app/(marketing)/_components/dash/rate-card-section.tsx

import prisma from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { CREDITS_SIGNUP_BONUS, PLAN_IDS, PRICING_PLANS, type PlanId, type PricingPlan } from '@/lib/constants'
import { marketingPlanCta } from '@/lib/pricing-cta'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Vfd } from './vfd'

const PLAN_COPY: Partial<Record<PlanId, { who: string; includes: string }>> = {
  [PLAN_IDS.basic]: { who: 'A few cars, paid once', includes: 'Every lamp, recalls and market history' },
  [PLAN_IDS.pro]: { who: 'Power buyers and flippers', includes: 'Everything in Basic, more reports' },
  [PLAN_IDS.core]: { who: 'Small used-car lots', includes: 'Everything in Pro, inventory risk scoring' },
  [PLAN_IDS.coreplus]: { who: 'Franchise dealers', includes: 'Everything in Core, depreciation forecasts' },
}

async function getCurrentPlan(): Promise<{ isAuthenticated: boolean; currentPlanId: PlanId | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { isAuthenticated: false, currentPlanId: null }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const organization = membership?.organization
  const status = organization?.subscription?.status ?? null
  const rawPlanId = organization?.subscription?.planId ?? null

  if (status === 'active') {
    if (!rawPlanId || rawPlanId === PLAN_IDS.free) return { isAuthenticated: true, currentPlanId: PLAN_IDS.free }
    const matched = PRICING_PLANS.find((plan) => plan.stripePriceId === rawPlanId)
    return { isAuthenticated: true, currentPlanId: matched?.id ?? PLAN_IDS.free }
  }
  if ((organization?.credits ?? 0) > 0) return { isAuthenticated: true, currentPlanId: PLAN_IDS.basic }
  return { isAuthenticated: true, currentPlanId: null }
}

function PriceColumn({
  plan,
  isAuthenticated,
  currentPlanId,
}: {
  plan: PricingPlan
  isAuthenticated: boolean
  currentPlanId: PlanId | null
}) {
  const cta = marketingPlanCta(plan, { isAuthenticated, currentPlanId })
  const copy = PLAN_COPY[plan.id]
  const isCurrent = currentPlanId === plan.id
  const recurring = plan.priceSuffix.includes('/mo')

  return (
    <li className='flex flex-col px-0 py-8 md:px-8 lg:px-10'>
      <div className='flex items-baseline justify-between gap-4'>
        <h3 className='nd-display text-[2rem] tracking-[0.04em] text-(--nd-print) uppercase'>{plan.title}</h3>
        {isCurrent ? <span className='nd-legend text-(--nd-emerald)'>Your plan</span> : null}
      </div>
      {copy ? <p className='mt-1 text-base text-(--nd-print-3)'>{copy.who}</p> : null}

      <div className='mt-8 flex items-start gap-1.5'>
        <span className='nd-display mt-1 text-[1.6rem] text-(--nd-vfd-dim)'>$</span>
        <Vfd value={plan.price} face='7' className='text-[3.4rem]' label={`$${plan.price}`} />
      </div>
      <p className='nd-legend mt-3 text-(--nd-print-2)'>{recurring ? 'Per month' : 'One time'}</p>

      <dl className='mt-8 space-y-3 border-t border-(--nd-rule) pt-6 text-base'>
        <div className='flex justify-between gap-4'>
          <dt className='text-(--nd-print-3)'>Full reports</dt>
          <dd className='font-medium text-(--nd-print) tabular-nums'>
            {plan.credits}
            {recurring ? ' / mo' : ''}
          </dd>
        </div>
        {copy ? (
          <div className='flex justify-between gap-4'>
            <dt className='text-(--nd-print-3)'>Includes</dt>
            <dd className='text-right text-(--nd-print-2)'>{copy.includes}</dd>
          </div>
        ) : null}
      </dl>

      <Link
        href={cta.href}
        className={cn(
          'nd-legend mt-8 inline-flex h-12 items-center justify-center rounded-md font-semibold transition-colors',
          plan.id === PLAN_IDS.basic
            ? 'bg-(--nd-emerald) text-(--nd-emerald-ink) hover:bg-(--nd-emerald-hover)'
            : 'border border-(--nd-rule-strong) text-(--nd-print) hover:border-(--nd-vfd-dim)'
        )}
      >
        {cta.label}
      </Link>
    </li>
  )
}

export async function RateCardSection() {
  const { isAuthenticated, currentPlanId } = await getCurrentPlan()
  const plans = PRICING_PLANS.filter((plan) => plan.id !== PLAN_IDS.free && !plan.hidden)

  return (
    <section id='pricing' aria-labelledby='pricing-heading' className='scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='grid gap-6 lg:grid-cols-2 lg:items-end'>
          <h2 id='pricing-heading' className='nd-display max-w-[16ch] text-[2.6rem] text-(--nd-print) sm:text-[3.4rem]'>
            Pay per report, or by the month.
          </h2>
          <p className='max-w-[48ch] text-lg leading-relaxed text-(--nd-print-2) lg:justify-self-end'>
            The decode is always free, and every new account gets {CREDITS_SIGNUP_BONUS} full report on us.{' '}
            <strong className='font-medium text-(--nd-print)'>The prices below are placeholders, not final.</strong>
          </p>
        </div>

        <ol
          className={cn(
            'mt-14 grid divide-y divide-(--nd-rule) rounded-2xl border border-(--nd-rule-strong) bg-(--nd-cowl) px-6 md:divide-x md:divide-y-0 md:px-0',
            plans.length === 2 ? 'md:grid-cols-2' : plans.length >= 3 ? 'md:grid-cols-3' : ''
          )}
        >
          {plans.map((plan) => (
            <PriceColumn key={plan.id} plan={plan} isAuthenticated={isAuthenticated} currentPlanId={currentPlanId} />
          ))}
        </ol>
      </div>
    </section>
  )
}
