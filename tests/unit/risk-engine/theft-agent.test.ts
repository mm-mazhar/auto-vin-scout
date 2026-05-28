// tests/unit/risk-engine/theft-agent.test.ts

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
    maxTokens: 700,
    systemInstruction: 'Test system instruction for theft agent',
  }),
}))

// --- Mock config.yml loading for highTheftModels ---
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: (filePath: string, encoding: string) => {
        if (filePath.includes('config.yml')) {
          return `
ai:
  agents:
    theft:
      highTheftModels: ["CIVIC", "ACCORD", "F-150", "F150", "SILVERADO", "OPTIMA", "ELANTRA", "SONATA", "CHARGER", "CHALLENGER", "CR-V", "CRV", "SPORTAGE"]
`
        }
        return actual.readFileSync(filePath, encoding as BufferEncoding)
      },
    },
    readFileSync: (filePath: string, encoding: string) => {
      if (filePath.includes('config.yml')) {
        return `
ai:
  agents:
    theft:
      highTheftModels: ["CIVIC", "ACCORD", "F-150", "F150", "SILVERADO", "OPTIMA", "ELANTRA", "SONATA", "CHARGER", "CHALLENGER", "CR-V", "CRV", "SPORTAGE"]
`
      }
      return actual.readFileSync(filePath, encoding as BufferEncoding)
    },
  }
})

import { TheftAgent } from '@/lib/services/risk-engine/agents/6-theft-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Test Helpers ---

function makeAgentInput(overrides: Partial<AgentInput['vehicle']> = {}): AgentInput {
  return {
    reportId: 'report-theft-test',
    vehicle: {
      id: 'vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
      year: 2020,
      trim: 'EX',
      engineDesc: '1.5L Turbo I4',
      engineCylinders: '4',
      turbo: 'Turbo',
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

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Heuristic Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TheftAgent – Scoring Heuristic', () => {
  let agent: TheftAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new TheftAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.GOOGLE_API_KEY
    // Default: LLM fails → fallback narrative used (keeps tests focused on scoring)
    mockCreate.mockRejectedValue(new Error('LLM unavailable'))
    mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
  })

  // ─── Tier 3: HIGH RISK ────────────────────────────────────────────────────

  describe('Tier 3 (HIGH): isHighTheftModel AND hasViralLocalTheft', () => {
    it('scores 85 when model is high-theft AND snippets have >2 trigger words', async () => {
      agent.setContext(
        [
          'Honda Civic stolen from parking lot — third theft this week',
          'Another Civic smashed and catalytic converter stolen overnight',
          'Theft spree continues in downtown area',
        ],
        'Miami',
        'FL'
      )
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })
  })

  // ─── Tier 2: MEDIUM RISK ──────────────────────────────────────────────────

  describe('Tier 2 (MEDIUM): isHighTheftModel only', () => {
    it('scores 55 when model is high-theft but no viral local theft', async () => {
      agent.setContext(
        ['Local news about traffic updates', 'Community event this weekend'],
        'Miami',
        'FL'
      )
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })
  })

  describe('Tier 2 (MEDIUM): hasViralLocalTheft only', () => {
    it('scores 55 when model is NOT high-theft but viral theft detected', async () => {
      agent.setContext(
        [
          'Cars stolen all over the neighborhood',
          'Break-in spree — catalytic converters targeted',
          'Another theft reported on Nextdoor',
        ],
        'Portland',
        'OR'
      )
      const input = makeAgentInput({ model: 'Camry' }) // Not in high-theft list
      const result = await agent.execute(input)

      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })
  })

  // ─── Tier 1: LOW RISK ─────────────────────────────────────────────────────

  describe('Tier 1 (LOW): neither condition', () => {
    it('scores 15 when model is NOT high-theft and no viral theft', async () => {
      agent.setContext(
        ['Great neighborhood for families', 'Local park renovation complete'],
        'Boise',
        'ID'
      )
      const input = makeAgentInput({ model: 'Camry' })
      const result = await agent.execute(input)

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })
  })

  // ─── Default Cases (missing city / empty snippets) ────────────────────────

  describe('Default: no city available', () => {
    it('scores 55 for high-theft model when city is null', async () => {
      agent.setContext([], null, null)
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('scores 15 for non-high-theft model when city is null', async () => {
      agent.setContext([], null, null)
      const input = makeAgentInput({ model: 'Camry' })
      const result = await agent.execute(input)

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })
  })

  describe('Default: empty snippets array', () => {
    it('scores 55 for high-theft model when snippets are empty', async () => {
      agent.setContext([], 'Miami', 'FL')
      const input = makeAgentInput({ model: 'Accord' })
      const result = await agent.execute(input)

      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })
  })

  // ─── High-Theft Model Matching ────────────────────────────────────────────

  describe('High-theft model matching', () => {
    it('matches case-insensitively (civic → CIVIC)', async () => {
      agent.setContext([], 'Miami', 'FL')
      const input = makeAgentInput({ model: 'civic' })
      const result = await agent.execute(input)

      expect(result.score).toBe(55) // High-theft model, no snippets
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.isHighTheftModel).toBe(true)
    })

    it('matches partial model names (CR-V in "CR-V EX-L")', async () => {
      agent.setContext([], 'Denver', 'CO')
      const input = makeAgentInput({ model: 'CR-V EX-L' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.isHighTheftModel).toBe(true)
    })

    it('does NOT match non-listed models', async () => {
      agent.setContext([], 'Denver', 'CO')
      const input = makeAgentInput({ model: 'Corolla' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.isHighTheftModel).toBe(false)
    })

    it('matches F-150 variant', async () => {
      agent.setContext([], 'Houston', 'TX')
      const input = makeAgentInput({ make: 'Ford', model: 'F-150' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.isHighTheftModel).toBe(true)
    })
  })

  // ─── Keyword Heuristic Boundary ───────────────────────────────────────────

  describe('Keyword heuristic boundary (>2 triggers)', () => {
    it('exactly 2 trigger words → hasViralLocalTheft = false', async () => {
      // "smashed" + "catalytic" = exactly 2 hits (no overlapping patterns)
      agent.setContext(
        ['Window smashed on Main St', 'Catalytic converter prices rising'],
        'Miami',
        'FL'
      )
      const input = makeAgentInput({ model: 'Camry' }) // Not high-theft
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.keywordHitCount).toBe(2)
      expect(metadata.hasViralLocalTheft).toBe(false)
      expect(result.score).toBe(15) // Low: not high-theft, no viral
    })

    it('3+ trigger words → hasViralLocalTheft = true', async () => {
      // "smashed" + "catalytic" + "spree" = exactly 3 hits (no overlapping patterns)
      agent.setContext(
        ['Window smashed, catalytic converter gone, part of a spree'],
        'Miami',
        'FL'
      )
      const input = makeAgentInput({ model: 'Camry' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.keywordHitCount).toBe(3)
      expect(metadata.hasViralLocalTheft).toBe(true)
      expect(result.score).toBe(55) // Medium: viral theft but not high-theft model
    })
  })

  // ─── Metadata Completeness ────────────────────────────────────────────────

  describe('Metadata completeness', () => {
    it('includes all expected metadata fields', async () => {
      agent.setContext(['stolen car report'], 'Miami', 'FL')
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata).toHaveProperty('isHighTheftModel')
      expect(metadata).toHaveProperty('hasViralLocalTheft')
      expect(metadata).toHaveProperty('keywordHitCount')
      expect(metadata).toHaveProperty('latestCity')
      expect(metadata).toHaveProperty('snippetCount')
      expect(metadata).toHaveProperty('usedFallbackNarrative')
      expect(metadata.latestCity).toBe('Miami')
      expect(metadata.snippetCount).toBe(1)
    })
  })

  // ─── Vector Result Shape ──────────────────────────────────────────────────

  describe('Vector result shape', () => {
    it('returns correct vectorIndex, vectorName, and weight', async () => {
      agent.setContext([], null, null)
      const input = makeAgentInput()
      const result = await agent.execute(input)

      expect(result.vectorIndex).toBe(6)
      expect(result.vectorName).toBe('Crime Statistics & Theft Risk')
      expect(result.weight).toBe(0.05)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LLM Narrative Generation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TheftAgent – LLM Narrative Generation', () => {
  let agent: TheftAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new TheftAgent()
    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.GOOGLE_API_KEY = 'test-google-key'
  })

  describe('Primary LLM succeeds', () => {
    it('uses primary LLM narrative', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'This Honda Civic is a top theft target in Miami.' } }],
      })
      agent.setContext(['stolen civic'], 'Miami', 'FL')
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      expect(result.narrative).toBe('This Honda Civic is a top theft target in Miami.')
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(false)
    })
  })

  describe('Primary fails, Google fallback succeeds', () => {
    it('uses Google GenAI narrative', async () => {
      mockCreate.mockRejectedValue(new Error('OpenRouter down'))
      mockGenerateContent.mockResolvedValue({
        text: 'Google: Civic theft risk is elevated in this area.',
      })
      agent.setContext(['stolen civic'], 'Miami', 'FL')
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      expect(result.narrative).toBe('Google: Civic theft risk is elevated in this area.')
      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(false)
    })
  })

  describe('Both providers fail → deterministic fallback', () => {
    it('uses fallback narrative for HIGH risk', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockRejectedValue(new Error('fail'))
      agent.setContext(
        ['stolen stolen stolen theft break-in'],
        'Miami',
        'FL'
      )
      const input = makeAgentInput({ model: 'Civic' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(true)
      expect(result.narrative).toContain('HIGH THEFT RISK')
    })

    it('uses fallback narrative for MEDIUM risk', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockRejectedValue(new Error('fail'))
      agent.setContext([], 'Miami', 'FL')
      const input = makeAgentInput({ model: 'Civic' }) // High-theft model, no snippets → Medium
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(true)
      expect(result.narrative).toContain('known high-theft target')
    })

    it('uses fallback narrative for LOW risk', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockRejectedValue(new Error('fail'))
      agent.setContext(['nice neighborhood'], 'Boise', 'ID')
      const input = makeAgentInput({ model: 'Camry' })
      const result = await agent.execute(input)

      const metadata = result.metadata as Record<string, unknown>
      expect(metadata.usedFallbackNarrative).toBe(true)
      expect(result.narrative).toContain('not on the national high-theft watchlist')
    })
  })

  describe('Narrative is always non-empty', () => {
    it('non-empty on primary success', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Narrative content.' } }],
      })
      agent.setContext([], null, null)
      const input = makeAgentInput()
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })

    it('non-empty on all failures', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      mockGenerateContent.mockRejectedValue(new Error('fail'))
      agent.setContext([], null, null)
      const input = makeAgentInput()
      const result = await agent.execute(input)
      expect(result.narrative.length).toBeGreaterThan(0)
    })
  })
})
