// tests/unit/reliability-durable-flow.test.ts
//
// Tests for the durable reliability agent flow:
//   startDiscovery → (Inngest sleep) → completeAnalysis
// All external calls are mocked — no real API or LLM calls.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AgentInput, RiskVectorResult } from '@/lib/services/risk-engine/types'
import type { ReliabilityDiscoveryResult } from '@/lib/services/risk-engine/agents/8-reliability-socialproof-agent'
import type { RedditPost } from '@/lib/services/brightdata-dataset-service'

// --- Hoisted mocks ---

const {
  mockTriggerRedditPostsDiscovery,
  mockFetchSnapshot,
  mockGetAgentConfig,
} = vi.hoisted(() => ({
  mockTriggerRedditPostsDiscovery: vi.fn(),
  mockFetchSnapshot: vi.fn(),
  mockGetAgentConfig: vi.fn(),
}))

// --- Mock BrightDataDatasetService ---
vi.mock('@/lib/services/brightdata-dataset-service', () => ({
  BrightDataDatasetService: {
    triggerRedditPostsDiscovery: (...args: unknown[]) => mockTriggerRedditPostsDiscovery(...args),
    fetchSnapshot: (...args: unknown[]) => mockFetchSnapshot(...args),
    discoverRedditPosts: vi.fn().mockResolvedValue([]),
    collectRedditComments: vi.fn().mockResolvedValue([]),
  },
}))

// --- Mock ai-config ---
vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: (...args: unknown[]) => mockGetAgentConfig(...args),
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

import { ReliabilitySocialProofAgent } from '@/lib/services/risk-engine/agents/8-reliability-socialproof-agent'

// --- Test Fixtures ---

const DEFAULT_AGENT_CONFIG = {
  disabled: false,
  primary: { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'test-model' },
  fallback: { provider: 'google', model: 'test-fallback-model' },
  temperature: 0.1,
  maxTokens: 500,
  systemInstruction: 'Test system instruction',
}

function buildAgentInput(overrides?: Partial<AgentInput['vehicle']>): AgentInput {
  return {
    reportId: 'report-test-123',
    vehicle: {
      id: 'vehicle-test-123',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
      year: 2018,
      ...overrides,
    } as AgentInput['vehicle'],
    recalls: [],
    listingHistory: [],
    safetyRating: null,
  }
}

function makeSeverePost(): RedditPost {
  return {
    url: 'https://www.reddit.com/r/Honda/comments/abc123/transmission_failure',
    title: 'Honda Civic transmission failure at 80k',
    description: 'My CVT completely died. Rod knock confirmed.',
    num_comments: 42,
    score: 156,
    author: 'civic_owner',
    created_at: '2024-03-15T10:30:00Z',
  }
}

function makeModeratePost(): RedditPost {
  return {
    url: 'https://www.reddit.com/r/Honda/comments/def456/oil_leak',
    title: 'Honda Civic oil leak issue',
    description: 'Noticed oil spots under my car. Dealer says valve cover gasket.',
    num_comments: 18,
    score: 45,
    author: 'worried_owner',
    created_at: '2024-02-20T14:00:00Z',
  }
}

function makeNeutralPost(): RedditPost {
  return {
    url: 'https://www.reddit.com/r/Honda/comments/ghi789/love_my_civic',
    title: 'Love my Honda Civic',
    description: 'Best car I have ever owned. 150k miles no issues.',
    num_comments: 8,
    score: 30,
    author: 'happy_owner',
    created_at: '2024-01-10T09:00:00Z',
  }
}

// --- Tests ---

describe('ReliabilitySocialProofAgent — Durable Flow', () => {
  let agent: ReliabilitySocialProofAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new ReliabilitySocialProofAgent()
    mockGetAgentConfig.mockReturnValue(DEFAULT_AGENT_CONFIG)
    // Default: no env vars for LLM (forces fallback narrative)
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  // ─── startDiscovery ──────────────────────────────────────────────────────

  describe('startDiscovery', () => {
    it('returns { status: "pending", snapshotId } when trigger returns pending', async () => {
      mockTriggerRedditPostsDiscovery.mockResolvedValue({
        status: 'pending',
        snapshotId: 'snap_abc123',
      })

      const result = await agent.startDiscovery(buildAgentInput())

      expect(result).toEqual<ReliabilityDiscoveryResult>({
        status: 'pending',
        snapshotId: 'snap_abc123',
      })
    })

    it('returns { status: "ready", posts } when trigger returns posts synchronously', async () => {
      const posts = [makeSeverePost(), makeModeratePost()]
      mockTriggerRedditPostsDiscovery.mockResolvedValue({
        status: 'ready',
        posts,
      })

      const result = await agent.startDiscovery(buildAgentInput())

      expect(result.status).toBe('ready')
      if (result.status === 'ready') {
        expect(result.posts).toHaveLength(2)
      }
    })

    it('returns { status: "empty" } when trigger returns empty', async () => {
      mockTriggerRedditPostsDiscovery.mockResolvedValue({ status: 'empty' })

      const result = await agent.startDiscovery(buildAgentInput())

      expect(result).toEqual<ReliabilityDiscoveryResult>({ status: 'empty' })
    })

    it('passes correct keyword (make + model + boolean search)', async () => {
      mockTriggerRedditPostsDiscovery.mockResolvedValue({ status: 'empty' })

      await agent.startDiscovery(buildAgentInput({ make: 'Toyota', model: 'Camry' }))

      expect(mockTriggerRedditPostsDiscovery).toHaveBeenCalledWith('Toyota Camry (transmission OR engine OR CVT OR failure)')
    })

    it('does not include year in keyword', async () => {
      mockTriggerRedditPostsDiscovery.mockResolvedValue({ status: 'empty' })

      await agent.startDiscovery(buildAgentInput({ year: 2020, make: 'Ford', model: 'F-150' }))

      const keyword = mockTriggerRedditPostsDiscovery.mock.calls[0][0]
      expect(keyword).not.toContain('2020')
      expect(keyword).toBe('Ford F-150 (transmission OR engine OR CVT OR failure)')
    })
  })

  // ─── completeAnalysis ────────────────────────────────────────────────────

  describe('completeAnalysis', () => {
    it('returns fallback result when discoveryResult is "disabled"', async () => {
      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'disabled' }
      )

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
      expect(result.vectorName).toBe('Reliability & Social Proof')
    })

    it('uses posts directly when discoveryResult is "ready"', async () => {
      const posts = [makeSeverePost()]

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'ready', posts }
      )

      // Severe keyword "transmission failure" → score 85
      expect(result.score).toBe(85)
      expect(result.label).toBe('High')
    })

    it('fetches snapshot when discoveryResult is "pending"', async () => {
      const posts = [makeModeratePost()]
      mockFetchSnapshot.mockResolvedValue(posts)

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'pending', snapshotId: 'snap_fetch_test' }
      )

      expect(mockFetchSnapshot).toHaveBeenCalledWith('snap_fetch_test')
      // Moderate keyword "oil leak" → score 55
      expect(result.score).toBe(55)
      expect(result.label).toBe('Medium')
    })

    it('returns Low score when discoveryResult is "empty"', async () => {
      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'empty' }
      )

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('returns Low score when fetchSnapshot returns empty array', async () => {
      mockFetchSnapshot.mockResolvedValue([])

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'pending', snapshotId: 'snap_empty' }
      )

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('filters out posts with empty title and description', async () => {
      const posts: RedditPost[] = [
        { url: 'https://reddit.com/1', title: '', description: '', num_comments: 0, score: 0, author: 'x', created_at: '' },
        makeSeverePost(),
      ]
      mockFetchSnapshot.mockResolvedValue(posts)

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'pending', snapshotId: 'snap_filter' }
      )

      // Only the severe post counts
      expect(result.score).toBe(85)
      expect((result.metadata as Record<string, unknown>).postCount).toBe(1)
    })

    it('returns correct metadata with matchedKeywords and postCount', async () => {
      const posts = [makeSeverePost(), makeModeratePost(), makeNeutralPost()]

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'ready', posts }
      )

      const meta = result.metadata as Record<string, unknown>
      expect(meta.postCount).toBe(3)
      expect(meta.matchedKeywords).toContain('transmission failure')
      expect(meta.matchedKeywords).toContain('oil leak')
    })

    it('uses fallback narrative when LLM is unavailable', async () => {
      const posts = [makeSeverePost()]

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'ready', posts }
      )

      const meta = result.metadata as Record<string, unknown>
      expect(meta.usedFallbackNarrative).toBe(true)
      expect(result.narrative).toContain('catastrophic issues')
    })

    it('never throws — returns fallback on unexpected error', async () => {
      mockFetchSnapshot.mockRejectedValue(new Error('Unexpected crash'))

      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'pending', snapshotId: 'snap_crash' }
      )

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
      expect(result.vectorName).toBe('Reliability & Social Proof')
    })

    it('returns vectorIndex 8 and weight 0.15', async () => {
      const result = await agent.completeAnalysis(
        buildAgentInput(),
        { status: 'empty' }
      )

      expect(result.vectorIndex).toBe(8)
      expect(result.weight).toBe(0.15)
    })
  })
})
