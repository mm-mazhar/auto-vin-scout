// tests/unit/risk-engine/serp-price-prediction.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// --- Mock global fetch ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { SerpService } from '@/lib/services/serp-service'

// Static mock SERP response matching Bright Data's full JSON format
const MOCK_SERP_RESPONSE = {
  ai_overview: {
    texts: [
      { text: 'The average price of a used 2019 Honda Civic ranges from $18,000 to $23,000 depending on mileage and trim.' },
      { snippet: 'Factors affecting price include mileage, accident history, and regional demand.' },
    ],
  },
  featured_snippets: [
    { description: 'A 2019 Honda Civic LX with 50k miles typically sells for $19,500 in the US market.' },
  ],
  organic: [
    { title: 'KBB Price Guide', description: '2019 Honda Civic fair market range: $17,800 - $22,400 based on condition.' },
    { title: 'Edmunds Valuation', description: 'Trade-in value averages $16,200; private party sale averages $19,800.' },
    { title: 'CarGurus Analysis', description: 'Great deal threshold is below $18,000 for this model year.' },
    { title: 'Extra result', description: 'This should not be included (only top 3 organic).' },
  ],
}

describe('SerpService – fetchPricePrediction()', () => {
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
    it('extracts and combines AI overview, featured snippets, and top 3 organic results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_SERP_RESPONSE,
      })

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')

      expect(result).not.toBeNull()
      // AI overview texts
      expect(result).toContain('$18,000 to $23,000')
      expect(result).toContain('Factors affecting price')
      // Featured snippet
      expect(result).toContain('$19,500 in the US market')
      // Top 3 organic descriptions
      expect(result).toContain('$17,800 - $22,400')
      expect(result).toContain('Trade-in value')
      expect(result).toContain('Great deal threshold')
      // Should NOT include the 4th organic result
      expect(result).not.toContain('This should not be included')
    })

    it('returns text from AI overview only when no featured snippets or organic', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ai_overview: {
            texts: [{ text: 'Price estimate: $20,000' }],
          },
        }),
      })

      const result = await SerpService.fetchPricePrediction(2020, 'Toyota', 'Camry')

      expect(result).toBe('Price estimate: $20,000')
    })

    it('returns organic descriptions as fallback when no AI overview or snippets', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          organic: [
            { title: 'Result 1', description: 'Fallback description 1' },
            { title: 'Result 2', description: 'Fallback description 2' },
          ],
        }),
      })

      const result = await SerpService.fetchPricePrediction(2018, 'Ford', 'F-150')

      expect(result).toContain('Fallback description 1')
      expect(result).toContain('Fallback description 2')
    })
  })

  // ─── Stringified Body Wrapper ─────────────────────────────────────────────

  describe('Response wrapped in stringified body property', () => {
    it('parses the body string and extracts price data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          body: JSON.stringify({
            ai_overview: {
              texts: [{ text: 'Wrapped: price is $15,000' }],
            },
          }),
        }),
      })

      const result = await SerpService.fetchPricePrediction(2017, 'Chevrolet', 'Silverado')

      expect(result).toContain('Wrapped: price is $15,000')
    })
  })

  // ─── Empty / No Data ──────────────────────────────────────────────────────

  describe('No usable data in response', () => {
    it('returns null when response has no AI overview, snippets, or organic', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')
      expect(result).toBeNull()
    })

    it('returns null when all arrays are empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ai_overview: { texts: [] },
          featured_snippets: [],
          organic: [],
        }),
      })

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')
      expect(result).toBeNull()
    })
  })

  // ─── Failsafe: Missing API Key ───────────────────────────────────────────

  describe('Missing API key', () => {
    it('returns null without calling fetch', async () => {
      delete process.env.BRIGHTDATA_SERP_API_KEY

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── Failsafe: HTTP Errors ────────────────────────────────────────────────

  describe('HTTP error responses', () => {
    it('returns null on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')
      expect(result).toBeNull()
    })

    it('returns null on 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')
      expect(result).toBeNull()
    })
  })

  // ─── Failsafe: Network Errors ─────────────────────────────────────────────

  describe('Network errors', () => {
    it('returns null on fetch rejection', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')
      expect(result).toBeNull()
    })

    it('returns null on JSON parse error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token') },
      })

      const result = await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')
      expect(result).toBeNull()
    })
  })

  // ─── Request Construction ─────────────────────────────────────────────────

  describe('Request construction', () => {
    it('sends correct headers and body with format: json', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [{ description: 'test' }] }),
      })

      await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.brightdata.com/request')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer test-serp-key')
      expect(options.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body)
      expect(body.zone).toBe('test_zone')
      expect(body.format).toBe('json')
      // Should NOT have data_format (unlike theft reports)
      expect(body.data_format).toBeUndefined()
      expect(body.url).toContain('google.com/search?q=')
      expect(body.url).toContain('Honda')
      expect(body.url).toContain('Civic')
      expect(body.url).toContain('2019')
      expect(body.url).toContain('used')
    })

    it('uses default zone when BRIGHTDATA_SERP_ZONE is not set', async () => {
      delete process.env.BRIGHTDATA_SERP_ZONE
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [{ description: 'test' }] }),
      })

      await SerpService.fetchPricePrediction(2019, 'Honda', 'Civic')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.zone).toBe('serp_api1')
    })

    it('constructs the correct search query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ organic: [{ description: 'test' }] }),
      })

      await SerpService.fetchPricePrediction(2021, 'Toyota', 'Camry')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const decodedUrl = decodeURIComponent(body.url)
      expect(decodedUrl).toContain('predict price of Toyota Camry 2021 used in usa')
    })
  })
})
