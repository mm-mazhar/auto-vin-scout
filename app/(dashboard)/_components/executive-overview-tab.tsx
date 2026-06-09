// app/(dashboard)/_components/executive-overview-tab.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TriangleAlert } from 'lucide-react'
import type { ReportWithVehicle } from '@/lib/orpc/routers/vin'

// ---------------------------------------------------------------------------
// ExecutiveSummaryBody
// Splits the LLM-generated paragraph into scannable sentences. The first
// sentence is surfaced as a lead callout; the rest flow as individual lines.
// ---------------------------------------------------------------------------

function ExecutiveSummaryBody({ text }: { text: string }) {
  // Split on sentence boundaries — period/exclamation/question followed by a
  // space or end-of-string. Filter out empty strings from the split.
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length === 0) return null

  const [lead, ...rest] = sentences

  return (
    <div className="space-y-3">
      {/* Lead sentence — visually prominent */}
      <p className="text-sm font-medium text-foreground leading-relaxed border-l-2 border-primary/50 pl-3">
        {lead}
      </p>

      {/* Remaining sentences as a tight list */}
      {rest.length > 0 && (
        <ul className="space-y-2">
          {rest.map((sentence, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
              {sentence}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


interface ExecutiveOverviewTabProps {
  report: ReportWithVehicle
  riskScore: number | null
  riskLabel: string | null
  riskNarrative: string | null
  isAiFallback: boolean
  getRiskColor: (label: string | null) => string
}

export function ExecutiveOverviewTab({
  report,
  riskScore,
  riskLabel,
  riskNarrative,
  isAiFallback,
  getRiskColor,
}: ExecutiveOverviewTabProps) {
  // Req 9.4: Fall back to riskNarrative for legacy reports without executiveSummary
  const summaryText = report.executiveSummary ?? riskNarrative

  return (
    <div className="space-y-6">
      {/* Top Section: Risk Gauge + Executive Summary side-by-side */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Circular Risk Gauge */}
            <div className="flex flex-col items-center text-center">
              <h3 className="text-lg font-medium text-muted-foreground mb-6 tracking-wider uppercase">
                Overall Risk Index
              </h3>

              <div className="relative w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke={getRiskColor(riskLabel)}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - (riskScore ?? 0) / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-foreground">
                    {riskScore ?? 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">/ 100</div>
                </div>
              </div>

              {riskLabel && (
                <div
                  className="text-sm px-4 py-2 rounded-full text-white font-medium"
                  style={{ backgroundColor: getRiskColor(riskLabel) }}
                >
                  {riskLabel} Risk
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3 max-w-[200px] text-center">
                Based on {report.vectorResults?.length ?? 0} assessment vectors
              </p>

              {/* Risk range legend */}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  0–30 Low
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
                  31–70 Medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  71–100 High
                </span>
              </div>
            </div>

            {/* Right: Executive Summary */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                Executive Summary
              </h3>

              {isAiFallback && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900/30">
                  <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    Analysis based on general rules due to temporary service limitations.
                  </p>
                </div>
              )}

              {summaryText ? (
                <ExecutiveSummaryBody text={summaryText} />
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No summary available.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Middle Section: Vector Breakdown — Req 9.2, 9.5 */}
      {report.vectorResults && report.vectorResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Detailed Assessment Vectors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.vectorResults.map((vector) => (
              <div
                key={vector.id}
                className="border-b border-border/50 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{vector.vectorName}</h4>
                  <span
                    className="text-xs px-2 py-1 rounded-full text-white font-medium"
                    style={{
                      backgroundColor: getRiskColor(
                        vector.label === 'Low'
                          ? 'Low'
                          : vector.label === 'Medium'
                            ? 'Moderate'
                            : 'High'
                      ),
                    }}
                  >
                    {vector.label} ({vector.score}/100)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{vector.narrative}</p>
              </div>
            ))}


          </CardContent>
        </Card>
      )}

      {/* Bottom Section: Negotiation Script removed — moved to Buyer Guidance tab */}
    </div>
  )
}
