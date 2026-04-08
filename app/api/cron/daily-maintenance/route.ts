// app/api/cron/daily-maintenance/route.ts

import prisma from '@/app/lib/db'
import { headers } from 'next/headers'
import { SOFT_DELETE_RETENTION_DAYS } from '../../../../lib/constants'

export async function GET() {
  const h = await headers()
  const auth = h.get('authorization') || ''
  
  const secret = process.env.CRON_SECRET || ''
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Cleanup: hard delete organizations where soft-delete retention elapsed.
    const cleanupResult = await prisma.$executeRaw`
      DELETE FROM "Organization" WHERE "deletedAt" <= NOW() - make_interval(days => ${SOFT_DELETE_RETENTION_DAYS})
    `

    // Use JSON.stringify for safety with BigInts (if any return from raw queries)
    return new Response(JSON.stringify({ 
      success: true, 
      orgsCleanedUp: Number(cleanupResult)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Cron job failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
