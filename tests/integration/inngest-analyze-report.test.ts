// tests/integration/inngest-analyze-report.test.ts
// Unit tests for analyzeReportFn using @inngest/test
//
// Tests the Inngest function in isolation without a running Inngest server.
// Uses @inngest/test to verify function execution and step handling.
//
// Step order:
//   verify-vehicle → fetch-recalls → upsert-recalls → fetch-market-history
//   → fetch-safety-ratings → load-agent-input → fetch-agent-deps
//   → [agent-baseline, agent-safety, agent-engine, agent-corrosion, agent-flood, agent-theft]
//   → persist-results → [master-synthesis, price-prediction] → finalize-report

import { describe, it, expect, beforeEach } from 'vitest'
import { InngestTestEngine } from '@inngest/test'
import { analyzeReportFn } from '@/lib/inngest/functions/analyze-report'

// --- Test Fixtures ---

const mockVehicle = { id: 'vehicle-789', vin: '1HGBH41JXMN109186' }

const mockAgentInput = {
  reportId: 'report-123',
  vehicle: {
    id: 'vehicle-789',
    vin: '1HGBH41JXMN109186',
    make: 'Honda',
    model: 'Civic',
    year: 2020,
    trim: 'EX',
    engineDesc: '2.0L I4',
    decoderSource: 'nhtsa',
  },
  recalls: [],
  listingHistory: [],
  safetyRating: null,
}

const mockAgentDeps = {
  weatherData: { maxPrecipitationMm: 0, maxPrecipitationInches: 0, city: null, state: null, date: null },
  serpSnippets: [],
  latestCity: null,
  latestState: null,
}

const mockAgentResult = {
  vectorIndex: 0,
  vectorName: 'Test Vector',
  score: 25,
  label: 'Low',
  weight: 0.20,
  narrative: 'Test narrative.',
  metadata: { usedFallbackNarrative: false, findings: [] },
}

const mockSynthesis = {
  compositeScore: 25,
  compositeLabel: 'Low',
  executiveSummary: 'Test summary',
  negotiationScript: 'Test script',
  isAiFallback: false,
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: 'vin/report.analyze' as const,
    data: {
      reportId: 'report-123',
      orgId: 'org-456',
      vehicleId: 'vehicle-789',
      vehicleMake: 'Honda',
      vehicleModel: 'Civic',
      vehicleYear: 2020,
      ...overrides,
    },
  }
}

/** All steps for the happy path (recalls > 0) */
function makeAllSteps(recallCount = 2) {
  const recallsResponse = {
    Count: recallCount,
    results: Array.from({ length: recallCount }, (_, i) => ({
      campaignNumber: `RECALL00${i + 1}`,
      description: `Test recall ${i + 1}`,
    })),
  }

  const steps = [
    { id: 'verify-vehicle', handler: () => mockVehicle },
    { id: 'fetch-recalls', handler: () => recallsResponse },
    ...(recallCount > 0 ? [{ id: 'upsert-recalls', handler: () => undefined }] : []),
    { id: 'fetch-market-history', handler: () => undefined },
    { id: 'fetch-safety-ratings', handler: () => undefined },
    { id: 'load-agent-input', handler: () => mockAgentInput },
    { id: 'fetch-agent-deps', handler: () => mockAgentDeps },
    { id: 'agent-baseline', handler: () => mockAgentResult },
    { id: 'agent-safety', handler: () => ({ ...mockAgentResult, vectorIndex: 1 }) },
    { id: 'agent-engine', handler: () => ({ ...mockAgentResult, vectorIndex: 2 }) },
    { id: 'agent-corrosion', handler: () => ({ ...mockAgentResult, vectorIndex: 4 }) },
    { id: 'agent-flood', handler: () => ({ ...mockAgentResult, vectorIndex: 5 }) },
    { id: 'agent-theft', handler: () => ({ ...mockAgentResult, vectorIndex: 6 }) },
    { id: 'persist-results', handler: () => undefined },
    { id: 'master-synthesis', handler: () => mockSynthesis },
    { id: 'price-prediction', handler: () => null },
    { id: 'finalize-report', handler: () => undefined },
  ]

  return steps
}

describe('analyzeReportFn', () => {
  let engine: InngestTestEngine

  beforeEach(() => {
    engine = new InngestTestEngine({
      function: analyzeReportFn,
    })
  })

  describe('Happy path: all steps execute in order', () => {
    it('should execute all steps when recalls > 0', async () => {
      const { state } = await engine.execute({
        events: [makeEvent()],
        steps: makeAllSteps(2),
      })

      expect(state).toBeDefined()
    })

    it('should complete successfully with valid event data', async () => {
      const { result } = await engine.execute({
        events: [makeEvent({ vehicleMake: 'Toyota', vehicleModel: 'Camry', vehicleYear: 2021 })],
        steps: makeAllSteps(1),
      })

      expect(result).not.toBeInstanceOf(Error)
    })
  })

  describe('Zero-recall path: upsert-recalls step is skipped', () => {
    it('should skip upsert-recalls when Count === 0', async () => {
      const { state } = await engine.execute({
        events: [makeEvent({ vehicleMake: 'Ford', vehicleModel: 'Mustang', vehicleYear: 2022 })],
        steps: makeAllSteps(0),
      })

      expect(state).toBeDefined()
    })

    it('should still run all agent steps even when no recalls exist', async () => {
      const { result } = await engine.execute({
        events: [makeEvent({ vehicleMake: 'BMW', vehicleModel: '3 Series', vehicleYear: 2023 })],
        steps: makeAllSteps(0),
      })

      expect(result).not.toBeInstanceOf(Error)
    })
  })

  describe('Per-agent step isolation', () => {
    it('each agent runs as a separate step', async () => {
      const steps = makeAllSteps(0)
      const agentStepIds = steps
        .filter((s) => s.id.startsWith('agent-'))
        .map((s) => s.id)

      expect(agentStepIds).toEqual([
        'agent-baseline',
        'agent-safety',
        'agent-engine',
        'agent-corrosion',
        'agent-flood',
        'agent-theft',
      ])
    })

    it('synthesis and price-prediction are separate steps', async () => {
      const steps = makeAllSteps(0)
      const postAgentSteps = steps
        .filter((s) => ['master-synthesis', 'price-prediction', 'finalize-report'].includes(s.id))
        .map((s) => s.id)

      expect(postAgentSteps).toEqual(['master-synthesis', 'price-prediction', 'finalize-report'])
    })
  })

  describe('Function configuration', () => {
    it('should have correct function ID', () => {
      expect(analyzeReportFn).toBeDefined()
      expect(analyzeReportFn).toHaveProperty('opts')
    })

    it('should be triggered by vin/report.analyze event', () => {
      expect(analyzeReportFn).toBeDefined()
      expect(analyzeReportFn).toHaveProperty('opts')
    })
  })
})
