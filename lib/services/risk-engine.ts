// lib/services/risk-engine.ts

import OpenAI from 'openai'
import prisma from '@/app/lib/db'
import { GoogleGenAI } from '@google/genai'
import {
  getFallbackLLMConfig,
  getLLMSettings,
  getPrimaryLLMConfig,
  getSystemInstruction,
} from '@/lib/ai-config'

export class RiskEngineService {
  static async generateRiskAssessment(reportId: string): Promise<void> {
    try {
      // Step 2a — Data Retrieval
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { vehicle: true },
      })

      if (!report) {
        console.error(`[RiskEngine] Report ${reportId} not found. Skipping.`)
        return
      }

      if (!report.vehicle) {
        console.error(
          `[RiskEngine] Report ${reportId} has no associated vehicle. Skipping.`
        )
        return
      }

      const vehicle = report.vehicle

      // Step 2b — Risk Scoring (Phase 1 MVP — partially simulated)
      let riskScore = 10
      const currentYear = new Date().getFullYear()

      // Rule 1: Vehicle Age
      const vehicleAge = currentYear - vehicle.year
      if (vehicleAge > 10) {
        riskScore += 15
      }

      // Rule 2: Open Safety Recalls (simulated)
      const hasOpenRecalls = Math.random() > 0.5
      if (hasOpenRecalls) {
        riskScore += 30
      }

      // Rule 3: Market Price Anomalies (simulated)
      const hasPriceAnomalies = Math.random() > 0.7
      if (hasPriceAnomalies) {
        riskScore += 25
      }

      // ─── ADD NEW SCORING RULES HERE ──────────────────────────────────────────
      // When adding a new data feature (e.g. recalls, flood zones, crash ratings):
      // 1. Fetch the data from the report or a new DB/API call
      // 2. Add a scoring rule below following the same pattern
      // 3. Define a variable (e.g. recallCount, floodZone) to pass into the prompt
      //
      // Example:
      //   const recallCount = report.recallData?.openRecalls ?? 0
      //   if (recallCount > 0) riskScore += recallCount * 10
      // ─────────────────────────────────────────────────────────────────────────

      // Cap at 100
      riskScore = Math.min(riskScore, 100)

      const riskLabel =
        riskScore <= 30 ? 'Low' : riskScore <= 60 ? 'Moderate' : 'High'

      // Step 2c — AI Narrative Generation
      const primary = getPrimaryLLMConfig()
      const fallback = getFallbackLLMConfig()
      const settings = getLLMSettings()
      const systemInstruction = getSystemInstruction()

      const userPrompt = `
Vehicle Details:
- VIN: ${vehicle.vin}
- Make: ${vehicle.make}
- Model: ${vehicle.model}
- Year: ${vehicle.year} (Age: ${vehicleAge} years)
- Trim: ${vehicle.trim || 'N/A'}
- Engine: ${vehicle.engine || 'N/A'}
- Drive Type: ${vehicle.driveType || 'N/A'}
- Fuel Type: ${vehicle.fuelTypePrimary || 'N/A'}
- Vehicle Type: ${vehicle.vehicleType || 'N/A'}
- Manufacturer: ${vehicle.manufacturer || 'N/A'}
- Plant Location: ${[vehicle.plantCity, vehicle.plantCountry].filter(Boolean).join(', ') || 'N/A'}
- Data Source: ${vehicle.decoderSource}
${vehicle.decoderSource === 'MARKETCHECK' ? `
Premium Specifications (confirmed via MarketCheck):
- Transmission: ${vehicle.transmission || 'N/A'}
- Powertrain Type: ${vehicle.powertrainType || 'N/A'}
- Engine Size: ${vehicle.engineSize != null ? `${vehicle.engineSize}L` : 'N/A'}
- Cylinders: ${vehicle.cylinders ?? 'N/A'}
- Body Subtype: ${vehicle.bodySubtype || 'N/A'}
- Doors: ${vehicle.doors ?? 'N/A'}
- Standard Seating: ${vehicle.stdSeating ?? 'N/A'}
- Highway MPG: ${vehicle.highwayMpg != null ? `${vehicle.highwayMpg} MPG` : 'N/A'}
- City MPG: ${vehicle.cityMpg != null ? `${vehicle.cityMpg} MPG` : 'N/A'}
- Dimensions (L×W×H): ${[vehicle.overallLength, vehicle.overallWidth, vehicle.overallHeight].map(v => v != null ? `${v}"` : 'N/A').join(' × ')}
` : `
Premium Specifications: unavailable (NHTSA decode only — transmission, MPG, dimensions not retrieved)
`}
Risk Factor Data:
- Vehicle Age Risk: ${vehicleAge} years old → ${vehicleAge > 15 ? 'HIGH' : vehicleAge > 10 ? 'MODERATE' : vehicleAge > 5 ? 'LOW-MODERATE' : 'LOW'}
- Open Safety Recalls: ${hasOpenRecalls ? 'Yes (simulated — real NHTSA data unavailable)' : 'None detected (simulated — verify independently at nhtsa.gov)'}
- Market Price Anomalies: ${hasPriceAnomalies ? 'Detected (simulated — verify against local listings)' : 'None detected (simulated)'}
- Flood/Environmental Risk: unavailable — no location data provided for this report
- Crash Test Ratings: unavailable — NHTSA ratings not retrieved for this vehicle
- Historical Claim Data: unavailable — not in current data set
// ADD NEW DATA FIELDS HERE when a feature is implemented
// Pattern: "- <Label>: \${variable} (<real|simulated|unavailable>)"
// Example when recalls are real: "- Open Recalls: \${recallCount} open recalls (confirmed via NHTSA)"

DATA COMPLETENESS SUMMARY:
- Real data available: VIN decode (make/model/year/engine)${vehicle.decoderSource === 'MARKETCHECK' ? ', premium specs (transmission/MPG/dimensions)' : ''}
- Simulated data: recalls, price anomalies
- Unavailable data: flood zone, crash ratings, historical claims${vehicle.decoderSource !== 'MARKETCHECK' ? ', premium specs' : ''}
// UPDATE completeness summary above when new data sources are added

Pre-calculated Risk Score: ${riskScore}/100 (${riskLabel} Risk)
Score breakdown:
- Age component (weight 0.25): ${vehicleAge > 10 ? 'elevated' : 'low'}
- Recall component (weight 0.20): ${hasOpenRecalls ? 'elevated (simulated)' : 'low (simulated)'}
- Price anomaly component (weight 0.20): ${hasPriceAnomalies ? 'elevated (simulated)' : 'low (simulated)'}
- Flood/environmental component (weight 0.35): conservative default applied (data unavailable)

Generate a concise 3-bullet risk narrative for a used-car buyer. Each bullet should:
1. Start with a bullet point (•)
2. Be actionable and specific to this vehicle
3. Clearly distinguish between confirmed data, simulated data, and unavailable data
4. If key data was unavailable, tell the buyer what to check and where
5. When premium specs are available, use them to add specific mechanical context (e.g. engine size, MPG, transmission type)

Format: Return only the 3 bullets, one per line, starting with •
`.trim()

      async function generateNarrative(): Promise<string> {
        // Try primary provider (OpenRouter)
        const openRouterKey = process.env.OPENROUTER_API_KEY
        if (openRouterKey) {
          try {
            const client = new OpenAI({
              apiKey: openRouterKey,
              baseURL: primary.baseUrl,
            })
            const response = await client.chat.completions.create({
              model: primary.model,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.7,
              max_tokens: 500,
            })
            const text = response.choices[0]?.message?.content?.trim()
            if (text) return text
            throw new Error('Primary LLM returned empty output')
          } catch (error) {
            console.warn('[RiskEngine] Primary LLM failed, trying fallback:', error)
          }
        }

        // Try fallback provider (Google Gemini)
        const googleKey = process.env.GOOGLE_API_KEY
        if (googleKey) {
          try {
            const ai = new GoogleGenAI({ apiKey: googleKey })
            const response = await ai.models.generateContent({
              model: fallback.model,
              contents: userPrompt,
              config: {
                systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 500,
              }
            })
            const text = response.text?.trim()
            if (text) return text
            throw new Error('Fallback LLM returned empty output')
          } catch (error) {
            console.warn(
              '[RiskEngine] Fallback LLM failed, using rules-based narrative:',
              error
            )
          }
        }

        // If we reach here, both providers failed
        throw new Error('All LLM providers failed')
      }

      let isAiFallback = false
      let riskNarrative: string

      try {
        riskNarrative = await generateNarrative()
      } catch (error) {
        console.warn('[RiskEngine] All LLM providers failed, using fallback narrative')
        isAiFallback = true
        // Fallback to rules-based narrative
        // ─── KEEP THIS IN SYNC with new scoring rules above ──────────────────
        // When you add a new data feature, add a corresponding bullet here too
        // so the fallback narrative reflects the same data the LLM would use.
        // ─────────────────────────────────────────────────────────────────────
        riskNarrative = [
          `• Vehicle age is ${vehicleAge} years, so inspect wear-related items carefully before purchase.`,
          hasOpenRecalls
            ? '• Recall signals were detected (simulated — verify independently) with a dealer before buying.'
            : '• No recall signals were detected in the simulated check, but confirm recalls independently before buying.',
          hasPriceAnomalies
            ? '• Pricing signals look unusual (simulated — verify independently), so compare this VIN against local listings and ask why it is priced differently.'
            : '• Compare this vehicle with local listings to confirm the asking price is reasonable for its age and configuration.',
        ].join('\n')
      }

      // Step 2d — Database Update (Success)
      await prisma.report.update({
        where: { id: reportId },
        data: {
          riskScore,
          riskLabel,
          riskNarrative,
          isAiFallback,
          status: 'COMPLETED',
        },
      })
    } catch (error) {
      console.error(`[RiskEngine] Failed for report ${reportId}:`, error)
      // Attempt to mark the report as failed — use .catch() so a DB error
      // here doesn't mask the original error in logs
      await prisma.report
        .update({
          where: { id: reportId },
          data: { status: 'FAILED' },
        })
        .catch((dbErr) =>
          console.error(
            `[RiskEngine] Could not mark report ${reportId} as FAILED:`,
            dbErr
          )
        )
    }
  }
}
