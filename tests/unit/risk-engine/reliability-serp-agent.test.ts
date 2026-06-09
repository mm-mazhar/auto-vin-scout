// tests/unit/risk-engine/reliability-serp-agent.test.ts

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
    fallback: { provider: 'google', model: 'gemini-1.5-flash' },
    temperature: 0.1,
    maxTokens: 400,
    systemInstruction: 'Test reliability system instruction',
  }),
}))

import { ReliabilitySerpAgent } from '@/lib/services/risk-engine/agents/8-reliability-serp-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Helpers ---

function makeAgentInput(overrides: Partial<AgentInput['vehicle']> = {}): AgentInput {
  return {
    reportId: 'report-001',
    vehicle: {
      id: 'vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      trim: 'EX',
      engineDesc: '1.5L Turbo I4',
      engineCylinders: '4',
      turbo: 'Yes',
      fuelTypePrimary: 'Gasoline',
      fuelTypeSecondary: null,
      electrificationLevel: null,
      engineModel: 'L15B7',
      decoderSource: 'vpic',
      ...overrides,
    },
    recalls: [],
    listingHistory: [],
    safetyRating: null,
  }
}

/** Helper: set context and execute in one call — mirrors the orchestrator pattern */
function runAgent(agent: ReliabilitySerpAgent, input: AgentInput, snippets: string[]) {
  agent.setContext(snippets)
  return agent.execute(input)
}

// Static mock SERP snippets — NEVER calls the real API
const MOCK_SNIPPETS_SEVERE = [
  'Honda Civic CVT failure — transmission failure at 60k miles according to Reddit thread',
  'My 2019 Honda Civic blown engine, complete rebuild needed',
  'Reddit: Rod knock on Honda Civic L15B7 engine, catastrophic damage',
]

const MOCK_SNIPPETS_MODERATE = [
  'Honda Civic check engine light coming on intermittently',
  'Oil leak from valve cover on 2019 Civic — Reddit thread',
  'AC compressor issue on Honda Civic, common problem per community',
]

const MOCK_SNIPPETS_NEUTRAL = [
  'Honda Civic 2019 — great car, very happy with it',
  'Best fuel economy in class according to Reddit users',
  'Honda Civic vs Toyota Corolla: which should I buy?',
]

const MOCK_SNIPPETS_EMPTY: string[] = []

describe('ReliabilitySerpAgent', () => {
  let agent: ReliabilitySerpAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new ReliabilitySerpAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.GOOGLE_API_KEY
  })

  // ─── Agent Constants ───────────────────────────────────────────────────────

  describe('Agent constants', () => {
    it('has vectorIndex === 8', () => {
      expect(agent.vectorIndex).toBe(8)
    })

    it('has vectorName === "Reliability & Social Proof"', () => {
      expect(agent.vectorName).toBe('Reliability & Social Proof')
    })

    it('has weight === 0.15', () => {
      expect(agent.weight).toBe(0.15)
    })
  })

  // ─── Heuristic Scoring ─────────────────────────────────────────────────────

  describe('Heuristic scoring (LLM unavailable)', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('returns score 85 (High) when a severe keyword is found in snippets', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('returns score 55 (Medium) when only moderate keywords are found', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_MODERATE)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('returns score 15 (Low) when no mechanical keywords found', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_NEUTRAL)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('returns score 15 (Low) when snippets array is empty', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_EMPTY)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('severe keywords take precedence over moderate keywords', async () => {
      const mixed = [...MOCK_SNIPPETS_MODERATE, 'transmission failure confirmed by mechanic']
      const result = await runAgent(agent, makeAgentInput(), mixed)
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('detects "cvt failure" as severe', async () => {
      const result = await runAgent(agent, makeAgentInput(), ['CVT failure on my 2020 Nissan Altima'])
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('detects "head gasket" as severe', async () => {
      const result = await runAgent(agent, makeAgentInput(), ['head gasket blown on my Honda Civic'])
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('detects "timing chain" as severe', async () => {
      const result = await runAgent(agent, makeAgentInput(), ['timing chain snapped at 90k miles'])
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('detects "alternator" as moderate', async () => {
      const result = await runAgent(agent, makeAgentInput(), ['alternator died, had to tow the car'])
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('detects "water pump" as moderate', async () => {
      const result = await runAgent(agent, makeAgentInput(), ['water pump replacement needed at 80k'])
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('keyword matching is case-insensitive', async () => {
      const result = await runAgent(agent, makeAgentInput(), ['TRANSMISSION FAILURE on highway'])
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })
  })

  // ─── Fallback Narratives ──────────────────────────────────────────────────

  describe('Fallback narratives (both LLMs unavailable)', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('returns LOW fallback narrative when score is 15', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_NEUTRAL)
      expect(result.narrative.length).toBeGreaterThan(0)
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('returns MEDIUM fallback narrative when score is 55', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_MODERATE)
      expect(result.narrative.length).toBeGreaterThan(0)
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('returns HIGH fallback narrative when score is 85', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)
      expect(result.narrative.length).toBeGreaterThan(0)
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })
  })

  // ─── LLM Narrative Generation ─────────────────────────────────────────────

  describe('LLM narrative generation', () => {
    it('uses primary LLM (OpenRouter) when available and overrides heuristic score', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"adjustedScore": 15, "narrative": "Cross-contamination detected. Snippets discuss a different trim level."}' } }],
      })

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)

      // LLM downgrades from heuristic 85 to 15 (cross-contamination override)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
      expect(result.narrative).toBe('Cross-contamination detected. Snippets discuss a different trim level.')
      expect(result.metadata?.usedFallbackNarrative).toBe(false)
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('falls back to Google GenAI when primary LLM fails', async () => {
      mockCreate.mockRejectedValue(new Error('Primary failed'))
      mockGenerateContent.mockResolvedValue({
        text: '{"adjustedScore": 85, "narrative": "Confirmed CVT failures reported by multiple Reddit users."}',
      })
      process.env.GOOGLE_API_KEY = 'test-google-key'

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)

      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
      expect(result.narrative).toBe('Confirmed CVT failures reported by multiple Reddit users.')
      expect(result.metadata?.usedFallbackNarrative).toBe(false)
    })

    it('uses fallback narrative when both LLM providers fail', async () => {
      mockCreate.mockRejectedValue(new Error('Primary failed'))
      mockGenerateContent.mockRejectedValue(new Error('Google failed'))
      process.env.GOOGLE_API_KEY = 'test-google-key'

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)

      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('handles LLM returning JSON with string-number adjustedScore', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"adjustedScore": "55", "narrative": "Moderate issues confirmed."}' } }],
      })

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)

      // String "55" should be coerced to number 55
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('handles LLM response wrapped in markdown code fences', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '```json\n{"adjustedScore": 85, "narrative": "Severe issues confirmed."}\n```' } }],
      })

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)

      expect(result.score).toBe(85)
      expect(result.narrative).toBe('Severe issues confirmed.')
    })

    it('clamps LLM adjustedScore above 100 to 100', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"adjustedScore": 150, "narrative": "Extreme risk."}' } }],
      })

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)
      expect(result.score).toBe(100)
    })

    it('clamps LLM adjustedScore below 0 to 0', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"adjustedScore": -10, "narrative": "No risk at all."}' } }],
      })

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_NEUTRAL)
      expect(result.score).toBe(0)
    })
  })

  // ─── setContext ────────────────────────────────────────────────────────────

  describe('setContext', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('execute() uses empty snippets when setContext is never called', async () => {
      // No setContext call — agent defaults to []
      const result = await agent.execute(makeAgentInput())
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('setContext replaces the internal snippets for each execution', async () => {
      agent.setContext(MOCK_SNIPPETS_SEVERE)
      const first = await agent.execute(makeAgentInput())
      expect(first.score).toBe(85)

      agent.setContext(MOCK_SNIPPETS_NEUTRAL)
      const second = await agent.execute(makeAgentInput())
      expect(second.score).toBe(15)
    })
  })

  // ─── Metadata Shape ───────────────────────────────────────────────────────

  describe('Metadata shape', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('includes heuristicOriginalScore, matchedKeywords, snippetCount, source="serp"', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)

      expect(result.metadata).toMatchObject({
        heuristicOriginalScore: 85,
        snippetCount: MOCK_SNIPPETS_SEVERE.length,
        source: 'serp',
      })
      expect(Array.isArray(result.metadata?.matchedKeywords)).toBe(true)
    })

    it('snippetCount reflects the number of snippets passed in', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_MODERATE)
      expect(result.metadata?.snippetCount).toBe(MOCK_SNIPPETS_MODERATE.length)
    })

    it('matchedKeywords is empty when no keywords match', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_NEUTRAL)
      expect(result.metadata?.matchedKeywords).toEqual([])
    })

    it('matchedKeywords are deduplicated', async () => {
      const duplicated = [
        'transmission failure here',
        'transmission failure there',
        'another transmission failure mention',
      ]
      const result = await runAgent(agent, makeAgentInput(), duplicated)
      const keywords = result.metadata?.matchedKeywords as string[]
      const unique = new Set(keywords)
      expect(keywords.length).toBe(unique.size)
    })
  })

  // ─── RiskVectorResult Shape ───────────────────────────────────────────────

  describe('RiskVectorResult shape', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('always returns correct vectorIndex, vectorName, weight', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_NEUTRAL)
      expect(result.vectorIndex).toBe(8)
      expect(result.vectorName).toBe('Reliability & Social Proof')
      expect(result.weight).toBe(0.15)
    })

    it('narrative is always a non-empty string', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_EMPTY)
      expect(typeof result.narrative).toBe('string')
      expect(result.narrative.length).toBeGreaterThan(0)
    })

    it('label is always "Low" | "Medium" | "High"', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_NEUTRAL)
      expect(['Low', 'Medium', 'High']).toContain(result.label)
    })

    it('score is within 0-100 range', async () => {
      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  // ─── Resilience ───────────────────────────────────────────────────────────

  describe('Resilience', () => {
    it('never throws — returns fallback result on unexpected error', async () => {
      // Force an internal crash by making parseLlmJson throw
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not valid json at all' } }],
      })

      const result = await runAgent(agent, makeAgentInput(), MOCK_SNIPPETS_SEVERE)
      expect(result).toBeDefined()
      expect(result.vectorIndex).toBe(8)
      expect(result.narrative.length).toBeGreaterThan(0)
    })
  })
})
