// lib/services/risk-engine/agents/8-reliability-serp-agent.ts
//
// Synchronous reliability agent that uses Bright Data SERP (Google → Reddit)
// instead of the Datasets API. Designed to complete within Vercel's serverless
// timeout budget — no polling, no snapshot IDs.

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'

const SEVERE_KEYWORDS: string[] = [
  'class action',     // New (Huge red flag for cars!)
  'transmission failure',
  'blown engine',
  'head gasket',
  'timing chain',
  'catastrophic',
  'rod knock',
  'metal shavings',
  'completely died',
  'rebuild',
  'cvt failure',
  'engine replacement', // New
  'seized',           // New
  'burning oil',      // New
  'lemon'             // New
]

const MODERATE_KEYWORDS: string[] = [
  'infotainment',
  'sensor',
  'oil leak',
  'water pump',
  'suspension',
  'rough shift',
  'check engine light',
  'alternator',
  'ac compressor',
  'stuck in gear',    // New
  'shudder'           // New
]

const FALLBACK_NARRATIVES: Record<RiskLabel, string> = {
  Low: 'No significant mechanical concerns detected in community discussions. Owners report normal wear patterns and typical maintenance requirements for this vehicle.',
  Medium: 'Moderate reliability concerns surfaced in Reddit discussions. Owners frequently mention issues such as sensor failures, minor leaks, or accessory component wear.',
  High: 'High probability of major mechanical failure. Reddit discussions reveal a strong pattern of catastrophic issues (e.g., transmission or engine defects) specific to this vehicle.',
}

export class ReliabilitySerpAgent implements RiskAgent {
  readonly vectorIndex = 8
  readonly vectorName = 'Reliability & Social Proof'
  readonly weight = 0.15

  private snippets: string[] = []

  /**
   * Inject SERP snippets before execution.
   * Called by the orchestrator after SerpService.fetchRedditReliability resolves.
   */
  setContext(snippets: string[]): void {
    this.snippets = snippets
  }

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    try {
      return await this.analyzeAndNarrate(input, this.snippets)
    } catch {
      // Never throw — return LOW fallback result on any unexpected error
      return this.fallbackResult()
    }
  }

  /**
   * Keyword heuristic (Pass 1: fast filter) → LLM override (Pass 2: senior reviewer).
   */
  private async analyzeAndNarrate(input: AgentInput, snippets: string[]): Promise<RiskVectorResult> {
    const { score, label, matchedKeywords } = this.computeScore(snippets)
    console.log('[ReliabilitySerpAgent] 🎯 Heuristic Score:', score, '| Label:', label, '| Keywords:', matchedKeywords)

    const formattedSnippets = snippets
      .slice(0, 20)
      .map((s, i) => `Snippet ${i + 1}: ${s}`)
      .join('\n\n')

    let narrative: string
    let finalScore = score
    let finalLabel: RiskLabel = label
    let usedFallbackNarrative = false

    try {
      const llmResult = await this.generateNarrative(input, formattedSnippets, matchedKeywords, score, label)
      narrative = llmResult.narrative
      finalScore = llmResult.adjustedScore

      if (finalScore >= 71) {
        finalLabel = 'High'
      } else if (finalScore >= 31) {
        finalLabel = 'Medium'
      } else {
        finalLabel = 'Low'
      }

      console.log('[ReliabilitySerpAgent] ✍️  LLM override — adjustedScore:', finalScore, '| finalLabel:', finalLabel)
    } catch {
      narrative = FALLBACK_NARRATIVES[label]
      usedFallbackNarrative = true
      console.log('[ReliabilitySerpAgent] ⚠️  Using fallback narrative (LLM failed)')
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
        usedFallbackNarrative,
        matchedKeywords,
        snippetCount: snippets.length,
        source: 'serp',
      },
    }
  }

  private fallbackResult(): RiskVectorResult {
    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score: 15,
      label: 'Low',
      weight: this.weight,
      narrative: FALLBACK_NARRATIVES.Low,
      metadata: {
        usedFallbackNarrative: true,
        matchedKeywords: [],
        snippetCount: 0,
        source: 'serp',
      },
    }
  }

  /**
   * Heuristic scoring matrix.
   * Tier 3 (HIGH): any severe keyword found → 85.
   * Tier 2 (MEDIUM): no severe, but moderate keyword found → 55.
   * Tier 1 (LOW): no mechanical keywords → 15.
   */
  private computeScore(snippets: string[]): {
    score: number
    label: RiskLabel
    matchedKeywords: string[]
  } {
    const joinedText = snippets.join(' ').toLowerCase()
    const matchedKeywords: string[] = []

    let hasSevere = false
    let hasModerate = false

    for (const kw of SEVERE_KEYWORDS) {
      if (joinedText.includes(kw)) {
        hasSevere = true
        matchedKeywords.push(kw)
      }
    }

    if (!hasSevere) {
      for (const kw of MODERATE_KEYWORDS) {
        if (joinedText.includes(kw)) {
          hasModerate = true
          matchedKeywords.push(kw)
        }
      }
    }

    const score = hasSevere ? 85 : hasModerate ? 55 : 15
    const label: RiskLabel = hasSevere ? 'High' : hasModerate ? 'Medium' : 'Low'

    return { score, label, matchedKeywords: [...new Set(matchedKeywords)] }
  }

  /**
   * Strips markdown code fences and parses JSON from LLM response.
   * Safely coerces string-numbers (e.g. "85") to number.
   */
  private parseLlmJson(rawText: string): { adjustedScore: number; narrative: string } {
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanedText)

    const scoreValue = Number(parsed.adjustedScore)
    if (isNaN(scoreValue) || !parsed.narrative) {
      throw new Error('Invalid LLM JSON shape: missing valid adjustedScore or narrative')
    }

    const adjustedScore = Math.max(0, Math.min(100, Math.round(scoreValue)))
    return { adjustedScore, narrative: String(parsed.narrative).trim() }
  }

  private async generateNarrative(
    input: AgentInput,
    formattedSnippets: string,
    matchedKeywords: string[],
    score: number,
    label: RiskLabel
  ): Promise<{ adjustedScore: number; narrative: string }> {
    const config = getAgentConfig('reliability')

    const userPrompt = `
Vehicle: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}
Heuristic Risk Score: ${score}/100 (${label})
Matched Keywords: ${matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'None'}

Google Search Snippets (Reddit threads):
${formattedSnippets || 'No relevant snippets found.'}
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
        if (text) return this.parseLlmJson(text)
      } catch (error) {
        console.warn('[ReliabilitySerpAgent] Primary LLM failed, trying fallback:', error)
      }
    }

    // Try fallback provider (Google GenAI)
    const googleKey = process.env.GOOGLE_API_KEY
    if (googleKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: googleKey })

        const response = await ai.models.generateContent({
          model: config.fallback.model,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: config.systemInstruction,
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
          },
        })
        const text = response.text?.trim()
        if (text) return this.parseLlmJson(text)
      } catch (error) {
        console.warn('[ReliabilitySerpAgent] Fallback LLM failed:', error)
      }
    }

    throw new Error('[ReliabilitySerpAgent] All LLM providers failed')
  }
}
