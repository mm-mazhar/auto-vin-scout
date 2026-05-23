'use client'

import { Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StarRating } from './star-rating'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import type { VehicleSafetyRatingDisplay } from '@/lib/orpc/routers/vin'

interface NhtsaSafetyTabProps {
  safetyRating: VehicleSafetyRatingDisplay | null
}

export function NhtsaSafetyTab({ safetyRating }: NhtsaSafetyTabProps) {
  if (!safetyRating) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Safety Data Unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              NHTSA crash test ratings are not available for this vehicle. This may be because the
              vehicle hasn&apos;t been tested or the data couldn&apos;t be retrieved.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section: Crash photo + Overall star rating */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Crash test photo */}
            <div className="rounded-lg overflow-hidden bg-muted">
              {safetyRating.frontCrashPicture ? (
                <img
                  src={safetyRating.frontCrashPicture}
                  alt={`${safetyRating.vehicleDescription ?? 'Vehicle'} frontal crash test`}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Shield className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No crash test photo available</p>
                </div>
              )}
            </div>
            {/* Right: Overall star rating */}
            <div className="flex flex-col items-center justify-center gap-3">
              <StarRating rating={safetyRating.overallRating ?? null} size={32} />
              <p className="text-lg font-semibold">Overall Safety Rating</p>
              <p className="text-sm text-muted-foreground text-center">
                {safetyRating.vehicleDescription ?? 'NHTSA Crash Test Results'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crash Test Grid: Frontal, Side, Rollover */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frontal Crash Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frontal Crash</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StarRating rating={safetyRating.overallFrontCrashRating ?? null} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Driver:</span>
                <StarRating rating={safetyRating.frontCrashDriversideRating ?? null} size={16} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Passenger:</span>
                <StarRating rating={safetyRating.frontCrashPassengersideRating ?? null} size={16} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Crash Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Side Crash</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StarRating rating={safetyRating.overallSideCrashRating ?? null} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Driver:</span>
                <StarRating rating={safetyRating.sideCrashDriversideRating ?? null} size={16} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Passenger:</span>
                <StarRating rating={safetyRating.sideCrashPassengersideRating ?? null} size={16} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Side Pole:</span>
                <StarRating rating={safetyRating.sidePoleCrashRating ?? null} size={16} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rollover Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rollover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StarRating rating={safetyRating.rolloverRating ?? null} />
            <p className="text-sm text-muted-foreground">
              {safetyRating.rolloverPossibility != null
                ? `Rollover Risk: ${(safetyRating.rolloverPossibility * 100).toFixed(1)}%`
                : 'Rollover Risk: N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Safety Score Radar Chart */}
      <SafetyRadarChart safetyRating={safetyRating} />

      {/* Complaints & Investigations Warning */}
      {((safetyRating.complaintsCount ?? 0) > 0 || (safetyRating.investigationCount ?? 0) > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400">Consumer Complaints & Investigations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  NHTSA has recorded issues for this vehicle model. Review before purchasing.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{safetyRating.complaintsCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Complaints</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{safetyRating.investigationCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Investigations</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Features & Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Features</CardTitle>
          <CardDescription>Advanced Driver Assistance Systems (ADAS)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ADAS Feature Rows */}
          <div className="space-y-3">
            <AdasFeatureRow
              label="Electronic Stability Control (ESC)"
              value={safetyRating.nhtsaElectronicStabilityControl}
            />
            <AdasFeatureRow
              label="Forward Collision Warning (FCW)"
              value={safetyRating.nhtsaForwardCollisionWarning}
            />
            <AdasFeatureRow
              label="Lane Departure Warning (LDW)"
              value={safetyRating.nhtsaLaneDepartureWarning}
            />
          </div>

          {/* Stat Cards (only if no warning card above) */}
          {(safetyRating.complaintsCount ?? 0) === 0 && (safetyRating.investigationCount ?? 0) === 0 && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">0</p>
                <p className="text-sm text-muted-foreground mt-1">NHTSA Complaints</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">0</p>
                <p className="text-sm text-muted-foreground mt-1">Investigations</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SafetyRadarChart({ safetyRating }: { safetyRating: VehicleSafetyRatingDisplay }) {
  const radarData = [
    { category: 'Front Crash', score: parseRating(safetyRating.overallFrontCrashRating) },
    { category: 'Side Crash', score: parseRating(safetyRating.overallSideCrashRating) },
    { category: 'Rollover', score: parseRating(safetyRating.rolloverRating) },
    { category: 'Front (Driver)', score: parseRating(safetyRating.frontCrashDriversideRating) },
    { category: 'Front (Pass.)', score: parseRating(safetyRating.frontCrashPassengersideRating) },
    { category: 'Side Pole', score: parseRating(safetyRating.sidePoleCrashRating) },
  ]

  // Only render if we have at least 3 data points
  const validPoints = radarData.filter((d) => d.score > 0)
  if (validPoints.length < 3) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Safety Score Breakdown</CardTitle>
        <CardDescription>Individual crash test ratings (1–5 stars)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              tickCount={6}
            />
            <Radar
              name="Rating"
              dataKey="score"
              stroke="oklch(0.696 0.17 162.48)"
              fill="oklch(0.696 0.17 162.48)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function parseRating(value: string | null | undefined): number {
  if (!value) return 0
  const num = parseInt(value, 10)
  return isNaN(num) ? 0 : num
}

function AdasFeatureRow({ label, value }: { label: string; value: string | null }) {
  if (value === 'Standard') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
            Standard
          </Badge>
        </div>
      </div>
    )
  }

  if (value === 'Optional') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400">
            Optional
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary">Not Available</Badge>
      </div>
    </div>
  )
}
