// tests/unit/brightdata-dataset-service.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// --- Mock global fetch ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  BrightDataDatasetService,
  type RedditPost,
  type RedditComment,
} from '@/lib/services/brightdata-dataset-service'

// --- Test Fixtures ---

function makeRedditPostResponse(): Record<string, unknown>[] {
  return [
    {
      url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_transmission_failure',
      title: '2018 Honda Civic transmission failure at 80k miles',
      description: 'My CVT completely died on the highway. Honda quoted $4500 for replacement.',
      num_comments: 42,
      score: 156,
      author: 'civic_owner_2018',
      created_at: '2024-03-15T10:30:00Z',
    },
    {
      url: 'https://www.reddit.com/r/Honda/comments/def456/civic_oil_leak',
      title: '2018 Honda Civic oil leak issue',
      description: 'Noticed oil spots under my car. Dealer says valve cover gasket.',
      num_comments: 18,
      score: 45,
      author: 'worried_honda_fan',
      created_at: '2024-02-20T14:00:00Z',
    },
  ]
}

function makeRedditCommentResponse(): Record<string, unknown>[] {
  return [
    {
      url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_transmission_failure',
      comment_text: 'Same thing happened to my 2017 Civic. CVT is a known weak point.',
      author: 'another_civic_owner',
      score: 23,
      created_at: '2024-03-15T12:00:00Z',
    },
    {
      url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_transmission_failure',
      comment_text: 'I got mine replaced under extended warranty. Check if yours qualifies.',
      author: 'helpful_redditor',
      score: 15,
      created_at: '2024-03-15T13:00:00Z',
    },
  ]
}

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(data),
  })
}

// --- Tests ---

describe('BrightDataDatasetService', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, BRIGHTDATA_API_TOKEN: 'test-token-123' }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  // ─── discoverRedditPosts ───────────────────────────────────────────────────

  describe('discoverRedditPosts', () => {
    it('returns parsed RedditPost array on success', async () => {
      mockFetch.mockReturnValue(mockFetchResponse(makeRedditPostResponse()))

      const result = await BrightDataDatasetService.discoverRedditPosts('2018 Honda Civic problem OR failure')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual<RedditPost>({
        url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_transmission_failure',
        title: '2018 Honda Civic transmission failure at 80k miles',
        description: 'My CVT completely died on the highway. Honda quoted $4500 for replacement.',
        num_comments: 42,
        score: 156,
        author: 'civic_owner_2018',
        created_at: '2024-03-15T10:30:00Z',
      })
    })

    it('sends correct payload with dataset ID, keyword, date, and num_of_posts', async () => {
      mockFetch.mockReturnValue(mockFetchResponse([]))

      await BrightDataDatasetService.discoverRedditPosts('2020 Toyota Camry problem OR failure')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]

      // Verify dataset ID in URL
      expect(url).toContain('dataset_id=gd_lvz8ah06191smkebj4')
      expect(url).toContain('https://api.brightdata.com/datasets/v3/scrape')

      // Verify payload structure
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        input: [{ keyword: '2020 Toyota Camry problem OR failure', date: 'Past year', num_of_posts: 10 }],
      })

      // Verify method
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
    })

    it('sends correct Bearer auth header', async () => {
      mockFetch.mockReturnValue(mockFetchResponse([]))

      await BrightDataDatasetService.discoverRedditPosts('test keyword')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer test-token-123')
    })

    it('returns [] on 4xx/5xx response', async () => {
      mockFetch.mockReturnValue(mockFetchResponse(null, false, 500))

      const result = await BrightDataDatasetService.discoverRedditPosts('test keyword')

      expect(result).toEqual([])
    })

    it('returns [] on network error (fetch throws)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error: ECONNREFUSED'))

      const result = await BrightDataDatasetService.discoverRedditPosts('test keyword')

      expect(result).toEqual([])
    })

    it('returns [] on malformed JSON response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        })
      )

      const result = await BrightDataDatasetService.discoverRedditPosts('test keyword')

      expect(result).toEqual([])
    })

    it('returns [] when BRIGHTDATA_API_TOKEN is missing', async () => {
      delete process.env.BRIGHTDATA_API_TOKEN
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await BrightDataDatasetService.discoverRedditPosts('test keyword')

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns [] on empty keyword', async () => {
      const result = await BrightDataDatasetService.discoverRedditPosts('')

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns [] on whitespace-only keyword', async () => {
      const result = await BrightDataDatasetService.discoverRedditPosts('   ')

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── collectRedditComments ─────────────────────────────────────────────────

  describe('collectRedditComments', () => {
    it('returns parsed RedditComment array on success', async () => {
      mockFetch.mockReturnValue(mockFetchResponse(makeRedditCommentResponse()))

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/civic_transmission_failure',
      ])

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual<RedditComment>({
        url: 'https://www.reddit.com/r/Honda/comments/abc123/civic_transmission_failure',
        comment_text: 'Same thing happened to my 2017 Civic. CVT is a known weak point.',
        author: 'another_civic_owner',
        score: 23,
        created_at: '2024-03-15T12:00:00Z',
      })
    })

    it('sends correct payload mapping URLs to {url, days_back: 365}', async () => {
      mockFetch.mockReturnValue(mockFetchResponse([]))

      const urls = [
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
        'https://www.reddit.com/r/Honda/comments/def456/post2',
      ]
      await BrightDataDatasetService.collectRedditComments(urls)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]

      // Verify dataset ID in URL
      expect(url).toContain('dataset_id=gd_lvzdpsdlw09j6t702')

      // Verify payload maps each URL to {url, days_back: 365}
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        input: [
          { url: 'https://www.reddit.com/r/Honda/comments/abc123/post1', days_back: 365 },
          { url: 'https://www.reddit.com/r/Honda/comments/def456/post2', days_back: 365 },
        ],
      })
    })

    it('filters out [deleted] comments', async () => {
      const responseData = [
        ...makeRedditCommentResponse(),
        {
          url: 'https://www.reddit.com/r/Honda/comments/abc123/post1',
          comment_text: '[deleted]',
          author: '[deleted]',
          score: 0,
          created_at: '2024-03-15T14:00:00Z',
        },
      ]
      mockFetch.mockReturnValue(mockFetchResponse(responseData))

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
      ])

      expect(result.every((c) => c.comment_text !== '[deleted]')).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('filters out [removed] comments', async () => {
      const responseData = [
        ...makeRedditCommentResponse(),
        {
          url: 'https://www.reddit.com/r/Honda/comments/abc123/post1',
          comment_text: '[removed]',
          author: 'mod_removed',
          score: 0,
          created_at: '2024-03-15T14:00:00Z',
        },
      ]
      mockFetch.mockReturnValue(mockFetchResponse(responseData))

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
      ])

      expect(result.every((c) => c.comment_text !== '[removed]')).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('filters out empty comment_text', async () => {
      const responseData = [
        ...makeRedditCommentResponse(),
        {
          url: 'https://www.reddit.com/r/Honda/comments/abc123/post1',
          comment_text: '',
          author: 'empty_commenter',
          score: 1,
          created_at: '2024-03-15T14:00:00Z',
        },
        {
          url: 'https://www.reddit.com/r/Honda/comments/abc123/post1',
          comment_text: '   ',
          author: 'whitespace_commenter',
          score: 1,
          created_at: '2024-03-15T14:00:00Z',
        },
      ]
      mockFetch.mockReturnValue(mockFetchResponse(responseData))

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
      ])

      expect(result.every((c) => c.comment_text.trim() !== '')).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('returns [] on API failure (non-ok response)', async () => {
      mockFetch.mockReturnValue(mockFetchResponse(null, false, 403))

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
      ])

      expect(result).toEqual([])
    })

    it('returns [] on network error', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'))

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
      ])

      expect(result).toEqual([])
    })

    it('returns [] when BRIGHTDATA_API_TOKEN is missing', async () => {
      delete process.env.BRIGHTDATA_API_TOKEN
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await BrightDataDatasetService.collectRedditComments([
        'https://www.reddit.com/r/Honda/comments/abc123/post1',
      ])

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns [] on empty URL array', async () => {
      const result = await BrightDataDatasetService.collectRedditComments([])

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
