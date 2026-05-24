// app/(dashboard)/_components/odometer-chart.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { VehicleListingHistory } from '@prisma/client'

interface OdometerChartProps {
  listings: VehicleListingHistory[]
}

export type IntensityBand = 'Low' | 'Standard' | 'Elevated' | 'High'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function computeIntensity(listings: VehicleListingHistory[]): {
  band: IntensityBand
  milesPerYear: number
} | null {
  const withMiles = listings.filter((l) => l.miles !== null && l.statusDate !== null)
  if (withMiles.length < 2) return null

  const first = withMiles[0]
  const last = withMiles[withMiles.length - 1]
  const firstDate = new Date(first.statusDate!)
  const lastDate = new Date(last.statusDate!)
  const yearSpan = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  if (yearSpan < 0.5) return null

  const milesPerYear = (last.miles! - first.miles!) / yearSpan

  let band: IntensityBand = 'Standard'
  if (milesPerYear > 25_000) band = 'High'
  else if (milesPerYear > 15_000) band = 'Elevated'
  else if (milesPerYear < 8_000) band = 'Low'

  return { band, milesPerYear: Math.round(milesPerYear) }
}

export const INTENSITY_STYLES: Record<IntensityBand, { bg: string; text: string; label: string }> = {
  Low: { bg: 'bg-blue-500/15 border-blue-500/20', text: 'text-blue-400', label: 'Low Intensity' },
  Standard: { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-400', label: 'Standard' },
  Elevated: { bg: 'bg-amber-500/15 border-amber-500/20', text: 'text-amber-400', label: 'Elevated' },
  High: { bg: 'bg-red-500/15 border-red-500/20', text: 'text-red-400', label: 'High Intensity' },
}

export function OdometerChart({ listings }: OdometerChartProps) {
  const data = listings
    .filter((l) => l.miles !== null && l.statusDate !== null)
    .map((l) => ({
      date: formatDate(new Date(l.statusDate!)),
      miles: l.miles!,
    }))

  if (data.length === 0) return null

  const useBarChart = data.length <= 3
  const intensity = computeIntensity(listings)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Odometer History</CardTitle>
        {intensity && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${INTENSITY_STYLES[intensity.band].bg} ${INTENSITY_STYLES[intensity.band].text}`}>
            {INTENSITY_STYLES[intensity.band].label} · {intensity.milesPerYear.toLocaleString()} mi/yr
          </span>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          {useBarChart ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`${Number(value).toLocaleString()} mi`, 'Miles']}
              />
              <Bar
                dataKey="miles"
                fill="oklch(0.696 0.17 162.48)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`${Number(value).toLocaleString()} mi`, 'Miles']}
              />
              <Line
                type="monotone"
                dataKey="miles"
                stroke="oklch(0.696 0.17 162.48)"
                strokeWidth={2}
                dot={{ r: 4, fill: 'oklch(0.696 0.17 162.48)', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
