// tests/unit/engine-agent.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mock OpenAI (OpenRouter) ---
const mockCreate = vi.fn()
vi.mock('openai', () => ({
  default: class OpenAI {
    constructor() {}
    chat = { completions: { create: mockCreate } }
  },
}))

// --- Mock Google GenAI ---
const mockGenerateContent = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {}
    models = { generateContent: mockGenerateContent }
  },
}))

// --- Mock ai-config ---
vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: () => ({
    primary: { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'test-model' },
    fallback: { provider: 'google', model: 'gemini-test' },
    temperature: 0.1,
    maxTokens: 400,
    systemInstruction: 'Test system instruction',
  }),
}))

import { EngineAgent, detectTurboHeuristic, extractLatestMileage } from '@/lib/services/risk-engine/agents/2-engine-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Test Helpers ---

function makeAgentInput(overrides: { vehicle?: Partial<AgentInput['vehicle']> } & Omit<Partial<AgentInput>, 'vehicle'> = {}): AgentInput {
  const { vehicle: vehicleOverrides, ...rest } = overrides
  return {
    reportId: 'report-001',
    vehicle: {
      id: 'vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      trim: 'LE',
      engineDesc: '1.8L I4',
      engineCylinders: '4',
      turbo: null,
      fuelTypePrimary: 'Gasoline',
      fuelTypeSecondary: null,
      electrificationLevel: null,
      engineModel: '2ZR-FE',
      decoderSource: 'vpic',
      ...vehicleOverrides,
    },
    recalls: [],
    listingHistory: [],
    safetyRating: null,
    ...rest,
  }
}

function makeListingEntry(miles: number | null, lastSeenAt: Date | null, statusDate: Date | null = null) {
  return {
    externalListingId: `listing-${Math.random().toString(36).slice(2)}`,
    price: 25000,
    miles,
    msrp: 30000,
    dom: null,
    statusDate,
    firstSeenAt: null,
    lastSeenAt,
    sellerType: 'dealer',
    sellerName: 'Test Dealer',
    city: 'San Jose',
    state: 'CA',
    latitude: null,
    longitude: null,
    isCertified: null,
  }
}

describe('EngineAgent', () => {
  let agent: EngineAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new EngineAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.GOOGLE_API_KEY
  })

  // ─── Agent Constants ───────────────────────────────────────────────────────

  describe('Agent constants', () => {
    it('has vectorIndex === 2', () => {
      expect(agent.vectorIndex).toBe(2)
    })

    it('has vectorName === "Powertrain Complexity & Maintenance Liability"', () => {
      expect(agent.vectorName).toBe('Powertrain Complexity & Maintenance Liability')
    })

    it('has weight === 0.10', () => {
      expect(agent.weight).toBe(0.10)
    })
  })

  // ─── Tier Classification Branches ─────────────────────────────────────────

  describe('Tier classification branches', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('Luxury brand (BMW) → Tier 3', async () => {
      const input = makeAgentInput({ vehicle: { make: 'BMW', model: '330i', engineCylinders: '4', turbo: 'Yes' } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_3_HIGH')
    })

    it('Supercharged → Tier 3', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Dodge', model: 'Charger', engineDesc: '6.2L Supercharged V8', engineCylinders: '8' } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_3_HIGH')
    })

    it('Turbo + 6 cylinders → Tier 3', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Ford', model: 'F-150', engineCylinders: '6', turbo: 'Yes' } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_3_HIGH')
    })

    it('8+ cylinders → Tier 3', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Chevrolet', model: 'Camaro', engineCylinders: '8', turbo: null } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_3_HIGH')
    })

    it('PHEV/EV → Tier 3', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Chevrolet', model: 'Bolt', electrificationLevel: 'EV', engineCylinders: null } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_3_HIGH')
    })

    it('Turbo + 4 cylinders (non-luxury) → Tier 2', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Honda', model: 'Civic', engineCylinders: '4', turbo: 'Yes' } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_2_MODERATE')
    })

    it('NA + 6 cylinders (non-luxury) → Tier 2', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Toyota', model: 'Camry', engineCylinders: '6', turbo: null } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_2_MODERATE')
    })

    it('Toyota Hybrid → Tier 2', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Toyota', model: 'Prius', engineCylinders: '4', electrificationLevel: 'Hybrid' } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_2_MODERATE')
    })

    it('NA + 4 cylinders (non-luxury) → Tier 1', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Toyota', model: 'Corolla', engineCylinders: '4', turbo: null } })
      const result = await agent.execute(input)
      expect(result.metadata?.tier).toBe('TIER_1_SIMPLE')
    })
  })

  // ─── Score Computation with Mileage Modifiers ─────────────────────────────

  describe('Score computation with mileage modifiers', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('Tier 1 at 50k → score 15', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'Toyota', model: 'Corolla', engineCylinders: '4', turbo: null },
        listingHistory: [makeListingEntry(50000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      expect(result.score).toBe(15)
    })

    it('Tier 1 at 160k → score 25', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'Toyota', model: 'Corolla', engineCylinders: '4', turbo: null },
        listingHistory: [makeListingEntry(160000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      expect(result.score).toBe(25)
    })

    it('Tier 2 at 100k (The Hump) → score 60', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'Honda', model: 'Civic', engineCylinders: '4', turbo: 'Yes' },
        listingHistory: [makeListingEntry(100000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      expect(result.score).toBe(60)
    })

    it('Tier 2 at 130k → score 50', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'Honda', model: 'Civic', engineCylinders: '4', turbo: 'Yes' },
        listingHistory: [makeListingEntry(130000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      expect(result.score).toBe(50)
    })

    it('Tier 3 at 95k (The Hump) → score 90', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'BMW', model: '330i', engineCylinders: '4', turbo: 'Yes' },
        listingHistory: [makeListingEntry(95000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      expect(result.score).toBe(90)
    })

    it('Tier 3 at 130k → score 80', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'BMW', model: '330i', engineCylinders: '4', turbo: 'Yes' },
        listingHistory: [makeListingEntry(130000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      expect(result.score).toBe(80)
    })
  })

  // ─── Turbo Heuristic Fallback ─────────────────────────────────────────────

  describe('Turbo heuristic fallback', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('Ford with "EcoBoost" in engineModel → detects turbo', () => {
      const result = detectTurboHeuristic(null, 'EcoBoost 2.7L', null)
      expect(result.isTurbo).toBe(true)
      expect(result.isSupercharged).toBe(false)
    })

    it('detects turbo via engineDesc when turbo field is null', () => {
      const result = detectTurboHeuristic(null, null, '2.0L Turbo I4')
      expect(result.isTurbo).toBe(true)
    })

    it('turbo field "Yes" takes priority over keywords', () => {
      const result = detectTurboHeuristic('Yes', null, null)
      expect(result.isTurbo).toBe(true)
      expect(result.isSupercharged).toBe(false)
    })

    it('SUPERCHARGED sets isSupercharged, not isTurbo', () => {
      const result = detectTurboHeuristic(null, null, '6.2L Supercharged V8')
      expect(result.isSupercharged).toBe(true)
      expect(result.isTurbo).toBe(false)
    })
  })

  // ─── Mileage Extraction ───────────────────────────────────────────────────

  describe('Mileage extraction', () => {
    it('returns most recent non-null miles from listing history', () => {
      const history = [
        makeListingEntry(45000, new Date('2023-01-01')),
        makeListingEntry(50000, new Date('2024-01-01')),
        makeListingEntry(null, new Date('2024-06-01')),
      ]
      const result = extractLatestMileage(history)
      expect(result).toBe(50000)
    })

    it('skips null miles entries and returns next valid one', () => {
      const history = [
        makeListingEntry(null, new Date('2024-06-01')),
        makeListingEntry(null, new Date('2024-03-01')),
        makeListingEntry(30000, new Date('2024-01-01')),
      ]
      const result = extractLatestMileage(history)
      expect(result).toBe(30000)
    })

    it('returns 0 when listing history is empty', () => {
      const result = extractLatestMileage([])
      expect(result).toBe(0)
    })

    it('returns 0 when all entries have null miles', () => {
      const history = [
        makeListingEntry(null, new Date('2024-01-01')),
        makeListingEntry(null, new Date('2024-06-01')),
      ]
      const result = extractLatestMileage(history)
      expect(result).toBe(0)
    })

    it('falls back to statusDate when lastSeenAt is null', () => {
      const history = [
        makeListingEntry(40000, null, new Date('2023-06-01')),
        makeListingEntry(55000, null, new Date('2024-06-01')),
      ]
      const result = extractLatestMileage(history)
      expect(result).toBe(55000)
    })
  })

  // ─── Fallback Narratives ──────────────────────────────────────────────────

  describe('Fallback narratives (LLM failure)', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('narrative is non-empty when LLM fails', async () => {
      const input = makeAgentInput()
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })

    it('metadata.usedFallbackNarrative = true when LLM fails', async () => {
      const input = makeAgentInput()
      const result = await agent.execute(input)
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('metadata.usedFallbackNarrative = false when LLM succeeds', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'LLM generated narrative about engine complexity.' } }],
      })
      const input = makeAgentInput()
      const result = await agent.execute(input)
      expect(result.metadata?.usedFallbackNarrative).toBe(false)
    })
  })

  // ─── Metadata Shape ───────────────────────────────────────────────────────

  describe('Metadata shape', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('includes tier, cylinders, isTurbo, isSupercharged, latestMileage, isInHump, findings', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'BMW', model: '330i', engineCylinders: '4', turbo: 'Yes' },
        listingHistory: [makeListingEntry(95000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)

      expect(result.metadata).toMatchObject({
        tier: 'TIER_3_HIGH',
        cylinders: 4,
        isTurbo: true,
        isSupercharged: false,
        latestMileage: 95000,
        isInHump: true,
        findings: expect.any(Array),
      })
    })

    it('findings includes luxury brand when applicable', async () => {
      const input = makeAgentInput({ vehicle: { make: 'BMW', model: '330i' } })
      const result = await agent.execute(input)
      const findings = result.metadata?.findings as string[]
      expect(findings.some((f) => f.includes('Luxury/complex brand'))).toBe(true)
    })

    it('findings includes turbo detection when applicable', async () => {
      const input = makeAgentInput({ vehicle: { make: 'Honda', model: 'Civic', turbo: 'Yes', engineCylinders: '4' } })
      const result = await agent.execute(input)
      const findings = result.metadata?.findings as string[]
      expect(findings.some((f) => f.includes('Turbocharged'))).toBe(true)
    })

    it('findings includes "The Hump" when mileage is 80k-120k', async () => {
      const input = makeAgentInput({
        vehicle: { make: 'Honda', model: 'Civic', turbo: 'Yes', engineCylinders: '4' },
        listingHistory: [makeListingEntry(100000, new Date('2024-01-01'))],
      })
      const result = await agent.execute(input)
      const findings = result.metadata?.findings as string[]
      expect(findings.some((f) => f.includes('The Hump'))).toBe(true)
    })

    it('RiskVectorResult has correct vectorIndex, vectorName, weight', async () => {
      const input = makeAgentInput()
      const result = await agent.execute(input)
      expect(result.vectorIndex).toBe(2)
      expect(result.vectorName).toBe('Powertrain Complexity & Maintenance Liability')
      expect(result.weight).toBe(0.10)
    })
  })
})
