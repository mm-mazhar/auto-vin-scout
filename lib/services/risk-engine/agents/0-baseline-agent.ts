// lib/services/risk-engine/agents/0-baseline-agent.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'

export class BaselineAgent implements RiskAgent {
  readonly vectorIndex = 0
  readonly vectorName = 'Baseline Health & Market Anomalies'
  readonly weight = 0.20

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    const { vehicle, recalls, listingHistory } = input
    let score = 0
    const findings: string[] = []

    // --- Vehicle Age ---
    const currentYear = new Date().getFullYear()
    const vehicleAge = currentYear - vehicle.year
    if (vehicleAge > 10) {
      score += 15
      findings.push(`Vehicle is ${vehicleAge} years old (elevated age risk)`)
    }

    // --- Odometer Rollback Detection ---
    // Listings are sorted ascending by statusDate.
    // A rollback = any listing where miles < a chronologically earlier listing's miles.
    let rollbackDetected = false
    const listingsWithMiles = listingHistory.filter((l) => l.miles !== null)

    for (let i = 1; i < listingsWithMiles.length; i++) {
      const prev = listingsWithMiles[i - 1].miles!
      const curr = listingsWithMiles[i].miles!
      if (curr < prev) {
        rollbackDetected = true
        findings.push(
          `Odometer rollback detected: ${prev.toLocaleString()} mi → ${curr.toLocaleString()} mi`
        )
        break
      }
    }

    if (rollbackDetected) {
      score = Math.max(score, 85)
    }

    // --- Fire-Sale Detection ---
    // >30% price drop between consecutive listings
    const listingsWithPrice = listingHistory.filter((l) => l.price !== null)

    for (let i = 1; i < listingsWithPrice.length; i++) {
      const prevPrice = listingsWithPrice[i - 1].price!
      const currPrice = listingsWithPrice[i].price!
      if (prevPrice > 0 && currPrice < prevPrice * 0.7) {
        score += 30
        findings.push(
          `Fire-sale pricing: $${prevPrice.toLocaleString()} → $${currPrice.toLocaleString()} (${Math.round((1 - currPrice / prevPrice) * 100)}% drop)`
        )
        break
      }
    }

    // --- Recall Impact ---
    // +10 per recall, with mileage multiplier for old high-mileage vehicles
    const recallCount = recalls.length
    const latestMiles = listingsWithMiles.length > 0
      ? listingsWithMiles[listingsWithMiles.length - 1].miles!
      : null

    let recallScore = recallCount * 10
    // Mileage multiplier: recalls on old high-mileage cars compound risk
    if (vehicleAge > 10 && latestMiles !== null && latestMiles > 150_000) {
      recallScore = Math.round(recallScore * 1.5)
    }
    score += recallScore
    if (recallCount > 0) {
      const multiplierNote = (vehicleAge > 10 && latestMiles !== null && latestMiles > 150_000)
        ? ' (1.5x multiplier: high-mileage aged vehicle)'
        : ''
      findings.push(`${recallCount} NHTSA recall(s) on record${multiplierNote}`)
    }

    // --- Usage Intensity Detection (Tiered) ---
    // Replaces the old binary 25k check with granular intensity bands
    type UsageIntensityBand = 'Low' | 'Standard' | 'Elevated' | 'High'
    let usageIntensityBand: UsageIntensityBand = 'Standard'
    let avgAnnualMiles = 0

    if (listingsWithMiles.length >= 2) {
      const first = listingsWithMiles[0]
      const last = listingsWithMiles[listingsWithMiles.length - 1]
      const firstDate = first.statusDate ?? first.firstSeenAt
      const lastDate = last.statusDate ?? last.lastSeenAt

      if (firstDate && lastDate && first.miles !== null && last.miles !== null) {
        const yearSpan =
          (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        if (yearSpan > 0.5) {
          avgAnnualMiles = (last.miles - first.miles) / yearSpan

          if (avgAnnualMiles > 25_000) {
            usageIntensityBand = 'High'
            score += 25
            findings.push(
              `High usage intensity: ~${Math.round(avgAnnualMiles).toLocaleString()} mi/yr (likely commercial/rideshare use)`
            )
          } else if (avgAnnualMiles > 15_000) {
            usageIntensityBand = 'Elevated'
            score += 10
            findings.push(
              `Elevated usage: ~${Math.round(avgAnnualMiles).toLocaleString()} mi/yr (above-average wear)`
            )
          } else if (avgAnnualMiles < 8_000) {
            usageIntensityBand = 'Low'
            // Low mileage on old cars = idle risk (dry-rot, stale fluids)
            if (vehicleAge > 8) {
              score += 5
              findings.push(
                `Unusually low usage (~${Math.round(avgAnnualMiles).toLocaleString()} mi/yr) on a ${vehicleAge}-year-old vehicle — inspect seals, belts, and fluid condition for age-related degradation`
              )
            }
          }
          // 'Standard' (8k-15k) adds no points
        }
      }
    }

    // --- Rollback + High Mileage Compound ---
    // Fraud on a high-mileage car is worse — hidden miles are the hardest miles
    if (rollbackDetected && latestMiles !== null && latestMiles > 80_000) {
      score = Math.max(score, 95)
    }

    // --- Days on Market (DOM) Analysis ---
    // High DOM signals stale inventory — possible hidden issue or overpricing
    const domValues = listingHistory
      .map((l) => l.dom)
      .filter((d): d is number => d !== null && d > 0)

    let avgDom = 0
    if (domValues.length > 0) {
      avgDom = Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
      if (avgDom > 200) {
        score += 10
        findings.push(
          `High days on market: avg ${avgDom} days across ${domValues.length} listing(s) — stale inventory may indicate hidden issues`
        )
      }
    }

    // --- Repeated Price Cuts ---
    // 3+ distinct price drops signal seller desperation
    let priceCutCount = 0
    for (let i = 1; i < listingsWithPrice.length; i++) {
      if (listingsWithPrice[i].price! < listingsWithPrice[i - 1].price!) {
        priceCutCount++
      }
    }
    if (priceCutCount >= 3) {
      score += 5
      findings.push(
        `Price reduced ${priceCutCount} times across listing history — seller likely motivated`
      )
    }

    // --- Geographic Spread ---
    // Multi-state movement is a strong auction-flipping indicator
    const states = new Set(
      listingHistory.map((l) => l.state).filter((s): s is string => s !== null)
    )
    const withCoords = listingHistory.filter(
      (l) => l.latitude !== null && l.longitude !== null
    )
    let maxDistanceMiles = 0
    if (withCoords.length >= 2) {
      for (let i = 0; i < withCoords.length; i++) {
        for (let j = i + 1; j < withCoords.length; j++) {
          const d = this.haversineDistance(
            withCoords[i].latitude!,
            withCoords[i].longitude!,
            withCoords[j].latitude!,
            withCoords[j].longitude!
          )
          if (d > maxDistanceMiles) maxDistanceMiles = d
        }
      }
    }
    if (states.size >= 3 || maxDistanceMiles > 500) {
      score += 15
      const detail = maxDistanceMiles > 500
        ? `spread across ${Math.round(maxDistanceMiles).toLocaleString()} miles`
        : `listed in ${states.size} states`
      findings.push(
        `Geographic spread detected: ${detail} (${Array.from(states).join(', ')}) — possible auction flipping or title washing`
      )
    }

    // --- Listing Freshness / Gap Detection ---
    // A car that disappears for 180+ days and reappears is suspicious
    // Requires 3+ date points to detect a gap (2 points is just the tracking span)
    const allDates = listingHistory
      .flatMap((l) => [l.firstSeenAt, l.lastSeenAt, l.statusDate])
      .filter((d): d is Date => d !== null)
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b)

    if (allDates.length >= 3) {
      let maxGapDays = 0
      for (let i = 1; i < allDates.length; i++) {
        const gapDays = (allDates[i] - allDates[i - 1]) / (24 * 60 * 60 * 1000)
        if (gapDays > maxGapDays) maxGapDays = gapDays
      }
      if (maxGapDays > 180) {
        score += 10
        findings.push(
          `Listing gap of ${Math.round(maxGapDays)} days detected — vehicle disappeared and reappeared (possible title wash or repair flip)`
        )
      }
    }

    // --- Cap at 100 ---
    score = Math.min(score, 100)

    // --- Label ---
    const label: RiskLabel =
      score <= 30 ? 'Low' : score <= 70 ? 'Medium' : 'High'

    // --- Narrative (LLM with fallback) ---
    let narrative: string
    let usedFallbackNarrative = false
    try {
      narrative = await this.generateNarrative(input, score, label, findings)
    } catch {
      narrative = this.generateFallbackNarrative(score, label, findings, input)
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
        vehicleAge,
        rollbackDetected,
        recallCount,
        listingCount: listingHistory.length,
        usageIntensity: {
          band: usageIntensityBand,
          milesPerYear: Math.round(avgAnnualMiles),
        },
        daysOnMarket: avgDom > 0 ? { avg: avgDom, count: domValues.length } : null,
        priceCutCount,
        geoSpread: {
          stateCount: states.size,
          maxDistanceMiles: Math.round(maxDistanceMiles),
        },
        usedFallbackNarrative,
        findings,
      },
    }
  }

  private async generateNarrative(
    input: AgentInput,
    score: number,
    label: RiskLabel,
    findings: string[]
  ): Promise<string> {
    const config = getAgentConfig('baseline')

    const userPrompt = `
Vehicle: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} (VIN: ${input.vehicle.vin})
Baseline Risk Score: ${score}/100 (${label})
Listing History Records: ${input.listingHistory.length}
Recalls: ${input.recalls.length}

Findings:
${findings.length > 0 ? findings.map((f) => `- ${f}`).join('\n') : '- No significant anomalies detected'}

Write a 2-3 sentence narrative summarizing the baseline health assessment for a used-car buyer.
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
        console.warn('[BaselineAgent] Primary LLM failed, trying fallback:', error)
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

    throw new Error('[BaselineAgent] All LLM providers failed')
  }

  private generateFallbackNarrative(
    score: number,
    label: RiskLabel,
    findings: string[],
    input: AgentInput
  ): string {
    if (findings.length === 0) {
      return `Baseline Health assessment: ${label} risk (score ${score}/100). No significant market anomalies detected in available listing history.`
    }
    return `Baseline Health assessment: ${label} risk (score ${score}/100). Findings: ${findings.join('. ')}.`
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8 // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
