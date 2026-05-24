// tests/property/baseline-agent-scoring.test.ts

/**
 * Property-based test: Baseline Agent scoring invariants.
 *
 * Validates: Requirements 10.7
 *
 * For any valid combination of vehicle year (1900 to current year), listing history
 * (0 to N listings with arbitrary miles, prices, and dates), and recalls (0 to M recalls),
 * the Baseline Agent's output:
 * - score SHALL be between 0 and 100 inclusive
 * - label SHALL correspond to the score range (0-30 = "Low", 31-70 = "Medium", 71-100 = "High")
 * - vectorIndex SHALL be 0
 * - vectorName SHALL be "Baseline Health & Market Anomalies"
 * - weight SHALL be 0.20
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock ai-config to return a test config
vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: vi.fn(() => ({
    primary: {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'test-model',
    },
    fallback: {
      provider: 'google',
      model: 'test-fallback-model',
    },
    temperature: 0.1,
    maxTokens: 400,
    systemInstruction: 'Test system instruction',
  })),
}))

// Mock OpenAI — always throw so we exercise fallback narrative path
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      },
    }
    constructor() {}
  },
}))

// Mock Google GenAI — always throw so we exercise fallback narrative path
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    }
    constructor() {}
  },
}))

import { BaselineAgent } from '@/lib/services/risk-engine/agents/0-baseline-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Arbitraries ---

const currentYear = new Date().getFullYear()

const vehicleYearArb = fc.integer({ min: 1900, max: currentYear })

const listingArb = fc.record({
  externalListingId: fc.string({ minLength: 1, maxLength: 20 }),
  price: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  miles: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  msrp: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  dom: fc.option(fc.integer({ min: 0, max: 365 }), { nil: null }),
  statusDate: fc.option(
    fc.integer({ min: 2015, max: 2025 }).chain((year) =>
      fc.integer({ min: 0, max: 364 }).map((dayOffset) => {
        const d = new Date(year, 0, 1)
        d.setDate(d.getDate() + dayOffset)
        return d
      })
    ),
    { nil: null }
  ),
  firstSeenAt: fc.option(
    fc.integer({ min: 2015, max: 2025 }).chain((year) =>
      fc.integer({ min: 0, max: 364 }).map((dayOffset) => {
        const d = new Date(year, 0, 1)
        d.setDate(d.getDate() + dayOffset)
        return d
      })
    ),
    { nil: null }
  ),
  lastSeenAt: fc.option(
    fc.integer({ min: 2015, max: 2025 }).chain((year) =>
      fc.integer({ min: 0, max: 364 }).map((dayOffset) => {
        const d = new Date(year, 0, 1)
        d.setDate(d.getDate() + dayOffset)
        return d
      })
    ),
    { nil: null }
  ),
  sellerType: fc.option(fc.constantFrom('dealer', 'fsbo', 'auction'), { nil: null }),
  sellerName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  city: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  state: fc.option(fc.string({ minLength: 2, maxLength: 2 }), { nil: null }),
  latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
  longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
  isCertified: fc.option(fc.boolean(), { nil: null }),
})

const listingHistoryArb = fc.array(listingArb, { minLength: 0, maxLength: 20 })

const recallArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  campaignNumber: fc.string({ minLength: 1, maxLength: 15 }),
  component: fc.string({ minLength: 1, maxLength: 30 }),
  summary: fc.string({ minLength: 1, maxLength: 100 }),
  parkIt: fc.boolean(),
  parkOutSide: fc.boolean(),
})

const recallsArb = fc.array(recallArb, { minLength: 0, maxLength: 10 })

const agentInputArb = fc
  .tuple(vehicleYearArb, listingHistoryArb, recallsArb)
  .map(([year, listingHistory, recalls]): AgentInput => ({
    reportId: 'pbt-report-001',
    vehicle: {
      id: 'pbt-vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Accord',
      year,
      trim: null,
      engineDesc: null,
      engineCylinders: '4',
      turbo: null,
      fuelTypePrimary: 'Gasoline',
      fuelTypeSecondary: null,
      electrificationLevel: null,
      engineModel: null,
      decoderSource: 'nhtsa',
    },
    recalls,
    listingHistory,
    safetyRating: null,
  }))

// --- Property Tests ---

describe('BaselineAgent Scoring Invariants (Property-Based)', () => {
  let agent: BaselineAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new BaselineAgent()
    // Ensure no real API keys are set so LLM always falls back
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  it('score is always between 0 and 100 inclusive', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        const result = await agent.execute(input)
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }),
      { numRuns: 150 }
    )
  })

  it('label always corresponds to the score range', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        const result = await agent.execute(input)

        if (result.score <= 30) {
          expect(result.label).toBe('Low')
        } else if (result.score <= 70) {
          expect(result.label).toBe('Medium')
        } else {
          expect(result.label).toBe('High')
        }
      }),
      { numRuns: 150 }
    )
  })

  it('vectorIndex is always 0', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        const result = await agent.execute(input)
        expect(result.vectorIndex).toBe(0)
      }),
      { numRuns: 150 }
    )
  })

  it('vectorName is always "Baseline Health & Market Anomalies"', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        const result = await agent.execute(input)
        expect(result.vectorName).toBe('Baseline Health & Market Anomalies')
      }),
      { numRuns: 150 }
    )
  })

  it('weight is always 0.20', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        const result = await agent.execute(input)
        expect(result.weight).toBe(0.20)
      }),
      { numRuns: 150 }
    )
  })
})
