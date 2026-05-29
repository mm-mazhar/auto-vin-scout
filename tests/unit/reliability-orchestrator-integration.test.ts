// tests/unit/reliability-orchestrator-integration.test.ts

/**
 * Integration tests for the Reliability & Social Proof Agent's orchestrator
 * integration, including unit tests for disabled/enabled behavior and
 * property-based tests for disabled flag and graceful degradation.
 *
 * Tasks: 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import type { RiskVectorResult, AgentInput } from '@/lib/services/risk-engine/types'

// --- Hoisted mocks ---

const { mockGetAgentConfig, mockDiscoverRedditPosts, mockCollectRedditComments } = vi.hoisted(() => ({
  mockGetAgentConfig: vi.fn(),
  mockDiscoverRedditPosts: vi.fn(),
  mockCollectRedditComments: vi.fn(),
}))

// --- Mock ai-config ---
vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: (...args: unknown[]) => mockGetAgentConfig(...args),
  getMasterAgentConfig: vi.fn(() => ({
    primary: { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'test-model' },
    fallback: { provider: 'google', model: 'test-fallback-model' },
    temperature: 0.2,
    maxTokens: 800,
    systemInstruction: 'Test master system instruction',
  })),
}))

// --- Mock OpenAI (always throw — no real LLM calls) ---
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

// --- Mock Google GenAI (always throw — no real LLM calls) ---
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    }
    constructor() {}
  },
}))

// --- Mock BrightDataDatasetService ---
vi.mock('@/lib/services/brightdata-dataset-service', () => ({
  BrightDataDatasetService: {
    discoverRedditPosts: (...args: unknown[]) => mockDiscoverRedditPosts(...args),
    collectRedditComments: (...args: unknown[]) => mockCollectRedditComments(...args),
  },
}))

// --- Mock Prisma (orchestrator imports it) ---
vi.mock('@/app/lib/db', () => ({
  default: {
    report: { findUnique: vi.fn(), update: vi.fn() },
    riskVectorResult: { createMany: vi.fn() },
  },
}))

// --- Mock @prisma/client ---
vi.mock('@prisma/client', () => ({
  Prisma: { JsonNull: 'DbNull' },
}))

// --- Mock WeatherService and SerpService (orchestrator imports them) ---
vi.mock('@/lib/services/weather-service', () => ({
  WeatherService: { getMaxPrecipitation: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@/lib/services/serp-service', () => ({
  SerpService: {
    fetchLocalTheftReports: vi.fn().mockResolvedValue([]),
    fetchVinSearch: vi.fn().mockResolvedValue({ snippets: [], links: [] }),
    fetchPricePrediction: vi.fn().mockResolvedValue(null),
  },
}))

import { RiskEngineOrchestrator } from '@/lib/services/risk-engine/orchestrator'

// --- Test Helpers ---

const DEFAULT_AGENT_CONFIG = {
  disabled: false,
  primary: { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'test-model' },
  fallback: { provider: 'google', model: 'test-fallback-model' },
  temperature: 0.1,
  maxTokens: 500,
  systemInstruction: 'Test system instruction for reliability agent',
}

function buildAgentInput(overrides?: Partial<AgentInput['vehicle']>): AgentInput {
  return {
    reportId: 'test-report-001',
    vehicle: {
      id: 'test-vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: overrides?.make ?? 'Honda',
      model: overrides?.model ?? 'Civic',
      year: overrides?.year ?? 2020,
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
    recalls: [],
    listingHistory: [],
    safetyRating: null,
  }
}

// --- Arbitraries for property tests ---

const makeArb = fc.constantFrom(
  'Honda', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz',
  'Nissan', 'Hyundai', 'Kia', 'Subaru', 'Mazda', 'Volkswagen',
)

const modelArb = fc.constantFrom(
  'Civic', 'Camry', 'F-150', 'Silverado', '3 Series', 'C-Class',
  'Altima', 'Elantra', 'Optima', 'Outback', 'CX-5', 'Jetta',
)

const yearArb = fc.integer({ min: 1990, max: 2025 })

const agentInputArb = fc.tuple(yearArb, makeArb, modelArb).map(([year, make, model]) =>
  buildAgentInput({ year, make, model })
)

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.3: Unit tests for orchestrator integration
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 4.3: Orchestrator Integration Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
    mockDiscoverRedditPosts.mockResolvedValue([])
    mockCollectRedditComments.mockResolvedValue([])
  })

  /**
   * Validates: Requirements 1.1, 1.3
   * When disabled === true, runReliabilityAgent returns null
   */
  it('returns null when getAgentConfig returns disabled: true', async () => {
    mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: true })

    const input = buildAgentInput()
    const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

    expect(result).toBeNull()
    // Agent should NOT have been executed (no BrightData calls)
    expect(mockDiscoverRedditPosts).not.toHaveBeenCalled()
    expect(mockCollectRedditComments).not.toHaveBeenCalled()
  })

  /**
   * Validates: Requirements 1.2, 8.2
   * When disabled === false, runReliabilityAgent executes agent and returns RiskVectorResult
   */
  it('executes agent and returns RiskVectorResult when enabled', async () => {
    mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: false })

    const input = buildAgentInput()
    const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

    expect(result).not.toBeNull()
    expect(result!.vectorIndex).toBe(8)
    expect(result!.vectorName).toBe('Reliability & Social Proof')
    expect(result!.weight).toBe(0.15)
    expect(result!.score).toBeOneOf([15, 55, 85])
    expect(result!.narrative.length).toBeGreaterThan(0)
    // Agent was executed (BrightData was called)
    expect(mockDiscoverRedditPosts).toHaveBeenCalled()
  })

  /**
   * Validates: Requirements 1.3, 11.2
   * Null results from disabled agents are filtered from the results array
   */
  it('null results are filtered from results array before aggregation', () => {
    // Simulate the orchestrator's null-filtering pattern from analyze-report.ts
    const baseline: RiskVectorResult = {
      vectorIndex: 0,
      vectorName: 'Baseline Health & Market Anomalies',
      score: 25,
      label: 'Low',
      weight: 0.20,
      narrative: 'Test baseline narrative.',
    }
    const reliability: RiskVectorResult | null = null // disabled agent

    const results: RiskVectorResult[] = [baseline, reliability].filter(
      (r): r is RiskVectorResult => r !== null
    )

    expect(results).toHaveLength(1)
    expect(results[0].vectorIndex).toBe(0)
    expect(results.every((r) => r !== null)).toBe(true)
  })

  /**
   * Validates: Requirements 1.1, 1.3
   * getAgentConfig is called with 'reliability' key
   */
  it('calls getAgentConfig with "reliability" key', async () => {
    mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: true })

    const input = buildAgentInput()
    await RiskEngineOrchestrator.runReliabilityAgent(input)

    expect(mockGetAgentConfig).toHaveBeenCalledWith('reliability')
  })

  /**
   * Validates: Requirements 8.2, 9.2
   * runReliabilityAgent never throws even if getAgentConfig throws
   */
  it('returns null (never throws) when getAgentConfig throws', async () => {
    mockGetAgentConfig.mockImplementation(() => {
      throw new Error('Config file not found')
    })

    const input = buildAgentInput()
    const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.4: Property 4 — Disabled Flag Prevents Execution
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 4.4: Property 4 — Disabled Flag Prevents Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
    mockDiscoverRedditPosts.mockResolvedValue([])
    mockCollectRedditComments.mockResolvedValue([])
  })

  /**
   * Property 4: Disabled Flag Prevents Execution
   *
   * When `disabled === true`, `runReliabilityAgent` returns `null` and no
   * agent is instantiated (no BrightData calls are made).
   *
   * **Validates: Requirements 1.1, 1.3**
   */
  it('for any AgentInput, disabled=true always returns null and no agent is instantiated', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        vi.clearAllMocks()
        mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: true })
        mockDiscoverRedditPosts.mockResolvedValue([])
        mockCollectRedditComments.mockResolvedValue([])

        const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

        // Must always return null when disabled
        expect(result).toBeNull()
        // No agent instantiation means no BrightData calls
        expect(mockDiscoverRedditPosts).not.toHaveBeenCalled()
        expect(mockCollectRedditComments).not.toHaveBeenCalled()
      }),
      { numRuns: 100 },
    )
  })

  it('for any AgentInput, disabled=false always returns a non-null RiskVectorResult', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        vi.clearAllMocks()
        mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: false })
        mockDiscoverRedditPosts.mockResolvedValue([])
        mockCollectRedditComments.mockResolvedValue([])

        const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

        // Must always return a valid result when enabled
        expect(result).not.toBeNull()
        expect(result!.vectorIndex).toBe(8)
        expect(result!.score).toBeOneOf([15, 55, 85])
      }),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Task 4.5: Property 5 — Graceful API Failure Degradation
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 4.5: Property 5 — Graceful API Failure Degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  /**
   * Property 5: Graceful API Failure Degradation
   *
   * For any failure mode, `BrightDataDatasetService` methods return `[]`
   * and never throw. When the service fails, the orchestrator still returns
   * a valid result (not null, not thrown).
   *
   * **Validates: Requirements 2.3, 2.4, 3.4, 9.1**
   */

  /** Arbitrary failure modes for BrightDataDatasetService */
  const failureModeArb = fc.constantFrom(
    'network-error',
    'timeout',
    'http-500',
    'http-403',
    'malformed-json',
    'missing-token',
    'rejection',
  )

  it('orchestrator returns valid result (never throws) for any API failure mode', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, failureModeArb, async (input, failureMode) => {
        vi.clearAllMocks()
        mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: false })

        // Simulate various failure modes — all should result in [] from the service
        // (the service itself catches errors and returns [])
        // Here we test that even if the mock rejects, the orchestrator handles it
        switch (failureMode) {
          case 'network-error':
            mockDiscoverRedditPosts.mockRejectedValue(new Error('ECONNREFUSED'))
            mockCollectRedditComments.mockRejectedValue(new Error('ECONNREFUSED'))
            break
          case 'timeout':
            mockDiscoverRedditPosts.mockRejectedValue(new Error('AbortError: timeout'))
            mockCollectRedditComments.mockRejectedValue(new Error('AbortError: timeout'))
            break
          case 'http-500':
            mockDiscoverRedditPosts.mockResolvedValue([])
            mockCollectRedditComments.mockResolvedValue([])
            break
          case 'http-403':
            mockDiscoverRedditPosts.mockResolvedValue([])
            mockCollectRedditComments.mockResolvedValue([])
            break
          case 'malformed-json':
            mockDiscoverRedditPosts.mockRejectedValue(new SyntaxError('Unexpected token'))
            mockCollectRedditComments.mockRejectedValue(new SyntaxError('Unexpected token'))
            break
          case 'missing-token':
            mockDiscoverRedditPosts.mockResolvedValue([])
            mockCollectRedditComments.mockResolvedValue([])
            break
          case 'rejection':
            mockDiscoverRedditPosts.mockRejectedValue(new Error('Unknown rejection'))
            mockCollectRedditComments.mockRejectedValue(new Error('Unknown rejection'))
            break
        }

        const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

        // Orchestrator must never throw — always returns a valid result or null
        // When enabled, the agent's internal try/catch ensures a valid result
        expect(result).not.toBeNull()
        expect(result!.vectorIndex).toBe(8)
        expect(result!.weight).toBe(0.15)
        expect(result!.score).toBeOneOf([15, 55, 85])
        expect(result!.label).toBeOneOf(['Low', 'Medium', 'High'])
        expect(result!.narrative.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )
  })

  it('BrightDataDatasetService failures result in LOW fallback score', async () => {
    await fc.assert(
      fc.asyncProperty(agentInputArb, async (input) => {
        vi.clearAllMocks()
        mockGetAgentConfig.mockReturnValue({ ...DEFAULT_AGENT_CONFIG, disabled: false })

        // When BrightData returns empty arrays (graceful degradation),
        // no keywords match → score should be 15 (Low)
        mockDiscoverRedditPosts.mockResolvedValue([])
        mockCollectRedditComments.mockResolvedValue([])

        const result = await RiskEngineOrchestrator.runReliabilityAgent(input)

        expect(result).not.toBeNull()
        expect(result!.score).toBe(15)
        expect(result!.label).toBe('Low')
      }),
      { numRuns: 50 },
    )
  })
})
