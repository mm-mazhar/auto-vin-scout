// tests/unit/safety-agent.test.ts

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
    temperature: 0.3,
    maxTokens: 300,
    systemInstruction: 'Test system instruction',
  }),
}))

import { SafetyAgent } from '@/lib/services/risk-engine/agents/1-safety-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Test Helpers ---

function makeAgentInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    reportId: 'report-001',
    vehicle: {
      id: 'vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      trim: 'LE',
      engine: '1.8L I4',
      decoderSource: 'vpic',
    },
    recalls: [],
    listingHistory: [],
    safetyRating: null,
    ...overrides,
  }
}


function makeSafetyRating(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rating-001',
    vehicleId: 'vehicle-001',
    nhtsaVehicleId: 14799,
    vehicleDescription: '2020 Toyota Corolla 4 DR FWD',
    overallRating: '5',
    overallFrontCrashRating: '4',
    overallSideCrashRating: '5',
    rolloverRating: '4',
    frontCrashDriversideRating: '4',
    frontCrashPassengersideRating: '4',
    sideCrashDriversideRating: '5',
    sideCrashPassengersideRating: '5',
    sidePoleCrashRating: '5',
    rolloverPossibility: 0.109,
    dynamicTipResult: 'No Tip',
    nhtsaElectronicStabilityControl: 'Standard',
    nhtsaForwardCollisionWarning: 'Optional',
    nhtsaLaneDepartureWarning: 'Optional',
    complaintsCount: 12,
    investigationCount: 0,
    frontCrashPicture: 'https://example.com/crash.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as any
}

describe('SafetyAgent', () => {
  let agent: SafetyAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new SafetyAgent()
  })

  // ─── Agent Constants ───────────────────────────────────────────────────────

  describe('Agent constants', () => {
    it('has vectorIndex === 1', () => {
      expect(agent.vectorIndex).toBe(1)
    })

    it('has vectorName === "NHTSA Safety Ratings"', () => {
      expect(agent.vectorName).toBe('NHTSA Safety Ratings')
    })

    it('has weight === 0.10', () => {
      expect(agent.weight).toBe(0.10)
    })
  })

  // ─── Scoring Branches ─────────────────────────────────────────────────────

  describe('Scoring branches', () => {
    beforeEach(() => {
      // Force LLM failures so we hit fallback narratives (simpler assertions)
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('5-star → score 15, label Low', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '5' }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('4-star → score 50, label Medium', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '4' }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(50)
      expect(result.label).toBe('Medium')
    })

    it('3-star → score 85, label High', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '3' }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('2-star → score 85, label High', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '2' }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('1-star → score 85, label High', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '1' }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('"Not Rated" → score 75, label High', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: 'Not Rated' }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(75)
      expect(result.label).toBe('High')
    })

    it('null overallRating → score 75, label High', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: null }) })
      const result = await agent.execute(input)
      expect(result.score).toBe(75)
      expect(result.label).toBe('High')
    })
  })

  // ─── Fallback Narratives ──────────────────────────────────────────────────

  describe('Fallback narratives (LLM failure)', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('Low label fallback contains "5-star NHTSA rating"', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '5' }) })
      const result = await agent.execute(input)
      expect(result.narrative).toContain('5-star NHTSA rating')
    })

    it('Medium label fallback contains "4-star overall rating"', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '4' }) })
      const result = await agent.execute(input)
      expect(result.narrative).toContain('4-star overall rating')
    })

    it('High label fallback contains "3-star or lower"', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '3' }) })
      const result = await agent.execute(input)
      expect(result.narrative).toContain('3-star or lower')
    })
  })

  // ─── Null Safety Data ─────────────────────────────────────────────────────

  describe('Null safety data handling', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('treats null safetyRating as "Not Rated" (score 75, High)', async () => {
      const input = makeAgentInput({ safetyRating: null })
      const result = await agent.execute(input)
      expect(result.score).toBe(75)
      expect(result.label).toBe('High')
    })

    it('uses High fallback narrative when safetyRating is null', async () => {
      const input = makeAgentInput({ safetyRating: null })
      const result = await agent.execute(input)
      expect(result.narrative).toContain('3-star or lower')
    })
  })

  // ─── Metadata ─────────────────────────────────────────────────────────────

  describe('Metadata', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('includes usedFallbackNarrative = true when LLM fails', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '5' }) })
      const result = await agent.execute(input)
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('includes usedFallbackNarrative = false when LLM succeeds', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'LLM generated narrative' } }],
      })
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '5' }) })
      const result = await agent.execute(input)
      expect(result.metadata?.usedFallbackNarrative).toBe(false)
    })

    it('includes overallRating in metadata', async () => {
      const input = makeAgentInput({ safetyRating: makeSafetyRating({ overallRating: '4' }) })
      const result = await agent.execute(input)
      expect(result.metadata?.overallRating).toBe('4')
    })

    it('includes null overallRating in metadata when safetyRating is null', async () => {
      const input = makeAgentInput({ safetyRating: null })
      const result = await agent.execute(input)
      expect(result.metadata?.overallRating).toBeNull()
    })
  })
})
