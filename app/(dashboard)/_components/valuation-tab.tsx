'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface ValuationTabProps {
  pricePrediction: string | null
}

export function ValuationTab({ pricePrediction }: ValuationTabProps) {
  if (!pricePrediction) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Market Valuation</CardTitle>
          </div>
          <CardDescription>
            Real-time price prediction based on current market data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">
              Valuation data is currently unavailable for this vehicle.
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              This may be due to limited market data or a temporary service issue.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Market Valuation</CardTitle>
        </div>
        <CardDescription>
          Real-time price prediction based on current market data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-td:text-muted-foreground prose-th:text-foreground [&_*]:whitespace-pre-wrap">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {pricePrediction}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
