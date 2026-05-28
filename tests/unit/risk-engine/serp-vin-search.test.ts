// tests/unit/risk-engine/serp-vin-search.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// --- Mock global fetch ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { SerpService } from '@/lib/services/serp-service'

describe('SerpService – fetchVinSearch()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BRIGHTDATA_SERP_API_KEY = 'test-serp-key'
    process.env.BRIGHTDATA_SERP_ZONE = 'test_zone'
  })

  afterEach(() => {
    delete process.env.BRIGHTDATA_SERP_API_KEY
    delete process.env.BRIGHTDATA_SERP_ZONE
  })

  // ─── Happy Path ─────────────────────────────────────────────────────────

  describe('Successful API response', () => {
    it('returns organicLinks, snippets, and imageUrls from organic results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            {
              title: 'Copart Lot 12345',
              description: 'Honda Civic 2019 salvage',
              link: 'https://www.copart.com/lot/12345',
              image: 'https://img.copart.com/12345.jpg',
            },
            {
              title: 'Cars.com listing',
              description: 'Clean title Honda Civic',
              link: 'https://www.cars.com/vehicledetail/abc',
              thumbnail: 'https://img.cars.com/abc.jpg',
            },
          ],
        }),
      })

      const result = await SerpService.fetchVinSearch('1HGBH41JXMN109186')

      expect(result.organicLinks).toEqual([
        'https://www.copart.com/lot/12345',
        'https://www.cars.com/vehicledetail/abc',
      ])
      expect(result.snippets).toHaveLength(2)
      expect(result.snippets[0]).toBe('Copart Lot 12345 — Honda Civic 2019 salvage')
      expect(result.snippets[1]).toBe('Cars.com listing — Clean title Honda Civic')
      expect(result.imageUrls).toEqual([
        'https://img.copart.com/12345.jpg',
        'https://img.cars.com/abc.jpg',
      ])
    })

    it('limits imageUrls to max 2', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: 'A', link: 'https://a.com', image: 'https://img1.jpg' },
            { title: 'B', link: 'https://b.com', image: 'https://img2.jpg' },
            { title: 'C', link: 'https://c.com', image: 'https://img3.jpg' },
          ],
        }),
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result.imageUrls).toHaveLength(2)
    })

    it('handles results with no images gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: 'Result', description: 'No image', link: 'https://example.com' },
          ],
        }),
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result.imageUrls).toEqual([])
    })

    it('handles results with no links gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: 'Result', description: 'No link' },
          ],
        }),
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result.organicLinks).toEqual([])
      expect(result.snippets).toHaveLength(1)
    })
  })

  // ─── Stringified Body Wrapper ─────────────────────────────────────────────

  describe('Response wrapped in stringified body property', () => {
    it('parses the body string and extracts results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          body: JSON.stringify({
            organic: [
              { title: 'Wrapped', description: 'From body', link: 'https://wrapped.com' },
            ],
          }),
        }),
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result.organicLinks).toEqual(['https://wrapped.com'])
      expect(result.snippets[0]).toBe('Wrapped — From body')
    })
  })

  // ─── Empty / Missing Organic ──────────────────────────────────────────────

  describe('Empty organic array', () => {
    it('returns empty arrays when organic is empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
    })

    it('returns empty arrays when organic is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
    })
  })

  // ─── Failsafe: Missing API Key ───────────────────────────────────────────

  describe('Missing API key', () => {
    it('returns empty result without calling fetch', async () => {
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await SerpService.fetchVinSearch('TESTVIN123')

      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── Failsafe: HTTP Errors ────────────────────────────────────────────────

  describe('HTTP error responses', () => {
    it('returns empty result on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
    })

    it('returns empty result on 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
    })
  })

  // ─── Failsafe: Network Errors ─────────────────────────────────────────────

  describe('Network errors', () => {
    it('returns empty result on fetch rejection', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
    })

    it('returns empty result on JSON parse error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token') },
      })

      const result = await SerpService.fetchVinSearch('TESTVIN123')
      expect(result).toEqual({ organicLinks: [], snippets: [], imageUrls: [] })
    })
  })

  // ─── Request Construction ─────────────────────────────────────────────────

  describe('Request construction', () => {
    it('sends correct headers and body to Bright Data API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      })

      await SerpService.fetchVinSearch('1HGBH41JXMN109186')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.brightdata.com/request')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer test-serp-key')
      expect(options.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body)
      expect(body.zone).toBe('test_zone')
      expect(body.format).toBe('json')
      expect(body.url).toContain('google.com/search?q=')
      expect(body.url).toContain('1HGBH41JXMN109186')
      // Verify social media exclusions
      expect(body.url).toContain('-site%3Ainstagram.com')
      expect(body.url).toContain('-site%3Afacebook.com')
    })

    it('uses default zone when BRIGHTDATA_SERP_ZONE is not set', async () => {
      delete process.env.BRIGHTDATA_SERP_ZONE
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      })

      await SerpService.fetchVinSearch('TESTVIN123')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.zone).toBe('serp_api1')
    })
  })
})
