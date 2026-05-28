// lib/services/risk-engine/orchestrator.ts
//
// Decomposed orchestrator — each public static method is designed to be called
// from an individual Inngest step.run() so that each agent gets its own
// Vercel invocation and timeout budget.

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import prisma from '@/app/lib/db'
import { getMasterAgentConfig, getAgentConfig } from '@/lib/ai-config'
import type { AgentInput, RiskVectorResult, RiskLabel } from './types'
import { BaselineAgent } from './agents/0-baseline-agent'
import { SafetyAgent } from './agents/1-safety-agent'
import { EngineAgent } from './agents/2-engine-agent'
import { CorrosionAgent } from './agents/4-corrosion-agent'
import { FloodAgent } from './agents/5-flood-agent'
import { TheftAgent } from './agents/6-theft-agent'
import { ForensicsAgent } from './agents/7-forensics-agent'
import { WeatherService } from '@/lib/services/weather-service'
import { SerpService } from '@/lib/services/serp-service'
import type { VinSearchResult } from '@/lib/services/serp-service'
import { Prisma } from '@prisma/client'
import type { MaxRainfallData } from '@/lib/services/weather-service'

// Planned agents not yet implemented — used for UI transparency
export const PENDING_AGENTS = [
  { vectorName: 'Title & Ownership History', weight: 0.25, description: 'Salvage/rebuilt titles, lien records, ownership chain' },
  { vectorName: 'Market Valuation Analysis', weight: 0.20, description: 'Fair market value comparison, depreciation curve' },
] as const

/** Data dependencies that FloodAgent, TheftAgent, and ForensicsAgent need before execution. */
export interface AgentDeps {
  weatherData: MaxRainfallData
  serpSnippets: string[]
  latestCity: string | null
  latestState: string | null
  vinSearchData: VinSearchResult
}

export class RiskEngineOrchestrator {
  // ---------------------------------------------------------------------------
  // Step: Load AgentInput from DB
  // ---------------------------------------------------------------------------
  static async loadAgentInput(reportId: string): Promise<AgentInput | null> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        vehicle: {
          include: {
            recalls: true,
            listingHistory: { orderBy: { statusDate: 'asc' } },
            safetyRating: true,
          },
        },
      },
    })

    if (!report || !report.vehicle) {
      console.error(`[Orchestrator] Report ${reportId} or vehicle not found.`)
      return null
    }

    return {
      reportId,
      vehicle: report.vehicle,
      recalls: report.vehicle.recalls,
      listingHistory: report.vehicle.listingHistory,
      safetyRating: report.vehicle.safetyRating ?? null,
    }
  }

  // ---------------------------------------------------------------------------
  // Step: Fetch external dependencies (weather + SERP) for Flood/Theft agents
  // ---------------------------------------------------------------------------
  static async fetchAgentDeps(agentInput: AgentInput): Promise<AgentDeps> {
    const latestListing = [...agentInput.listingHistory]
      .reverse()
      .find((l) => l.city != null && l.state != null)
    const latestCity = latestListing?.city ?? null
    const latestState = latestListing?.state ?? null

    const [weatherData, serpSnippets, vinSearchData] = await Promise.all([
      WeatherService.getMaxPrecipitation(agentInput.listingHistory),
      latestCity && latestState
        ? SerpService.fetchLocalTheftReports(latestCity, latestState, agentInput.vehicle.make, agentInput.vehicle.model)
        : Promise.resolve([]),
      SerpService.fetchVinSearch(agentInput.vehicle.vin),
    ])

    return { weatherData, serpSnippets, latestCity, latestState, vinSearchData }
  }

  // ---------------------------------------------------------------------------
  // Individual agent executors — one per step.run()
  // ---------------------------------------------------------------------------
  static async runBaselineAgent(input: AgentInput): Promise<RiskVectorResult> {
    return new BaselineAgent().execute(input)
  }

  static async runSafetyAgent(input: AgentInput): Promise<RiskVectorResult> {
    return new SafetyAgent().execute(input)
  }

  static async runEngineAgent(input: AgentInput): Promise<RiskVectorResult> {
    return new EngineAgent().execute(input)
  }

  static async runCorrosionAgent(input: AgentInput): Promise<RiskVectorResult> {
    return new CorrosionAgent().execute(input)
  }

  static async runFloodAgent(input: AgentInput, deps: AgentDeps): Promise<RiskVectorResult> {
    const agent = new FloodAgent()
    agent.setWeatherData(deps.weatherData)
    return agent.execute(input)
  }

  static async runTheftAgent(input: AgentInput, deps: AgentDeps): Promise<RiskVectorResult> {
    const agent = new TheftAgent()
    agent.setContext(deps.serpSnippets, deps.latestCity, deps.latestState)
    return agent.execute(input)
  }

  static async runForensicsAgent(input: AgentInput, deps: AgentDeps): Promise<RiskVectorResult> {
    const agent = new ForensicsAgent()
    agent.setContext(deps.vinSearchData)
    return agent.execute(input)
  }

  // ---------------------------------------------------------------------------
  // Step: Persist vector results to DB
  // ---------------------------------------------------------------------------
  static async persistResults(reportId: string, results: RiskVectorResult[]): Promise<void> {
    await prisma.riskVectorResult.createMany({
      data: results.map((r): Prisma.RiskVectorResultCreateManyInput => ({
        reportId,
        vectorIndex: r.vectorIndex,
        vectorName: r.vectorName,
        score: r.score,
        label: r.label,
        weight: r.weight,
        narrative: r.narrative,
        metadata: r.metadata
          ? (r.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      })),
    })
  }

  // ---------------------------------------------------------------------------
  // Step: Price Prediction / Valuation
  // Fetches SERP data and formats it via LLM into a Markdown valuation report.
  // ---------------------------------------------------------------------------
  static async runValuation(
    year: number,
    make: string,
    model: string
  ): Promise<string | null> {
    const rawSerpText = await SerpService.fetchPricePrediction(year, make, model)
    if (!rawSerpText) return null

    try {
      const config = getAgentConfig('valuation')
      const userPrompt = `Vehicle: ${year} ${make} ${model}\n\nRaw Google search data:\n${rawSerpText}`

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
          console.warn('[Orchestrator] Valuation primary LLM failed, trying fallback:', error)
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

      console.warn('[Orchestrator] All valuation LLM providers failed, returning raw text.')
      return rawSerpText
    } catch (error) {
      console.warn('[Orchestrator] Valuation LLM formatting failed:', error)
      return rawSerpText
    }
  }

  // ---------------------------------------------------------------------------
  // Step: Master LLM synthesis
  // ---------------------------------------------------------------------------
  static async synthesize(
    results: RiskVectorResult[]
  ): Promise<{
    compositeScore: number
    compositeLabel: RiskLabel
    executiveSummary: string
    negotiationScript: string
    isAiFallback: boolean
  }> {
    const compositeScore = Math.min(
      100,
      Math.round(results.reduce((sum, r) => sum + r.score * r.weight, 0))
    )
    const compositeLabel: RiskLabel =
      compositeScore <= 30 ? 'Low' : compositeScore <= 70 ? 'Medium' : 'High'

    let executiveSummary: string
    let negotiationScript: string
    let masterLLMFailed = false

    try {
      const synthesis = await generateMasterSynthesis(results, compositeScore, compositeLabel)
      executiveSummary = synthesis.executiveSummary
      negotiationScript = synthesis.negotiationScript
    } catch (error) {
      console.warn('[Orchestrator] Master LLM failed, using rules-based fallback:', error)
      executiveSummary = generateFallbackSummary(results, compositeScore, compositeLabel)
      negotiationScript = generateFallbackNegotiationScript(results)
      masterLLMFailed = true
    }

    const anyAgentUsedFallback = results.some((r) => {
      const meta = r.metadata as Record<string, unknown> | undefined
      return meta?.usedFallbackNarrative === true
    })

    return {
      compositeScore,
      compositeLabel,
      executiveSummary,
      negotiationScript,
      isAiFallback: masterLLMFailed || anyAgentUsedFallback,
    }
  }

  // ---------------------------------------------------------------------------
  // Step: Finalize report in DB
  // ---------------------------------------------------------------------------
  static async finalizeReport(
    reportId: string,
    data: {
      compositeScore: number
      compositeLabel: RiskLabel
      executiveSummary: string
      negotiationScript: string
      isAiFallback: boolean
      pricePrediction?: string | null
    }
  ): Promise<void> {
    await prisma.report.update({
      where: { id: reportId },
      data: {
        riskScore: data.compositeScore,
        riskLabel: data.compositeLabel,
        executiveSummary: data.executiveSummary,
        negotiationScript: data.negotiationScript,
        isAiFallback: data.isAiFallback,
        riskNarrative: data.executiveSummary, // backward compat
        pricePrediction: data.pricePrediction ?? undefined,
        status: 'COMPLETED',
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Error handler: mark report as FAILED
  // ---------------------------------------------------------------------------
  static async markFailed(reportId: string): Promise<void> {
    await prisma.report
      .update({ where: { id: reportId }, data: { status: 'FAILED' } })
      .catch((dbErr) =>
        console.error(`[Orchestrator] Could not mark report as FAILED:`, dbErr)
      )
  }
}


/**
 * Invoke the Master LLM to synthesize all agent narratives into an
 * executive summary and negotiation script.
 */
async function generateMasterSynthesis(
  results: RiskVectorResult[],
  compositeScore: number,
  compositeLabel: RiskLabel
): Promise<{ executiveSummary: string; negotiationScript: string }> {
  const config = getMasterAgentConfig()

  const userPrompt = `
Composite Risk Score: ${compositeScore}/100 (${compositeLabel})

Agent Narratives:
${results.map((r) => `[${r.vectorName}] (Score: ${r.score}/100, Weight: ${r.weight})\n${r.narrative}`).join('\n\n')}

Generate the executive summary and negotiation script.
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
      if (text) {
        const parsed = parseMasterResponse(text)
        if (parsed) return parsed
      }
    } catch (error) {
      console.warn('[Orchestrator] Primary LLM failed, trying fallback:', error)
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
    if (text) {
      const parsed = parseMasterResponse(text)
      if (parsed) return parsed
    }
  }

  throw new Error('[Orchestrator] All Master LLM providers failed')
}

/**
 * Parse the Master LLM response using delimiters.
 * Expected format:
 *   ---EXECUTIVE_SUMMARY---
 *   [summary text]
 *   ---NEGOTIATION_SCRIPT---
 *   [script text]
 */
function parseMasterResponse(
  text: string
): { executiveSummary: string; negotiationScript: string } | null {
  const summaryDelimiter = '---EXECUTIVE_SUMMARY---'
  const scriptDelimiter = '---NEGOTIATION_SCRIPT---'

  const summaryIdx = text.indexOf(summaryDelimiter)
  const scriptIdx = text.indexOf(scriptDelimiter)

  if (summaryIdx === -1 || scriptIdx === -1) return null

  const executiveSummary = text
    .slice(summaryIdx + summaryDelimiter.length, scriptIdx)
    .trim()
  const negotiationScript = text
    .slice(scriptIdx + scriptDelimiter.length)
    .trim()

  if (!executiveSummary || !negotiationScript) return null

  return { executiveSummary, negotiationScript }
}

/**
 * Fallback summary when Master LLM is unavailable.
 * Concatenates agent narratives with a header.
 */
function generateFallbackSummary(
  results: RiskVectorResult[],
  compositeScore: number,
  compositeLabel: RiskLabel
): string {
  const narratives = results.map((r) => r.narrative).join(' ')
  return `Overall Risk: ${compositeLabel} (${compositeScore}/100). ${narratives}`
}

/**
 * Fallback negotiation script when Master LLM is unavailable.
 * Generates a default template with bullet points based on findings.
 */
function generateFallbackNegotiationScript(results: RiskVectorResult[]): string {
  const findings: string[] = []

  for (const result of results) {
    const meta = result.metadata as Record<string, unknown> | undefined
    const agentFindings = (meta?.findings as string[]) ?? []
    findings.push(...agentFindings)
  }

  if (findings.length === 0) {
    return [
      'Negotiation Talking Points:',
      '• Ask the seller for maintenance records to verify vehicle condition.',
      '• Request a pre-purchase inspection by an independent mechanic.',
      '• Compare the asking price against market averages for similar vehicles.',
    ].join('\n')
  }

  const bullets = findings
    .slice(0, 5)
    .map((f) => `• Based on our research: ${f}. Can you explain this?`)

  return ['Negotiation Talking Points:', ...bullets].join('\n')
}
