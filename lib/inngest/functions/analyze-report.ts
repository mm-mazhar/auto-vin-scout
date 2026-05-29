// lib/inngest/functions/analyze-report.ts
// Durable Inngest function that executes the full VIN risk assessment pipeline
// for a single report.
//
// Each risk agent runs in its own step.run() call so Inngest can checkpoint
// between them. On Vercel serverless, this means each agent gets its own
// invocation and timeout budget — no single call exceeds maxRuntime.
//
// Step order:
//   verify-vehicle → fetch-recalls → upsert-recalls → fetch-market-history
//   → fetch-safety-ratings → load-agent-input → fetch-agent-deps
//   → [agents in parallel] → persist-results → master-synthesis → finalize-report

import prisma from '@/app/lib/db'
import { inngest, analyzeReportEvent } from '@/lib/inngest/client'
import {
  fetchNHTSARecalls,
  upsertVehicleRecalls,
} from '@/lib/services/nhtsa-recalls'
import { MarketCheckHistoryService } from '@/lib/services/marketcheck-history-service'
import { NhtsaNcapService } from '@/lib/services/nhtsa-ncap-service'
import { RiskEngineOrchestrator } from '@/lib/services/risk-engine/orchestrator'
import type { AgentInput, RiskVectorResult } from '@/lib/services/risk-engine/types'
import type { AgentDeps } from '@/lib/services/risk-engine/orchestrator'

export const analyzeReportFn = inngest.createFunction(
  {
    id: 'analyze-report',
    concurrency: { limit: 1, key: 'event.data.orgId' },
    retries: 0, // Orchestrator handles primary→fallback internally; Inngest retries are redundant
    triggers: [{ event: analyzeReportEvent }],
  },
  async ({ event, step }) => {
    const { reportId, orgId, vehicleId, vehicleMake, vehicleModel, vehicleYear } =
      event.data

    // Guard: all three vehicle fields required before any step executes.
    if (!vehicleMake || !vehicleModel || !vehicleYear) {
      throw new Error(
        `[analyzeReportFn] Missing required vehicle fields on event for report ${reportId}. ` +
          `vehicleMake=${vehicleMake}, vehicleModel=${vehicleModel}, vehicleYear=${vehicleYear}`
      )
    }

    // -------------------------------------------------------------------------
    // Step 0: verify-vehicle
    // -------------------------------------------------------------------------
    const vehicle = await step.run('verify-vehicle', async () => {
      const maxRetries = 5
      let lastError: Error | null = null

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const found = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true, vin: true },
          })

          if (found) return found

          const delayMs = 100 * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
        }
      }

      throw new Error(
        `[analyzeReportFn] Vehicle ${vehicleId} not found for report ${reportId} after ${maxRetries} retries. ` +
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
    // -------------------------------------------------------------------------
    const recallsResponse = await step.run('fetch-recalls', () =>
      fetchNHTSARecalls(vehicleMake, vehicleModel, vehicleYear)
    )

    if (recallsResponse === null) {
      throw new Error(
        `[analyzeReportFn] fetchNHTSARecalls returned null for ${vehicleMake} ${vehicleModel} ${vehicleYear} — transient network error, will retry`
      )
    }

    // -------------------------------------------------------------------------
    // Step 2: upsert-recalls (conditional)
    // -------------------------------------------------------------------------
    if (recallsResponse.Count > 0) {
      await step.run('upsert-recalls', () =>
        upsertVehicleRecalls(vehicleId, recallsResponse.results)
      )
    }

    // -------------------------------------------------------------------------
    // Step 3: fetch-market-history
    // -------------------------------------------------------------------------
    await step.run('fetch-market-history', async () => {
      try {
        await MarketCheckHistoryService.fetchAndPersist(vehicle.vin, vehicleId)
      } catch (error) {
        console.warn(
          `[analyzeReportFn] fetch-market-history failed for VIN ${vehicle.vin} (report ${reportId}). ` +
            `Continuing with empty market history. Error: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    })

    // -------------------------------------------------------------------------
    // Step 4: fetch-safety-ratings
    // -------------------------------------------------------------------------
    await step.run('fetch-safety-ratings', async () => {
      const fullVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true, make: true, model: true, year: true, driveType: true, doors: true, vehicleType: true, bodyType: true, bodySubtype: true },
      })
      if (fullVehicle) {
        await NhtsaNcapService.fetchAndSaveSafetyRatings(fullVehicle)
      }
    })

    // -------------------------------------------------------------------------
    // Step 5: load-agent-input
    // Loads the full AgentInput from DB (includes recalls, listings, safety
    // ratings that were just persisted in prior steps).
    // -------------------------------------------------------------------------
    const agentInput = await step.run('load-agent-input', async () => {
      const input = await RiskEngineOrchestrator.loadAgentInput(reportId)
      if (!input) {
        throw new Error(`[analyzeReportFn] Could not load AgentInput for report ${reportId}`)
      }
      return input
    }) as AgentInput

    // -------------------------------------------------------------------------
    // Step 6: fetch-agent-deps
    // Weather + SERP data needed by FloodAgent and TheftAgent.
    // -------------------------------------------------------------------------
    const agentDeps = await step.run('fetch-agent-deps', () =>
      RiskEngineOrchestrator.fetchAgentDeps(agentInput)
    ) as AgentDeps

    // -------------------------------------------------------------------------
    // Steps 7-12: Individual agent executions (parallel)
    // Each agent = separate Vercel invocation = no timeout pressure.
    // -------------------------------------------------------------------------
    const [baseline, safety, engine, corrosion, flood, theft, forensics, reliability] = await Promise.all([
      step.run('agent-baseline', () =>
        RiskEngineOrchestrator.runBaselineAgent(agentInput)
      ),
      step.run('agent-safety', () =>
        RiskEngineOrchestrator.runSafetyAgent(agentInput)
      ),
      step.run('agent-engine', () =>
        RiskEngineOrchestrator.runEngineAgent(agentInput)
      ),
      step.run('agent-corrosion', () =>
        RiskEngineOrchestrator.runCorrosionAgent(agentInput)
      ),
      step.run('agent-flood', () =>
        RiskEngineOrchestrator.runFloodAgent(agentInput, agentDeps)
      ),
      step.run('agent-theft', () =>
        RiskEngineOrchestrator.runTheftAgent(agentInput, agentDeps)
      ),
      step.run('agent-forensics', () =>
        RiskEngineOrchestrator.runForensicsAgent(agentInput, agentDeps)
      ),
      step.run('agent-reliability', () =>
        RiskEngineOrchestrator.runReliabilityAgent(agentInput)
      ),
    ]) as [RiskVectorResult, RiskVectorResult, RiskVectorResult, RiskVectorResult, RiskVectorResult, RiskVectorResult, RiskVectorResult, RiskVectorResult | null]

    const results: RiskVectorResult[] = [baseline, safety, engine, corrosion, flood, theft, forensics, reliability]
      .filter((r): r is RiskVectorResult => r !== null)

    // -------------------------------------------------------------------------
    // Step 13: persist-results
    // -------------------------------------------------------------------------
    await step.run('persist-results', () =>
      RiskEngineOrchestrator.persistResults(reportId, results)
    )

    // -------------------------------------------------------------------------
    // Steps 14-15: master-synthesis + price-prediction (parallel)
    // These are independent — synthesis needs agent results, valuation needs
    // only vehicle year/make/model. Running them concurrently saves ~2-5s.
    // -------------------------------------------------------------------------
    const [synthesis, pricePrediction] = await Promise.all([
      step.run('master-synthesis', () =>
        RiskEngineOrchestrator.synthesize(results)
      ),
      step.run('price-prediction', () =>
        RiskEngineOrchestrator.runValuation(vehicleYear, vehicleMake, vehicleModel)
      ),
    ])

    // -------------------------------------------------------------------------
    // Step 16: finalize-report
    // Updates the Report record with final score, label, and narratives.
    // -------------------------------------------------------------------------
    await step.run('finalize-report', () =>
      RiskEngineOrchestrator.finalizeReport(reportId, {
        ...synthesis,
        pricePrediction,
      })
    )
  }
)
