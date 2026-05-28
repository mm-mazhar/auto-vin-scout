// lib/services/serp-service.ts

interface SerpOrganicResult {
  title?: string
  description?: string
  link?: string
}

interface SerpAiOverviewText {
  text?: string
  snippet?: string
}

interface SerpFeaturedSnippet {
  description?: string
  title?: string
}

interface SerpResponse {
  organic?: SerpOrganicResult[]
  ai_overview?: {
    texts?: SerpAiOverviewText[]
  }
  featured_snippets?: SerpFeaturedSnippet[]
}

/**
 * Fetches local theft/crime reports from Bright Data SERP API.
 * Returns an array of combined title+description strings from organic results.
 * On failure or missing API key, returns [] so the pipeline never crashes.
 */
export class SerpService {
  static async fetchLocalTheftReports(
    city: string,
    state: string,
    make: string,
    model: string
  ): Promise<string[]> {
    const apiKey = process.env.BRIGHTDATA_SERP_API_KEY
    if (!apiKey) {
      console.warn('[SerpService] BRIGHTDATA_SERP_API_KEY not set, skipping SERP fetch.')
      return []
    }

    try {
      const year = new Date().getFullYear()
      const query = `site:reddit.com OR site:nextdoor.com "${city}, ${state}" "${make} ${model}" stolen OR theft ${year}`
      const zone = process.env.BRIGHTDATA_SERP_ZONE || 'serp_api1'

      const response = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          format: 'raw',
          data_format: 'parsed_light',
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        console.warn(`[SerpService] API returned ${response.status}: ${response.statusText}`)
        return []
      }

      const rawBody = await response.json()

      // Handle case where response may be wrapped in a stringified `body` property
      let parsed: SerpResponse
      if (typeof rawBody === 'string') {
        parsed = JSON.parse(rawBody) as SerpResponse
      } else if (typeof rawBody?.body === 'string') {
        parsed = JSON.parse(rawBody.body) as SerpResponse
      } else {
        parsed = rawBody as SerpResponse
      }

      const organic = parsed.organic ?? []

      return organic.map((result) => {
        const parts = [result.title, result.description].filter(Boolean)
        return parts.join(' — ')
      })
    } catch (error) {
      console.warn('[SerpService] Failed to fetch local theft reports:', error)
      return []
    }
  }

  /**
   * Fetches price prediction data from Bright Data SERP API using Google's
   * AI Overview and Featured Snippets for real-time used car valuation.
   * Returns combined raw text or null on failure.
   */
  static async fetchPricePrediction(
    year: number,
    make: string,
    model: string
  ): Promise<string | null> {
    const apiKey = process.env.BRIGHTDATA_SERP_API_KEY
    if (!apiKey) {
      console.warn('[SerpService] BRIGHTDATA_SERP_API_KEY not set, skipping price prediction fetch.')
      return null
    }

    try {
      const query = `predict price of ${make} ${model} ${year} used in usa`
      const zone = process.env.BRIGHTDATA_SERP_ZONE || 'serp_api1'

      const response = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          format: 'json',
        }),
        signal: AbortSignal.timeout(15_000),
      })

      if (!response.ok) {
        console.warn(`[SerpService] Price prediction API returned ${response.status}: ${response.statusText}`)
        return null
      }

      const rawBody = await response.json()

      // Handle stringified body if necessary
      let parsed: SerpResponse
      if (typeof rawBody === 'string') {
        parsed = JSON.parse(rawBody) as SerpResponse
      } else if (typeof rawBody?.body === 'string') {
        parsed = JSON.parse(rawBody.body) as SerpResponse
      } else {
        parsed = rawBody as SerpResponse
      }

      const textParts: string[] = []

      // Extract AI Overview texts
      const aiOverviewTexts = parsed.ai_overview?.texts ?? []
      for (const item of aiOverviewTexts) {
        const text = item.text || item.snippet
        if (text) textParts.push(text)
      }

      // Extract Featured Snippets
      const featuredSnippets = parsed.featured_snippets ?? []
      for (const snippet of featuredSnippets) {
        if (snippet.description) textParts.push(snippet.description)
      }

      // Fallback: top 3 organic result descriptions
      const organic = parsed.organic ?? []
      const topOrganic = organic.slice(0, 3)
      for (const result of topOrganic) {
        if (result.description) textParts.push(result.description)
      }

      if (textParts.length === 0) {
        console.warn('[SerpService] No price prediction data found in SERP response.')
        return null
      }

      // Strip web scraping artifacts (Read more, See more, Learn more, etc.)
      const cleaned = textParts
        .map((text) => text.replace(/\.{0,3}\s*Read more\s*/gi, '. ').replace(/\.{0,3}\s*See more\s*/gi, '. ').replace(/\.{0,3}\s*Learn more\s*/gi, '. ').replace(/\.\s*\.\s*/g, '. ').trim())
        .filter((text) => text.length > 0)

      if (cleaned.length === 0) {
        console.warn('[SerpService] No price prediction data after cleaning.')
        return null
      }

      return cleaned.join('\n\n')
    } catch (error) {
      console.warn('[SerpService] Failed to fetch price prediction:', error)
      return null
    }
  }
}
