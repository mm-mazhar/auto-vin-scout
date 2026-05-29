// lib/services/risk-engine/agents/6-theft-agent.ts

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from '../types'

interface TheftAgentConfig {
  highTheftModels: string[]
}

const TRIGGER_WORDS = ['stolen', 'theft', 'break-in', 'smashed', 'catalytic', 'stole', 'boyz', 'spree']

// Parsed once at module load and cached
let _highTheftModels: string[] | null = null

function loadHighTheftModels(): string[] {
  if (_highTheftModels) return _highTheftModels
  const configPath = path.join(process.cwd(), 'config.yml')
  const raw = fs.readFileSync(configPath, 'utf8')
  const parsed = yaml.load(raw) as { ai: { agents: { theft: TheftAgentConfig } } }
  _highTheftModels = parsed.ai.agents.theft.highTheftModels ?? []
  return _highTheftModels
}

export class TheftAgent implements RiskAgent {
  readonly vectorIndex = 6
  readonly vectorName = 'Crime Statistics & Theft Risk'
  readonly weight = 0.05

  private serpSnippets: string[] = []
  private latestCity: string | null = null
  private latestState: string | null = null

  /**
   * Inject SERP snippets, city, and state before execution.
   * Called by the orchestrator after SerpService resolves.
   */
  setContext(serpSnippets: string[], latestCity: string | null, latestState: string | null): void {
    this.serpSnippets = serpSnippets
    this.latestCity = latestCity
    this.latestState = latestState
  }

  async execute(input: AgentInput): Promise<RiskVectorResult> {
    const { vehicle } = input
    console.log(`[TheftAgent] 🔍 Starting: ${vehicle.make} ${vehicle.model} | Location: ${this.latestCity ?? 'Unknown'}, ${this.latestState ?? 'Unknown'}`)

    // Step 1: High-theft model check
    const highTheftModels = loadHighTheftModels()
    const vehicleModel = (vehicle.model ?? '').toUpperCase()
    const isHighTheftModel = highTheftModels.some(
      (m) => vehicleModel.includes(m.toUpperCase())
    )

    // Step 2: Snippet keyword heuristic
    const joinedSnippets = this.serpSnippets.join(' ').toLowerCase()
    let keywordHitCount = 0
    for (const word of TRIGGER_WORDS) {
      const regex = new RegExp(word, 'gi')
      const matches = joinedSnippets.match(regex)
      keywordHitCount += matches?.length ?? 0
    }
    const hasViralLocalTheft = keywordHitCount > 2

    // Step 3: Compute heuristic score
    const { score, label } = this.computeScore(isHighTheftModel, hasViralLocalTheft)

    console.log(`[TheftAgent] 🎯 Score: ${score} | Label: ${label}`)

    // Step 4: Generate narrative (LLM with deterministic fallback)
    let narrative: string
    let usedFallbackNarrative = false
    try {
      narrative = await this.generateNarrative(
        score, label, isHighTheftModel, hasViralLocalTheft, keywordHitCount, vehicle.make, vehicle.model
      )
      console.log('[TheftAgent] ✍️  LLM narrative generated successfully')
    } catch {
      narrative = this.generateFallbackNarrative(label)
      usedFallbackNarrative = true
      console.log('[TheftAgent] ⚠️  Using fallback narrative')
    }

    return {
      vectorIndex: this.vectorIndex,
      vectorName: this.vectorName,
      score,
      label,
      weight: this.weight,
      narrative,
      metadata: {
        isHighTheftModel,
        hasViralLocalTheft,
        keywordHitCount,
        latestCity: this.latestCity,
        latestState: this.latestState,
        snippetCount: this.serpSnippets.length,
        usedFallbackNarrative,
      },
    }
  }

  private computeScore(
    isHighTheftModel: boolean,
    hasViralLocalTheft: boolean
  ): { score: number; label: RiskLabel } {
    // If no city or no snippets, use defaults based on model status
    if (!this.latestCity || this.serpSnippets.length === 0) {
      if (isHighTheftModel) {
        return { score: 55, label: 'Medium' }
      }
      return { score: 15, label: 'Low' }
    }

    // Tier 3 (HIGH): high-theft model AND viral local theft
    if (isHighTheftModel && hasViralLocalTheft) {
      return { score: 85, label: 'High' }
    }

    // Tier 2 (MEDIUM): one condition true
    if (isHighTheftModel || hasViralLocalTheft) {
      return { score: 55, label: 'Medium' }
    }

    // Tier 1 (LOW): neither condition
    return { score: 15, label: 'Low' }
  }

  private async generateNarrative(
    score: number,
    label: RiskLabel,
    isHighTheftModel: boolean,
    hasViralLocalTheft: boolean,
    keywordHitCount: number,
    make: string,
    model: string
  ): Promise<string> {
    const config = getAgentConfig('theft')

    const topSnippets = this.serpSnippets.slice(0, 3)

  const userPrompt = `
  Vehicle: ${make} ${model}
  Is High-Theft Model: ${isHighTheftModel}
  Has Viral Local Theft Sentiment: ${hasViralLocalTheft}
  Keyword Hit Count: ${keywordHitCount}
  Latest Location: ${this.latestCity ?? 'Unknown'}, ${this.latestState ?? 'Unknown'}
  Risk Score: ${score}/100 (${label})
  ${topSnippets.length > 0 ? `\nTop SERP Snippets:\n${topSnippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '\nNo local SERP data available.'}

  Write a 2-3 sentence narrative summarizing the theft risk assessment for a used-car buyer.
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
        console.warn('[TheftAgent] Primary LLM failed, trying fallback:', error)
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

    throw new Error('[TheftAgent] All LLM providers failed')
  }

  private generateFallbackNarrative(label: RiskLabel): string {
    switch (label) {
      case 'Low':
        return 'This vehicle model is not on the national high-theft watchlist and no local theft chatter was detected. Standard anti-theft precautions apply.'
      case 'Medium':
        return 'This vehicle is either a known high-theft target or local search data indicates elevated theft activity in the area. Consider comprehensive insurance coverage and aftermarket anti-theft devices.'
      case 'High':
        return 'HIGH THEFT RISK: This model is a confirmed high-theft target AND local OSINT reveals active viral theft trends in the listing city. Expect elevated insurance premiums and strongly consider steering-wheel locks, GPS trackers, or aftermarket immobilizers.'
    }
  }
}
