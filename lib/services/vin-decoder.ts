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
 * Decodes a VIN using the appropriate decoder based on user tier
 * 
 * Tier-based routing:
 * - PAID: MarketCheck → NHTSA fallback on failure
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

  // PAID tier: Try MarketCheck first
  try {
    const premiumData = await decodeVinMarketCheck(vin)
    if (premiumData) {
      return {
        ...premiumData,
        decoderSource: 'MARKETCHECK',
      }
    }
  } catch (error) {
    console.error('MarketCheck decoder failed:', {
      vin,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }

  // Fallback to NHTSA
  console.warn(`MarketCheck failed for VIN ${vin}, falling back to NHTSA`)
  const basicData = await decodeVin(vin)
  if (!basicData) {
    return null
  }

  return {
    ...basicData,
    decoderSource: 'NHTSA_FALLBACK',
  }
}
