// app/api/cron/notify/route.ts

import prisma from '@/app/lib/db'
import { sendLowCreditsEmail, sendRenewalReminderEmail } from '@/app/lib/email'
import { CREDIT_REMINDER_THRESHOLD, PRICING_PLANS, RENEWAL_REMINDER_DAYS_BEFORE } from '@/lib/constants'
import { headers } from 'next/headers'

export async function GET() {
  const h = await headers()
  const auth = h.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const now = Math.floor(Date.now() / 1000)
  const thresholdDays = Number(RENEWAL_REMINDER_DAYS_BEFORE)
  const upper = now + thresholdDays * 24 * 60 * 60

  // 1. Find Subscriptions ending soon
  const subs = await prisma.subscription.findMany({
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

  let sent = 0
  const details: { email: string; daysLeft?: number; reason: 'days' | 'credits' }[] = []

  // 2. Reset threshold for organizations with enough credits
  await prisma.organization.updateMany({
    where: {
      creditsReminderThresholdSent: true,
      credits: { gt: CREDIT_REMINDER_THRESHOLD },
    },
    data: { creditsReminderThresholdSent: false },
  })

  // Process Subscription Reminders
  for (const s of subs) {
    const owner = s.organization?.members[0]?.user
    const to = owner?.email || null
    if (!to) continue

    const daysLeft = Math.ceil((s.currentPeriodEnd - now) / (24 * 60 * 60))
    if (s.periodEndReminderSent) continue
    const remaining = typeof s.organization?.credits === 'number' ? s.organization.credits : undefined
    
    try {
      await sendRenewalReminderEmail({
        to,
        name: owner?.name ?? s.organization?.name ?? null,
        orgName: s.organization?.name ?? null,
        planTitle: PRICING_PLANS.find((p) => p.stripePriceId === s.planId)?.title ?? null,
        periodEnd: s.currentPeriodEnd,
        creditsRemaining: remaining,
        portalUrl: null, // Could generate a link to billing page if we had orgId
      })
      sent++
      await prisma.subscription.update({
        where: { stripeSubscriptionId: s.stripeSubscriptionId },
        data: { periodEndReminderSent: true },
      })
      details.push({ email: to, daysLeft: daysLeft, reason: 'days' })
    } catch {}
  }

  let creditCandidates = 0

  // 3. Find Low Credit Organizations
  const lowCreditsOrgs = await prisma.organization.findMany({
    where: {
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

  for (const o of lowCreditsOrgs) {
    const owner = o.members[0]?.user
    const to = owner?.email || null
    if (!to) continue

    const creditsRemaining = o.credits ?? 0
    creditCandidates++
    try {
      await sendLowCreditsEmail({
        to,
        name: owner?.name ?? o.name ?? null,
        orgName: o.name ?? null,
        creditsRemaining,
      })
      await prisma.organization.update({ where: { id: o.id }, data: { creditsReminderThresholdSent: true } })
      details.push({ email: to, reason: 'credits' })
    } catch {}
  }

  return Response.json({ totalCandidates: subs.length, creditCandidates, sent, details })
}
