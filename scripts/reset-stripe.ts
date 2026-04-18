// scripts/reset-stripe.ts
// pnpm tsx scripts/reset-stripe.ts

import 'dotenv/config'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Let the v22 SDK use its native built-in API version automatically
  // apiVersion: '2025-10-29.clover',
})

async function resetStripe() {
  console.log('🗑️  Starting Stripe cleanup...')

  // 1. REFUND CHARGES
  console.log('\n--- Processing Refunds ---')
  let refundCount = 0
  let chargesMore = true
  let chargeCursor: string | undefined = undefined

  while (chargesMore) {
// scripts/reset-stripe.ts
    const charges: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
      limit: 100,
      starting_after: chargeCursor,
    })

    if (charges.data.length === 0) {
      chargesMore = false
      break
    }

    // Process refunds in parallel
    await Promise.all(
      charges.data.map(async (charge) => {
        if (!charge.refunded && charge.status === 'succeeded') {
          try {
            await stripe.refunds.create({ charge: charge.id })
            process.stdout.write('R') // R for Refund
            refundCount++
          } catch (err) {
             // Ignore if already refunded or other minor errors
             console.error(`\nError refunding charge ${charge.id}:`, err)
          }
        }
      })
    )
    chargeCursor = charges.data[charges.data.length - 1].id
  }
  console.log(`\nRefunded ${refundCount} charges.`)

  // 2. DELETE CUSTOMERS
  console.log('\n--- Deleting Customers ---')
  let deletedCount = 0
  let customersMore = true
  let customerCursor: string | undefined = undefined

  while (customersMore) {
// scripts/reset-stripe.ts
    const customers: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list({
      limit: 100,
      starting_after: customerCursor,
    })

    if (customers.data.length === 0) {
      customersMore = false
      break
    }

    await Promise.all(
      customers.data.map(async (customer) => {
        try {
          await stripe.customers.del(customer.id)
          process.stdout.write('D') // D for Delete
          deletedCount++
        } catch (err) {
          // Ignore
          console.error(`\nError deleting customer ${customer.id}:`, err)
        }
      })
    )
    customerCursor = customers.data[customers.data.length - 1].id
  }

  console.log(`\n\n✅ Cleanup complete!`)
  console.log(`- Refunded: ${refundCount}`)
  console.log(`- Deleted Customers: ${deletedCount}`)
}

if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live')) {
  console.error('❌ DANGER: Live key detected. Aborting.')
  process.exit(1)
}

resetStripe()

