// lib/inngest/functions/analyze-report.ts
// Durable Inngest function that executes the full VIN risk assessment pipeline
// for a single report. Replaces the hand-rolled after() + JobQueue orchestration.
//
// Step order: fetch-recalls → upsert-recalls (conditional) → generate-risk

import prisma from '@/app/lib/db'
import { inngest, analyzeReportEvent } from '@/lib/inngest/client'
import {
  fetchNHTSARecalls,
  upsertVehicleRecalls,
} from '@/lib/services/nhtsa-recalls'
import { RiskEngineService } from '@/lib/services/risk-engine'

export const analyzeReportFn = inngest.createFunction(
  {
    id: 'analyze-report',
    concurrency: { limit: 1, key: 'event.data.orgId' },
    retries: 1, // Reduced from 3 to 1: only retry on transient network errors, not on invalid vehicles
    triggers: [{ event: analyzeReportEvent }],
  },
  async ({ event, step }) => {
    const { reportId, orgId, vehicleId, vehicleMake, vehicleModel, vehicleYear } =
      event.data

    // Guard: all three vehicle fields required before any step executes.
    // Missing fields indicate a malformed event — throw immediately so Inngest
    // marks the run as failed rather than retrying a fundamentally broken payload.
    if (!vehicleMake || !vehicleModel || !vehicleYear) {
      throw new Error(
        `[analyzeReportFn] Missing required vehicle fields on event for report ${reportId}. ` +
          `vehicleMake=${vehicleMake}, vehicleModel=${vehicleModel}, vehicleYear=${vehicleYear}`
      )
    }

    // Verify the vehicle exists in the database before proceeding.
    // This ensures database isolation is respected and the vehicle record is visible
    // to this Inngest function execution (which may run in a different connection/process).
    // Retry with exponential backoff if the vehicle isn't found yet (transaction isolation).
    const vehicle = await step.run('verify-vehicle', async () => {
      const maxRetries = 5
      let lastError: Error | null = null

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const found = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true, vin: true },
          })

          if (found) {
            return found
          }

          // Vehicle not found yet, wait before retrying
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
          const delayMs = 100 * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          // Continue to next retry
        }
      }

      // After all retries, throw an error
      throw new Error(
        `[analyzeReportFn] Vehicle ${vehicleId} not found for report ${reportId} after ${maxRetries} retries. ` +
          `This may indicate a database isolation issue or the vehicle record hasn't been committed yet. ` +
          `Last error: ${lastError?.message || 'unknown'}`
      )
    })

    if (!vehicle) {
      throw new Error(
        `[analyzeReportFn] Vehicle ${vehicleId} not found for report ${reportId}.`
      )
    }

    // -------------------------------------------------------------------------
    // Step 1: fetch-recalls
    // Idempotent — pure HTTP read, safe to retry on transient errors.
    // Returns EMPTY_RESPONSE (Count: 0) when:
    //   - Vehicle not found (404)
    //   - Invalid/unsupported vehicle (400)
    //   - No recalls exist for the vehicle
    // Returns null only on transient network errors (timeout, connection failure).
    // -------------------------------------------------------------------------
    const recallsResponse = await step.run('fetch-recalls', () =>
      fetchNHTSARecalls(vehicleMake, vehicleModel, vehicleYear)
    )

    // A null response means fetchNHTSARecalls encountered a transient network error.
    // This is retryable. Throw to let Inngest retry the entire function.
    if (recallsResponse === null) {
      throw new Error(
        `[analyzeReportFn] fetchNHTSARecalls returned null for ${vehicleMake} ${vehicleModel} ${vehicleYear} — transient network error, will retry`
      )
    }

    // If we get here, recallsResponse is valid (either with recalls or empty).
    // Count === 0 means no recalls found (404, 400, or genuinely no recalls).
    // This is NOT an error — proceed to risk assessment.

    // -------------------------------------------------------------------------
    // Step 2: upsert-recalls (conditional — skipped when Count === 0)
    // Idempotent — upserts by campaignNumber, safe to retry.
    // -------------------------------------------------------------------------
    if (recallsResponse.Count > 0) {
      await step.run('upsert-recalls', () =>
        upsertVehicleRecalls(vehicleId, recallsResponse.results)
      )
    }

    // -------------------------------------------------------------------------
    // Step 3: generate-risk
    // Calls RiskEngineService which writes riskScore, riskLabel, riskNarrative,
    // isAiFallback, and sets Report.status = 'COMPLETED'.
    // -------------------------------------------------------------------------
    await step.run('generate-risk', () =>
      RiskEngineService.generateRiskAssessment(reportId)
    )
  }
)
