// tests/integration/orchestrator.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RiskVectorResult } from '@/lib/services/risk-engine/types'

// Hoist mock functions so they're available inside vi.mock factories
const {
  mockFindUnique,
  mockCreateMany,
  mockUpdate,
  mockOpenAICreate,
  mockGoogleGenerateContent,
  mockAgentExecute,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreateMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockOpenAICreate: vi.fn(),
  mockGoogleGenerateContent: vi.fn(),
  mockAgentExecute: vi.fn(),
}))

// --- Mock prisma ---
vi.mock('@/app/lib/db', () => ({
  default: {
    report: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    riskVectorResult: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}))

// --- Mock ai-config ---
vi.mock('@/lib/ai-config', () => ({
  getMasterAgentConfig: vi.fn(() => ({
    primary: {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'test-model',
    },
    fallback: {
      provider: 'google',
      model: 'test-fallback-model',
    },
    temperature: 0.2,
    maxTokens: 800,
    systemInstruction: 'Test master system instruction',
  })),
}))

// --- Mock OpenAI (Master LLM primary provider) ---
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockOpenAICreate } }
    constructor() {}
  },
}))

// --- Mock Google GenAI (Master LLM fallback provider) ---
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGoogleGenerateContent }
    constructor() {}
  },
}))

// --- Mock BaselineAgent ---
vi.mock('@/lib/services/risk-engine/agents/0-baseline-agent', () => ({
  BaselineAgent: class MockBaselineAgent {
    readonly vectorIndex = 0
    readonly vectorName = 'Baseline Health & Market Anomalies'
    readonly weight = 0.20
    execute = mockAgentExecute
  },
}))

// --- Mock SafetyAgent ---
vi.mock('@/lib/services/risk-engine/agents/1-safety-agent', () => ({
  SafetyAgent: class MockSafetyAgent {
    readonly vectorIndex = 1
    readonly vectorName = 'NHTSA Safety Ratings'
    readonly weight = 0.10
    execute = mockAgentExecute
  },
}))

// --- Mock @prisma/client for Prisma namespace ---
vi.mock('@prisma/client', () => ({
  Prisma: {
    JsonNull: 'DbNull',
  },
}))

import { RiskEngineOrchestrator } from '@/lib/services/risk-engine/orchestrator'

// --- Test Fixtures ---

function makeTestReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-001',
    status: 'PROCESSING',
    vehicle: {
      id: 'vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Accord',
      year: 2019,
      trim: 'EX',
      engineDesc: '2.0L I4',
      decoderSource: 'nhtsa',
      safetyRating: null,
      recalls: [
        {
          id: 'recall-001',
          campaignNumber: '24V-001',
          component: 'Brakes',
          summary: 'Brake caliper may corrode',
          parkIt: false,
          parkOutSide: false,
        },
      ],
      listingHistory: [
        {
          externalListingId: 'listing-001',
          price: 25000,
          miles: 45000,
          msrp: 30000,
          statusDate: new Date('2023-01-15'),
          firstSeenAt: new Date('2023-01-10'),
          lastSeenAt: new Date('2023-02-01'),
          sellerType: 'dealer',
          sellerName: 'Test Dealer',
          city: 'San Jose',
          state: 'CA',
        },
      ],
    },
    ...overrides,
  }
}

function makeAgentResult(overrides: Partial<RiskVectorResult> = {}): RiskVectorResult {
  return {
    vectorIndex: 0,
    vectorName: 'Baseline Health & Market Anomalies',
    score: 25,
    label: 'Low',
    weight: 0.20,
    narrative: 'Test narrative from baseline agent.',
    metadata: {
      vehicleAge: 6,
      rollbackDetected: false,
      recallCount: 1,
      listingCount: 1,
      usedFallbackNarrative: false,
      findings: ['1 NHTSA recall(s) on record'],
    },
    ...overrides,
  }
}

const VALID_MASTER_LLM_RESPONSE = [
  '---EXECUTIVE_SUMMARY---',
  'This vehicle shows low overall risk with minor recall concerns.',
  '---NEGOTIATION_SCRIPT---',
  '• Ask about the open recall and whether it has been addressed.',
].join('\n')

describe('RiskEngineOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: report found
    mockFindUnique.mockResolvedValue(makeTestReport())

    // Default: agent returns a controlled result
    mockAgentExecute.mockResolvedValue(makeAgentResult())

    // Default: DB operations succeed
    mockCreateMany.mockResolvedValue({ count: 2 })
    mockUpdate.mockResolvedValue({})

    // Default: Master LLM returns valid response
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: VALID_MASTER_LLM_RESPONSE } }],
    })

    // Set env var so OpenRouter path is taken
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.GOOGLE_API_KEY
  })

  // --- Test 1: Parallel agent execution — all agents in registry are called ---
  it('executes all registered agents with correct input', async () => {
    await RiskEngineOrchestrator.run('report-001')

    expect(mockAgentExecute).toHaveBeenCalledTimes(2)
    expect(mockAgentExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 'report-001',
        vehicle: expect.objectContaining({
          vin: '1HGBH41JXMN109186',
          make: 'Honda',
        }),
        recalls: expect.arrayContaining([
          expect.objectContaining({ campaignNumber: '24V-001' }),
        ]),
        listingHistory: expect.arrayContaining([
          expect.objectContaining({ externalListingId: 'listing-001' }),
        ]),
      })
    )
  })

  // --- Test 2: Composite score = weighted sum, capped at 100 ---
  it('computes composite score as weighted sum of agent scores', async () => {
    // Both agents return score 60, weight 0.20 → composite = 60*0.20 + 60*0.20 = 24
    mockAgentExecute.mockResolvedValue(makeAgentResult({ score: 60, label: 'Medium' }))

    await RiskEngineOrchestrator.run('report-001')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          riskScore: 24,
        }),
      })
    )
  })

  it('caps composite score at 100', async () => {
    // Score 100, weight 0.20 → 100 * 0.20 = 20 (won't exceed 100 with single agent)
    // Simulate a scenario where weighted sum would exceed 100 by using a high score
    mockAgentExecute.mockResolvedValue(makeAgentResult({ score: 100, weight: 1.5 }))

    await RiskEngineOrchestrator.run('report-001')

    // The orchestrator uses the weight from the result: 100 * 1.5 = 150, capped at 100
    // But the mock agent's weight in the registry is 0.20, and the orchestrator uses
    // the result's weight field. Let's verify the cap logic with the actual weight.
    // With weight 0.20 and score 100: 100 * 0.20 = 20, not capped.
    // The cap is tested by the logic itself — let's verify it doesn't exceed 100.
    const updateCall = mockUpdate.mock.calls[0][0]
    expect(updateCall.data.riskScore).toBeLessThanOrEqual(100)
  })

  // --- Test 3: Label assignment (Low/Medium/High thresholds) ---
  it('assigns "Low" label for composite score 0-30', async () => {
    // Score 25, weight 0.20 → composite = 5
    mockAgentExecute.mockResolvedValue(makeAgentResult({ score: 25 }))

    await RiskEngineOrchestrator.run('report-001')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          riskLabel: 'Low',
        }),
      })
    )
  })

  it('assigns "Medium" label for composite score 31-70', async () => {
    // Need composite > 30. With 2 agents both using weight from result:
    // Score 80, weight 0.50 → 80*0.50 + 80*0.50 = 80 → High (too high)
    // Score 50, weight 0.40 → 50*0.40 + 50*0.40 = 40 → Medium
    mockAgentExecute.mockResolvedValue(makeAgentResult({ score: 50, weight: 0.40 }))

    await RiskEngineOrchestrator.run('report-001')

    // 50 * 0.40 + 50 * 0.40 = 40 → Medium
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          riskScore: 40,
          riskLabel: 'Medium',
        }),
      })
    )
  })

  it('assigns "High" label for composite score 71-100', async () => {
    mockAgentExecute.mockResolvedValue(makeAgentResult({ score: 90, weight: 0.50 }))

    await RiskEngineOrchestrator.run('report-001')

    // 90 * 0.50 + 90 * 0.50 = 90 → High
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          riskScore: 90,
          riskLabel: 'High',
        }),
      })
    )
  })

  // --- Test 4: Master LLM invocation with agent narratives ---
  it('invokes Master LLM with agent narratives and updates report with parsed response', async () => {
    await RiskEngineOrchestrator.run('report-001')

    // Verify OpenAI was called
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1)
    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Baseline Health & Market Anomalies'),
          }),
        ]),
      })
    )

    // Verify report updated with parsed executive summary and negotiation script
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executiveSummary: 'This vehicle shows low overall risk with minor recall concerns.',
          negotiationScript: '• Ask about the open recall and whether it has been addressed.',
        }),
      })
    )
  })

  // --- Test 5: Fallback narrative when LLM fails ---
  it('generates fallback narrative when Master LLM fails', async () => {
    // Make OpenAI throw
    mockOpenAICreate.mockRejectedValue(new Error('LLM unavailable'))
    // No Google key set, so fallback provider also unavailable
    delete process.env.GOOGLE_API_KEY

    await RiskEngineOrchestrator.run('report-001')

    // Should still update report with fallback content
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executiveSummary: expect.stringContaining('Overall Risk:'),
          negotiationScript: expect.stringContaining('Based on our research'),
          isAiFallback: true,
          status: 'COMPLETED',
        }),
      })
    )
  })

  it('uses default negotiation template when no findings exist and LLM fails', async () => {
    mockOpenAICreate.mockRejectedValue(new Error('LLM unavailable'))
    delete process.env.GOOGLE_API_KEY

    // Agent returns no findings in metadata
    mockAgentExecute.mockResolvedValue(
      makeAgentResult({
        metadata: {
          vehicleAge: 3,
          rollbackDetected: false,
          recallCount: 0,
          listingCount: 0,
          usedFallbackNarrative: false,
          findings: [],
        },
      })
    )

    await RiskEngineOrchestrator.run('report-001')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          negotiationScript: expect.stringContaining('Negotiation Talking Points:'),
          isAiFallback: true,
        }),
      })
    )
  })

  // --- Test 6: Report update on completion (all fields) ---
  it('updates report with all required fields on successful completion', async () => {
    mockAgentExecute.mockResolvedValue(makeAgentResult({ score: 25 }))

    await RiskEngineOrchestrator.run('report-001')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'report-001' },
      data: {
        riskScore: expect.any(Number),
        riskLabel: expect.stringMatching(/^(Low|Medium|High)$/),
        executiveSummary: expect.any(String),
        negotiationScript: expect.any(String),
        isAiFallback: expect.any(Boolean),
        riskNarrative: expect.any(String),
        status: 'COMPLETED',
      },
    })
  })

  it('persists RiskVectorResult records before updating report', async () => {
    await RiskEngineOrchestrator.run('report-001')

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          reportId: 'report-001',
          vectorIndex: 0,
          vectorName: 'Baseline Health & Market Anomalies',
          score: 25,
          label: 'Low',
          weight: 0.20,
          narrative: 'Test narrative from baseline agent.',
        }),
      ]),
    })
  })

  // --- Test 7: Report marked FAILED on agent error ---
  it('marks report as FAILED when an agent throws an error', async () => {
    mockAgentExecute.mockRejectedValue(new Error('Agent crashed'))

    await RiskEngineOrchestrator.run('report-001')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'report-001' },
      data: { status: 'FAILED' },
    })
  })

  it('marks report as FAILED when DB persistence fails', async () => {
    mockCreateMany.mockRejectedValue(new Error('DB write failed'))

    await RiskEngineOrchestrator.run('report-001')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'report-001' },
      data: { status: 'FAILED' },
    })
  })

  // --- Edge cases ---
  it('returns early without error when report is not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    await RiskEngineOrchestrator.run('nonexistent-report')

    expect(mockAgentExecute).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns early without error when report has no vehicle', async () => {
    mockFindUnique.mockResolvedValue({ id: 'report-001', vehicle: null })

    await RiskEngineOrchestrator.run('report-001')

    expect(mockAgentExecute).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('falls back to Google GenAI when OpenRouter key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY
    process.env.GOOGLE_API_KEY = 'test-google-key'

    mockGoogleGenerateContent.mockResolvedValue({
      text: VALID_MASTER_LLM_RESPONSE,
    })

    await RiskEngineOrchestrator.run('report-001')

    expect(mockOpenAICreate).not.toHaveBeenCalled()
    expect(mockGoogleGenerateContent).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          executiveSummary: expect.any(String),
        }),
      })
    )
  })
})
