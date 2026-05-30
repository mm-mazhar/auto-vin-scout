// tests/unit/brightdata-durable-async.test.ts
//
// Tests for the durable async flow: triggerRedditPostsDiscovery + fetchSnapshot.
// All external calls are mocked — no real API calls.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// --- Mock global fetch ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  BrightDataDatasetService,
  type RedditPost,
  type RedditDiscoveryResult,
} from '@/lib/services/brightdata-dataset-service'

// --- Helpers ---

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(data),
  })
}

function makeRedditPostApiResponse(): Record<string, unknown>[] {
  return [
    {
      url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_engine_failure',
      title: 'Honda Civic engine failure at 90k',
      description: 'My engine completely died. Rod knock confirmed by mechanic.',
      num_comments: 35,
      num_upvotes: 120,
      user_posted: 'civic_owner',
      date_posted: '2024-05-10T08:00:00Z',
    },
    {
      url: 'https://www.reddit.com/r/Honda/comments/def456/civic_oil_consumption',
      title: 'Civic oil consumption issue',
      description: 'Burning a quart every 1000 miles. Dealer says normal.',
      num_comments: 22,
      num_upvotes: 67,
      user_posted: 'oil_burner',
      date_posted: '2024-04-20T12:00:00Z',
    },
  ]
}

// --- Tests ---

describe('BrightDataDatasetService — Durable Async Flow', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    process.env = { ...ORIGINAL_ENV, BRIGHTDATA_API_TOKEN: 'test-token-abc' }
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env = ORIGINAL_ENV
  })

  // ─── triggerRedditPostsDiscovery ─────────────────────────────────────────

  describe('triggerRedditPostsDiscovery', () => {
    it('returns { status: "pending", snapshotId } when API returns snapshot_id', async () => {
      mockFetch.mockReturnValue(
        mockFetchResponse({ snapshot_id: 'snap_abc123' })
      )

      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('Honda Civic engine failure')

      expect(result).toEqual<RedditDiscoveryResult>({
        status: 'pending',
        snapshotId: 'snap_abc123',
      })
    })

    it('uses /trigger endpoint (not /scrape)', async () => {
      mockFetch.mockReturnValue(
        mockFetchResponse({ snapshot_id: 'snap_xyz' })
      )

      await BrightDataDatasetService.triggerRedditPostsDiscovery('Toyota Camry engine failure')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('https://api.brightdata.com/datasets/v3/trigger')
      expect(url).not.toContain('/scrape')
    })

    it('sends correct dataset_id, type, discover_by, and format params', async () => {
      mockFetch.mockReturnValue(
        mockFetchResponse({ snapshot_id: 'snap_xyz' })
      )

      await BrightDataDatasetService.triggerRedditPostsDiscovery('Ford F-150 engine failure')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('dataset_id=gd_lvz8ah06191smkebj4')
      expect(url).toContain('type=discover_new')
      expect(url).toContain('discover_by=keyword')
      expect(url).toContain('format=json')

      const body = JSON.parse(options.body)
      expect(body).toEqual({
        input: [{ keyword: 'Ford F-150 engine failure', date: 'Past year', num_of_posts: 10 }],
      })
    })

    it('sends Bearer auth header', async () => {
      mockFetch.mockReturnValue(
        mockFetchResponse({ snapshot_id: 'snap_xyz' })
      )

      await BrightDataDatasetService.triggerRedditPostsDiscovery('test keyword')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer test-token-abc')
    })

    it('returns { status: "ready", posts } when API returns array directly', async () => {
      const apiData = makeRedditPostApiResponse()
      mockFetch.mockReturnValue(mockFetchResponse(apiData))

      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('Honda Civic engine failure')

      expect(result.status).toBe('ready')
      if (result.status === 'ready') {
        expect(result.posts).toHaveLength(2)
        expect(result.posts[0].title).toBe('Honda Civic engine failure at 90k')
        expect(result.posts[0].url).toBe('https://www.reddit.com/r/Honda/comments/abc123/civic_engine_failure')
      }
    })

    it('returns { status: "empty" } on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFetchResponse(null, false, 500))

      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('test keyword')

      expect(result).toEqual<RedditDiscoveryResult>({ status: 'empty' })
    })

    it('returns { status: "empty" } on network error', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('test keyword')

      expect(result).toEqual<RedditDiscoveryResult>({ status: 'empty' })
    })

    it('returns { status: "empty" } when API token is missing', async () => {
      delete process.env.BRIGHTDATA_API_TOKEN
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('test keyword')

      expect(result).toEqual<RedditDiscoveryResult>({ status: 'empty' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns { status: "empty" } on empty keyword', async () => {
      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('')

      expect(result).toEqual<RedditDiscoveryResult>({ status: 'empty' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns { status: "empty" } on whitespace-only keyword', async () => {
      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('   ')

      expect(result).toEqual<RedditDiscoveryResult>({ status: 'empty' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns { status: "empty" } when response is non-array non-snapshot object', async () => {
      mockFetch.mockReturnValue(mockFetchResponse({ error: 'unknown format' }))

      const result = await BrightDataDatasetService.triggerRedditPostsDiscovery('test keyword')

      expect(result).toEqual<RedditDiscoveryResult>({ status: 'empty' })
    })

    it('trims keyword before sending', async () => {
      mockFetch.mockReturnValue(mockFetchResponse({ snapshot_id: 'snap_trim' }))

      await BrightDataDatasetService.triggerRedditPostsDiscovery('  Honda Civic engine failure  ')

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.input[0].keyword).toBe('Honda Civic engine failure')
    })

    it('includes AbortSignal in fetch call', async () => {
      mockFetch.mockReturnValue(mockFetchResponse({ snapshot_id: 'snap_signal' }))

      await BrightDataDatasetService.triggerRedditPostsDiscovery('test keyword')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.signal).toBeDefined()
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })
  })

  // ─── fetchSnapshot ───────────────────────────────────────────────────────

  describe('fetchSnapshot', () => {
    it('returns parsed posts when snapshot is ready (status 200)', async () => {
      const apiData = makeRedditPostApiResponse()
      mockFetch.mockReturnValue(mockFetchResponse(apiData, true, 200))

      const result = await BrightDataDatasetService.fetchSnapshot('snap_ready_123')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual<RedditPost>({
        url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_engine_failure',
        title: 'Honda Civic engine failure at 90k',
        description: 'My engine completely died. Rod knock confirmed by mechanic.',
        num_comments: 35,
        score: 120,
        author: 'civic_owner',
        created_at: '2024-05-10T08:00:00Z',
      })
    })

    it('calls correct snapshot URL with Bearer auth', async () => {
      mockFetch.mockReturnValue(mockFetchResponse([], true, 200))

      await BrightDataDatasetService.fetchSnapshot('snap_url_test')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.brightdata.com/datasets/v3/snapshot/snap_url_test?format=json')
      expect(options.method).toBe('GET')
      expect(options.headers['Authorization']).toBe('Bearer test-token-abc')
    })

    it('retries on 202 (still processing) and succeeds on subsequent 200', async () => {
      const apiData = makeRedditPostApiResponse()

      // First call: 202 (processing), second call: 200 (ready)
      mockFetch
        .mockReturnValueOnce(Promise.resolve({ ok: true, status: 202, statusText: 'Accepted', json: () => Promise.resolve(null) }))
        .mockReturnValueOnce(mockFetchResponse(apiData, true, 200))

      const promise = BrightDataDatasetService.fetchSnapshot('snap_retry_123')

      // Advance past first poll interval (5s)
      await vi.advanceTimersByTimeAsync(5_000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
    })

    it('returns [] when API token is missing', async () => {
      delete process.env.BRIGHTDATA_API_TOKEN
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await BrightDataDatasetService.fetchSnapshot('snap_no_token')

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns [] on unexpected status code', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', json: () => Promise.resolve(null) })
      )

      const result = await BrightDataDatasetService.fetchSnapshot('snap_404')

      expect(result).toEqual([])
    })

    it('returns [] on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await BrightDataDatasetService.fetchSnapshot('snap_network_err')

      expect(result).toEqual([])
    })

    it('returns [] when response is not an array', async () => {
      mockFetch.mockReturnValue(mockFetchResponse({ unexpected: 'object' }, true, 200))

      const result = await BrightDataDatasetService.fetchSnapshot('snap_bad_format')

      expect(result).toEqual([])
    })

    it('returns [] after max retry attempts exhausted (all 202s)', async () => {
      // Always return 202
      mockFetch.mockReturnValue(
        Promise.resolve({ ok: true, status: 202, statusText: 'Accepted', json: () => Promise.resolve(null) })
      )

      const promise = BrightDataDatasetService.fetchSnapshot('snap_timeout')

      // Advance through all 9 retry intervals (9 * 5s = 45s)
      for (let i = 0; i < 9; i++) {
        await vi.advanceTimersByTimeAsync(5_000)
      }

      const result = await promise

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(9)
    })
  })
})
