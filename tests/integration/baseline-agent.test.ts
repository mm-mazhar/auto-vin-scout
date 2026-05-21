// tests/integration/baseline-agent.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AgentInput, RiskVectorResult } from '@/lib/services/risk-engine/types'

// Mock ai-config to return a test config for getAgentConfig('baseline')
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

// Mock OpenAI — default: returns a narrative
const mockCreate = vi.fn()
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } }
      constructor() {}
    },
  }
})

// Mock Google GenAI
const mockGenerateContent = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent }
    constructor() {}
  },
}))

import { BaselineAgent } from '@/lib/services/risk-engine/agents/0-baseline-agent'

// --- Helpers ---

function makeRecall(overrides: Partial<AgentInput['recalls'][number]> = {}) {
  return {
    id: `recall-${Math.random().toString(36).slice(2, 8)}`,
    campaignNumber: '24V-001',
    component: 'Brakes',
    summary: 'Brake caliper may corrode',
    parkIt: false,
    parkOutSide: false,
    ...overrides,
  }
}

function makeListing(overrides: Partial<AgentInput['listingHistory'][number]> = {}) {
  return {
    externalListingId: `listing-${Math.random().toString(36).slice(2, 8)}`,
    price: null as number | null,
    miles: null as number | null,
    msrp: null as number | null,
    statusDate: null as Date | null,
    firstSeenAt: null as Date | null,
    lastSeenAt: null as Date | null,
    sellerType: null as string | null,
    sellerName: null as string | null,
    city: null as string | null,
    state: null as string | null,
    ...overrides,
  }
}

function makeInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    reportId: 'report-test-001',
    vehicle: {
      id: 'vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Accord',
      year: new Date().getFullYear() - 5, // 5 years old by default
      trim: 'EX',
      engine: '2.0L I4',
      decoderSource: 'nhtsa',
    },
    recalls: [],
    listingHistory: [],
    ...overrides,
  }
}

describe('BaselineAgent', () => {
  let agent: BaselineAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new BaselineAgent()

    // Default: OpenAI returns a narrative successfully
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Test narrative from LLM.' } }],
    })

    // Set env var so the OpenAI path is taken
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  // --- Test 1: Vehicle age scoring — vehicle > 10 years old gets +15 points ---
  it('adds 15 points when vehicle is older than 10 years', async () => {
    const input = makeInput({
      vehicle: {
        id: 'v1',
        vin: '1HGBH41JXMN109186',
        make: 'Toyota',
        model: 'Camry',
        year: new Date().getFullYear() - 12, // 12 years old
        trim: null,
        engine: null,
        decoderSource: 'nhtsa',
      },
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(15)
    expect(result.label).toBe('Low')
    expect(result.metadata?.vehicleAge).toBe(12)
  })

  // --- Test 2: Vehicle age scoring — vehicle <= 10 years old gets 0 age points ---
  it('adds 0 age points when vehicle is 10 years old or newer', async () => {
    const input = makeInput({
      vehicle: {
        id: 'v1',
        vin: '1HGBH41JXMN109186',
        make: 'Toyota',
        model: 'Camry',
        year: new Date().getFullYear() - 10, // exactly 10 years old
        trim: null,
        engine: null,
        decoderSource: 'nhtsa',
      },
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(0)
    expect(result.label).toBe('Low')
  })

  // --- Test 3: Odometer rollback detection — miles decreasing sets score floor to 85 ---
  it('sets score floor to 85 when odometer rollback is detected', async () => {
    const input = makeInput({
      listingHistory: [
        makeListing({ miles: 50000, statusDate: new Date('2023-01-01') }),
        makeListing({ miles: 60000, statusDate: new Date('2023-06-01') }),
        makeListing({ miles: 45000, statusDate: new Date('2024-01-01') }), // rollback
      ],
    })

    const result = await agent.execute(input)

    expect(result.score).toBeGreaterThanOrEqual(85)
    expect(result.metadata?.rollbackDetected).toBe(true)
    expect(result.label).toBe('High')
  })

  // --- Test 4: Fire-sale detection — >30% price drop adds 30 points ---
  it('adds 30 points when a >30% price drop is detected', async () => {
    const input = makeInput({
      listingHistory: [
        makeListing({ price: 30000, statusDate: new Date('2023-01-01') }),
        makeListing({ price: 18000, statusDate: new Date('2023-06-01') }), // 40% drop
      ],
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(30)
    expect(result.label).toBe('Low') // 30 is still "Low" (0-30)
  })

  // --- Test 5: Recall scoring — +10 per recall ---
  it('adds 10 points per recall', async () => {
    const input = makeInput({
      recalls: [makeRecall(), makeRecall(), makeRecall()],
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(30)
    expect(result.metadata?.recallCount).toBe(3)
  })

  // --- Test 6: High-usage detection — >25k miles/year adds 25 points ---
  it('adds 25 points when average annual mileage exceeds 25,000', async () => {
    const input = makeInput({
      listingHistory: [
        makeListing({ miles: 10000, statusDate: new Date('2022-01-01') }),
        makeListing({ miles: 70000, statusDate: new Date('2024-01-01') }), // 30k/year over 2 years
      ],
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(25)
    expect(result.label).toBe('Low')
  })

  // --- Test 7: Score capping at 100 — multiple factors don't exceed 100 ---
  it('caps the score at 100 when multiple factors combine', async () => {
    const input = makeInput({
      vehicle: {
        id: 'v1',
        vin: '1HGBH41JXMN109186',
        make: 'Ford',
        model: 'Focus',
        year: new Date().getFullYear() - 15, // +15 (age)
        trim: null,
        engine: null,
        decoderSource: 'nhtsa',
      },
      recalls: [makeRecall(), makeRecall(), makeRecall()], // +30 (recalls)
      listingHistory: [
        makeListing({ miles: 50000, price: 30000, statusDate: new Date('2023-01-01') }),
        makeListing({ miles: 40000, price: 10000, statusDate: new Date('2024-01-01') }), // rollback (floor 85) + fire-sale (+30)
      ],
    })

    const result = await agent.execute(input)

    // rollback floor 85 + fire-sale 30 + recalls 30 + age 15 = would be 160, capped at 100
    expect(result.score).toBe(100)
    expect(result.label).toBe('High')
  })

  // --- Test 8: Correct RiskVectorResult output shape ---
  it('returns correct RiskVectorResult shape with vectorIndex=0, vectorName, weight=0.20', async () => {
    const input = makeInput()

    const result = await agent.execute(input)

    expect(result.vectorIndex).toBe(0)
    expect(result.vectorName).toBe('Baseline Health & Market Anomalies')
    expect(result.weight).toBe(0.20)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(['Low', 'Medium', 'High']).toContain(result.label)
    expect(typeof result.narrative).toBe('string')
    expect(result.narrative.length).toBeGreaterThan(0)

    // Metadata shape
    expect(result.metadata).toBeDefined()
    expect(result.metadata).toHaveProperty('vehicleAge')
    expect(result.metadata).toHaveProperty('rollbackDetected')
    expect(result.metadata).toHaveProperty('recallCount')
    expect(result.metadata).toHaveProperty('listingCount')
    expect(result.metadata).toHaveProperty('findings')
  })

  // --- Test 9: No listing history — uses vehicle age + recalls only ---
  it('computes score from vehicle age and recalls when no listing history exists', async () => {
    const input = makeInput({
      vehicle: {
        id: 'v1',
        vin: '1HGBH41JXMN109186',
        make: 'Chevy',
        model: 'Malibu',
        year: new Date().getFullYear() - 12, // +15 (age)
        trim: null,
        engine: null,
        decoderSource: 'nhtsa',
      },
      recalls: [makeRecall(), makeRecall()], // +20 (recalls)
      listingHistory: [],
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(35) // 15 + 20
    expect(result.label).toBe('Medium')
    expect(result.metadata?.rollbackDetected).toBe(false)
    expect(result.metadata?.listingCount).toBe(0)
  })

  // --- Test 10: LLM failure → fallback narrative ---
  it('generates a fallback narrative when LLM fails', async () => {
    // Make OpenAI throw
    mockCreate.mockRejectedValue(new Error('LLM unavailable'))
    // Remove Google key so fallback provider also fails
    delete process.env.GOOGLE_API_KEY

    const input = makeInput({
      recalls: [makeRecall()],
    })

    const result = await agent.execute(input)

    // Should still produce a valid result with a fallback narrative
    expect(result.narrative).toContain('Baseline Health assessment')
    expect(result.narrative).toContain('risk')
    expect(result.score).toBe(10) // 1 recall = 10 points
  })

  // --- Additional label boundary assertions ---
  it('assigns "Medium" label for scores 31-70', async () => {
    const input = makeInput({
      listingHistory: [
        makeListing({ price: 30000, statusDate: new Date('2023-01-01') }),
        makeListing({ price: 18000, statusDate: new Date('2023-06-01') }), // 40% drop → +30
      ],
      recalls: [makeRecall()], // +10
    })

    const result = await agent.execute(input)

    expect(result.score).toBe(40) // 30 + 10
    expect(result.label).toBe('Medium')
  })

  it('assigns "High" label for scores 71-100', async () => {
    const input = makeInput({
      listingHistory: [
        makeListing({ miles: 50000, statusDate: new Date('2023-01-01') }),
        makeListing({ miles: 40000, statusDate: new Date('2024-01-01') }), // rollback → floor 85
      ],
    })

    const result = await agent.execute(input)

    expect(result.score).toBeGreaterThanOrEqual(85)
    expect(result.label).toBe('High')
  })
})
