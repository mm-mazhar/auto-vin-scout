// lib/services/risk-engine/orchestrator.ts

import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import prisma from '@/app/lib/db'
import { getMasterAgentConfig } from '@/lib/ai-config'
import type { RiskAgent, AgentInput, RiskVectorResult, RiskLabel } from './types'
import { BaselineAgent } from './agents/0-baseline-agent'
import { SafetyAgent } from './agents/1-safety-agent'
import { Prisma } from '@prisma/client'

// Agent registry — add new agents here
const AGENT_REGISTRY: RiskAgent[] = [
  new BaselineAgent(),
  new SafetyAgent(),
]

// Planned agents not yet implemented — used for UI transparency
export const PENDING_AGENTS = [
  { vectorName: 'Title & Ownership History', weight: 0.25, description: 'Salvage/rebuilt titles, lien records, ownership chain' },
  { vectorName: 'Market Valuation Analysis', weight: 0.20, description: 'Fair market value comparison, depreciation curve' },
  { vectorName: 'Mechanical & Maintenance', weight: 0.20, description: 'Service records, known mechanical issues, TSBs' },
  { vectorName: 'Flood & Environmental Risk', weight: 0.15, description: 'Flood zone history, environmental damage indicators' },
] as const

export class RiskEngineOrchestrator {
  static async run(reportId: string): Promise<void> {
    try {
      // 1. Load all required data
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
        return
      }

      const agentInput: AgentInput = {
        reportId,
        vehicle: report.vehicle,
        recalls: report.vehicle.recalls,
        listingHistory: report.vehicle.listingHistory,
        safetyRating: report.vehicle.safetyRating ?? null,
      }

      // 2. Execute all agents in parallel
      const results = await Promise.all(
        AGENT_REGISTRY.map((agent) => agent.execute(agentInput))
      )

      // 3. Persist RiskVectorResult records
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

      // 4. Compute composite score
      const compositeScore = Math.min(
        100,
        Math.round(
          results.reduce((sum, r) => sum + r.score * r.weight, 0)
        )
      )
      const compositeLabel: RiskLabel =
        compositeScore <= 30 ? 'Low' : compositeScore <= 70 ? 'Medium' : 'High'

      // 5. Generate executive summary + negotiation script via Master LLM
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

      // 6. Determine isAiFallback: true if any agent or master used fallback
      const anyAgentUsedFallback = results.some((r) => {
        const meta = r.metadata as Record<string, unknown> | undefined
        return meta?.usedFallbackNarrative === true
      })
      const isAiFallback = masterLLMFailed || anyAgentUsedFallback

      // 7. Update Report with final results
      await prisma.report.update({
        where: { id: reportId },
        data: {
          riskScore: compositeScore,
          riskLabel: compositeLabel,
          executiveSummary,
          negotiationScript,
          isAiFallback,
          riskNarrative: executiveSummary, // backward compat
          status: 'COMPLETED',
        },
      })
    } catch (error) {
      console.error(`[Orchestrator] Failed for report ${reportId}:`, error)
      await prisma.report
        .update({ where: { id: reportId }, data: { status: 'FAILED' } })
        .catch((dbErr) =>
          console.error(`[Orchestrator] Could not mark report as FAILED:`, dbErr)
        )
    }
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
