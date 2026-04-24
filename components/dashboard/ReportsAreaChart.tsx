'use client'

// components/dashboard/ReportsAreaChart.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DailyReportCount } from '@/lib/orpc/routers/dashboard'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const

type RangeDays = (typeof RANGE_OPTIONS)[number]['days']

interface ReportsAreaChartProps {
  data: DailyReportCount[]
}

const chartConfig = {
  count: {
    label: 'Reports',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

function formatAxisDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ReportsAreaChart({ data }: ReportsAreaChartProps) {
  const [selectedDays, setSelectedDays] = useState<RangeDays>(30)

  // Slice to the selected range from the end of the full dataset
  const slicedData = data.slice(-selectedDays)

  const isEmpty = slicedData.length === 0 || slicedData.every((d) => d.count === 0)

  // Show every Nth label to avoid crowding based on range
  const labelEvery = selectedDays <= 7 ? 1 : selectedDays <= 30 ? 5 : 10
  const tickIndices = new Set(
    slicedData
      .map((_, i) => i)
      .filter((i) => i === 0 || i === slicedData.length - 1 || i % labelEvery === 0)
  )

  return (
    <Card className='col-span-3'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>
          {isEmpty ? 'Reports' : `Reports (Last ${selectedDays} Days)`}
        </CardTitle>
        <div className='flex items-center gap-1 rounded-md border border-border p-0.5'>
          {RANGE_OPTIONS.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                selectedDays === days
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className='flex flex-col items-center justify-center h-48 gap-3'>
            <TrendingUp className='h-8 w-8 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>No reports in this period</p>
            <Link
              href='/dashboard/reports'
              className='text-sm font-medium text-primary hover:underline'
            >
              Run your first report →
            </Link>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className='h-48 w-full'>
            <BarChart data={slicedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} />
              <XAxis
                dataKey='date'
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(val, idx) =>
                  tickIndices.has(idx) ? formatAxisDate(val) : ''
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                width={28}
                domain={[0, 'auto']}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(val) => formatAxisDate(String(val))}
                  />
                }
              />
              <Bar
                dataKey='count'
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              >
                {slicedData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill='var(--primary)'
                    fillOpacity={entry.count === 0 ? 0.15 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
