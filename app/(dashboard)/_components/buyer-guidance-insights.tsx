// app/(dashboard)/_components/buyer-guidance-insights.tsx

'use client'

import type { VehicleListingHistory } from '@prisma/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Handshake, Fuel, TrendingDown, Clock, MapPin, Gauge } from 'lucide-react'

// --- Valuation Markdown Renderer ---
// Highlights dollar amounts and mileage figures inline, adds proper spacing.

function highlightNumbers(text: string): React.ReactNode[] {
  // Match $X,XXX / $XX,XXX / $XXX,XXX and XXX,XXX miles / XXX mi
  const pattern = /(\$[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d,]+(?:\.\d{2})?)?|\b\d{1,3}(?:,\d{3})+\s*(?:miles?|mi)\b)/g
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const isDollar = part.startsWith('$')
      return (
        <span
          key={i}
          className={`font-semibold ${isDollar ? 'text-emerald-400' : 'text-sky-400'}`}
        >
          {part}
        </span>
      )
    }
    return part
  })
}

const valuationComponents: Components = {
  // H2 — section title with border
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-6 mb-2 pb-1 border-b border-border/40 first:mt-0">
      {children}
    </h2>
  ),
  // H3 — subsection
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground/90 mt-4 mb-1.5">
      {children}
    </h3>
  ),
  // Paragraph with number highlighting
  p: ({ children }) => (
    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
      {typeof children === 'string'
        ? highlightNumbers(children)
        : children}
    </p>
  ),
  // Unordered list
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-3 ml-1">
      {children}
    </ul>
  ),
  // List item with number highlighting
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
      <span className="leading-relaxed">
        {typeof children === 'string' ? highlightNumbers(children) : children}
      </span>
    </li>
  ),
  // Bold — price ranges are often bolded by the LLM
  strong: ({ children }) => {
    const text = typeof children === 'string' ? children : ''
    const hasDollar = text.includes('$')
    return (
      <strong className={`font-semibold ${hasDollar ? 'text-emerald-400' : 'text-foreground'}`}>
        {children}
      </strong>
    )
  },
}

interface BuyerGuidanceInsightsProps {
  listings: VehicleListingHistory[]
  vehicle: {
    year: number
    make: string
    model: string
    cityMpg: number | null
    highwayMpg: number | null
    fuelTypePrimary: string | null
    engineSize: number | null
  }
  pricePrediction?: string | null
}

// --- Negotiation Leverage ---

interface LeveragePoint {
  icon: React.ReactNode
  text: string
  strength: 'strong' | 'moderate' | 'mild'
}

function computeLeveragePoints(
  listings: VehicleListingHistory[],
  vehicleYear: number
): LeveragePoint[] {
  const points: LeveragePoint[] = []

  // DOM leverage
  const domValues = listings
    .map((l) => l.dom)
    .filter((d): d is number => d !== null && d > 0)

  if (domValues.length > 0) {
    const avgDom = Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
    if (avgDom > 200) {
      points.push({
        icon: <Clock className="h-4 w-4" />,
        text: `Listed ${avgDom} days on average — seller is likely very motivated to move this vehicle`,
        strength: 'strong',
      })
    } else if (avgDom > 90) {
      points.push({
        icon: <Clock className="h-4 w-4" />,
        text: `Listed ${avgDom} days on average — longer than typical, seller may accept lower offers`,
        strength: 'moderate',
      })
    }
  }

  // Price cut leverage
  const withPrice = listings
    .filter((l) => l.price !== null && l.statusDate !== null)
    .sort((a, b) => new Date(a.statusDate!).getTime() - new Date(b.statusDate!).getTime())

  let priceCutCount = 0
  let totalDrop = 0
  for (let i = 1; i < withPrice.length; i++) {
    if (withPrice[i].price! < withPrice[i - 1].price!) {
      priceCutCount++
      totalDrop += withPrice[i - 1].price! - withPrice[i].price!
    }
  }

  if (priceCutCount >= 3) {
    points.push({
      icon: <TrendingDown className="h-4 w-4" />,
      text: `Price reduced ${priceCutCount} times (total $${totalDrop.toLocaleString()} in cuts) — pattern of desperation, negotiate aggressively`,
      strength: 'strong',
    })
  } else if (priceCutCount >= 1 && withPrice.length >= 2) {
    const firstPrice = withPrice[0].price!
    const lastPrice = withPrice[withPrice.length - 1].price!
    if (lastPrice < firstPrice) {
      const pctDrop = Math.round(((firstPrice - lastPrice) / firstPrice) * 100)
      points.push({
        icon: <TrendingDown className="h-4 w-4" />,
        text: `Price dropped ${pctDrop}% from $${firstPrice.toLocaleString()} to $${lastPrice.toLocaleString()} — room for further negotiation`,
        strength: pctDrop > 15 ? 'strong' : 'moderate',
      })
    }
  }

  // High mileage leverage
  const withMiles = listings.filter((l) => l.miles !== null)
  if (withMiles.length > 0) {
    const latestMiles = withMiles[withMiles.length - 1].miles!
    const currentYear = new Date().getFullYear()
    const vehicleAge = currentYear - vehicleYear

    if (latestMiles > 100_000) {
      points.push({
        icon: <Gauge className="h-4 w-4" />,
        text: `${latestMiles.toLocaleString()} miles — request maintenance records and factor in upcoming major service intervals`,
        strength: latestMiles > 150_000 ? 'strong' : 'moderate',
      })
    } else if (vehicleAge > 0 && latestMiles / vehicleAge > 15_000) {
      points.push({
        icon: <Gauge className="h-4 w-4" />,
        text: `Above-average mileage for age (~${Math.round(latestMiles / vehicleAge).toLocaleString()} mi/yr) — ask about driving conditions and service history`,
        strength: 'mild',
      })
    }
  }

  // Geographic spread leverage
  const states = new Set(listings.map((l) => l.state).filter(Boolean))
  if (states.size >= 3) {
    points.push({
      icon: <MapPin className="h-4 w-4" />,
      text: `Listed across ${states.size} states — ask seller to explain the vehicle's movement history and verify title is clean`,
      strength: 'strong',
    })
  }

  return points
}

// --- Ownership Cost Estimate ---

interface OwnershipCost {
  annualFuelCost: number
  monthlyFuelCost: number
  assumedMilesPerYear: number
  fuelType: string
  cityMpg: number
  highwayMpg: number
}

const NATIONAL_AVG_GAS_PRICE = 3.50 // $/gallon
const NATIONAL_AVG_ELECTRICITY_PRICE = 0.14 // $/kWh
const AVG_EV_EFFICIENCY = 3.5 // miles per kWh
const ASSUMED_ANNUAL_MILES = 12_000
const CITY_HIGHWAY_SPLIT = { city: 0.55, highway: 0.45 }

function computeOwnershipCost(
  cityMpg: number | null,
  highwayMpg: number | null,
  fuelTypePrimary: string | null
): OwnershipCost | null {
  if (!cityMpg && !highwayMpg) return null

  const isElectric = fuelTypePrimary?.toLowerCase().includes('electric')

  if (isElectric) {
    // EV cost calculation
    const annualKwh = ASSUMED_ANNUAL_MILES / AVG_EV_EFFICIENCY
    const annualFuelCost = Math.round(annualKwh * NATIONAL_AVG_ELECTRICITY_PRICE)
    return {
      annualFuelCost,
      monthlyFuelCost: Math.round(annualFuelCost / 12),
      assumedMilesPerYear: ASSUMED_ANNUAL_MILES,
      fuelType: 'Electric',
      cityMpg: 0,
      highwayMpg: 0,
    }
  }

  // ICE / Hybrid cost calculation
  const cMpg = cityMpg || highwayMpg || 25
  const hMpg = highwayMpg || cityMpg || 30

  const cityGallons = (ASSUMED_ANNUAL_MILES * CITY_HIGHWAY_SPLIT.city) / cMpg
  const highwayGallons = (ASSUMED_ANNUAL_MILES * CITY_HIGHWAY_SPLIT.highway) / hMpg
  const totalGallons = cityGallons + highwayGallons
  const annualFuelCost = Math.round(totalGallons * NATIONAL_AVG_GAS_PRICE)

  return {
    annualFuelCost,
    monthlyFuelCost: Math.round(annualFuelCost / 12),
    assumedMilesPerYear: ASSUMED_ANNUAL_MILES,
    fuelType: fuelTypePrimary || 'Gasoline',
    cityMpg: cMpg,
    highwayMpg: hMpg,
  }
}

// --- Component ---

export function BuyerGuidanceInsights({ listings, vehicle, pricePrediction }: BuyerGuidanceInsightsProps) {
  const leveragePoints = computeLeveragePoints(listings, vehicle.year)
  const ownershipCost = computeOwnershipCost(
    vehicle.cityMpg,
    vehicle.highwayMpg,
    vehicle.fuelTypePrimary
  )

  return (
    <div className="space-y-6">
      {/* Negotiation Leverage Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            <CardTitle>Negotiation Leverage</CardTitle>
          </div>
          <CardDescription>
            Data-driven talking points based on market signals for this {vehicle.year} {vehicle.make} {vehicle.model}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leveragePoints.length > 0 ? (
            <div className="space-y-3">
              {leveragePoints.map((point, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className={`mt-0.5 shrink-0 ${
                    point.strength === 'strong' ? 'text-emerald-400' :
                    point.strength === 'moderate' ? 'text-amber-400' :
                    'text-muted-foreground'
                  }`}>
                    {point.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${
                        point.strength === 'strong' ? 'bg-emerald-500/15 text-emerald-400' :
                        point.strength === 'moderate' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {point.strength}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{point.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No significant negotiation leverage detected from available market data.
              The vehicle appears fairly priced for its segment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Market Valuation */}
      {pricePrediction && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              <CardTitle>Market Valuation</CardTitle>
            </div>
            <CardDescription>
              Real-time price prediction based on current market data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={valuationComponents}
            >
              {pricePrediction}
            </ReactMarkdown>
          </CardContent>
        </Card>
      )}

      {/* Ownership Cost Estimate */}
      {ownershipCost && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              <CardTitle>Estimated Annual Fuel Cost</CardTitle>
            </div>
            <CardDescription>
              Based on {ownershipCost.assumedMilesPerYear.toLocaleString()} mi/yr with national average {ownershipCost.fuelType.toLowerCase().includes('electric') ? 'electricity' : 'gas'} prices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-3xl font-bold">${ownershipCost.annualFuelCost.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">per year</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-3xl font-bold">${ownershipCost.monthlyFuelCost}</p>
                <p className="text-xs text-muted-foreground mt-1">per month</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                {ownershipCost.fuelType.toLowerCase().includes('electric') ? (
                  <>
                    <p className="text-3xl font-bold">⚡ EV</p>
                    <p className="text-xs text-muted-foreground mt-1">~{AVG_EV_EFFICIENCY} mi/kWh</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold">{ownershipCost.cityMpg}/{ownershipCost.highwayMpg}</p>
                    <p className="text-xs text-muted-foreground mt-1">city/hwy MPG</p>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Assumes {CITY_HIGHWAY_SPLIT.city * 100}% city / {CITY_HIGHWAY_SPLIT.highway * 100}% highway driving mix.
              {ownershipCost.fuelType.toLowerCase().includes('electric')
                ? ` Electricity at $${NATIONAL_AVG_ELECTRICITY_PRICE}/kWh national average.`
                : ` Gas at $${NATIONAL_AVG_GAS_PRICE.toFixed(2)}/gal national average.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
