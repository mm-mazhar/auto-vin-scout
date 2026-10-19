// lib/services/vin-preview.ts

/**
 * Public VIN preview: the free, signed-out decode behind the marketing hero.
 * Limited to free federal sources (NHTSA vPIC decode + model-year recall count).
 */

import { decodeVin, type VehicleData } from './nhtsa-decoder'
import { fetchNHTSARecalls, type NHTSARecallsResponse } from './nhtsa-recalls'

export interface VinPreview {
  vin: string
  year: number
  make: string
  model: string
  trim: string | null
  engineDesc: string | null
  driveType: string | null
  fuelTypePrimary: string | null
  /** null when the NHTSA recalls service could not be reached */
  modelRecallCount: number | null
}

export interface VinPreviewDependencies {
  decode: (vin: string) => Promise<VehicleData | null>
  fetchRecalls: (make: string, model: string, year: number) => Promise<NHTSARecallsResponse | null>
  now: () => number
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

export function createVinPreviewService(
  deps: VinPreviewDependencies = {
    decode: decodeVin,
    fetchRecalls: fetchNHTSARecalls,
    now: Date.now,
  }
) {
  const cache = new Map<string, { value: VinPreview; expiresAt: number }>()

  return async function getVinPreview(vin: string): Promise<VinPreview | null> {
    const cached = cache.get(vin)
    if (cached && cached.expiresAt > deps.now()) return cached.value

    const vehicle = await deps.decode(vin)
    if (!vehicle) return null

    const recalls = await deps.fetchRecalls(vehicle.make, vehicle.model, vehicle.year)

    const preview: VinPreview = {
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      engineDesc: vehicle.engineDesc,
      driveType: vehicle.driveType,
      fuelTypePrimary: vehicle.fuelTypePrimary,
      modelRecallCount: recalls ? recalls.results.length : null,
    }

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
    if (recalls) cache.set(vin, { value: preview, expiresAt: deps.now() + CACHE_TTL_MS })

    return preview
  }
}
