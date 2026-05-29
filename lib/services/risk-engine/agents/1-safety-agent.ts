// lib/services/risk-engine/agents/1-safety-agent.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'
import type { VehicleSafetyRating } from '@prisma/client'

export class SafetyAgent implements RiskAgent {
  readonly vectorIndex = 1
  readonly vectorName = 'NHTSA Safety Ratings'
  readonly weight = 0.10

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    const { safetyRating } = input
    console.log(`[SafetyAgent] 🔍 Starting: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`)

    const overallRating = safetyRating?.overallRating ?? null
    const { score, label } = this.computeScore(overallRating)
    console.log(`[SafetyAgent] 🎯 Score: ${score} | Label: ${label}`)

    let narrative: string
    let usedFallbackNarrative = false
    try {
      narrative = await this.generateNarrative(input, score, label, safetyRating)
      console.log('[SafetyAgent] ✍️  LLM narrative generated successfully')
    } catch {
      narrative = this.generateFallbackNarrative(score, label)
      usedFallbackNarrative = true
      console.log('[SafetyAgent] ⚠️  Using fallback narrative')
    }

    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score,
      label,
      weight: this.weight,
      narrative,
      metadata: {
        usedFallbackNarrative,
        overallRating,
        nhtsaVehicleId: safetyRating?.nhtsaVehicleId ?? null,
      },
    }
  }

  private computeScore(overallRating: string | null): { score: number; label: RiskLabel } {
    switch (overallRating) {
      case '5':
        return { score: 15, label: 'Low' }
      case '4':
        return { score: 50, label: 'Medium' }
      case '3':
      case '2':
      case '1':
        return { score: 85, label: 'High' }
      case 'Not Rated':
      case null:
      default:
        return { score: 75, label: 'High' }
    }
  }

  private async generateNarrative(
    input: AgentInput,
    score: number,
    label: RiskLabel,
    safetyRating: VehicleSafetyRating | null
  ): Promise<string> {
    const config = getAgentConfig('safety')

    const userPrompt = `
Vehicle: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} (VIN: ${input.vehicle.vin})
Safety Risk Score: ${score}/100 (${label})

NHTSA Safety Ratings:
- Overall Rating: ${safetyRating?.overallRating ?? 'Not Rated'}
- Frontal Crash Rating: ${safetyRating?.overallFrontCrashRating ?? 'Not Rated'}
- Side Crash Rating: ${safetyRating?.overallSideCrashRating ?? 'Not Rated'}
- Rollover Rating: ${safetyRating?.rolloverRating ?? 'Not Rated'}

Write a 2-3 sentence narrative summarizing the safety assessment for a used-car buyer.
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
        console.warn('[SafetyAgent] Primary LLM failed, trying fallback:', error)
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

    throw new Error('[SafetyAgent] All LLM providers failed')
  }

  private generateFallbackNarrative(score: number, label: RiskLabel): string {
    switch (label) {
      case 'Low':
        return 'Elite protection. This vehicle holds a 5-star NHTSA rating. Even at its current mileage, this chassis remains one of the safest configurations on the road.'
      case 'Medium':
        return 'Acceptable safety profile. Holds a 4-star overall rating. Cabin integrity is standard for the class.'
      case 'High':
        return 'Critical safety concern. This model carries a 3-star or lower NHTSA rating, indicating elevated risk in frontal and side-impact collisions.'
    }
  }
}
