// app/api/webhook/stripe/route.ts

import prisma from '@/app/lib/db'
import { sendCancellationEmail, sendPaymentConfirmationEmail } from '@/app/lib/email'
import { stripe } from '@/app/lib/stripe'
import { ENABLE_EMAILS, PRICING_PLANS } from '@/lib/constants'
import { headers } from 'next/headers'
import Stripe from 'stripe'

type PeriodFields = {
  current_period_start?: number
  current_period_end?: number
}

const scheduledCancellationNotified = new Set<string>()

async function getOrgOwner(orgId: string): Promise<{ email: string; name: string | null } | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
          take: 1,
        },
      },
    })
    const user = org?.members[0]?.user
    return user ? { email: user.email, name: user.name } : null
  } catch (error) {
    console.error('[Stripe Webhook] Failed to load organization owner', { orgId, error })
    return null
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error) {
    console.error('[Stripe Webhook] Signature verification failed:', error)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  console.log(`[Stripe Webhook] ✅ Received event: ${event.type}`)

  // ============================================================
  // 1. CHECKOUT SESSION COMPLETED
  // Purpose: Link customer, enforce single subscription, create DB record
  // NOTE: Do NOT add credits here - wait for invoice.payment_succeeded
  // ============================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = String(session.customer || '')
    const subscriptionId = session.subscription as string
    
    console.log(`[Stripe Webhook] 📋 checkout.session.completed`)
    console.log(`  Session: ${session.id}`)
    console.log(`  Customer: ${customerId}`)
    console.log(`  Subscription: ${subscriptionId}`)

    // Find organization ID
    let orgId = session.metadata?.organizationId || session.client_reference_id

    console.log(`  metadata.organizationId: ${session.metadata?.organizationId}`)
    console.log(`  client_reference_id: ${session.client_reference_id}`)

    if (!orgId && customerId) {
      const found = await prisma.organization.findUnique({ 
        where: { stripeCustomerId: customerId }, 
        select: { id: true } 
      })
      orgId = found?.id || null
      console.log(`  Found by customerId: ${orgId}`)
    }

    if (!orgId) {
      console.error('[Stripe Webhook] ❌ No Organization ID found in session metadata or client_reference_id')
      return new Response(null, { status: 200 })
    }

    console.log(`  Organization: ${orgId}`)

    try {
      // Verify organization exists before proceeding
      const existingOrg = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, stripeCustomerId: true }
      })

      if (!existingOrg) {
        console.error(`[Stripe Webhook] ❌ Organization ${orgId} not found in database`)
        return new Response(null, { status: 200 })
      }

      // Enforce single subscription per organization
      if (customerId && subscriptionId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 100,
        })

        const activeStatuses = ['active', 'trialing', 'past_due']
        for (const sub of subscriptions.data) {
          if (sub.id === subscriptionId) continue
          if (activeStatuses.includes(sub.status)) {
            console.log(`[Stripe Webhook] 🗑️  Canceling old subscription ${sub.id}`)
            await stripe.subscriptions.cancel(sub.id)
          }
        }
      }

      // Link customer ID to organization (only if not already linked)
      if (existingOrg.stripeCustomerId !== customerId) {
        await prisma.organization.update({ 
          where: { id: orgId }, 
          data: { stripeCustomerId: customerId } 
        })
        console.log(`[Stripe Webhook] 🔗 Linked customer to organization`)
      } else {
        console.log(`[Stripe Webhook] 🔗 Customer already linked to organization`)
      }

      // Create/update subscription record
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
        const p = subscription as unknown as PeriodFields

        // Store organizationId in subscription metadata for future reference
        // This helps invoice.paid find the org even if checkout fails to link customer
        if (!subscription.metadata?.organizationId) {
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { organizationId: orgId }
          })
          console.log(`[Stripe Webhook] 📝 Stored organizationId in subscription metadata`)
        }

        await prisma.subscription.upsert({
          where: { organizationId: orgId },
          update: {
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: p.current_period_start ?? Math.floor(Date.now() / 1000),
            currentPeriodEnd: p.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            status: subscription.status,
            planId: subscription.items.data[0].price.id,
            interval: String(subscription.items.data[0].price.recurring?.interval || 'month'),
            periodEndReminderSent: false,
          },
          create: {
            stripeSubscriptionId: subscription.id,
            organizationId: orgId,
            currentPeriodStart: p.current_period_start ?? Math.floor(Date.now() / 1000),
            currentPeriodEnd: p.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            status: subscription.status,
            planId: subscription.items.data[0].price.id,
            interval: String(subscription.items.data[0].price.recurring?.interval || 'month'),
            periodEndReminderSent: false,
          },
        })
        console.log(`[Stripe Webhook] 💾 Subscription record saved`)
      }

      console.log(`[Stripe Webhook] ✅ Checkout completed successfully`)
    } catch (error) {
      console.error('[Stripe Webhook] ❌ Error in checkout.session.completed:', error)
    }
  }

  // ============================================================
  // 2. INVOICE PAID
  // Purpose: Add credits and send confirmation email
  // This is the ONLY place where credits are added
  // Strategy: Multiple fallback strategies to find organization
  // Note: We use ONLY invoice.paid (not invoice.payment_succeeded) 
  //       because Stripe sends both events and we'd process twice
  // ============================================================
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    
    console.log(`[Stripe Webhook] 💰 ${event.type}`)
    console.log(`  Invoice: ${invoice.id}`)
    console.log(`  Billing reason: ${invoice.billing_reason}`)
    console.log(`  Amount paid: ${invoice.amount_paid}`)

    // Get customer ID from invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
    
    if (!customerId) {
      console.log('[Stripe Webhook] ⚠️  No customer ID in invoice, skipping')
      return new Response(null, { status: 200 })
    }

    console.log(`  Customer: ${customerId}`)

    try {
      // For first-time purchases, stripeCustomerId won't be linked yet
      // We need to find the organization through multiple strategies
      
      let org: { id: string; name: string; credits: number } | null = null
      let orgId: string | null = null

      console.log(`[Stripe Webhook] 🔍 Looking up organization...`)
      
      // Get subscription from Stripe
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'all' })
      const subscription = subs.data[0]
      
      // Strategy 1: Get organizationId from Stripe subscription metadata
      if (subscription?.metadata?.organizationId) {
        orgId = subscription.metadata.organizationId
        console.log(`  Strategy 1: Found organizationId in subscription metadata: ${orgId}`)
      }

      // Strategy 2: Try to find by stripeCustomerId (works for renewals/existing customers)
      if (!orgId) {
        const orgByCustomer = await prisma.organization.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true }
        })
        if (orgByCustomer) {
          orgId = orgByCustomer.id
          console.log(`  Strategy 2: Found organization by stripeCustomerId: ${orgId}`)
        }
      }

      // Strategy 3: Find the checkout session that created this subscription
      // This is the most reliable for first-time purchases when invoice.paid arrives before checkout.session.completed
      if (!orgId && subscription) {
        console.log(`  Strategy 3: Looking for checkout session...`)
        try {
          // List checkout sessions for this customer, find the one that created this subscription
          const sessions = await stripe.checkout.sessions.list({
            customer: customerId,
            limit: 5,
          })
          
          for (const session of sessions.data) {
            if (session.subscription === subscription.id) {
              // Found the checkout session that created this subscription
              const sessionOrgId = session.metadata?.organizationId || session.client_reference_id
              if (sessionOrgId) {
                orgId = sessionOrgId
                console.log(`  Strategy 3: Found organizationId from checkout session: ${orgId}`)
                
                // Also store it in subscription metadata for future use
                await stripe.subscriptions.update(subscription.id, {
                  metadata: { organizationId: orgId }
                })
                console.log(`  Strategy 3: Stored organizationId in subscription metadata`)
                break
              }
            }
          }
        } catch (sessionError) {
          console.error(`  Strategy 3: Failed to lookup checkout session:`, sessionError)
        }
      }

      // Strategy 4: Check our database subscription table by stripeSubscriptionId
      if (!orgId && subscription) {
        const dbSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
          select: { organizationId: true }
        })
        if (dbSub?.organizationId) {
          orgId = dbSub.organizationId
          console.log(`  Strategy 4: Found organizationId from DB subscription: ${orgId}`)
        }
      }

      if (!orgId) {
        console.error(`[Stripe Webhook] ❌ Could not determine organizationId for customer ${customerId}`)
        console.error(`  Subscription ID: ${subscription?.id}`)
        console.error(`  Subscription metadata: ${JSON.stringify(subscription?.metadata)}`)
        // Return 500 to trigger Stripe retry - checkout.session.completed might still be processing
        return new Response('Organization not found, will retry', { status: 500 })
      }

      // Now fetch the full organization
      org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, credits: true }
      })

      if (!org) {
        console.error(`[Stripe Webhook] ❌ Organization ${orgId} not found in database`)
        return new Response('Organization not found in database', { status: 500 })
      }

      // Link stripeCustomerId if not already linked (in case checkout.session.completed failed)
      const currentOrg = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { stripeCustomerId: true }
      })
      
      if (!currentOrg?.stripeCustomerId) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { stripeCustomerId: customerId }
        })
        console.log(`[Stripe Webhook] 🔗 Linked customer ${customerId} to organization ${orgId}`)
      }

      console.log(`  Organization: ${org.id}`)

      // Get subscription from Stripe (we already fetched it above, reuse if available)
      let stripeSubscription = subscription
      if (!stripeSubscription) {
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'all' })
        stripeSubscription = subs.data[0]
      }

      if (!stripeSubscription) {
        console.error(`[Stripe Webhook] ❌ No subscription found in Stripe for customer ${customerId}`)
        return new Response('No subscription in Stripe', { status: 500 })
      }

      const subscriptionId = stripeSubscription.id
      const priceId = stripeSubscription.items.data[0].price.id
      const sp = stripeSubscription as unknown as PeriodFields

      // Find or CREATE subscription record in database
      // This handles the race condition where invoice.paid arrives before checkout.session.completed
      let subRecord = await prisma.subscription.findUnique({
        where: { organizationId: org.id },
        select: { stripeSubscriptionId: true, planId: true }
      })

      // Also try to find by stripeSubscriptionId (in case organizationId lookup fails)
      if (!subRecord) {
        subRecord = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
          select: { stripeSubscriptionId: true, planId: true }
        })
      }

      try {
        if (!subRecord) {
          console.log(`[Stripe Webhook] 📝 Creating subscription record (invoice.paid arrived before checkout)`)
          
          // Store organizationId in Stripe subscription metadata if not already there
          if (!stripeSubscription.metadata?.organizationId) {
            await stripe.subscriptions.update(subscriptionId, {
              metadata: { organizationId: org.id }
            })
          }

          // Use upsert to handle race condition where checkout.session.completed just created it
          await prisma.subscription.upsert({
            where: { organizationId: org.id },
            update: {
              stripeSubscriptionId: subscriptionId,
              currentPeriodStart: sp.current_period_start ?? Math.floor(Date.now() / 1000),
              currentPeriodEnd: sp.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              status: stripeSubscription.status,
              planId: priceId,
              interval: String(stripeSubscription.items.data[0].price.recurring?.interval || 'month'),
              periodEndReminderSent: false,
            },
            create: {
              stripeSubscriptionId: subscriptionId,
              organizationId: org.id,
              currentPeriodStart: sp.current_period_start ?? Math.floor(Date.now() / 1000),
              currentPeriodEnd: sp.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              status: stripeSubscription.status,
              planId: priceId,
              interval: String(stripeSubscription.items.data[0].price.recurring?.interval || 'month'),
              periodEndReminderSent: false,
            },
          })
          console.log(`[Stripe Webhook] 💾 Subscription record created/updated`)
          
          subRecord = { stripeSubscriptionId: subscriptionId, planId: priceId }
        } else {
          // Update existing subscription record
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subRecord.stripeSubscriptionId },
            data: {
              currentPeriodStart: sp.current_period_start ?? undefined,
              currentPeriodEnd: sp.current_period_end ?? undefined,
              status: stripeSubscription.status,
              planId: priceId,
              interval: String(stripeSubscription.items.data[0].price.recurring?.interval || 'month'),
              periodEndReminderSent: false,
            },
          })
        }
      } catch (subError) {
        console.error(`[Stripe Webhook] ⚠️ Subscription upsert error (continuing anyway):`, subError)
        // Continue anyway - credits are more important than subscription record
      }

      console.log(`  Subscription: ${subscriptionId}`)

      // ADD CREDITS - This is the critical part
      const plan = PRICING_PLANS.find((pl) => pl.stripePriceId === priceId)
      const creditsToAdd = plan?.credits ?? 0

      if (creditsToAdd > 0) {
        console.log(`  Plan: ${plan?.title}`)
        console.log(`  Credits to add: ${creditsToAdd}`)

        const updatedOrg = await prisma.organization.update({
          where: { id: org.id },
          data: { 
            credits: { increment: creditsToAdd },
            creditsReminderThresholdSent: false,
          },
          select: { id: true, name: true, credits: true }
        })
        
        console.log(`[Stripe Webhook] ✅ Added ${creditsToAdd} credits. New balance: ${updatedOrg.credits}`)

        // Send email ONLY for new subscriptions
        if (invoice.billing_reason === 'subscription_create' && ENABLE_EMAILS) {
          const owner = await getOrgOwner(org.id)
          const to = invoice.customer_email || owner?.email

          if (to) {
            console.log(`  Sending email to: ${to}`)

            const amount = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0
            const currency = invoice.currency || 'usd'
            const invUrl = invoice.hosted_invoice_url || ''
            const invNum = (invoice.number as string | null) || null
            const planTitle = plan?.title ?? 'Subscription'
            const currentEnd = sp.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

            try {
              await sendPaymentConfirmationEmail({
                to,
                name: owner?.name || 'Customer',
                orgName: updatedOrg.name,
                amountPaid: amount,
                currency,
                invoiceUrl: invUrl,
                invoiceNumber: invNum,
                planTitle,
                periodEnd: currentEnd,
                portalUrl: null,
                finalCredits: updatedOrg.credits,
              })
              console.log(`[Stripe Webhook] ✅ Email sent successfully`)
            } catch (emailError) {
              console.error('[Stripe Webhook] ❌ Email failed:', emailError)
            }
          } else {
            console.warn('[Stripe Webhook] ⚠️  No email address found')
          }
        } else if (invoice.billing_reason !== 'subscription_create') {
          console.log(`[Stripe Webhook] ℹ️  Renewal - no email sent`)
        }
      } else {
        console.warn(`[Stripe Webhook] ⚠️  No credits configured for plan ${priceId}`)
      }
    } catch (error) {
      console.error('[Stripe Webhook] ❌ Error in invoice payment handler:', error)
    }
  }

  // ============================================================
  // 3. SUBSCRIPTION UPDATED
  // ============================================================
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const fresh = await stripe.subscriptions.retrieve(sub.id) as Stripe.Subscription
    const sp = fresh as unknown as PeriodFields
    
    console.log(`[Stripe Webhook] 🔄 customer.subscription.updated: ${sub.id}`)

    try {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: fresh.id },
        data: {
          planId: fresh.items.data[0].price.id,
          interval: String(fresh.items.data[0].price.recurring?.interval || 'month'),
          status: fresh.status,
          currentPeriodStart: sp.current_period_start ?? undefined,
          currentPeriodEnd: sp.current_period_end ?? undefined,
        },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        console.log(`[Stripe Webhook] ⚠️  Subscription ${fresh.id} not found in DB`)
      } else {
        console.error('[Stripe Webhook] ❌ Update failed:', error)
      }
    }

    // Handle cancellation scheduling
    const scheduled = !!fresh.cancel_at_period_end || !!fresh.cancel_at
    const immediateCanceled = fresh.status === 'canceled'
    const previous = (event.data.previous_attributes ?? {}) as {
      cancel_at?: number | null
      cancel_at_period_end?: boolean
    }

    let newlyScheduled = false
    if (Object.prototype.hasOwnProperty.call(previous, 'cancel_at_period_end')) {
      newlyScheduled = !previous.cancel_at_period_end && scheduled
    } else if (Object.prototype.hasOwnProperty.call(previous, 'cancel_at')) {
      newlyScheduled = (previous.cancel_at == null || previous.cancel_at === 0) && scheduled
    }

    if (newlyScheduled && !immediateCanceled && !scheduledCancellationNotified.has(fresh.id)) {
      scheduledCancellationNotified.add(fresh.id)
      console.log(`[Stripe Webhook] 📅 Cancellation scheduled`)

      try {
        const subRecord = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: fresh.id },
          include: { organization: true },
        })

        if (subRecord?.organization && ENABLE_EMAILS) {
          const owner = await getOrgOwner(subRecord.organization.id)
          if (owner?.email) {
            const plan = PRICING_PLANS.find((pl) => pl.stripePriceId === fresh.items.data[0].price.id)

            await sendCancellationEmail({
              to: owner.email,
              name: owner.name,
              orgName: subRecord.organization.name,
              planTitle: plan?.title,
              effectiveDate: typeof fresh.cancel_at === 'number' ? fresh.cancel_at : sp.current_period_end,
              final: false,
              creditsRemaining: subRecord.organization.credits,
            })
            console.log(`[Stripe Webhook] ✅ Cancellation email sent`)
          }
        }
      } catch (error) {
        console.error('[Stripe Webhook] ❌ Cancellation email failed:', error)
      }
    }
  }

  // ============================================================
  // 4. SUBSCRIPTION DELETED
  // ============================================================
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = String(sub.customer || '')

    console.log(`[Stripe Webhook] 🗑️  customer.subscription.deleted: ${sub.id}`)

    try {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodEnd: (sub as unknown as PeriodFields).current_period_end ?? undefined,
        },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        console.log(`[Stripe Webhook] ⚠️  Subscription ${sub.id} not found in DB`)
      } else {
        console.error('[Stripe Webhook] ❌ Update failed:', error)
      }
    }

    if (ENABLE_EMAILS) {
      try {
        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true, name: true, credits: true, deletedAt: true },
        })

        if (org && !org.deletedAt) {
          const owner = await getOrgOwner(org.id)
          if (owner?.email) {
            const plan = PRICING_PLANS.find((pl) => pl.stripePriceId === sub.items.data[0].price.id)

            await sendCancellationEmail({
              to: owner.email,
              name: owner.name,
              orgName: org.name,
              planTitle: plan?.title ?? 'Subscription',
              effectiveDate: (sub as unknown as PeriodFields).current_period_end ?? undefined,
              final: true,
              creditsRemaining: org.credits,
            })
            console.log(`[Stripe Webhook] ✅ Final cancellation email sent`)
          }
        }
      } catch (error) {
        console.error('[Stripe Webhook] ❌ Final email failed:', error)
      }
    }
  }

  return new Response(null, { status: 200 })
}
