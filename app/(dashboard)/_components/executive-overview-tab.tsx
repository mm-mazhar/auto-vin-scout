// app/(dashboard)/_components/executive-overview-tab.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TriangleAlert, Clock } from 'lucide-react'
import type { ReportWithVehicle } from '@/lib/orpc/routers/vin'

// Planned agents not yet active — mirrors orchestrator's PENDING_AGENTS
const PENDING_AGENTS = [
  { vectorName: 'Title & Ownership History', weight: 0.25, description: 'Salvage/rebuilt titles, lien records, ownership chain' },
  { vectorName: 'Market Valuation Analysis', weight: 0.20, description: 'Fair market value comparison, depreciation curve' },
  { vectorName: 'Mechanical & Maintenance', weight: 0.20, description: 'Service records, known mechanical issues, TSBs' },
  { vectorName: 'Flood & Environmental Risk', weight: 0.15, description: 'Flood zone history, environmental damage indicators' },
] as const

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
                Based on {report.vectorResults?.length ?? 0} of 5 assessment vectors (20% weight active)
              </p>
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
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {summaryText}
                </p>
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

            {/* Pending Agents — show what's not yet contributing */}
            {PENDING_AGENTS.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pending Data Sources ({Math.round(PENDING_AGENTS.reduce((s, a) => s + a.weight, 0) * 100)}% of total score)
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PENDING_AGENTS.map((agent) => (
                    <div
                      key={agent.vectorName}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-dashed border-border/50"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {agent.vectorName}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Section: Negotiation Script removed — moved to Buyer Guidance tab */}
    </div>
  )
}
