// app/(dashboard)/_components/market-insights-cards.tsx

'use client'

import type { VehicleListingHistory } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, TrendingDown, MapPin, CalendarClock, ShieldCheck, Globe, ArrowRightLeft } from 'lucide-react'

interface MarketInsightsCardsProps {
  listings: VehicleListingHistory[]
}

// --- DOM Analysis ---

function computeDomStats(listings: VehicleListingHistory[]) {
  const domValues = listings
    .map((l) => l.dom)
    .filter((d): d is number => d !== null && d > 0)

  if (domValues.length === 0) return null

  const avg = Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
  const min = Math.min(...domValues)
  const max = Math.max(...domValues)

  let status: 'normal' | 'elevated' | 'high' = 'normal'
  if (avg > 200) status = 'high'
  else if (avg > 90) status = 'elevated'

  return { avg, min, max, count: domValues.length, status }
}

// --- Price Trend ---

function computePriceTrend(listings: VehicleListingHistory[]) {
  const withPrice = listings
    .filter((l) => l.price !== null && l.statusDate !== null)
    .sort((a, b) => new Date(a.statusDate!).getTime() - new Date(b.statusDate!).getTime())

  if (withPrice.length < 2) return null

  const first = withPrice[0]
  const last = withPrice[withPrice.length - 1]
  const priceDiff = last.price! - first.price!
  const percentChange = ((priceDiff / first.price!) * 100)

  const firstDate = new Date(first.statusDate!)
  const lastDate = new Date(last.statusDate!)
  const monthsSpan = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
  )

  return {
    firstPrice: first.price!,
    lastPrice: last.price!,
    priceDiff,
    percentChange: Math.round(percentChange * 10) / 10,
    monthsSpan,
    direction: priceDiff < 0 ? 'down' : priceDiff > 0 ? 'up' : 'flat',
  } as const
}

// --- Geographic Spread ---

function computeGeoSpread(listings: VehicleListingHistory[]) {
  const states = new Set(listings.map((l) => l.state).filter(Boolean))
  const cities = new Set(
    listings.map((l) => [l.city, l.state].filter(Boolean).join(', ')).filter((s) => s.length > 0)
  )

  // Compute max distance between any two listings with coordinates
  const withCoords = listings.filter(
    (l) => l.latitude !== null && l.longitude !== null
  )

  let maxDistanceMiles = 0
  if (withCoords.length >= 2) {
    for (let i = 0; i < withCoords.length; i++) {
      for (let j = i + 1; j < withCoords.length; j++) {
        const d = haversineDistance(
          withCoords[i].latitude!,
          withCoords[i].longitude!,
          withCoords[j].latitude!,
          withCoords[j].longitude!
        )
        if (d > maxDistanceMiles) maxDistanceMiles = d
      }
    }
  }

  return {
    stateCount: states.size,
    cityCount: cities.size,
    maxDistanceMiles: Math.round(maxDistanceMiles),
    states: Array.from(states).sort(),
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// --- Listing Freshness ---

function computeFreshness(listings: VehicleListingHistory[]) {
  const now = new Date()

  const allDates = listings
    .flatMap((l) => [l.firstSeenAt, l.lastSeenAt, l.statusDate])
    .filter((d): d is Date => d !== null)
    .map((d) => new Date(d).getTime())

  if (allDates.length === 0) return null

  const mostRecent = new Date(Math.max(...allDates))
  const earliest = new Date(Math.min(...allDates))

  const daysSinceLastSeen = Math.round(
    (now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
  )
  const totalSpanDays = Math.round(
    (mostRecent.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)
  )

  let status: 'active' | 'recent' | 'stale' | 'dormant' = 'active'
  if (daysSinceLastSeen > 180) status = 'dormant'
  else if (daysSinceLastSeen > 60) status = 'stale'
  else if (daysSinceLastSeen > 14) status = 'recent'

  return { daysSinceLastSeen, totalSpanDays, mostRecent, earliest, status }
}

// --- Certification ---

function computeCertification(listings: VehicleListingHistory[]) {
  const certifiedListings = listings.filter((l) => l.isCertified === true)
  return {
    everCertified: certifiedListings.length > 0,
    certifiedCount: certifiedListings.length,
    totalCount: listings.length,
  }
}

// --- Source Diversity ---

function computeSourceDiversity(listings: VehicleListingHistory[]) {
  const sources = listings
    .map((l) => l.source)
    .filter((s): s is string => s !== null && s.length > 0)

  const uniqueSources = [...new Set(sources)]
  const sourceCounts = uniqueSources.map((source) => ({
    name: source,
    count: sources.filter((s) => s === source).length,
  })).sort((a, b) => b.count - a.count)

  // Check if only auction sources
  const auctionKeywords = ['auction', 'manheim', 'copart', 'iaai', 'adesa']
  const allAuction = uniqueSources.length > 0 && uniqueSources.every((s) =>
    auctionKeywords.some((kw) => s.toLowerCase().includes(kw))
  )

  return { uniqueSources, sourceCounts, allAuction, totalWithSource: sources.length }
}

// --- Inventory Type Tracking ---

function computeInventoryTracking(listings: VehicleListingHistory[]) {
  const withType = listings
    .filter((l) => l.inventoryType !== null)
    .sort((a, b) => {
      const dateA = a.statusDate ? new Date(a.statusDate).getTime() : 0
      const dateB = b.statusDate ? new Date(b.statusDate).getTime() : 0
      return dateA - dateB
    })

  const types = withType.map((l) => l.inventoryType!)
  const uniqueTypes = [...new Set(types)]

  // Detect new → used transition
  const newIndex = types.indexOf('new')
  const usedIndex = types.lastIndexOf('used')
  const transitionDetected = newIndex !== -1 && usedIndex !== -1 && usedIndex > newIndex

  const newCount = types.filter((t) => t === 'new').length
  const usedCount = types.filter((t) => t === 'used').length

  return { uniqueTypes, transitionDetected, newCount, usedCount, totalWithType: withType.length }
}

// --- Component ---

export function MarketInsightsCards({ listings }: MarketInsightsCardsProps) {
  const dom = computeDomStats(listings)
  const priceTrend = computePriceTrend(listings)
  const geo = computeGeoSpread(listings)
  const freshness = computeFreshness(listings)
  const cert = computeCertification(listings)
  const sources = computeSourceDiversity(listings)
  const inventory = computeInventoryTracking(listings)

  return (
    <>
      {/* Row 1: 6 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* DOM Analysis */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              Days on Market
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {dom ? (
              <>
                <p className={`text-2xl font-bold ${
                  dom.status === 'high' ? 'text-red-400' :
                  dom.status === 'elevated' ? 'text-amber-400' :
                  'text-foreground'
                }`}>
                  {dom.avg} days
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  avg across {dom.count} listing{dom.count > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span>Min: {dom.min}d</span>
                  <span>·</span>
                  <span>Max: {dom.max}d</span>
                </div>
                {dom.status === 'high' && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium">⚠ Sitting unusually long</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No DOM data</p>
            )}
          </CardContent>
        </Card>

        {/* Price Trend */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              Price Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {priceTrend ? (
              <>
                <p className={`text-2xl font-bold ${
                  priceTrend.direction === 'down' ? 'text-red-400' :
                  priceTrend.direction === 'up' ? 'text-emerald-400' :
                  'text-foreground'
                }`}>
                  {priceTrend.direction === 'down' ? '↓' : priceTrend.direction === 'up' ? '↑' : '→'}{' '}
                  {Math.abs(priceTrend.percentChange)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  over {priceTrend.monthsSpan} month{priceTrend.monthsSpan > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  ${priceTrend.firstPrice.toLocaleString()} → ${priceTrend.lastPrice.toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Insufficient price data</p>
            )}
          </CardContent>
        </Card>

        {/* Geographic Spread */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              Geographic Spread
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">
              {geo.stateCount} state{geo.stateCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {geo.cityCount} unique location{geo.cityCount !== 1 ? 's' : ''}
            </p>
            {geo.maxDistanceMiles > 0 && (
              <p className={`text-xs mt-1.5 font-medium ${
                geo.maxDistanceMiles > 500 ? 'text-amber-400' : 'text-muted-foreground'
              }`}>
                {geo.maxDistanceMiles > 500 ? '⚠ ' : ''}Max spread: {geo.maxDistanceMiles.toLocaleString()} mi
              </p>
            )}
            {geo.maxDistanceMiles > 500 && (
              <p className="text-xs text-amber-400/80 mt-0.5">Possible auction flipping</p>
            )}
          </CardContent>
        </Card>

        {/* Listing Freshness */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-purple-400" />
              Listing Freshness
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {freshness ? (
              <>
                <p className={`text-2xl font-bold ${
                  freshness.status === 'dormant' ? 'text-red-400' :
                  freshness.status === 'stale' ? 'text-amber-400' :
                  'text-foreground'
                }`}>
                  {freshness.daysSinceLastSeen === 0 ? 'Today' :
                   freshness.daysSinceLastSeen < 30 ? `${freshness.daysSinceLastSeen}d ago` :
                   `${Math.round(freshness.daysSinceLastSeen / 30)}mo ago`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">last seen</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Tracked over {freshness.totalSpanDays > 365
                    ? `${(freshness.totalSpanDays / 365).toFixed(1)} yrs`
                    : `${freshness.totalSpanDays} days`}
                </p>
                {freshness.status === 'dormant' && (
                  <p className="text-xs text-red-400 mt-1.5 font-medium">⚠ Reappeared after long gap</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No date data</p>
            )}
          </CardContent>
        </Card>

        {/* Certification Status */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Certification
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {cert.everCertified ? (
              <>
                <p className="text-2xl font-bold text-emerald-400">CPO</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Certified in {cert.certifiedCount} of {cert.totalCount} listing{cert.totalCount > 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">None</p>
                <p className="text-xs text-muted-foreground mt-1">Never listed as CPO</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Inventory Type Tracking */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-amber-400" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {inventory.totalWithType > 0 ? (
              <>
                {inventory.transitionDetected ? (
                  <>
                    <p className="text-2xl font-bold text-amber-400">New → Used</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Title/registration event detected
                    </p>
                    <p className="text-xs text-amber-400 mt-1.5 font-medium">
                      ⚠ Was sold as new, now listed used
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">
                      {inventory.usedCount > 0 ? 'Used' : inventory.newCount > 0 ? 'New' : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consistent across {inventory.totalWithType} listing{inventory.totalWithType > 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No inventory data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Source Diversity — full width */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            Source Diversity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {sources.uniqueSources.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-lg font-bold">
                {sources.uniqueSources.length} platform{sources.uniqueSources.length !== 1 ? 's' : ''}
              </p>
              <span className="text-muted-foreground">·</span>
              {sources.sourceCounts.map((s) => (
                <span key={s.name} className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                  {s.name} ({s.count})
                </span>
              ))}
              {sources.allAuction && (
                <span className="text-xs text-amber-400 font-medium">⚠ Only auction sources</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No source data available</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
