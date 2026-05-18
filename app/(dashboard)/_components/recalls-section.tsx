'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Shield, TriangleAlert, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import type { RecallDisplay } from '@/lib/orpc/routers/vin'

interface RecallsSectionProps {
  recalls: RecallDisplay[]
  vehicleLabel: string
}

function RecallBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Badge className="bg-green-500 text-white hover:bg-green-600">
        {count} Recalls
      </Badge>
    )
  }
  if (count <= 2) {
    return (
      <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
        {count} Recall{count > 1 ? 's' : ''}
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-500 text-white hover:bg-red-600">
      {count} Recalls
    </Badge>
  )
}

function RecallCard({ recall }: { recall: RecallDisplay }) {
  const [open, setOpen] = useState(false)
  const isCritical = recall.parkIt || recall.parkOutSide

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-start justify-between gap-3 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isCritical ? (
              <TriangleAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <Shield className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{recall.component}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Campaign: {recall.campaignNumber}
                {recall.reportReceivedDate && (
                  <span className="ml-2">
                    · {recall.reportReceivedDate} (date format may vary)
                  </span>
                )}
              </p>
              {isCritical && (
                <div className="flex gap-2 mt-1">
                  {recall.parkIt && (
                    <Badge variant="destructive" className="text-xs">Park Vehicle</Badge>
                  )}
                  {recall.parkOutSide && (
                    <Badge variant="destructive" className="text-xs">Park Outside</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3 border border-t-0 border-border rounded-b-lg">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Summary</p>
            <p className="text-sm mt-1">{recall.summary}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Consequence</p>
            <p className="text-sm mt-1">{recall.consequence}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Remedy</p>
            <p className="text-sm mt-1">{recall.remedy}</p>
          </div>
          {recall.manufacturer && (
            <p className="text-xs text-muted-foreground">Manufacturer: {recall.manufacturer}</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function RecallsSection({ recalls, vehicleLabel }: RecallsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>NHTSA Recalls</CardTitle>
          </div>
          <RecallBadge count={recalls.length} />
        </div>
        <CardDescription>
          NHTSA safety recall data for {vehicleLabel}. Verify remedies at{' '}
          <a
            href="https://www.nhtsa.gov/vehicle-safety/recalls"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            nhtsa.gov
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recalls.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">No recalls found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirmed via NHTSA. Always verify independently at{' '}
                <a
                  href="https://www.nhtsa.gov/recalls"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  nhtsa.gov
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recalls.map((recall) => (
              <RecallCard key={recall.id} recall={recall} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
