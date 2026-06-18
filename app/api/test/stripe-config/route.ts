// app/api/test/stripe-config/route.ts
// TEMPORARY - Remove after debugging

import { PRICING_PLANS } from '@/lib/constants'
import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return NextResponse.json({
    plans: PRICING_PLANS.map(p => ({
      title: p.title,
      stripePriceId: p.stripePriceId || 'NOT SET',
      credits: p.credits
    })),
    envVars: {
      STRIPE_PRICE_ID_basic: process.env.STRIPE_PRICE_ID_basic ? 'SET' : 'NOT SET',
      STRIPE_PRICE_ID_pro: process.env.STRIPE_PRICE_ID_pro ? 'SET' : 'NOT SET',
      STRIPE_PRICE_ID_core: process.env.STRIPE_PRICE_ID_core ? 'SET' : 'NOT SET',
      STRIPE_PRICE_ID_coreplus: process.env.STRIPE_PRICE_ID_coreplus ? 'SET' : 'NOT SET',
    }
  })
}
