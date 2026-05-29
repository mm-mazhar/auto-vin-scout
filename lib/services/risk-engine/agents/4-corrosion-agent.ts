// lib/services/risk-engine/agents/4-corrosion-agent.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'

// US states and Canadian provinces with heavy road salt usage
const SALT_BELT_STATES: readonly string[] = [
  'CT', 'DE', 'IL', 'IN', 'IA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MO', 'NH', 'NJ', 'NY', 'OH', 'PA', 'RI', 'VT', 'VA', 'WV',
  'WI', 'DC', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'MB', 'SK',
] as const

// US states with extreme UV and heat exposure
const SUN_BELT_STATES: readonly string[] = [
  'FL', 'AZ', 'NV', 'NM', 'TX', 'LA', 'HI', 'UT',
] as const

interface StateClassification {
  saltBeltPercent: number
  sunBeltPercent: number
  uniqueStates: string[]
  validCount: number
}

export class CorrosionAgent implements RiskAgent {
  readonly vectorIndex = 4
  readonly vectorName = 'Regional Corrosion & Environmental Stress'
  readonly weight = 0.05

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    const { listingHistory } = input
    console.log(`[CorrosionAgent] 🔍 Starting: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} | ${listingHistory.length} listings`)

    // Step 1: Classify states
    const classification = this.classifyStates(listingHistory)

    // Step 2: Compute heuristic score
    const { score, label } = this.computeScore(
      classification.saltBeltPercent,
      classification.sunBeltPercent,
      classification.validCount,
    )

    console.log(`[CorrosionAgent] 🎯 Score: ${score} | Label: ${label}`)

    // Step 3: Generate narrative (LLM with deterministic fallback)
    let narrative: string
    let usedFallbackNarrative = false
    try {
      narrative = await this.generateNarrative(score, label, classification)
      console.log('[CorrosionAgent] ✍️  LLM narrative generated successfully')
    } catch {
      narrative = this.generateFallbackNarrative(score, label, classification)
      usedFallbackNarrative = true
      console.log('[CorrosionAgent] ⚠️  Using fallback narrative')
    }

    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score,
      label,
      weight: this.weight,
      narrative,
      metadata: {
        saltBeltPercent: classification.saltBeltPercent,
        sunBeltPercent: classification.sunBeltPercent,
        uniqueStates: classification.uniqueStates,
        validListingCount: classification.validCount,
        totalListingCount: listingHistory.length,
        usedFallbackNarrative,
      },
    }
  }

  private classifyStates(listingHistory: AgentInput['listingHistory']): StateClassification {
    // Filter out null states and normalize to UPPERCASE
    const validStates = listingHistory
      .filter((l) => l.state !== null)
      .map((l) => l.state!.toUpperCase())

    const validCount = validStates.length

    if (validCount === 0) {
      return { saltBeltPercent: 0, sunBeltPercent: 0, uniqueStates: [], validCount: 0 }
    }

    // Count occurrences in each belt
    let saltCount = 0
    let sunCount = 0

    for (const state of validStates) {
      if (SALT_BELT_STATES.includes(state)) saltCount++
      if (SUN_BELT_STATES.includes(state)) sunCount++
    }

    // Calculate percentages (constrained to [0.0, 1.0] by construction)
    const saltBeltPercent = saltCount / validCount
    const sunBeltPercent = sunCount / validCount

    // Deduplicate states
    const uniqueStates = Array.from(new Set(validStates))

    return { saltBeltPercent, sunBeltPercent, uniqueStates, validCount }
  }

  private computeScore(
    saltBeltPercent: number,
    sunBeltPercent: number,
    validCount: number,
  ): { score: number; label: RiskLabel } {
    // No valid data → default LOW
    if (validCount === 0) {
      return { score: 15, label: 'Low' }
    }

    // Tier priority: salt-high → salt-medium → sun-medium → low
    if (saltBeltPercent > 0.60) {
      return { score: 85, label: 'High' }
    }

    if (saltBeltPercent >= 0.25 && saltBeltPercent <= 0.60) {
      return { score: 55, label: 'Medium' }
    }

    if (sunBeltPercent > 0.80) {
      return { score: 45, label: 'Medium' }
    }

    return { score: 15, label: 'Low' }
  }

  private async generateNarrative(
    score: number,
    label: RiskLabel,
    classification: StateClassification,
  ): Promise<string> {
    const config = getAgentConfig('corrosion')

    const userPrompt = `
Salt Belt Exposure: ${Math.round(classification.saltBeltPercent * 100)}%
Sun Belt Exposure: ${Math.round(classification.sunBeltPercent * 100)}%
Unique States: ${classification.uniqueStates.join(', ') || 'None'}
Valid Listing Count: ${classification.validCount}
Risk Score: ${score}/100 (${label})

Write a 2-3 sentence narrative summarizing the regional corrosion and environmental stress assessment for a used-car buyer.
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
        console.warn('[CorrosionAgent] Primary LLM failed, trying fallback:', error)
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

    throw new Error('[CorrosionAgent] All LLM providers failed')
  }

  private generateFallbackNarrative(
    score: number,
    label: RiskLabel,
    classification: StateClassification,
  ): string {
    const { saltBeltPercent, sunBeltPercent, uniqueStates, validCount } = classification

    if (validCount === 0) {
      return `Regional Corrosion & Environmental Stress: ${label} risk (score ${score}/100). No geographic listing data available to assess regional exposure.`
    }

    if (label === 'High') {
      return `Regional Corrosion & Environmental Stress: ${label} risk (score ${score}/100). Vehicle spent ${Math.round(saltBeltPercent * 100)}% of its tracked history in salt belt states (${uniqueStates.join(', ')}), indicating significant road salt corrosion exposure.`
    }

    if (label === 'Medium' && saltBeltPercent >= 0.25) {
      return `Regional Corrosion & Environmental Stress: ${label} risk (score ${score}/100). Vehicle has moderate salt belt exposure (${Math.round(saltBeltPercent * 100)}%) across states: ${uniqueStates.join(', ')}.`
    }

    if (label === 'Medium' && sunBeltPercent > 0.80) {
      return `Regional Corrosion & Environmental Stress: ${label} risk (score ${score}/100). Vehicle spent ${Math.round(sunBeltPercent * 100)}% of its tracked history in sun belt states (${uniqueStates.join(', ')}), indicating significant UV and heat degradation exposure.`
    }

    return `Regional Corrosion & Environmental Stress: ${label} risk (score ${score}/100). No significant regional corrosion or environmental stress indicators detected.`
  }
}
