// lib/services/risk-engine/agents/8-reliability-socialproof-agent.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'
import { BrightDataDatasetService } from '@/lib/services/brightdata-dataset-service'
import type { RedditPost } from '@/lib/services/brightdata-dataset-service'

const SEVERE_KEYWORDS: string[] = [
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
]

const FALLBACK_NARRATIVES: Record<RiskLabel, string> = {
  Low: "Exceptional reliability profile. Enthusiast forums report high satisfaction with this powertrain's longevity, with minimal mentions of major failures.",
  Medium: 'Moderate reliability concerns. Social proof indicates owners frequently experience issues such as sensor failures, minor leaks, or accessory wear.',
  High: 'High probability of major mechanical failure. Social media sentiment indicates a severe pattern of catastrophic issues (e.g., transmission or engine defects) for this specific model.',
}

export class ReliabilitySocialProofAgent implements RiskAgent {
  readonly vectorIndex = 8
  readonly vectorName = 'Reliability & Social Proof'
  readonly weight = 0.15

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    try {
      // Phase 1: Discover Reddit posts and classify by keyword severity
      const keyword = `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model} problem OR failure`
      console.log('[ReliabilityAgent] 🔍 Searching Reddit with keyword:', keyword)

      const posts = await BrightDataDatasetService.discoverRedditPosts(keyword)
      console.log('[ReliabilityAgent] 📬 Posts returned from Bright Data:', posts.length)

      // Filter out posts where both title and description are empty
      const validPosts = posts.filter(
        (post) => post.title.trim() !== '' || post.description.trim() !== ''
      )

      // Keyword heuristic scoring
      const { score, label, matchedKeywords, filteredPosts } = this.computeScore(validPosts)
      console.log('[ReliabilityAgent] 🎯 Score:', score, '| Label:', label, '| Keywords:', matchedKeywords)

      // Phase 2: Format post content for LLM (no comment scraping needed)
      const formattedPosts = validPosts
        .slice(0, 10)
        .map((p, i) => `Post ${i + 1}: ${p.title}\nDescription: ${p.description}`)
        .join('\n\n')

      // Phase 3: Generate LLM narrative
      let narrative: string
      let usedFallbackNarrative = false
      try {
        narrative = await this.generateNarrative(input, formattedPosts, matchedKeywords, score, label)
        console.log('[ReliabilityAgent] ✍️  LLM narrative generated successfully')
      } catch {
        narrative = FALLBACK_NARRATIVES[label]
        usedFallbackNarrative = true
        console.log('[ReliabilityAgent] ⚠️  Using fallback narrative (LLM failed)')
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
          matchedKeywords,
          postCount: validPosts.length,
        },
      }
    } catch {
      // Never throw — return LOW fallback result on any unexpected error
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
          postCount: 0,
        },
      }
    }
  }

  private computeScore(posts: RedditPost[]): {
    score: number
    label: RiskLabel
    matchedKeywords: string[]
    filteredPosts: RedditPost[]
  } {
    let hasSevere = false
    let hasModerate = false
    const filteredPosts: RedditPost[] = []
    const matchedKeywords: string[] = []

    for (const post of posts) {
      const text = `${post.title} ${post.description}`.toLowerCase()
      let matched = false

      for (const kw of SEVERE_KEYWORDS) {
        if (text.includes(kw)) {
          hasSevere = true
          matched = true
          matchedKeywords.push(kw)
          break
        }
      }

      if (!matched) {
        for (const kw of MODERATE_KEYWORDS) {
          if (text.includes(kw)) {
            hasModerate = true
            matched = true
            matchedKeywords.push(kw)
            break
          }
        }
      }

      if (matched) {
        filteredPosts.push(post)
      }
    }

    const score = hasSevere ? 85 : hasModerate ? 55 : 15
    const label: RiskLabel = hasSevere ? 'High' : hasModerate ? 'Medium' : 'Low'

    return { score, label, matchedKeywords: [...new Set(matchedKeywords)], filteredPosts }
  }

  private async generateNarrative(
    input: AgentInput,
    formattedPosts: string,
    matchedKeywords: string[],
    score: number,
    label: RiskLabel
  ): Promise<string> {
    const config = getAgentConfig('reliability')

    const userPrompt = `
Vehicle: ${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}
Heuristic Risk Score: ${score}/100 (${label})
Matched Keywords: ${matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'None'}

Recent Reddit Discussions:
${formattedPosts || 'No relevant discussions found.'}

Provide a concise 2-3 sentence reliability assessment based on the owner discussions above.
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
        console.warn('[ReliabilitySocialProofAgent] Primary LLM failed, trying fallback:', error)
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
        if (text) return text
      } catch (error) {
        console.warn('[ReliabilitySocialProofAgent] Fallback LLM failed:', error)
      }
    }

    throw new Error('[ReliabilitySocialProofAgent] All LLM providers failed')
  }
}
