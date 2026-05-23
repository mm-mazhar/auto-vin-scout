// lib/services/marketcheck-history-service.ts

/**
 * MarketCheck History API Integration Service
 *
 * Fetches historical vehicle listing data from MarketCheck, handles pagination,
 * and persists results to the VehicleListingHistory table.
 */

import { PREMIUM_VIN_API_KEY, PREMIUM_VIN_BASE_URL, PREMIUM_VIN_TIMEOUT_MS } from '@/lib/constants'
import prisma from '@/app/lib/db'
import type { VehicleListingHistory } from '@prisma/client'

// --- Error Types ---

export class MarketCheckHistoryServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string
  ) {
    super(message)
    this.name = 'MarketCheckHistoryServiceError'
  }
}

export class MarketCheckTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MarketCheckTimeoutError'
  }
}

// --- Raw API Response Interface ---

export interface MarketCheckListingRaw {
  id: string
  price?: number | null
  miles?: number | null
  msrp?: number | null
  seller_type?: string | null
  inventory_type?: string | null
  is_certified?: boolean | number | null
  exterior_color?: string | null
  interior_color?: string | null
  dom?: number | null
  status_date?: number | null // Unix timestamp (seconds)
  first_seen_at?: number | null // Unix timestamp (seconds)
  last_seen_at?: number | null // Unix timestamp (seconds)
  seller_name?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  latitude?: string | null // String from API, convert to Float
  longitude?: string | null // String from API, convert to Float
  source?: string | null
  vdp_url?: string | null
  data_source?: string | null
}

// --- Constants ---

const FIELDS = [
  'id',
  'price',
  'miles',
  'msrp',
  'seller_type',
  'inventory_type',
  'is_certified',
  'exterior_color',
  'interior_color',
  'dom',
  'status_date',
  'first_seen_at',
  'last_seen_at',
  'seller_name',
  'city',
  'state',
  'zip',
  'latitude',
  'longitude',
  'source',
  'vdp_url',
  'data_source',
].join(',')

const PAGE_SIZE = 50

// --- Service ---

export class MarketCheckHistoryService {
  /**
   * Fetch all listing history pages for a VIN and persist to DB.
   * Returns listings sorted ascending by statusDate.
   */
  static async fetchAndPersist(
    vin: string,
    vehicleId: string
  ): Promise<VehicleListingHistory[]> {
    const allRawListings: MarketCheckListingRaw[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = new URL(`${PREMIUM_VIN_BASE_URL}/v2/history/car/${vin}`)
      url.searchParams.set('api_key', PREMIUM_VIN_API_KEY)
      url.searchParams.set('fields', FIELDS)
      url.searchParams.set('page', String(page))
      url.searchParams.set('sort_order', 'desc')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), PREMIUM_VIN_TIMEOUT_MS)

      let response: Response
      try {
        response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
      } catch (error) {
        clearTimeout(timeout)
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new MarketCheckTimeoutError(
            `MarketCheck History API timed out after ${PREMIUM_VIN_TIMEOUT_MS}ms (page ${page})`
          )
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new MarketCheckHistoryServiceError(
          `MarketCheck History API returned ${response.status}`,
          response.status,
          body
        )
      }

      const pageData: MarketCheckListingRaw[] = await response.json()

      if (pageData.length === 0) {
        hasMore = false
      } else {
        allRawListings.push(...pageData)
        hasMore = pageData.length >= PAGE_SIZE
        page++
      }
    }

    if (allRawListings.length === 0) return []

    // Upsert all listings to DB
    const upsertedListings = await Promise.all(
      allRawListings.map((raw) =>
        prisma.vehicleListingHistory.upsert({
          where: {
            vehicleId_externalListingId: {
              vehicleId,
              externalListingId: raw.id,
            },
          },
          update: buildListingData(vehicleId, raw),
          create: buildListingData(vehicleId, raw),
        })
      )
    )

    // Return sorted ascending by statusDate (API returns descending)
    return upsertedListings.sort((a, b) => {
      const dateA = a.statusDate?.getTime() ?? 0
      const dateB = b.statusDate?.getTime() ?? 0
      return dateA - dateB
    })
  }
}

// --- Helpers ---

function buildListingData(vehicleId: string, raw: MarketCheckListingRaw) {
  return {
    vehicleId,
    externalListingId: raw.id,
    price: raw.price ?? null,
    miles: raw.miles ?? null,
    msrp: raw.msrp ?? null,
    sellerType: raw.seller_type ?? null,
    inventoryType: raw.inventory_type ?? null,
    isCertified: raw.is_certified != null ? Boolean(raw.is_certified) : null,
    exteriorColor: raw.exterior_color ?? null,
    interiorColor: raw.interior_color ?? null,
    dom: raw.dom ?? null,
    statusDate: raw.status_date ? new Date(raw.status_date * 1000) : null,
    firstSeenAt: raw.first_seen_at ? new Date(raw.first_seen_at * 1000) : null,
    lastSeenAt: raw.last_seen_at ? new Date(raw.last_seen_at * 1000) : null,
    sellerName: raw.seller_name ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    zip: raw.zip ?? null,
    latitude: raw.latitude ? parseFloat(raw.latitude) : null,
    longitude: raw.longitude ? parseFloat(raw.longitude) : null,
    source: raw.source ?? null,
    vdpUrl: raw.vdp_url ?? null,
    dataSource: raw.data_source ?? null,
  }
}
