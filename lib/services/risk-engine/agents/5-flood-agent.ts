// lib/services/risk-engine/agents/5-flood-agent.ts

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'
import type { MaxRainfallData } from '@/lib/services/weather-service'

interface FemaDisaster {
  name: string
  state: string
  year: number
  month: number
}

interface FemaConfig {
  femaDisasters: FemaDisaster[]
}

// Parsed once at module load and cached
let _femaDisasters: FemaDisaster[] | null = null

function loadFemaDisasters(): FemaDisaster[] {
  if (_femaDisasters) return _femaDisasters
  const configPath = path.join(process.cwd(), 'config-fema.yml')
  const raw = fs.readFileSync(configPath, 'utf8')
  const parsed = yaml.load(raw) as FemaConfig
  _femaDisasters = parsed.femaDisasters ?? []
  return _femaDisasters
}

export class FloodAgent implements RiskAgent {
  readonly vectorIndex = 5
  readonly vectorName = 'Geospatial Flood Forensics'
  readonly weight = 0.15

  private weatherData: MaxRainfallData = {
    maxPrecipitationMm: 0,
    maxPrecipitationInches: 0,
    city: null,
    state: null,
    date: null,
  }

  /**
   * Inject weather data before execution.
   * Called by the orchestrator after WeatherService resolves.
   */
  setWeatherData(data: MaxRainfallData): void {
    this.weatherData = data
  }

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    const { listingHistory } = input

    // Derive latest mileage from listing history
    const latestMileage = this.getLatestMileage(listingHistory)

    // Step 1: FEMA heuristic match
    const femaDisasterMatch = this.findFemaMatch(listingHistory)

    // Step 2: Compute heuristic score
    const maxInches = this.weatherData.maxPrecipitationInches
    const { score, label } = this.computeScore(maxInches, femaDisasterMatch, latestMileage, listingHistory.length)

    // Step 3: Generate narrative (LLM with deterministic fallback)
    let narrative: string
    let usedFallbackNarrative = false
    try {
      narrative = await this.generateNarrative(score, label, maxInches, femaDisasterMatch, latestMileage)
    } catch {
      narrative = this.generateFallbackNarrative(label)
      usedFallbackNarrative = true
    }

    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score,
      label,
      weight: this.weight,
      narrative,
      metadata: {
        maxPrecipitationMm: this.weatherData.maxPrecipitationMm,
        maxPrecipitationInches: maxInches,
        rainfallCity: this.weatherData.city,
        rainfallState: this.weatherData.state,
        rainfallDate: this.weatherData.date,
        femaDisasterMatch,
        latestMileage,
        usedFallbackNarrative,
      },
    }
  }

  private getLatestMileage(listingHistory: AgentInput['listingHistory']): number {
    // Find the most recent listing with mileage data
    for (let i = listingHistory.length - 1; i >= 0; i--) {
      if (listingHistory[i].miles != null) {
        return listingHistory[i].miles!
      }
    }
    return 0
  }

  /**
   * Check if any listing's state/year/month matches a known FEMA disaster.
   */
  private findFemaMatch(listingHistory: AgentInput['listingHistory']): string | null {
    const disasters = loadFemaDisasters()

    for (const listing of listingHistory) {
      if (!listing.state) continue

      // Extract year/month from statusDate or lastSeenAt
      const dateSource = listing.statusDate ?? listing.lastSeenAt
      if (!dateSource) continue

      const date = new Date(dateSource)
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // JS months are 0-indexed
      const state = listing.state.toUpperCase()

      for (const disaster of disasters) {
        if (
          disaster.state.toUpperCase() === state &&
          disaster.year === year &&
          disaster.month === month
        ) {
          return disaster.name
        }
      }
    }

    return null
  }

  private computeScore(
    maxInches: number,
    femaMatch: string | null,
    latestMileage: number,
    listingCount: number,
  ): { score: number; label: RiskLabel } {
    // No listing history → default LOW
    if (listingCount === 0) {
      return { score: 15, label: 'Low' }
    }

    // Tier 3 (HIGH): >10 inches OR FEMA match
    if (maxInches > 10 || femaMatch !== null) {
      return { score: 85, label: 'High' }
    }

    // Tier 2 (MEDIUM): 4-10 inches, OR (>2.5 inches AND high mileage)
    if (maxInches >= 4 || (maxInches > 2.5 && latestMileage > 100_000)) {
      return { score: 55, label: 'Medium' }
    }

    // Tier 1 (LOW): <2.5 inches and no FEMA match
    return { score: 15, label: 'Low' }
  }

  private async generateNarrative(
    score: number,
    label: RiskLabel,
    maxInches: number,
    femaMatch: string | null,
    latestMileage: number,
  ): Promise<string> {
    const config = getAgentConfig('flood')

    const userPrompt = `
Max Rainfall: ${maxInches.toFixed(1)} inches
Rainfall Location: ${this.weatherData.city ?? 'Unknown'}, ${this.weatherData.state ?? 'Unknown'}
Rainfall Date: ${this.weatherData.date ?? 'Unknown'}
FEMA Disaster Match: ${femaMatch ?? 'None'}
Latest Mileage: ${latestMileage.toLocaleString()} miles
Risk Score: ${score}/100 (${label})

Write a 2-3 sentence narrative summarizing the flood risk assessment for a used-car buyer.
`.trim()

    // Try primary provider (OpenRouter / OpenAI-compatible)
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (openRouterKey && config.primary.baseUrl) {
      try {
        const client = new OpenAI({
          apiKey: openRouterKey,
          baseURL: config.primary.baseUrl,
        })
        const response = await client.chat.completions.create({
          model: config.primary.model,
          messages: [
            { role: 'system', content: config.systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        })
        const text = response.choices[0]?.message?.content?.trim()
        if (text) return text
      } catch (error) {
        console.warn('[FloodAgent] Primary LLM failed, trying fallback:', error)
      }
    }

    // Try fallback provider (Google GenAI)
    const googleKey = process.env.GOOGLE_API_KEY
    if (googleKey) {
      const ai = new GoogleGenAI({ apiKey: googleKey })
      const response = await ai.models.generateContent({
        model: config.fallback.model,
        contents: userPrompt,
        config: {
          systemInstruction: config.systemInstruction,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        },
      })
      const text = response.text?.trim()
      if (text) return text
    }

    throw new Error('[FloodAgent] All LLM providers failed')
  }

  private generateFallbackNarrative(label: RiskLabel): string {
    switch (label) {
      case 'Low':
        return 'Zero flood overlap. Lifetime location trail shows no presence in declared FEMA disaster zones or extreme precipitation events during the vehicle\'s tracked lifespan.'
      case 'Medium':
        return 'Moderate exposure risk. The vehicle was listed in an area that experienced significant rainfall during its listing window. A mechanic should inspect the lower seat-rails and carpets for silt or oxidation indicating water intrusion.'
      case 'High':
        return 'SEVERE SUBMERSION PROBABILITY: Geospatial forensics place this vehicle directly in a high-risk zone during an extreme precipitation event or known FEMA disaster. There is a high probability of unreported flood damage and terminal electrical failures.'
    }
  }
}
