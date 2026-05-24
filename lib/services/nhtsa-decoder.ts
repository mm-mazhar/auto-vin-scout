// lib/services/nhtsa-decoder.ts

/**
 * NHTSA vPIC API Integration Service
 * 
 * Decodes Vehicle Identification Numbers (VINs) using the NHTSA vPIC API
 * to extract vehicle identity and configuration data.
 */

import { NHTSA_VIN_DECODER } from '../constants'

interface NHTSAApiResponse {
  Results: Array<{
    Make: string | null
    Model: string | null
    ModelYear: string | null
    Trim: string | null
    DriveType: string | null
    VehicleType: string | null
    Manufacturer: string | null
    PlantCity: string | null
    PlantCountry: string | null
    EngineModel: string | null
    EngineCylinders: string | null
    FuelInjectionType: string | null
    FuelTypePrimary: string | null
    FuelTypeSecondary: string | null
    ElectrificationLevel: string | null
    Turbo: string | null
  }>
}

export interface VehicleData {
  vin: string
  make: string
  model: string
  year: number
  trim: string | null
  engineDesc: string | null
  driveType: string | null
  vehicleType: string | null
  manufacturer: string | null
  plantCity: string | null
  plantCountry: string | null
  engineModel: string | null
  engineCylinders: string | null
  fuelInjectionType: string | null
  fuelTypePrimary: string | null
  fuelTypeSecondary: string | null
  electrificationLevel: string | null
  turbo: string | null
}

/**
 * Generates a human-readable engine description from NHTSA engine fields
 */
function generateEngineDescription(results: NHTSAApiResponse['Results'][0]): string | null {
  const parts: string[] = []

  if (results.EngineCylinders) {
    parts.push(`${results.EngineCylinders}-cylinder`)
  }

  if (results.EngineModel) {
    parts.push(results.EngineModel)
  }

  if (results.FuelInjectionType) {
    parts.push(results.FuelInjectionType)
  }

  if (results.FuelTypePrimary) {
    parts.push(results.FuelTypePrimary)
  }

  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Normalizes empty strings and "Not Applicable" values to null
 */
function normalizeValue(value: string | null | undefined): string | null {
  if (!value || value.trim() === '' || value === 'Not Applicable') {
    return null
  }
  return value.trim()
}

/**
 * Decodes a VIN using the NHTSA vPIC API
 * 
 * @param vin - Valid 17-character VIN
 * @returns VehicleData object if successful, null if decode fails
 */
export async function decodeVin(vin: string): Promise<VehicleData | null> {
  const url = `${NHTSA_VIN_DECODER}/api/vehicles/DecodeVinValues/${vin}?format=json`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`NHTSA API returned status ${response.status}`)
      return null
    }

    const json = (await response.json()) as NHTSAApiResponse

    if (!json.Results || json.Results.length === 0) {
      console.error('NHTSA API returned no results')
      return null
    }

    const results = json.Results[0]

    // Validate required fields
    const make = normalizeValue(results.Make)
    const model = normalizeValue(results.Model)
    const yearStr = normalizeValue(results.ModelYear)

    if (!make || !model || !yearStr) {
      console.error('NHTSA API missing required fields (Make, Model, or Year)')
      return null
    }

    const year = parseInt(yearStr, 10)
    if (isNaN(year)) {
      console.error('NHTSA API returned invalid year')
      return null
    }

    // Build vehicle data object
    const vehicleData: VehicleData = {
      vin,
      make,
      model,
      year,
      trim: normalizeValue(results.Trim),
      engineDesc: generateEngineDescription(results),
      driveType: normalizeValue(results.DriveType),
      vehicleType: normalizeValue(results.VehicleType),
      manufacturer: normalizeValue(results.Manufacturer),
      plantCity: normalizeValue(results.PlantCity),
      plantCountry: normalizeValue(results.PlantCountry),
      engineModel: normalizeValue(results.EngineModel),
      engineCylinders: normalizeValue(results.EngineCylinders),
      fuelInjectionType: normalizeValue(results.FuelInjectionType),
      fuelTypePrimary: normalizeValue(results.FuelTypePrimary),
      fuelTypeSecondary: normalizeValue(results.FuelTypeSecondary),
      electrificationLevel: normalizeValue(results.ElectrificationLevel),
      turbo: normalizeValue(results.Turbo),
    }

    return vehicleData
  } catch (error) {
    console.error('NHTSA API request failed:', error)
    return null
  }
}
