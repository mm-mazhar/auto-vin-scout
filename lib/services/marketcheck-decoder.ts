// lib/services/marketcheck-decoder.ts

/**
 * MarketCheck API Integration Service
 * 
 * Decodes Vehicle Identification Numbers (VINs) using the MarketCheck API
 * to extract enhanced vehicle data including transmission, dimensions, fuel economy, etc.
 */

import {
  PREMIUM_VIN_API_KEY,
  PREMIUM_VIN_API_SECRET,
  PREMIUM_VIN_BASE_URL,
  PREMIUM_VIN_TIMEOUT_MS,
} from '@/lib/constants'
import type { VehicleData } from './nhtsa-decoder'

/**
 * MarketCheck API Response Structure
 */
interface MarketCheckApiResponse {
  vin?: string
  is_valid?: boolean
  decode_mode?: string
  year: number
  make: string
  model: string
  trim?: string
  body_type?: string
  body_subtype?: string
  vehicle_type?: string
  transmission?: string
  drivetrain?: string
  fuel_type?: string
  engine?: string
  engine_size?: number
  doors?: number
  cylinders?: number
  made_in?: string
  overall_height?: string  // string per API docs
  overall_length?: string  // string per API docs
  overall_width?: string   // string per API docs
  std_seating?: string     // string per API docs
  highway_mpg?: number
  city_mpg?: number
  powertrain_type?: string
}

/**
 * Enhanced Vehicle Data with Premium Fields
 * Extends base VehicleData with MarketCheck-specific fields
 */
export interface MarketCheckVehicleData extends VehicleData {
  bodySubtype: string | null
  transmission: string | null
  doors: number | null
  engineSize: number | null
  cylinders: number | null
  overallHeight: number | null
  overallLength: number | null
  overallWidth: number | null
  stdSeating: number | null
  highwayMpg: number | null
  cityMpg: number | null
  powertrainType: string | null
  decoderSource: 'MARKETCHECK'
}

/**
 * Normalizes empty strings to null
 */
function normalizeString(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') {
    return null
  }
  return value.trim()
}

/**
 * Validates numeric field is within acceptable range.
 */
function validateNumeric(
  value: number | null | undefined,
  min: number,
  max: number
): number | null {
  if (value === null || value === undefined || isNaN(value)) {
    return null
  }
  if (value < min || value > max) {
    console.warn(`Numeric value ${value} out of range [${min}, ${max}], setting to null`)
    return null
  }
  return value
}

/**
 * Validates integer field, rounding floats.
 */
function validateInt(
  value: number | null | undefined,
  min: number,
  max: number
): number | null {
  const num = validateNumeric(value, min, max)
  return num !== null ? Math.round(num) : null
}

/**
 * Decodes a VIN using the MarketCheck API
 * 
 * @param vin - Valid 17-character VIN
 * @returns MarketCheckVehicleData object if successful, null if decode fails
 * 
 * Error Handling:
 * - Returns null on 401/403 (authentication errors)
 * - Returns null on 429 (rate limit)
 * - Returns null on 500/503 (server errors)
 * - Returns null on timeout
 * - Throws error on VIN mismatch (validation error)
 */
export async function decodeVinMarketCheck(
  vin: string
): Promise<MarketCheckVehicleData | null> {
  const url = `${PREMIUM_VIN_BASE_URL}/v2/decode/car/${vin}/specs?api_key=${PREMIUM_VIN_API_KEY}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PREMIUM_VIN_TIMEOUT_MS)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // 'X-API-Secret': PREMIUM_VIN_API_SECRET,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Handle error status codes with fallback
    if (response.status === 401 || response.status === 403) {
      console.error('MarketCheck API authentication failed', { status: response.status })
      return null
    }

    if (response.status === 400 || response.status === 422) {
      console.warn('MarketCheck API: VIN is invalid or cannot be decoded', { status: response.status })
      return null
    }

    if (response.status === 429) {
      console.warn('MarketCheck API rate limit exceeded')
      return null
    }

    if (response.status === 500 || response.status === 502 || response.status === 503) {
      console.error('MarketCheck API server/gateway error', { status: response.status })
      return null
    }

    if (!response.ok) {
      console.error(`MarketCheck API returned unexpected status ${response.status}`)
      return null
    }

    const data = (await response.json()) as MarketCheckApiResponse

    // Validate required fields
    if (!data.make || !data.model || !data.year) {
      console.error('MarketCheck API missing required fields (make, model, or year)')
      return null
    }

    // Build enhanced vehicle data object
    const vehicleData: MarketCheckVehicleData = {
      // Base fields
      vin,
      make: data.make,
      model: data.model,
      year: data.year,
      trim: normalizeString(data.trim),
      engine: normalizeString(data.engine),
      driveType: normalizeString(data.drivetrain),
      vehicleType: normalizeString(data.vehicle_type),
      manufacturer: null, // MarketCheck doesn't provide this
      plantCity: null, // MarketCheck doesn't provide this
      plantCountry: normalizeString(data.made_in),
      engineModel: null, // MarketCheck doesn't provide this
      engineCylinders: data.cylinders?.toString() || null,
      fuelInjectionType: null, // MarketCheck doesn't provide this
      fuelTypePrimary: normalizeString(data.fuel_type),
      fuelTypeSecondary: null, // MarketCheck doesn't provide this
      electrificationLevel: null, // MarketCheck doesn't provide this

      // Premium fields with validation
      bodySubtype: normalizeString(data.body_subtype),
      transmission: normalizeString(data.transmission),
      doors: validateInt(data.doors, 1, 10),
      engineSize: validateNumeric(data.engine_size, 0.5, 10.0),
      cylinders: validateInt(data.cylinders, 1, 16),
      overallHeight: validateNumeric(data.overall_height ? parseFloat(data.overall_height) : null, 40, 120),
      overallLength: validateNumeric(data.overall_length ? parseFloat(data.overall_length) : null, 100, 300),
      overallWidth: validateNumeric(data.overall_width ? parseFloat(data.overall_width) : null, 50, 100),
      stdSeating: validateInt(data.std_seating ? parseFloat(data.std_seating) : null, 1, 20),
      highwayMpg: validateNumeric(data.highway_mpg, 5, 150),
      cityMpg: validateNumeric(data.city_mpg, 5, 150),
      powertrainType: normalizeString(data.powertrain_type),

      // Decoder source
      decoderSource: 'MARKETCHECK',
    }

    return vehicleData
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('MarketCheck API request timed out')
        return null
      }
      // Re-throw validation errors
      if (error.message.includes('VIN mismatch')) {
        throw error
      }
    }
    console.error('MarketCheck API request failed:', error)
    return null
  }
}
