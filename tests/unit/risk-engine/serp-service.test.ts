// tests/unit/risk-engine/serp-service.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// --- Mock global fetch ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { SerpService } from '@/lib/services/serp-service'

describe('SerpService – fetchLocalTheftReports()', () => {
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
    it('returns combined title + description strings from organic results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: 'Honda Civic stolen in Miami', description: 'Third theft this week on Reddit' },
            { title: 'Kia Boyz spree continues', description: 'Nextdoor users report break-ins' },
          ],
        }),
      })

      const result = await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')

      expect(result).toHaveLength(2)
      expect(result[0]).toBe('Honda Civic stolen in Miami — Third theft this week on Reddit')
      expect(result[1]).toBe('Kia Boyz spree continues — Nextdoor users report break-ins')
    })

    it('handles results with only title (no description)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: 'Theft report', description: undefined },
          ],
        }),
      })

      const result = await SerpService.fetchLocalTheftReports('Dallas', 'TX', 'Hyundai', 'Elantra')

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('Theft report')
    })

    it('handles results with only description (no title)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: undefined, description: 'Catalytic converter theft on the rise' },
          ],
        }),
      })

      const result = await SerpService.fetchLocalTheftReports('Portland', 'OR', 'Toyota', 'Prius')

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('Catalytic converter theft on the rise')
    })
  })

  // ─── Stringified Body Wrapper ─────────────────────────────────────────────

  describe('Response wrapped in stringified body property', () => {
    it('parses the body string and extracts organic results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          body: JSON.stringify({
            organic: [
              { title: 'Wrapped result', description: 'From body string' },
            ],
          }),
        }),
      })

      const result = await SerpService.fetchLocalTheftReports('Chicago', 'IL', 'Kia', 'Optima')

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('Wrapped result — From body string')
    })
  })

  // ─── Empty / Missing Organic ──────────────────────────────────────────────

  describe('Empty organic array', () => {
    it('returns empty array when organic is empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      })

      const result = await SerpService.fetchLocalTheftReports('Austin', 'TX', 'Ford', 'F-150')
      expect(result).toEqual([])
    })

    it('returns empty array when organic is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const result = await SerpService.fetchLocalTheftReports('Austin', 'TX', 'Ford', 'F-150')
      expect(result).toEqual([])
    })
  })

  // ─── Failsafe: Missing API Key ───────────────────────────────────────────

  describe('Missing API key', () => {
    it('returns empty array without calling fetch', async () => {
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── Failsafe: HTTP Errors ────────────────────────────────────────────────

  describe('HTTP error responses', () => {
    it('returns empty array on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const result = await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')
      expect(result).toEqual([])
    })

    it('returns empty array on 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')
      expect(result).toEqual([])
    })
  })

  // ─── Failsafe: Network Errors ─────────────────────────────────────────────

  describe('Network errors', () => {
    it('returns empty array on fetch rejection', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')
      expect(result).toEqual([])
    })

    it('returns empty array on JSON parse error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token') },
      })

      const result = await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')
      expect(result).toEqual([])
    })
  })

  // ─── Request Construction ─────────────────────────────────────────────────

  describe('Request construction', () => {
    it('sends correct headers and body to Bright Data API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      })

      await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.brightdata.com/request')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer test-serp-key')
      expect(options.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body)
      expect(body.zone).toBe('test_zone')
      expect(body.format).toBe('raw')
      expect(body.data_format).toBe('parsed_light')
      expect(body.url).toContain('google.com/search?q=')
      expect(body.url).toContain('Miami')
      expect(body.url).toContain('FL')
      expect(body.url).toContain('Honda')
      expect(body.url).toContain('Civic')
    })

    it('uses default zone when BRIGHTDATA_SERP_ZONE is not set', async () => {
      delete process.env.BRIGHTDATA_SERP_ZONE
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [] }),
      })

      await SerpService.fetchLocalTheftReports('Miami', 'FL', 'Honda', 'Civic')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.zone).toBe('serp_api1')
    })
  })
})
