// app/lib/stripe.ts

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-10-29.clover', 
  // apiVersion: '2025-06-30.basil',
  typescript: true,
})

export const getStripeSession = async ({
  priceId,
  domainUrl,
  customerId,
  userId,
  organizationId,
  mode = 'subscription',
}: {
  priceId: string
  domainUrl: string
  customerId?: string
  userId?: string
  organizationId?: string
  mode?: 'subscription'
}) => {
  const payload: Stripe.Checkout.SessionCreateParams = {
    mode,
    billing_address_collection: 'auto',
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ['card'],
    success_url: `${domainUrl}/payment/success`,
    cancel_url: `${domainUrl}/payment/unsuccessful`,
    allow_promotion_codes: true,
  }

  if (customerId && customerId.startsWith('cus_')) {
    payload.customer = customerId
    payload.customer_update = { address: 'auto', name: 'auto' }
  }

  if (organizationId || userId) {
    // Prefer organizationId for client_reference_id if available, as we are moving to Org billing
    payload.client_reference_id = organizationId || userId
    payload.metadata = { 
      ...(payload.metadata || {}), 
      userId: userId || '',
      organizationId: organizationId || ''
    }
  }

  const session = await stripe.checkout.sessions.create(payload)

  return session.url as string
}
