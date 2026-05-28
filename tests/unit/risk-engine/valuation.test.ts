// tests/unit/risk-engine/valuation.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// --- Mock global fetch (for SerpService) ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// --- Mock ai-config ---
vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: vi.fn().mockReturnValue({
    primary: {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-sonnet',
    },
    fallback: {
      provider: 'google',
      model: 'gemini-1.5-flash',
    },
    temperature: 0.2,
    maxTokens: 800,
    systemInstruction: 'You are an expert automotive appraiser.',
  }),
  getMasterAgentConfig: vi.fn(),
}))

// --- Mock OpenAI ---
const mockOpenAICreate = vi.fn()
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    }
  },
}))

// --- Mock Google GenAI ---
const mockGoogleGenerate = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGoogleGenerate,
    }
  },
}))

// --- Mock Prisma ---
vi.mock('@/app/lib/db', () => ({
  default: {
    report: { update: vi.fn(), findUnique: vi.fn() },
    riskVectorResult: { createMany: vi.fn() },
  },
}))

import { RiskEngineOrchestrator } from '@/lib/services/risk-engine/orchestrator'

// Static mock SERP response
const MOCK_SERP_RESPONSE = {
  ai_overview: {
    texts: [
      { text: 'The 2019 Honda Civic ranges from $18,000 to $23,000.' },
    ],
  },
  featured_snippets: [
    { description: 'Average price: $19,500 for LX trim with 50k miles.' },
  ],
  organic: [
    { description: 'KBB range: $17,800 - $22,400.' },
    { description: 'Edmunds trade-in: $16,200.' },
    { description: 'CarGurus deal: below $18,000.' },
  ],
}

const MOCK_LLM_MARKDOWN = `# Market Valuation Report

## 2019 Honda Civic

### Expected Price Range
- **Fair Market Value:** $18,000 – $23,000
- **Trade-in Value:** $16,200
- **Great Deal Threshold:** Below $18,000

### Factors Affecting Price
- Mileage (50k miles is average for this year)
- Trim level (LX vs EX vs Touring)
- Accident history and condition

### Summary
The 2019 Honda Civic holds its value well in the used market.`

describe('RiskEngineOrchestrator.runValuation()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BRIGHTDATA_SERP_API_KEY = 'test-serp-key'
    process.env.BRIGHTDATA_SERP_ZONE = 'test_zone'
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.GOOGLE_API_KEY = 'test-google-key'
  })

  afterEach(() => {
    delete process.env.BRIGHTDATA_SERP_API_KEY
    delete process.env.BRIGHTDATA_SERP_ZONE
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  // ─── Happy Path ─────────────────────────────────────────────────────────

  it('fetches SERP data and formats it via primary LLM into Markdown', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_SERP_RESPONSE,
    })

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: MOCK_LLM_MARKDOWN } }],
    })

    const result = await RiskEngineOrchestrator.runValuation(2019, 'Honda', 'Civic')

    expect(result).toBe(MOCK_LLM_MARKDOWN)
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1)
    expect(mockGoogleGenerate).not.toHaveBeenCalled()
  })

  // ─── Fallback to Google ─────────────────────────────────────────────────

  it('falls back to Google GenAI when primary LLM fails', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_SERP_RESPONSE,
    })

    mockOpenAICreate.mockRejectedValue(new Error('OpenRouter down'))
    mockGoogleGenerate.mockResolvedValue({
      text: MOCK_LLM_MARKDOWN,
    })

    const result = await RiskEngineOrchestrator.runValuation(2019, 'Honda', 'Civic')

    expect(result).toBe(MOCK_LLM_MARKDOWN)
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1)
    expect(mockGoogleGenerate).toHaveBeenCalledTimes(1)
  })

  // ─── Returns raw text when all LLMs fail ────────────────────────────────

  it('returns raw SERP text when all LLM providers fail', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_SERP_RESPONSE,
    })

    mockOpenAICreate.mockRejectedValue(new Error('OpenRouter down'))
    mockGoogleGenerate.mockResolvedValue({ text: '' })

    const result = await RiskEngineOrchestrator.runValuation(2019, 'Honda', 'Civic')

    // Should return the raw combined text since LLM returned empty
    expect(result).not.toBeNull()
    expect(result).toContain('$18,000 to $23,000')
  })

  // ─── Returns null when SERP fails ──────────────────────────────────────

  it('returns null when SERP fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const result = await RiskEngineOrchestrator.runValuation(2019, 'Honda', 'Civic')

    expect(result).toBeNull()
    expect(mockOpenAICreate).not.toHaveBeenCalled()
    expect(mockGoogleGenerate).not.toHaveBeenCalled()
  })

  // ─── Returns null when no API key ──────────────────────────────────────

  it('returns null when BRIGHTDATA_SERP_API_KEY is not set', async () => {
    delete process.env.BRIGHTDATA_SERP_API_KEY

    const result = await RiskEngineOrchestrator.runValuation(2019, 'Honda', 'Civic')

    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ─── LLM receives correct prompt ──────────────────────────────────────

  it('passes vehicle info and raw SERP text to the LLM', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ai_overview: { texts: [{ text: 'Price data here' }] },
      }),
    })

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: '# Report' } }],
    })

    await RiskEngineOrchestrator.runValuation(2021, 'Toyota', 'Camry')

    const callArgs = mockOpenAICreate.mock.calls[0][0]
    expect(callArgs.messages[0].role).toBe('system')
    expect(callArgs.messages[0].content).toContain('automotive appraiser')
    expect(callArgs.messages[1].role).toBe('user')
    expect(callArgs.messages[1].content).toContain('2021 Toyota Camry')
    expect(callArgs.messages[1].content).toContain('Price data here')
  })
})
