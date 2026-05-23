// app/(dashboard)/_components/market-behavior-tab.tsx

'use client'

import type { VehicleListingHistory } from '@prisma/client'
import { OdometerChart, computeIntensity, INTENSITY_STYLES } from './odometer-chart'
import { PriceChart } from './price-chart'
import { SellerLocationMap } from './seller-location-map'
import { ListingHistoryTable } from './listing-history-table'
import { MarketInsightsCards } from './market-insights-cards'
import { Card, CardContent } from '@/components/ui/card'
import { Info, Gauge, DollarSign, List } from 'lucide-react'

interface MarketBehaviorTabProps {
  listings: VehicleListingHistory[]
}

export function MarketBehaviorTab({ listings }: MarketBehaviorTabProps) {
  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Info className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No market history available for this vehicle.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Derive latest mileage and last list price from listings (sorted ascending by statusDate)
  const latestWithMiles = [...listings].reverse().find((l) => l.miles !== null)
  const latestWithPrice = [...listings].reverse().find((l) => l.price !== null)
  const intensity = computeIntensity(listings)

  // Seller type breakdown
  const dealerCount = listings.filter((l) => l.sellerType === 'dealer').length
  const fsboCount = listings.filter((l) => l.sellerType === 'fsbo').length
  const auctionCount = listings.filter((l) => l.sellerType === 'auction').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Latest Mileage</p>
                <p className="text-2xl font-bold">
                  {latestWithMiles ? `${latestWithMiles.miles!.toLocaleString()} mi` : '—'}
                </p>
                {latestWithMiles?.statusDate && (
                  <p className="text-xs text-muted-foreground">
                    as of {new Date(latestWithMiles.statusDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            {intensity && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Usage Intensity</p>
                <p className={`text-sm font-semibold mt-0.5 ${INTENSITY_STYLES[intensity.band].text}`}>
                  {INTENSITY_STYLES[intensity.band].label} · {intensity.milesPerYear.toLocaleString()} mi/yr
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-950/40">
              <List className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Listings Found</p>
              <p className="text-2xl font-bold">{listings.length}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>Dealer: {dealerCount}</span>
                <span>·</span>
                <span>FSBO: {fsboCount}</span>
                <span>·</span>
                <span>Auction: {auctionCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-950/40">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Last List Price</p>
              <p className="text-2xl font-bold">
                {latestWithPrice ? `$${latestWithPrice.price!.toLocaleString()}` : '—'}
              </p>
              {latestWithPrice?.statusDate && (
                <p className="text-xs text-muted-foreground">
                  as of {new Date(latestWithPrice.statusDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <MarketInsightsCards listings={listings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OdometerChart listings={listings} />
        <PriceChart listings={listings} />
      </div>
      <SellerLocationMap listings={listings} />
      <ListingHistoryTable listings={listings} />
    </div>
  )
}
