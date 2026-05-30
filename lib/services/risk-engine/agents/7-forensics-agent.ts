// lib/services/risk-engine/agents/7-forensics-agent.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'
import type { VinSearchResult } from '@/lib/services/serp-service'

const SEVERE_URL_KEYWORDS = [
  'bidfax.info',
  'poctra.com',
  'autoastat.com',
  'salvagebid.com',
  'copart.com',
  'iaai.com',
  'bid.cars',
]

const MODERATE_TEXT_KEYWORDS = [
  'copart',
  'iaai',
  'salvage',
  'rebuilt',
  'damage',
  'as-is',
  'parts only',
  'mechanic special',
]

export class ForensicsAgent implements RiskAgent {
  readonly vectorIndex = 7
  readonly vectorName = 'Visual & Auction Forensics'
  readonly weight = 0.20

  private vinSearchData: VinSearchResult = { organicLinks: [], snippets: [], imageUrls: [] }

  /**
   * Inject VIN search data before execution.
   * Called by the orchestrator after SerpService.fetchVinSearch resolves.
   */
  setContext(vinSearchData: VinSearchResult): void {
    this.vinSearchData = vinSearchData
  }

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    console.log(`[ForensicsAgent] 🔍 Starting: VIN ${input.vehicle.vin} | ${this.vinSearchData.organicLinks.length} links, ${this.vinSearchData.imageUrls.length} images`)
    const { organicLinks, snippets, imageUrls } = this.vinSearchData

    // Pass 1: URL vs. Text Heuristic Matrix (fast filter)
    const { score, label } = this.computeScore(organicLinks, snippets)
    console.log(`[ForensicsAgent] 🎯 Heuristic Score: ${score} | Label: ${label}`)

    // Pass 2: LLM as "Senior Reviewer" — can override score based on context
    let narrative: string
    let finalScore = score
    let finalLabel: RiskLabel = label
    let usedFallbackNarrative = false

    try {
      const llmResult = await this.generateNarrative(input, organicLinks, snippets, imageUrls, score, label)
      narrative = llmResult.narrative
      finalScore = llmResult.adjustedScore

      // Recalculate label based on LLM's overridden score
      if (finalScore >= 71) {
        finalLabel = 'High'
      } else if (finalScore >= 31) {
        finalLabel = 'Medium'
      } else {
        finalLabel = 'Low'
      }

      console.log(`[ForensicsAgent] ✍️  LLM override — adjustedScore: ${finalScore} | finalLabel: ${finalLabel}`)
    } catch {
      narrative = this.generateFallbackNarrative(label)
      usedFallbackNarrative = true
      console.log('[ForensicsAgent] ⚠️  Using fallback narrative')
    }

    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score: finalScore,
      label: finalLabel,
      weight: this.weight,
      narrative,
      metadata: {
        heuristicOriginalScore: score,
        organicLinkCount: organicLinks.length,
        snippetCount: snippets.length,
        imageUrlCount: imageUrls.length,
        usedFallbackNarrative,
      },
    }
  }

  private computeScore(
    organicLinks: string[],
    snippets: string[]
  ): { score: number; label: RiskLabel } {
    const joinedUrls = organicLinks.join(' ').toLowerCase()
    const joinedSnippets = snippets.join(' ').toLowerCase()

    if (SEVERE_URL_KEYWORDS.some((kw) => joinedUrls.includes(kw))) {
      return { score: 100, label: 'High' }
    }

    if (MODERATE_TEXT_KEYWORDS.some((kw) => joinedSnippets.includes(kw))) {
      return { score: 55, label: 'Medium' }
    }

    return { score: 15, label: 'Low' }
  }

  /**
   * Strips markdown code fences and parses JSON from LLM response.
   */
  private parseLlmJson(rawText: string): { adjustedScore: number; narrative: string } {
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanedText)

    if (typeof parsed.adjustedScore !== 'number' || typeof parsed.narrative !== 'string') {
      throw new Error('Invalid LLM JSON shape: missing adjustedScore or narrative')
    }

    const adjustedScore = Math.max(0, Math.min(100, Math.round(parsed.adjustedScore)))
    return { adjustedScore, narrative: parsed.narrative.trim() }
  }

  private async generateNarrative(
    input: AgentInput,
    organicLinks: string[],
    snippets: string[],
    imageUrls: string[],
    score: number,
    label: RiskLabel
  ): Promise<{ adjustedScore: number; narrative: string }> {
    const config = getAgentConfig('forensics')

    // Fetch images as base64 (max 2, 3s timeout per image)
    const imageDataParts = await this.fetchImagesAsBase64(imageUrls)

    const userPrompt = `
VIN: ${input.vehicle.vin}
Vehicle: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}
Heuristic Risk Score: ${score}/100 (${label})

Organic URLs found:
${organicLinks.length > 0 ? organicLinks.slice(0, 10).map((u, i) => `${i + 1}. ${u}`).join('\n') : 'None'}

Snippets:
${snippets.length > 0 ? snippets.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n') : 'None'}

${imageDataParts.length > 0 ? `${imageDataParts.length} image(s) attached for visual analysis.` : 'No images available for visual analysis.'}
`.trim()

    // Try primary provider (OpenRouter / OpenAI-compatible) — multimodal with images
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (openRouterKey && config.primary.baseUrl) {
      try {
        const client = new OpenAI({
          apiKey: openRouterKey,
          baseURL: config.primary.baseUrl,
        })

        // Build multimodal content array for OpenAI-compatible API
        const userContent: Array<
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string } }
        > = [{ type: 'text', text: userPrompt }]

        for (const img of imageDataParts) {
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          })
        }

        const response = await client.chat.completions.create({
          model: config.primary.model,
          messages: [
            { role: 'system', content: config.systemInstruction },
            { role: 'user', content: userContent },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        })
        const text = response.choices[0]?.message?.content?.trim()
        if (text) return this.parseLlmJson(text)
      } catch (error) {
        console.warn('[ForensicsAgent] Primary LLM failed, trying fallback:', error)
      }
    }

    // Try fallback provider (Google GenAI) — supports multimodal with images
    const googleKey = process.env.GOOGLE_API_KEY
    if (googleKey) {
      const ai = new GoogleGenAI({ apiKey: googleKey })

      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        { text: userPrompt },
      ]

      // Attach images as inline data parts
      for (const img of imageDataParts) {
        parts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType,
          },
        })
      }

      const response = await ai.models.generateContent({
        model: config.fallback.model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: config.systemInstruction,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        },
      })
      const text = response.text?.trim()
      if (text) return this.parseLlmJson(text)
    }

    throw new Error('[ForensicsAgent] All LLM providers failed')
  }

  private generateFallbackNarrative(label: RiskLabel): string {
    switch (label) {
      case 'Low':
        return 'Clean forensic audit. Cross-referencing historical marketplace datasets and visual search reveals zero prior \'parts-only\' listings or auction URLs.'
      case 'Medium':
        return 'Caution advised. While no direct salvage auction URLs were found, textual forensic data suggests this vehicle may have been listed as \'As-Is\', \'Wholesale\', or discussed in relation to salvage yards. Verify the title status before purchase.'
      case 'High':
        return 'CRITICAL RED FLAG: Forensic search identified this exact VIN associated with a confirmed salvage auction URL (e.g., Copart, IAAI, Bidfax). The vehicle has likely been through a total-loss event. A full structural inspection and title verification are mandatory.'
    }
  }

  /**
   * Fetches up to 2 images and converts them to base64.
   * Each fetch has a strict 3-second timeout. Dead links are silently skipped.
   */
  private async fetchImagesAsBase64(
    imageUrls: string[]
  ): Promise<Array<{ base64: string; mimeType: string }>> {
    if (imageUrls.length === 0) return []

    const urls = imageUrls.slice(0, 2)

    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(3_000),
          })
          if (!response.ok) return null

          const contentType = response.headers.get('content-type') || 'image/jpeg'
          const mimeType = contentType.split(';')[0].trim()
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')

          return { base64, mimeType }
        } catch {
          return null
        }
      })
    )

    return results.filter((r): r is { base64: string; mimeType: string } => r !== null)
  }
}
