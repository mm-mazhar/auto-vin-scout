// lib/inngest/client.ts
// Singleton Inngest client shared across all functions and event sends.
// Server-side only — never import from client components.

import { Inngest, eventType } from 'inngest'

import { analyzeReportEventSchema } from '@/lib/inngest/events'

// ---------------------------------------------------------------------------
// Typed event definitions (v4 API: eventType + StandardSchema-compatible Zod)
// ---------------------------------------------------------------------------

/**
 * Typed event definition for `vin/report.analyze`.
 * Use `analyzeReportEvent.create(data)` when calling `inngest.send()` to get
 * compile-time validation of the event payload.
 */
export const analyzeReportEvent = eventType('vin/report.analyze', {
  schema: analyzeReportEventSchema,
})

// ---------------------------------------------------------------------------
// Inngest client singleton
// ---------------------------------------------------------------------------

export const inngest = new Inngest({
  id: 'autovinscout',
  // Checkpointing is enabled by default in v4. On Vercel serverless,
  // maxRuntime MUST be set below the function's maxDuration to prevent
  // the SDK from exceeding the platform timeout (which causes Inngest
  // to retry indefinitely because it never receives a response).
  checkpointing: {
    maxRuntime: '45s', // Vercel Pro default maxDuration is 60s
  },
})
