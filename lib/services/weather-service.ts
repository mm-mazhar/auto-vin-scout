// lib/services/weather-service.ts

import { OPEN_METEO_BASE, MAX_CLUSTERS, DATE_WINDOW_DAYS } from '../constants'

interface ListingLocation {
  latitude: number | null
  longitude: number | null
  statusDate: Date | null
  city: string | null
  state: string | null
}

interface GeoCluster {
  latitude: number
  longitude: number
  startDate: string
  endDate: string
  city: string | null
  state: string | null
}

export interface MaxRainfallData {
  maxPrecipitationMm: number
  maxPrecipitationInches: number
  city: string | null
  state: string | null
  date: string | null
}

// const OPEN_METEO_BASE = 'https://archive-api.open-meteo.com/v1/archive'
// const MAX_CLUSTERS = 3
// const DATE_WINDOW_DAYS = 5

/**
 * Fetches historical precipitation data from Open-Meteo Archive API.
 * Clusters listing locations to a max of 3 unique geo-points to keep execution fast.
 */
export class WeatherService {
  /**
   * Returns the maximum precipitation found across the vehicle's listing history.
   * On failure, returns 0mm so the pipeline never crashes.
   */
  static async getMaxPrecipitation(
    listingHistory: ListingLocation[]
  ): Promise<MaxRainfallData> {
    const clusters = this.extractClusters(listingHistory)

    if (clusters.length === 0) {
      return { maxPrecipitationMm: 0, maxPrecipitationInches: 0, city: null, state: null, date: null }
    }

    try {
      const results = await Promise.all(
        clusters.map((cluster) => this.fetchPrecipitation(cluster))
      )

      // Find the cluster with the highest single-day precipitation
      let best: MaxRainfallData = {
        maxPrecipitationMm: 0,
        maxPrecipitationInches: 0,
        city: null,
        state: null,
        date: null,
      }

      for (const result of results) {
        if (result.maxPrecipitationMm > best.maxPrecipitationMm) {
          best = result
        }
      }

      return best
    } catch (error) {
      console.warn('[WeatherService] API call failed, returning 0 rainfall:', error)
      return { maxPrecipitationMm: 0, maxPrecipitationInches: 0, city: null, state: null, date: null }
    }
  }

  /**
   * Extracts up to MAX_CLUSTERS unique geographical clusters from listing history.
   * Uses a simple deduplication by rounding lat/lon to 2 decimal places.
   */
  private static extractClusters(listingHistory: ListingLocation[]): GeoCluster[] {
    const seen = new Set<string>()
    const clusters: GeoCluster[] = []

    for (const listing of listingHistory) {
      if (clusters.length >= MAX_CLUSTERS) break
      if (listing.latitude == null || listing.longitude == null || listing.statusDate == null) {
        continue
      }

      // Round to 2 decimals (~1.1km precision) for deduplication
      const key = `${listing.latitude.toFixed(2)},${listing.longitude.toFixed(2)}`
      if (seen.has(key)) continue
      seen.add(key)

      const statusDate = new Date(listing.statusDate)

      const startDateObj = new Date(statusDate)
      startDateObj.setDate(startDateObj.getDate() - DATE_WINDOW_DAYS)
      const startDate = startDateObj.toISOString().split('T')[0]

      const endDateObj = new Date(statusDate)
      endDateObj.setDate(endDateObj.getDate() + DATE_WINDOW_DAYS)
      const endDate = endDateObj.toISOString().split('T')[0]

      clusters.push({
        latitude: listing.latitude,
        longitude: listing.longitude,
        startDate,
        endDate,
        city: listing.city,
        state: listing.state,
      })
    }

    return clusters
  }

  /**
   * Fetches daily precipitation for a single cluster from Open-Meteo.
   */
  private static async fetchPrecipitation(cluster: GeoCluster): Promise<MaxRainfallData> {
    const url = `${OPEN_METEO_BASE}?latitude=${cluster.latitude}&longitude=${cluster.longitude}&start_date=${cluster.startDate}&end_date=${cluster.endDate}&daily=precipitation_sum&timezone=auto`

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (!response.ok) {
      throw new Error(`Open-Meteo returned ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      daily?: { time?: string[]; precipitation_sum?: (number | null)[] }
    }

    const times = data.daily?.time ?? []
    const precips = data.daily?.precipitation_sum ?? []

    let maxMm = 0
    let maxDate: string | null = null

    for (let i = 0; i < precips.length; i++) {
      const val = precips[i]
      if (val != null && val > maxMm) {
        maxMm = val
        maxDate = times[i] ?? null
      }
    }

    return {
      maxPrecipitationMm: maxMm,
      maxPrecipitationInches: maxMm / 25.4,
      city: cluster.city,
      state: cluster.state,
      date: maxDate,
    }
  }
}
