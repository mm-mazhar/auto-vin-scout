// tests/unit/risk-engine/forensics-agent.test.ts

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
    systemInstruction: 'Test forensics system instruction',
  }),
}))

// --- Mock global fetch (for image fetching) ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { ForensicsAgent } from '@/lib/services/risk-engine/agents/7-forensics-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'
import type { VinSearchResult } from '@/lib/services/serp-service'

// --- Test Helpers ---

function makeAgentInput(overrides: Partial<AgentInput> = {}): AgentInput {
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
    },
    recalls: [],
    listingHistory: [],
    safetyRating: null,
    ...overrides,
  }
}

function makeVinSearchResult(overrides: Partial<VinSearchResult> = {}): VinSearchResult {
  return {
    organicLinks: [],
    snippets: [],
    imageUrls: [],
    ...overrides,
  }
}

describe('ForensicsAgent', () => {
  let agent: ForensicsAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new ForensicsAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.GOOGLE_API_KEY
  })

  // ─── Agent Constants ───────────────────────────────────────────────────────

  describe('Agent constants', () => {
    it('has vectorIndex === 7', () => {
      expect(agent.vectorIndex).toBe(7)
    })

    it('has vectorName === "Visual & Auction Forensics"', () => {
      expect(agent.vectorName).toBe('Visual & Auction Forensics')
    })

    it('has weight === 0.20', () => {
      expect(agent.weight).toBe(0.20)
    })
  })

  // ─── Heuristic Scoring ─────────────────────────────────────────────────────

  describe('Heuristic scoring', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('returns score 100 (High) when severe URL keyword is found', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://www.copart.com/lot/12345', 'https://cars.com/listing/abc'],
        snippets: ['Some listing on copart'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(100)
      expect(result.label).toBe('High')
    })

    it('detects bidfax.info as severe URL', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://bidfax.info/honda/civic/12345'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(100)
      expect(result.label).toBe('High')
    })

    it('detects iaai.com as severe URL', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://www.iaai.com/VehicleDetail/12345'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(100)
      expect(result.label).toBe('High')
    })

    it('detects bid.cars as severe URL', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://bid.cars/en/lot/12345'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(100)
      expect(result.label).toBe('High')
    })

    it('returns score 55 (Medium) when moderate text keyword is found in snippets', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://cars.com/listing/abc'],
        snippets: ['This vehicle was listed as salvage title on marketplace'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('detects "as-is" in snippets as moderate', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://craigslist.org/car/123'],
        snippets: ['Selling as-is, no warranty'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('detects "parts only" in snippets as moderate', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://ebay.com/item/123'],
        snippets: ['Listed for parts only, does not run'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('detects "mechanic special" in snippets as moderate', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://marketplace.com/car/123'],
        snippets: ['Mechanic special, needs engine work'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('returns score 15 (Low) when no keywords match', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://cars.com/listing/abc', 'https://autotrader.com/car/123'],
        snippets: ['Great condition Honda Civic for sale', 'Low mileage, one owner'],
      }))

      const result = await agent.execute(input)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('returns score 15 (Low) when no data is available', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult())

      const result = await agent.execute(input)
      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('URL check takes priority over text check', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://copart.com/lot/999'],
        snippets: ['salvage title vehicle'],
      }))

      const result = await agent.execute(input)
      // URL match → 100, not 55 from text
      expect(result.score).toBe(100)
      expect(result.label).toBe('High')
    })
  })

  // ─── Fallback Narratives ──────────────────────────────────────────────────

  describe('Fallback narratives (LLM failure)', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('returns LOW fallback narrative when score is 15', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult())

      const result = await agent.execute(input)
      expect(result.narrative).toContain('Clean forensic audit')
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('returns MEDIUM fallback narrative when score is 55', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        snippets: ['rebuilt title vehicle'],
      }))

      const result = await agent.execute(input)
      expect(result.narrative).toContain('Caution advised')
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })

    it('returns HIGH fallback narrative when score is 100', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://copart.com/lot/123'],
      }))

      const result = await agent.execute(input)
      expect(result.narrative).toContain('CRITICAL RED FLAG')
      expect(result.metadata?.usedFallbackNarrative).toBe(true)
    })
  })

  // ─── LLM Narrative Generation ─────────────────────────────────────────────

  describe('LLM narrative generation', () => {
    it('uses primary LLM (OpenRouter) when available', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'LLM forensic analysis narrative.' } }],
      })

      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://copart.com/lot/123'],
      }))

      const result = await agent.execute(input)
      expect(result.narrative).toBe('LLM forensic analysis narrative.')
      expect(result.metadata?.usedFallbackNarrative).toBe(false)
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('falls back to Google GenAI when primary fails', async () => {
      mockCreate.mockRejectedValue(new Error('Primary failed'))
      mockGenerateContent.mockResolvedValue({
        text: 'Google GenAI forensic narrative.',
      })
      process.env.GOOGLE_API_KEY = 'test-google-key'

      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult())

      const result = await agent.execute(input)
      expect(result.narrative).toBe('Google GenAI forensic narrative.')
      expect(result.metadata?.usedFallbackNarrative).toBe(false)
    })
  })

  // ─── Metadata Shape ───────────────────────────────────────────────────────

  describe('Metadata shape', () => {
    beforeEach(() => {
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
    })

    it('includes organicLinkCount, snippetCount, imageUrlCount, usedFallbackNarrative', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult({
        organicLinks: ['https://copart.com/lot/1', 'https://cars.com/2'],
        snippets: ['snippet 1', 'snippet 2', 'snippet 3'],
        imageUrls: ['https://img.com/1.jpg'],
      }))

      const result = await agent.execute(input)
      expect(result.metadata).toMatchObject({
        organicLinkCount: 2,
        snippetCount: 3,
        imageUrlCount: 1,
        usedFallbackNarrative: true,
      })
    })

    it('RiskVectorResult has correct vectorIndex, vectorName, weight', async () => {
      const input = makeAgentInput()
      agent.setContext(makeVinSearchResult())

      const result = await agent.execute(input)
      expect(result.vectorIndex).toBe(7)
      expect(result.vectorName).toBe('Visual & Auction Forensics')
      expect(result.weight).toBe(0.20)
    })
  })
})
