// app/api/inngest/route.ts
// HTTP endpoint for Inngest event delivery and step execution.
//
// The serve() handler from inngest/next manages the Inngest handshake,
// event delivery, and step execution protocol. Signature verification is
// handled automatically via INNGEST_SIGNING_KEY — no manual auth code needed.
//
// Security note (Requirement 15.3): this route accepts only Inngest platform
// callbacks. It does not expose a path to trigger analyzeReportFn directly;
// all user-facing VIN analysis requests must pass through the orgProcedure
// middleware in lib/orpc/routers/vin.ts before an event is ever dispatched.

import { serve } from 'inngest/next'

import { inngest } from '@/lib/inngest/client'
import { analyzeReportFn } from '@/lib/inngest/functions/analyze-report'

// Allow Inngest step execution up to 150s on Vercel Pro.
// The reliability-discover step may take up to 90s for Bright Data's /trigger response.
export const maxDuration = 150

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeReportFn],
})
