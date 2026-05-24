// lib/services/vin-decoder.ts

/**
 * Unified VIN Decoder Service
 * 
 * Provides tier-based VIN decoding with automatic decoder selection:
 * - PAID tier: MarketCheck (premium) with NHTSA fallback
 * - FREE_TIER/ZERO_CREDITS: NHTSA only
 */

import { decodeVin, type VehicleData } from './nhtsa-decoder'
import { decodeVinMarketCheck } from './marketcheck-decoder'
import type { UserTier } from '@/lib/orpc/routers/vin'
import type { Vehicle } from '@prisma/client'

/**
 * Decoder source types
 */
export type DecoderSource = 'NHTSA' | 'MARKETCHECK' | 'NHTSA_FALLBACK'

/**
 * Enhanced Vehicle Data with optional premium fields
 * Supports both NHTSA-only and MarketCheck responses
 */
export interface EnhancedVehicleData extends VehicleData {
  // Premium fields (nullable - only populated by MarketCheck)
  bodyType?: string | null
  bodySubtype?: string | null
  transmission?: string | null
  doors?: number | null
  engineSize?: number | null
  cylinders?: number | null
  overallHeight?: number | null
  overallLength?: number | null
  overallWidth?: number | null
  stdSeating?: number | null
  highwayMpg?: number | null
  cityMpg?: number | null
  powertrainType?: string | null
  
  // Decoder source tracking
  decoderSource: DecoderSource
}

/**
 * Determines whether a cached Vehicle record must be refreshed via MarketCheck.
 *
 * Returns true only when a PAID-tier user has an existing record that was decoded
 * by NHTSA — meaning premium fields are absent and MarketCheck should be called.
 * Pure function — no side effects.
 */
export function needsMarketCheckUpgrade(
  existingVehicle: Vehicle | null,
  tier: UserTier
): boolean {
  if (!existingVehicle) return false
  if (tier !== 'PAID') return false
  return (
    existingVehicle.decoderSource === 'NHTSA' ||
    existingVehicle.decoderSource === 'NHTSA_FALLBACK'
  )
}

/**
 * Decodes a VIN using the appropriate decoder based on user tier
 * 
 * Tier-based routing:
 * - PAID: NHTSA first (base fields), then cherry-pick premium fields from MarketCheck
 * - FREE_TIER/ZERO_CREDITS: NHTSA only
 * 
 * @param vin - Valid 17-character VIN
 * @param tier - User tier classification
 * @returns EnhancedVehicleData if successful, null if all decoders fail
 */
export async function decodeVinForTier(
  vin: string,
  tier: UserTier
): Promise<EnhancedVehicleData | null> {
  // FREE_TIER and ZERO_CREDITS use NHTSA only
  if (tier !== 'PAID') {
    const basicData = await decodeVin(vin)
    if (!basicData) {
      return null
    }
    
    return {
      ...basicData,
      decoderSource: 'NHTSA',
    }
  }

  // PAID tier: NHTSA first, then cherry-pick premium fields from MarketCheck
  const nhtsaData = await decodeVin(vin)
  if (!nhtsaData) {
    return null
  }

  let premiumFields: Awaited<ReturnType<typeof decodeVinMarketCheck>> | null = null
  try {
    premiumFields = await decodeVinMarketCheck(vin)
  } catch (error) {
    console.warn('MarketCheck decoder failed, using NHTSA only:', {
      vin,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }

  if (!premiumFields) {
    console.warn(`MarketCheck returned null for VIN ${vin}, using NHTSA only`)
  }

  return {
    ...nhtsaData,
    // Override base fields where MarketCheck provides better data
    driveType: premiumFields?.driveType ?? nhtsaData.driveType,
    // Cherry-pick premium fields from MarketCheck
    bodyType: premiumFields?.bodyType ?? null,
    bodySubtype: premiumFields?.bodySubtype ?? null,
    transmission: premiumFields?.transmission ?? null,
    doors: premiumFields?.doors ?? null,
    engineSize: premiumFields?.engineSize ?? null,
    cylinders: premiumFields?.cylinders ?? null,
    overallHeight: premiumFields?.overallHeight ?? null,
    overallLength: premiumFields?.overallLength ?? null,
    overallWidth: premiumFields?.overallWidth ?? null,
    stdSeating: premiumFields?.stdSeating ?? null,
    highwayMpg: premiumFields?.highwayMpg ?? null,
    cityMpg: premiumFields?.cityMpg ?? null,
    powertrainType: premiumFields?.powertrainType ?? null,
    decoderSource: premiumFields ? 'MARKETCHECK' : 'NHTSA_FALLBACK',
  }
}
