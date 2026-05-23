// app/(dashboard)/_components/price-chart.tsx

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
  ReferenceLine,
} from 'recharts'
import type { VehicleListingHistory } from '@prisma/client'

interface PriceChartProps {
  listings: VehicleListingHistory[]
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function PriceChart({ listings }: PriceChartProps) {
  const data = listings
    .filter((l) => l.price !== null && l.statusDate !== null)
    .map((l) => ({
      date: formatDate(new Date(l.statusDate!)),
      price: l.price!,
    }))

  if (data.length === 0) return null

  // Find MSRP if available (use first non-null msrp)
  const msrp = listings.find((l) => l.msrp !== null)?.msrp ?? null

  const useBarChart = data.length <= 3

  // Shared chart elements
  const msrpLine = msrp ? (
    <ReferenceLine
      y={msrp}
      stroke="oklch(0.828 0.189 84.429)"
      strokeDasharray="5 5"
      label={{
        value: `MSRP $${msrp.toLocaleString()}`,
        position: 'insideTopRight',
        fill: 'oklch(0.828 0.189 84.429)',
        fontSize: 11,
      }}
    />
  ) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Price History</CardTitle>
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
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
              />
              {msrpLine}
              <Bar
                dataKey="price"
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
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
              />
              {msrpLine}
              <Line
                type="monotone"
                dataKey="price"
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
