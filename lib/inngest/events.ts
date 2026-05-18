// lib/inngest/events.ts
// Centralized, typed event definitions for all Inngest events.
// Imported by lib/inngest/client.ts to register EventSchemas and by
// property tests to validate payload shape at runtime via Zod.

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod schema — used by property tests (Property 1) and runtime validation
// ---------------------------------------------------------------------------

export const analyzeReportEventSchema = z.object({
  reportId: z.string().min(1),
  orgId: z.string().min(1),
  vehicleId: z.string().min(1),
  vehicleMake: z.string().min(1),
  vehicleModel: z.string().min(1),
  vehicleYear: z.number().int().min(1900).max(2100),
})

export type AnalyzeReportEventData = z.infer<typeof analyzeReportEventSchema>

// ---------------------------------------------------------------------------
// Inngest event type map — registered with EventSchemas in client.ts
// ---------------------------------------------------------------------------

export type InngestEvents = {
  'vin/report.analyze': {
    data: AnalyzeReportEventData
  }
}
