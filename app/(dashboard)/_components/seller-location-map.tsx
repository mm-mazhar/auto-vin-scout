// app/(dashboard)/_components/seller-location-map.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import type { VehicleListingHistory } from '@prisma/client'
import { US_STATE_PATHS } from './us-state-paths'

interface SellerLocationMapProps {
  listings: VehicleListingHistory[]
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming',
}

function isUSState(state: string | null): boolean {
  if (!state) return false
  return state.toUpperCase() in US_STATES
}

export function SellerLocationMap({ listings }: SellerLocationMapProps) {
  const cityStateListings = listings.filter((l) => l.city || l.state)
  if (cityStateListings.length === 0) return null

  // Deduplicate locations by city+state
  const uniqueLocations = Array.from(
    new Map(
      cityStateListings.map((l) => [
        `${l.city}-${l.state}`,
        {
          city: l.city,
          state: l.state,
          sellerType: l.sellerType,
          date: l.statusDate,
          count: 0,
        },
      ])
    ).values()
  )

  for (const loc of uniqueLocations) {
    loc.count = cityStateListings.filter(
      (l) => l.city === loc.city && l.state === loc.state
    ).length
  }

  const usaLocations = uniqueLocations.filter((l) => isUSState(l.state))
  const highlightedStates = [
    ...new Set(usaLocations.map((l) => l.state!.toUpperCase())),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Seller Locations ({uniqueLocations.length} unique)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {usaLocations.length > 0 && (
          <div className="space-y-3">
            <USAMap highlightedStates={highlightedStates} />
            <div className="flex flex-wrap gap-2">
              {highlightedStates.map((st) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-medium border border-emerald-500/20"
                >
                  <MapPin className="h-3 w-3" />
                  {US_STATES[st] ?? st}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {uniqueLocations.map((loc, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {[loc.city, loc.state].filter(Boolean).join(', ')}
                </p>
                <div className="flex items-center gap-2">
                  {loc.sellerType && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {loc.sellerType}
                    </p>
                  )}
                  {loc.count > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({loc.count} listings)
                    </span>
                  )}
                </div>
                {loc.date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(loc.date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {usaLocations.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Locations are outside the USA — state map not available.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function USAMap({ highlightedStates }: { highlightedStates: string[] }) {
  const highlighted = new Set(highlightedStates)

  return (
    <div className="w-full rounded-lg border border-border/50 bg-zinc-900/60 p-4 overflow-hidden">
      <svg
        viewBox="0 0 960 600"
        className="w-full h-auto"
        style={{ maxHeight: '300px' }}
        aria-label="USA map showing seller locations"
      >
        {US_STATE_PATHS.map(({ id, d }) => (
          <path
            key={id}
            d={d}
            fill={highlighted.has(id) ? '#10b981' : '#27272a'}
            stroke={highlighted.has(id) ? '#34d399' : '#3f3f46'}
            strokeWidth={highlighted.has(id) ? '1.5' : '0.75'}
            className="transition-colors duration-200"
          >
            <title>{US_STATES[id] ?? id}</title>
          </path>
        ))}
      </svg>
    </div>
  )
}
