// lib/services/risk-engine/agents/2-engine-agent.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'

// --- Internal Types ---

interface EngineData {
  make: string
  cylinders: number | null
  isTurbo: boolean
  isSupercharged: boolean
  fuelTypePrimary: string | null
  fuelTypeSecondary: string | null
  electrificationLevel: string | null
  engineDesc: string | null
}

type ComplexityTier = 'TIER_1_SIMPLE' | 'TIER_2_MODERATE' | 'TIER_3_HIGH'

// --- Constants ---

const LUXURY_COMPLEX_BRANDS = new Set([
  'BMW', 'MERCEDES-BENZ', 'AUDI', 'PORSCHE',
  'LAND ROVER', 'JAGUAR', 'MASERATI', 'ALFA ROMEO',
])

const TURBO_KEYWORDS = ['TURBO', 'ECOBOOST', 'SUPERCHARGED', 'TFSI', 'TSI']

const BASE_SCORES: Record<ComplexityTier, number> = {
  TIER_1_SIMPLE: 15,
  TIER_2_MODERATE: 35,
  TIER_3_HIGH: 55,
}

const FALLBACK_NARRATIVES: Record<RiskLabel, string> = {
  Low: 'Low maintenance liability. The vehicle utilizes a simple naturally aspirated architecture with a proven lifecycle. Maintenance costs will likely remain low despite future mileage accumulation.',
  Medium: 'Moderate powertrain complexity. At this mileage, expect standard higher-cost maintenance like carbon cleaning, turbo seal inspections, or hybrid system checks.',
  High: 'Critical maintenance window. This complex powertrain is currently in or approaching the documented \'Mileage Hump\' where expensive services (e.g., timing chains, air suspension, or major hybrid cooling) are required. Expect elevated repair bills.',
}

// --- Pure Functions ---


/**
 * Detects forced induction from vPIC turbo field or heuristic keyword matching.
 * SUPERCHARGED keyword sets isSupercharged (not isTurbo).
 */
export function detectTurboHeuristic(
  turboField: string | null,
  engineModel: string | null,
  engineDesc: string | null
): { isTurbo: boolean; isSupercharged: boolean } {
  // Check vPIC field first
  if (turboField && turboField.toUpperCase() === 'YES') {
    return { isTurbo: true, isSupercharged: false }
  }

  // Heuristic: scan engineModel and engineDesc for keywords
  const combined = [engineModel ?? '', engineDesc ?? ''].join(' ').toUpperCase()

  if (combined.includes('SUPERCHARGED')) {
    return { isTurbo: false, isSupercharged: true }
  }

  const turboDetected = TURBO_KEYWORDS.some(
    (kw) => kw !== 'SUPERCHARGED' && combined.includes(kw)
  )

  return { isTurbo: turboDetected, isSupercharged: false }
}

/**
 * Extracts and normalizes engine data from the vehicle object.
 * Does NOT mutate the input vehicle.
 */
export function extractEngineData(vehicle: AgentInput['vehicle']): EngineData {
  const parsedCylinders = parseInt(vehicle.engineCylinders ?? '', 10)
  const cylinders = Number.isNaN(parsedCylinders) ? null : parsedCylinders

  const { isTurbo, isSupercharged } = detectTurboHeuristic(
    vehicle.turbo,
    vehicle.engineModel,
    vehicle.engineDesc
  )

  return {
    make: vehicle.make.toUpperCase(),
    cylinders,
    isTurbo,
    isSupercharged,
    fuelTypePrimary: vehicle.fuelTypePrimary,
    fuelTypeSecondary: vehicle.fuelTypeSecondary,
    electrificationLevel: vehicle.electrificationLevel,
    engineDesc: vehicle.engineDesc,
  }
}

/**
 * Sorts listing history by most recent date and returns the first non-null miles.
 * Returns 0 if no mileage data is available.
 * Does NOT mutate the input array.
 *
 * Note: Dates may arrive as ISO strings after Inngest step serialization,
 * so we wrap with `new Date()` to handle both Date objects and strings.
 */
export function extractLatestMileage(
  listingHistory: AgentInput['listingHistory']
): number {
  const sorted = [...listingHistory].sort((a, b) => {
    const rawA = a.lastSeenAt ?? a.statusDate
    const rawB = b.lastSeenAt ?? b.statusDate
    if (!rawA && !rawB) return 0
    if (!rawA) return 1
    if (!rawB) return -1
    return new Date(rawB).getTime() - new Date(rawA).getTime()
  })

  for (const listing of sorted) {
    if (listing.miles !== null && listing.miles !== undefined) {
      return listing.miles
    }
  }

  return 0
}


/**
 * Checks if electrification level indicates PHEV or full EV (not standard hybrid alone).
 */
function isPlugInOrFullEV(electrificationLevel: string | null): boolean {
  if (!electrificationLevel) return false
  const upper = electrificationLevel.toUpperCase()
  return upper.includes('PHEV') || (upper.includes('EV') && !upper.includes('HYBRID'))
}

/**
 * Checks if electrification level indicates a standard hybrid for Toyota/Honda.
 */
function isStandardHybrid(electrificationLevel: string | null, make: string): boolean {
  if (!electrificationLevel) return false
  const upper = electrificationLevel.toUpperCase()
  if (!upper.includes('HYBRID')) return false
  // Exclude PHEV — those are Tier 3
  if (upper.includes('PHEV')) return false
  return make === 'TOYOTA' || make === 'HONDA'
}

/**
 * Classifies the vehicle into a complexity tier based on engine data.
 * Deterministic: same inputs always produce the same tier.
 */
export function classifyTier(data: EngineData, _mileage: number): ComplexityTier {
  const make = data.make.toUpperCase()
  const cyl = data.cylinders

  // Tier 3 checks (highest complexity) — any single condition triggers
  if (LUXURY_COMPLEX_BRANDS.has(make)) return 'TIER_3_HIGH'
  if (data.isSupercharged) return 'TIER_3_HIGH'
  if (data.isTurbo && cyl !== null && cyl >= 6) return 'TIER_3_HIGH'
  if (cyl !== null && cyl >= 8) return 'TIER_3_HIGH'
  if (isPlugInOrFullEV(data.electrificationLevel)) return 'TIER_3_HIGH'

  // Tier 2 checks (moderate complexity)
  if (data.isTurbo && (cyl === null || cyl <= 4)) return 'TIER_2_MODERATE'
  if (!data.isTurbo && !data.isSupercharged && cyl === 6) return 'TIER_2_MODERATE'
  if (isStandardHybrid(data.electrificationLevel, make)) return 'TIER_2_MODERATE'

  // Default: Tier 1 (simple)
  return 'TIER_1_SIMPLE'
}

/**
 * Computes the 0–100 risk score from tier and mileage.
 * Applies mileage-based modifiers targeting the 80k–120k "Hump".
 * Result is capped at 100.
 */
export function computeScore(tier: ComplexityTier, mileage: number): number {
  let score: number

  switch (tier) {
    case 'TIER_1_SIMPLE':
      score = BASE_SCORES.TIER_1_SIMPLE
      if (mileage > 150_000) score += 10
      break
    case 'TIER_2_MODERATE':
      score = BASE_SCORES.TIER_2_MODERATE
      if (mileage >= 80_000 && mileage <= 120_000) score += 25
      else if (mileage > 120_000) score += 15
      break
    case 'TIER_3_HIGH':
      score = BASE_SCORES.TIER_3_HIGH
      if (mileage >= 80_000 && mileage <= 120_000) score += 35
      else if (mileage > 120_000) score += 25
      break
  }

  return Math.min(score, 100)
}

/**
 * Assigns a risk label based on the computed score.
 */
function assignLabel(score: number): RiskLabel {
  if (score <= 30) return 'Low'
  if (score <= 70) return 'Medium'
  return 'High'
}


// --- EngineAgent Class ---

export class EngineAgent implements RiskAgent {
  readonly vectorIndex = 2
  readonly vectorName = 'Powertrain Complexity & Maintenance Liability'
  readonly weight = 0.10

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    const engineData = extractEngineData(input.vehicle)
    const latestMileage = extractLatestMileage(input.listingHistory)
    const tier = classifyTier(engineData, latestMileage)
    const score = computeScore(tier, latestMileage)
    const label = assignLabel(score)

    let narrative: string
    let usedFallbackNarrative = false
    try {
      narrative = await this.generateNarrative(input, engineData, tier, score, label, latestMileage)
    } catch {
      narrative = FALLBACK_NARRATIVES[label]
      usedFallbackNarrative = true
    }

    const findings: string[] = []
    if (LUXURY_COMPLEX_BRANDS.has(engineData.make)) {
      findings.push(`Luxury/complex brand: ${engineData.make}`)
    }
    if (engineData.isTurbo) findings.push('Turbocharged powertrain detected')
    if (engineData.isSupercharged) findings.push('Supercharged powertrain detected')
    if (engineData.cylinders !== null && engineData.cylinders >= 8) {
      findings.push(`High cylinder count: ${engineData.cylinders}`)
    }
    if (latestMileage >= 80_000 && latestMileage <= 120_000) {
      findings.push(`In "The Hump" mileage band: ${latestMileage.toLocaleString()} miles`)
    }
    if (isPlugInOrFullEV(engineData.electrificationLevel)) {
      findings.push('PHEV/EV electrification detected')
    }

    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score,
      label,
      weight: this.weight,
      narrative,
      metadata: {
        tier,
        cylinders: engineData.cylinders,
        isTurbo: engineData.isTurbo,
        isSupercharged: engineData.isSupercharged,
        latestMileage,
        isInHump: latestMileage >= 80_000 && latestMileage <= 120_000,
        usedFallbackNarrative,
        findings,
      },
    }
  }

  private async generateNarrative(
    input: AgentInput,
    engineData: EngineData,
    tier: ComplexityTier,
    score: number,
    label: RiskLabel,
    mileage: number
  ): Promise<string> {
    const config = getAgentConfig('engine')

    const userPrompt = `
Vehicle: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} (VIN: ${input.vehicle.vin})
Trim: ${input.vehicle.trim ?? 'N/A'}
Engine: ${engineData.engineDesc ?? 'Unknown'}
Cylinders: ${engineData.cylinders ?? 'Unknown'}
Turbo: ${engineData.isTurbo ? 'Yes' : 'No'}
Supercharged: ${engineData.isSupercharged ? 'Yes' : 'No'}
Fuel: ${engineData.fuelTypePrimary ?? 'Unknown'}
Electrification: ${engineData.electrificationLevel ?? 'None'}
Current Mileage: ${mileage.toLocaleString()} miles

Complexity Tier: ${tier}
Risk Score: ${score}/100 (${label})
In "The Hump" (80k-120k): ${mileage >= 80_000 && mileage <= 120_000 ? 'Yes' : 'No'}

Write a 2-3 sentence narrative explaining the powertrain complexity and maintenance risk for a used-car buyer.
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
        console.warn('[EngineAgent] Primary LLM failed, trying fallback:', error)
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

    throw new Error('[EngineAgent] All LLM providers failed')
  }
}
