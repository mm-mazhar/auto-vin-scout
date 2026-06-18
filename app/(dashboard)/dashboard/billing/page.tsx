// app/(dashboard)/dashboard/billing/page.tsx

import { stripe } from '@/app/lib/stripe'
import { createClient } from '@/app/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireOrgRole } from '@/lib/auth/guards'
import { PLAN_IDS, PRICING_PLANS, SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD, type PlanId, type PricingPlan } from '@/lib/constants'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RenewSubscriptionButton } from '../../_components/RenewSubscriptionButton'
import { StripePortalButton } from '../../_components/StripePortalButton'
import { UpgradeSubscriptionButton } from '../../_components/UpgradeSubscriptionButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function resolvePlanId(planIdFromDb?: string | null): Promise<PlanId | null> {
  if (!planIdFromDb) return null
  if (planIdFromDb === PLAN_IDS.free) return PLAN_IDS.free
  const matched = PRICING_PLANS.find((p: PricingPlan) => p.stripePriceId === planIdFromDb)
  return matched?.id ?? null
}

export default async function BillingPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/get-started')

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value

  // Debug: Log the org ID being checked
  console.log('[Billing] currentOrgId from cookie:', currentOrgId)
  console.log('[Billing] user.id:', user.id)

  if (!currentOrgId) {
      console.log('[Billing] No currentOrgId cookie - redirecting to dashboard')
      return redirect('/dashboard')
  }

  // Security Check: Only ADMIN/OWNER can access billing
  try {
      const role = await requireOrgRole(currentOrgId, user.id, 'ADMIN')
      console.log('[Billing] User role:', role)
  } catch (error) {
      console.log('[Billing] requireOrgRole failed:', error)
      return redirect('/dashboard')
  }

  const rpc = await getRPCCaller()
  
  let org
  try {
    org = await rpc.org.getById({ id: currentOrgId, includeSubscription: true })
  } catch {
    // Org not found or deleted - redirect to dashboard which will auto-switch to valid org
    return redirect('/dashboard')
  }

  if (!org) return redirect('/dashboard')

  const data = {
    status: org.subscription?.status ?? 'inactive',
    planId: org.subscription?.planId ?? null,
    stripeSubscriptionId: null as string | null,
    currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
    org: org,
  }

  const resolvedCurrent = await resolvePlanId(data.planId)

  const isSubActive = data.status === 'active'

  const basicPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.basic)
  const proPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.pro)
  const corePlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.core)
  const coreplusPlan = PRICING_PLANS.find((p) => p.id === PLAN_IDS.coreplus && !p.hidden)

  const showRenewal = isSubActive && (data.org.credits < SUBSCRIPTION_RENEWAL_CREDIT_THRESHOLD)
  // Core Plus is hidden — upgrade chain ends at Core
  const upgradeTargetPlan = resolvedCurrent === PLAN_IDS.pro ? corePlan : null
  const showUpgrade = isSubActive && !!upgradeTargetPlan
  const hasBasicCredits = !isSubActive && data.org.credits > 0
  const showNonSubscriptionUpgradeCards = !isSubActive
  const showBillingDetails = isSubActive || hasBasicCredits

  // Dynamic grid class: 3 visible plans → 2-col on md, 3-col on lg so last card stretches full width on 2-col
  const upgradeCardCount = [basicPlan, proPlan, corePlan, coreplusPlan].filter(Boolean).length
  const upgradeGridCols =
    upgradeCardCount === 3
      ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
      : 'grid grid-cols-1 gap-4 md:grid-cols-2'

  const currentForState: PlanId | null = isSubActive
    ? resolvedCurrent
    : hasBasicCredits
      ? PLAN_IDS.basic
      : PLAN_IDS.free
  const isFreeTierBilling = currentForState === null || currentForState === PLAN_IDS.free

  let invoices: {
    id: string;
    amount_paid: number;
    currency: string | null;
    status: string | null;
    hosted_invoice_url: string | null;
    number: string | null;
    created: number | null;
  }[] = []
  if (data.org.stripeCustomerId) {
    const list = await stripe.invoices.list({ customer: data.org.stripeCustomerId, limit: 12 })
    invoices = list.data.map((inv) => ({
      id: inv.id,
      amount_paid: typeof inv.amount_paid === 'number' ? inv.amount_paid : 0,
      currency: inv.currency || 'usd',
      status: inv.status || null,
      hosted_invoice_url: inv.hosted_invoice_url || null,
      number: (inv.number as string | null) || null,
      created: typeof inv.created === 'number' ? inv.created : null,
    }))
  }

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center justify-center py-2'>
      <div className='max-w-6xl mx-auto w-full space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Billing</h1>
          <Link href='/#pricing' className='text-sm text-primary hover:underline inline-flex items-center'>
            All plans &rarr;
          </Link>
        </div>

        <Card className='rounded-lg border border-primary/40 bg-primary/5'>
          <CardHeader className='p-2'>
            <CardTitle className='text-sm'>Available Credits</CardTitle>
            <CardDescription className='text-xs'>
              Credits are consumed as you run reports and checks.
            </CardDescription>
          </CardHeader>
          <CardContent className='px-2 pb-2'>
            <p className='text-2xl font-semibold'>{data.org.credits}</p>
          </CardContent>
        </Card>

        {isFreeTierBilling ? (
          <Card className='rounded-lg border bg-muted/30'>
            <CardHeader className='p-2'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm'>{hasBasicCredits ? 'Basic Report' : 'Free'}</CardTitle>
                <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30'>
                  Current state
                </span>
              </div>
              <CardDescription className='text-xs'>
                {hasBasicCredits
                  ? 'No active subscription. You can buy Basic credits again anytime or upgrade to a recurring plan.'
                  : 'No active subscription. Purchase Basic credits anytime or upgrade to a recurring plan.'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {showNonSubscriptionUpgradeCards ? (
          <div className={upgradeGridCols}>
            {basicPlan ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                      <CardTitle className='text-sm'>
                        {hasBasicCredits ? basicPlan.title : `Purchase ${basicPlan.title}`}
                      </CardTitle>
                      <CardDescription className='text-xs'>{basicPlan.description}</CardDescription>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      {hasBasicCredits ? (
                        <span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0 whitespace-nowrap'>
                          Current Plan
                        </span>
                      ) : null}
                      <UpgradeSubscriptionButton
                        planId={PLAN_IDS.basic}
                        hasActiveSubscription={isSubActive}
                        ctaLabel={hasBasicCredits ? 'Buy Again' : 'Purchase'}
                      />
                    </div>
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {basicPlan.features.map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {proPlan ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>Upgrade to {proPlan.title}</CardTitle>
                      <CardDescription className='text-xs'>{proPlan.description}</CardDescription>
                    </div>
                    <UpgradeSubscriptionButton planId={PLAN_IDS.pro} hasActiveSubscription={isSubActive} />
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {proPlan.features.map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {corePlan ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>Upgrade to {corePlan.title}</CardTitle>
                      <CardDescription className='text-xs'>{corePlan.description}</CardDescription>
                    </div>
                    <UpgradeSubscriptionButton planId={PLAN_IDS.core} hasActiveSubscription={isSubActive} />
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {corePlan.features.map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {coreplusPlan ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>Upgrade to {coreplusPlan.title}</CardTitle>
                      <CardDescription className='text-xs'>{coreplusPlan.description}</CardDescription>
                    </div>
                    <UpgradeSubscriptionButton planId={PLAN_IDS.coreplus} hasActiveSubscription={isSubActive} />
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {coreplusPlan.features.map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* TOP ROW: Edit Subscription + Upgrade + Renew */}
        {isSubActive ? (
          <div className={`grid grid-cols-1 gap-4 ${showUpgrade && showRenewal ? 'md:grid-cols-3' : (showUpgrade || showRenewal ? 'md:grid-cols-2' : 'md:grid-cols-1')}`}>

             {/* Renew Subscription (Primary Action if Low Credits) */}
            {showRenewal ? (
              <Card className='rounded-lg border border-yellow-500/50 bg-yellow-500/10 flex flex-col'>
                 <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm text-yellow-600 dark:text-yellow-400'>Run out of credits?</CardTitle>
                      <CardDescription className='text-xs'>
                        Renew early to get fresh credits.
                        <br />
                        <span className='text-muted-foreground'>
                           Current Credits: <span className='font-mono font-bold text-foreground'>{data.org.credits}</span>
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='px-2 pb-2 mt-auto'>
                   <RenewSubscriptionButton />
                </CardContent>
              </Card>
            ) : null}

            {/* Edit Subscription */}
            <Card className='rounded-lg border bg-muted/30 flex flex-col'>
              <CardHeader className='p-2'>
                <CardTitle className="text-sm">Edit Subscription</CardTitle>
                <CardDescription className="text-xs">
                  Click below to
                  <span className='font-bold text-secondary-foreground'> change details,</span>
                  <span className='font-bold text-secondary-foreground'> view statement</span> or
                  <span className='font-bold text-secondary-foreground'> Cancel Subscription</span>.
                  <p>&nbsp;</p>
                  <p className='text-xs text-foreground'>
                    If you cancel your subscription then you still can retain your remaining credits.
                  </p>
                </CardDescription>
              </CardHeader>
              <CardContent className='px-2 pb-2 mt-auto'>
                <StripePortalButton />
              </CardContent>
            </Card>

            {/* Upgrade to Pro Plus (only when current is Pro) */}
            {showUpgrade ? (
              <Card className='rounded-lg border'>
                <CardHeader className='p-2'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>Upgrade to {upgradeTargetPlan?.title}</CardTitle>
                      <CardDescription className='text-xs'>{upgradeTargetPlan?.description}</CardDescription>
                    </div>
                    <UpgradeSubscriptionButton planId={upgradeTargetPlan?.id ?? PLAN_IDS.coreplus} hasActiveSubscription={isSubActive} />
                  </div>
                </CardHeader>
                <div className='border-t mx-2'></div>
                <CardContent className='px-2 pb-2'>
                  <ul className='text-xs space-y-1'>
                    {upgradeTargetPlan?.features.map((f, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* SECOND ROW: Billing Details + Invoice History (full width) */}
        {showBillingDetails ? (
          <Card className='rounded-lg border'>
            <CardHeader className='p-2'>
              <CardTitle className='text-sm'>Billing Details</CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-2 space-y-3'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Stripe Customer ID</span>
                  <p className='font-mono text-xs'>{data.org.stripeCustomerId || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Subscription ID</span>
                  <p className='font-mono text-xs'>{data.org.subscription?.stripeSubscriptionId || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Status</span>
                  <p className='text-xs capitalize'>{isSubActive ? data.status : 'Basic Report'}</p>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Current Period End</span>
                  <p className='text-xs'>
                    {data.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className='border-t mx-2'></div>
              <div className='pt-2'>
                <h4 className='text-sm font-medium mb-2'>Invoice History</h4>
                {invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Date</TableHead>
                        <TableHead className='text-xs'>Invoice</TableHead>
                        <TableHead className='text-xs'>Status</TableHead>
                        <TableHead className='text-xs'>Amount</TableHead>
                        <TableHead className='text-xs'>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => {
                        const date = inv.created ? new Date(inv.created * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
                        const amount = (inv.amount_paid || 0) / 100
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className='text-xs text-muted-foreground'>{date}</TableCell>
                            <TableCell className='font-mono text-xs'>{inv.number || inv.id}</TableCell>
                            <TableCell className='text-xs capitalize'>{inv.status || ''}</TableCell>
                            <TableCell className='text-xs'>
                              {amount.toLocaleString(undefined, { style: 'currency', currency: inv.currency || 'usd' })}
                            </TableCell>
                            <TableCell>
                              {inv.hosted_invoice_url ? (
                                <Link href={inv.hosted_invoice_url} target='_blank' className='text-xs text-primary underline'>
                                  View
                                </Link>
                              ) : (
                                <span className='text-xs text-muted-foreground'>N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className='text-xs text-muted-foreground'>No billing records found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {null}
      </div>
    </div>
  )
}
