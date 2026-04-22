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
- Year: ${vehicle.year}
- Trim: ${vehicle.trim || 'N/A'}
- Engine: ${vehicle.engine || 'N/A'}
- Drive Type: ${vehicle.driveType || 'N/A'}

Risk Assessment:
- Risk Score: ${riskScore}/100
- Risk Label: ${riskLabel}
- Vehicle Age: ${vehicleAge} years
- Open Recalls Detected: ${hasOpenRecalls ? 'Yes (simulated)' : 'No (simulated)'}
- Price Anomalies Detected: ${hasPriceAnomalies ? 'Yes (simulated)' : 'No (simulated)'}

Generate a concise 3-bullet risk narrative for a used-car buyer. Each bullet should:
1. Start with a bullet point (•)
2. Be actionable and specific
3. Acknowledge when data is simulated
4. Focus on what the buyer should verify or inspect

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
