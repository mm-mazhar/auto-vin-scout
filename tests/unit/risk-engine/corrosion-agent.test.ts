// tests/unit/risk-engine/corrosion-agent.test.ts

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
    systemInstruction: 'Test system instruction for corrosion agent',
  }),
}))

import { CorrosionAgent } from '@/lib/services/risk-engine/agents/4-corrosion-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Test Helpers ---

function makeListingEntry(state: string | null): AgentInput['listingHistory'][number] {
  return {
    externalListingId: `listing-${Math.random().toString(36).slice(2)}`,
    price: 20000,
    miles: 50000,
    msrp: 28000,
    dom: null,
    statusDate: null,
    firstSeenAt: null,
    lastSeenAt: new Date('2024-01-01'),
    sellerType: 'dealer',
    sellerName: 'Test Dealer',
    city: 'Test City',
    state,
    latitude: null,
    longitude: null,
    isCertified: null,
  }
}

function makeAgentInput(listingHistory: AgentInput['listingHistory'] = []): AgentInput {
  return {
    reportId: 'report-corrosion-test',
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
    },
    recalls: [],
    listingHistory,
    safetyRating: null,
  }
}

/**
 * Build a listing history with exact counts to hit target percentages.
 * totalValid = saltCount + sunCount + otherCount
 * saltBeltPercent = saltCount / totalValid
 * sunBeltPercent = sunCount / totalValid
 */
function buildListings(saltCount: number, sunCount: number, otherCount: number): AgentInput['listingHistory'] {
  const listings: AgentInput['listingHistory'] = []
  // Salt belt states (OH)
  for (let i = 0; i < saltCount; i++) listings.push(makeListingEntry('OH'))
  // Sun belt states (FL)
  for (let i = 0; i < sunCount; i++) listings.push(makeListingEntry('FL'))
  // Other states (CA - neither salt nor sun belt)
  for (let i = 0; i < otherCount; i++) listings.push(makeListingEntry('CA'))
  return listings
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 6.1: Unit tests for classifyStates() and computeScore()
// Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
// ─────────────────────────────────────────────────────────────────────────────

describe('CorrosionAgent – classifyStates() and computeScore()', () => {
  let agent: CorrosionAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new CorrosionAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.GOOGLE_API_KEY
    // Default: LLM fails → fallback narrative used (keeps tests focused on scoring)
    mockCreate.mockRejectedValue(new Error('LLM unavailable'))
    mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
  })

  // ─── Salt Belt Boundary Tests ─────────────────────────────────────────────

  describe('Salt belt boundary: saltBeltPercent = 0.25 (inclusive → Medium, score 55)', () => {
    it('exactly 25% salt belt → score 55, label "Medium"', async () => {
      // 1 salt out of 4 total = 0.25 exactly
      const input = makeAgentInput(buildListings(1, 0, 3))
      const result = await agent.execute(input)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })
  })

  describe('Salt belt boundary: saltBeltPercent = 0.60 (inclusive → Medium, score 55, not High)', () => {
    it('exactly 60% salt belt → score 55, label "Medium" (not High)', async () => {
      // 3 salt out of 5 total = 0.60 exactly
      const input = makeAgentInput(buildListings(3, 0, 2))
      const result = await agent.execute(input)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })
  })

  describe('Salt belt boundary: saltBeltPercent > 0.60 (→ High, score 85)', () => {
    it('saltBeltPercent just above 0.60 → score 85, label "High"', async () => {
      // We need saltBeltPercent > 0.60. Use 61/100 = 0.61
      // Simpler: 4 salt out of 6 total = 0.6667
      const input = makeAgentInput(buildListings(4, 0, 2))
      const result = await agent.execute(input)
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })
  })

  // ─── Sun Belt Boundary Tests ──────────────────────────────────────────────

  describe('Sun belt boundary: sunBeltPercent = 0.80 (not triggered, needs >0.80)', () => {
    it('exactly 80% sun belt → score 15, label "Low" (threshold is >0.80)', async () => {
      // 4 sun out of 5 total = 0.80 exactly. No salt belt states.
      const input = makeAgentInput(buildListings(0, 4, 1))
      const result = await agent.execute(input)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })
  })

  describe('Sun belt boundary: sunBeltPercent > 0.80 (→ Medium, score 45)', () => {
    it('sunBeltPercent just above 0.80 → score 45, label "Medium"', async () => {
      // 5 sun out of 6 total = 0.8333 > 0.80. No salt belt states.
      const input = makeAgentInput(buildListings(0, 5, 1))
      const result = await agent.execute(input)
      expect(result.score).toBe(45)
      expect(result.label).toBe('Medium')
    })
  })

  // ─── Case Normalization ───────────────────────────────────────────────────

  describe('Mixed-case normalization', () => {
    it('"oh", "Oh", "OH" all classify as salt belt', async () => {
      const listings = [
        makeListingEntry('oh'),
        makeListingEntry('Oh'),
        makeListingEntry('OH'),
        makeListingEntry('CA'), // non-salt, non-sun
      ]
      const input = makeAgentInput(listings)
      const result = await agent.execute(input)
      // 3/4 = 0.75 salt belt > 0.60 → High
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
      // All normalized to 'OH' in uniqueStates
      const metadata = result.metadata as Record<string, unknown>
      const uniqueStates = metadata.uniqueStates as string[]
      expect(uniqueStates).toContain('OH')
      expect(uniqueStates).toContain('CA')
    })
  })

  // ─── Null State Filtering ─────────────────────────────────────────────────

  describe('Null state filtering', () => {
    it('listings with null state are excluded from percentage calculations', async () => {
      // 3 salt + 1 other + 2 null = 3/4 valid = 0.75 salt → High
      const listings = [
        makeListingEntry('OH'),
        makeListingEntry('MI'),
        makeListingEntry('PA'),
        makeListingEntry('CA'),
        makeListingEntry(null),
        makeListingEntry(null),
      ]
      const input = makeAgentInput(listings)
      const result = await agent.execute(input)
      // saltBeltPercent = 3/4 = 0.75 > 0.60 → High
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.validListingCount).toBe(4)
      expect(metadata.totalListingCount).toBe(6)
    })
  })

  // ─── Empty / All-Null Edge Cases ──────────────────────────────────────────

  describe('Empty listing history', () => {
    it('returns score 15, label "Low"', async () => {
      const input = makeAgentInput([])
      const result = await agent.execute(input)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })
  })

  describe('All-null states', () => {
    it('returns score 15, label "Low"', async () => {
      const listings = [
        makeListingEntry(null),
        makeListingEntry(null),
        makeListingEntry(null),
      ]
      const input = makeAgentInput(listings)
      const result = await agent.execute(input)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.validListingCount).toBe(0)
      expect(metadata.saltBeltPercent).toBe(0)
      expect(metadata.sunBeltPercent).toBe(0)
    })
  })

  // ─── UniqueStates Deduplication ───────────────────────────────────────────

  describe('uniqueStates deduplication', () => {
    it('duplicate states are deduplicated in metadata', async () => {
      const listings = [
        makeListingEntry('OH'),
        makeListingEntry('OH'),
        makeListingEntry('OH'),
        makeListingEntry('MI'),
        makeListingEntry('CA'),
      ]
      const input = makeAgentInput(listings)
      const result = await agent.execute(input)
      const metadata = result.metadata as Record<string, unknown>
      const uniqueStates = metadata.uniqueStates as string[]
      // Should only have OH, MI, CA (no duplicates)
      expect(uniqueStates).toHaveLength(3)
      expect(uniqueStates.sort()).toEqual(['CA', 'MI', 'OH'])
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Task 6.2: Unit tests for LLM narrative generation and fallback
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 7.4
// ─────────────────────────────────────────────────────────────────────────────

describe('CorrosionAgent – LLM narrative generation and fallback', () => {
  let agent: CorrosionAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new CorrosionAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.GOOGLE_API_KEY = 'test-google-key'
  })

  describe('Successful primary LLM narrative generation', () => {
    it('uses primary LLM narrative and sets usedFallbackNarrative = false', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'This vehicle has moderate salt belt exposure indicating potential corrosion risk.' } }],
      })
      const input = makeAgentInput(buildListings(2, 0, 2))
      const result = await agent.execute(input)
      expect(result.narrative).toBe('This vehicle has moderate salt belt exposure indicating potential corrosion risk.')
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(false)
    })
  })

  describe('Primary fails, fallback succeeds', () => {
    it('uses Google GenAI fallback and sets usedFallbackNarrative = false', async () => {
      mockCreate.mockRejectedValue(new Error('OpenRouter unavailable'))
      mockGenerateContent.mockResolvedValue({
        text: 'Google fallback: Vehicle shows moderate salt belt exposure.',
      })
      const input = makeAgentInput(buildListings(2, 0, 2))
      const result = await agent.execute(input)
      expect(result.narrative).toBe('Google fallback: Vehicle shows moderate salt belt exposure.')
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(false)
    })
  })

  describe('Both providers fail → deterministic fallback narrative', () => {
    it('uses deterministic fallback and sets usedFallbackNarrative = true', async () => {
      mockCreate.mockRejectedValue(new Error('OpenRouter unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('Google GenAI unavailable'))
      const input = makeAgentInput(buildListings(2, 0, 2))
      const result = await agent.execute(input)
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(true)
      // Fallback narrative should contain the label and score info
      expect(result.narrative).toContain('Regional Corrosion & Environmental Stress')
      expect(result.narrative).toContain('Medium')
    })
  })

  describe('Narrative is always non-empty regardless of path', () => {
    it('narrative is non-empty when primary succeeds', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Primary narrative content.' } }],
      })
      const input = makeAgentInput(buildListings(1, 0, 3))
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })

    it('narrative is non-empty when fallback LLM succeeds', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockResolvedValue({ text: 'Fallback narrative content.' })
      const input = makeAgentInput(buildListings(1, 0, 3))
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })

    it('narrative is non-empty when deterministic fallback is used', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockRejectedValue(new Error('fail'))
      const input = makeAgentInput(buildListings(1, 0, 3))
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })

    it('narrative is non-empty for empty listing history', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockRejectedValue(new Error('fail'))
      const input = makeAgentInput([])
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })
  })

  describe('Unexpected error in narrative generation does not throw', () => {
    it('agent does not throw even when LLM throws unexpected error types', async () => {
      mockCreate.mockImplementation(() => { throw new TypeError('Unexpected type error') })
      mockGenerateContent.mockImplementation(() => { throw new RangeError('Unexpected range error') })
      const input = makeAgentInput(buildListings(2, 0, 2))
      // Should not throw — falls back to deterministic narrative
      const result = await agent.execute(input)
      expect(result).toBeDefined()
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
      expect(result.narrative.length).toBeGreaterThan(0)
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(true)
    })

    it('agent does not throw when primary returns empty content and fallback fails', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      })
      mockGenerateContent.mockRejectedValue(new Error('Google fail'))
      const input = makeAgentInput(buildListings(2, 0, 2))
      // Empty content from primary → tries fallback → fallback fails → deterministic
      const result = await agent.execute(input)
      expect(result).toBeDefined()
      expect(result.narrative.length).toBeGreaterThan(0)
    })
  })
})
