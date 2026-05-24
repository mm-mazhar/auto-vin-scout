// tests/integration/vin-decoder-nhtsa-first.property.test.ts
//
// Property-based tests for the NHTSA-first MarketCheck-append decode flow.
// Validates correctness properties from the design document using fast-check.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { decodeVinForTier } from '@/lib/services/vin-decoder'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'
import type { VehicleData } from '@/lib/services/nhtsa-decoder'
import type { MarketCheckVehicleData } from '@/lib/services/marketcheck-decoder'

// --- Arbitraries ---

const VALID_VIN = '1FTFW1E84MFA12345'

/** Generates a non-whitespace string (avoids normalization edge cases) */
const nonEmptyStr = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 -]{0,28}[A-Za-z0-9]$/)

/** Generates arbitrary VehicleData (NHTSA response) with random field values */
const vehicleDataArb: fc.Arbitrary<VehicleData> = fc.record({
  vin: fc.constant(VALID_VIN),
  make: nonEmptyStr,
  model: nonEmptyStr,
  year: fc.integer({ min: 1980, max: 2030 }),
  trim: fc.option(nonEmptyStr, { nil: null }),
  engineDesc: fc.option(nonEmptyStr, { nil: null }),
  driveType: fc.option(nonEmptyStr, { nil: null }),
  vehicleType: fc.option(nonEmptyStr, { nil: null }),
  manufacturer: fc.option(nonEmptyStr, { nil: null }),
  plantCity: fc.option(nonEmptyStr, { nil: null }),
  plantCountry: fc.option(nonEmptyStr, { nil: null }),
  engineModel: fc.option(nonEmptyStr, { nil: null }),
  engineCylinders: fc.option(fc.constantFrom('3', '4', '5', '6', '8', '10', '12'), { nil: null }),
  fuelInjectionType: fc.option(nonEmptyStr, { nil: null }),
  fuelTypePrimary: fc.option(nonEmptyStr, { nil: null }),
  fuelTypeSecondary: fc.option(nonEmptyStr, { nil: null }),
  electrificationLevel: fc.option(nonEmptyStr, { nil: null }),
  turbo: fc.option(nonEmptyStr, { nil: null }),
})

/** Generates arbitrary MarketCheck premium field values */
const premiumFieldsArb = fc.record({
  bodyType: fc.option(nonEmptyStr, { nil: null }),
  bodySubtype: fc.option(nonEmptyStr, { nil: null }),
  transmission: fc.option(nonEmptyStr, { nil: null }),
  doors: fc.option(fc.integer({ min: 2, max: 6 }), { nil: null }),
  engineSize: fc.option(fc.double({ min: 1.0, max: 8.0, noNaN: true }), { nil: null }),
  cylinders: fc.option(fc.integer({ min: 3, max: 12 }), { nil: null }),
  overallHeight: fc.option(fc.double({ min: 50, max: 100, noNaN: true }), { nil: null }),
  overallLength: fc.option(fc.double({ min: 120, max: 280, noNaN: true }), { nil: null }),
  overallWidth: fc.option(fc.double({ min: 55, max: 95, noNaN: true }), { nil: null }),
  stdSeating: fc.option(fc.integer({ min: 2, max: 12 }), { nil: null }),
  highwayMpg: fc.option(fc.integer({ min: 10, max: 100 }), { nil: null }),
  cityMpg: fc.option(fc.integer({ min: 10, max: 80 }), { nil: null }),
  powertrainType: fc.option(nonEmptyStr, { nil: null }),
})

type PremiumFields = {
  bodyType: string | null
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
}

/** Builds a full MarketCheckVehicleData from NHTSA base + premium fields */
function buildMarketCheckData(
  nhtsaData: VehicleData,
  premium: PremiumFields
): MarketCheckVehicleData {
  return {
    ...nhtsaData,
    bodyType: premium.bodyType,
    bodySubtype: premium.bodySubtype,
    transmission: premium.transmission,
    doors: premium.doors,
    engineSize: premium.engineSize,
    cylinders: premium.cylinders,
    overallHeight: premium.overallHeight,
    overallLength: premium.overallLength,
    overallWidth: premium.overallWidth,
    stdSeating: premium.stdSeating,
    highwayMpg: premium.highwayMpg,
    cityMpg: premium.cityMpg,
    powertrainType: premium.powertrainType,
    decoderSource: 'MARKETCHECK',
  }
}

// --- Field key constants for assertions ---
const NHTSA_FIELD_KEYS = [
  'vin', 'make', 'model', 'year', 'trim', 'engineDesc', 'driveType',
  'vehicleType', 'manufacturer', 'plantCity', 'plantCountry',
  'engineModel', 'engineCylinders', 'fuelInjectionType',
  'fuelTypePrimary', 'fuelTypeSecondary', 'electrificationLevel', 'turbo',
] as const

const PREMIUM_FIELD_KEYS = [
  'bodySubtype', 'transmission', 'doors', 'engineSize', 'cylinders',
  'overallHeight', 'overallLength', 'overallWidth', 'stdSeating',
  'highwayMpg', 'cityMpg', 'powertrainType',
] as const

// --- Tests ---

describe('NHTSA-First Decode: Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('Property 1: NHTSA fields always populated for PAID tier', () => {
    /**
     * **Validates: Requirements 1.3, 1.4**
     *
     * For any successful PAID tier decode, the result SHALL contain all NHTSA fields
     * from the NHTSA response — regardless of MarketCheck success/failure.
     */
    it('all NHTSA fields present when MarketCheck succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, premiumFieldsArb, async (nhtsaData, premium) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(
            buildMarketCheckData(nhtsaData, premium)
          )

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          for (const key of NHTSA_FIELD_KEYS) {
            expect(result![key]).toBe(nhtsaData[key])
          }
        }),
        { numRuns: 30 }
      )
    })

    it('all NHTSA fields present when MarketCheck returns null', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          for (const key of NHTSA_FIELD_KEYS) {
            expect(result![key]).toBe(nhtsaData[key])
          }
        }),
        { numRuns: 30 }
      )
    })

    it('all NHTSA fields present when MarketCheck throws', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockRejectedValue(
            new Error('API timeout')
          )

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          for (const key of NHTSA_FIELD_KEYS) {
            expect(result![key]).toBe(nhtsaData[key])
          }
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Property 2: Premium fields from MarketCheck when available', () => {
    /**
     * **Validates: Requirements 2.1, 2.2**
     *
     * For any successful PAID tier decode where MarketCheck also succeeds,
     * the result SHALL contain the 12 premium fields from MarketCheck.
     */
    it('all 12 premium fields match MarketCheck input', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, premiumFieldsArb, async (nhtsaData, premium) => {
          const mcData = buildMarketCheckData(nhtsaData, premium)
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mcData)

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          for (const key of PREMIUM_FIELD_KEYS) {
            expect(result![key]).toBe(premium[key])
          }
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Property 3: Graceful degradation preserves NHTSA data', () => {
    /**
     * **Validates: Requirements 1.4, 3.1**
     *
     * When MarketCheck fails (null or throws), NHTSA fields are unchanged
     * and all 12 premium fields are null.
     */
    it('NHTSA fields unchanged and premium fields null when MarketCheck returns null', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          for (const key of NHTSA_FIELD_KEYS) {
            expect(result![key]).toBe(nhtsaData[key])
          }
          for (const key of PREMIUM_FIELD_KEYS) {
            expect(result![key]).toBeNull()
          }
        }),
        { numRuns: 30 }
      )
    })

    it('NHTSA fields unchanged and premium fields null when MarketCheck throws', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockRejectedValue(
            new Error('Network error')
          )

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          for (const key of NHTSA_FIELD_KEYS) {
            expect(result![key]).toBe(nhtsaData[key])
          }
          for (const key of PREMIUM_FIELD_KEYS) {
            expect(result![key]).toBeNull()
          }
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Property 4: Decoder source tracking', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     *
     * For PAID tier: decoderSource is 'MARKETCHECK' when MarketCheck succeeds,
     * 'NHTSA_FALLBACK' when MarketCheck fails.
     */
    it('decoderSource is MARKETCHECK when MarketCheck succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, premiumFieldsArb, async (nhtsaData, premium) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(
            buildMarketCheckData(nhtsaData, premium)
          )

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          expect(result!.decoderSource).toBe('MARKETCHECK')
        }),
        { numRuns: 30 }
      )
    })

    it('decoderSource is NHTSA_FALLBACK when MarketCheck returns null', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          expect(result!.decoderSource).toBe('NHTSA_FALLBACK')
        }),
        { numRuns: 30 }
      )
    })

    it('decoderSource is NHTSA_FALLBACK when MarketCheck throws', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockRejectedValue(
            new Error('Service unavailable')
          )

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          expect(result!.decoderSource).toBe('NHTSA_FALLBACK')
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Property 5: Non-PAID paths unchanged', () => {
    /**
     * **Validates: Requirements 5.1, 5.2**
     *
     * For FREE_TIER and ZERO_CREDITS: no MarketCheck call, decoderSource is 'NHTSA'.
     */
    it('FREE_TIER never calls MarketCheck and decoderSource is NHTSA', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          const mcSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

          const result = await decodeVinForTier(VALID_VIN, 'FREE_TIER')

          expect(result).not.toBeNull()
          expect(result!.decoderSource).toBe('NHTSA')
          expect(mcSpy).not.toHaveBeenCalled()
        }),
        { numRuns: 30 }
      )
    })

    it('ZERO_CREDITS never calls MarketCheck and decoderSource is NHTSA', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          const mcSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

          const result = await decodeVinForTier(VALID_VIN, 'ZERO_CREDITS')

          expect(result).not.toBeNull()
          expect(result!.decoderSource).toBe('NHTSA')
          expect(mcSpy).not.toHaveBeenCalled()
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Property 6: Output conforms to EnhancedVehicleData', () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * For any successful PAID tier decode: vin, make, model, year, decoderSource
     * are non-null. All 12 premium fields are defined (value or null, never undefined).
     */
    it('required fields non-null and premium fields defined for MarketCheck success', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, premiumFieldsArb, async (nhtsaData, premium) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(
            buildMarketCheckData(nhtsaData, premium)
          )

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          // Required fields are non-null
          expect(result!.vin).not.toBeNull()
          expect(result!.make).not.toBeNull()
          expect(result!.model).not.toBeNull()
          expect(result!.year).not.toBeNull()
          expect(result!.decoderSource).not.toBeNull()
          // All 12 premium fields are defined (not undefined)
          for (const key of PREMIUM_FIELD_KEYS) {
            expect(result![key]).not.toBeUndefined()
          }
        }),
        { numRuns: 30 }
      )
    })

    it('required fields non-null and premium fields defined for MarketCheck failure', async () => {
      await fc.assert(
        fc.asyncProperty(vehicleDataArb, async (nhtsaData) => {
          vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(nhtsaData)
          vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)

          const result = await decodeVinForTier(VALID_VIN, 'PAID')

          expect(result).not.toBeNull()
          // Required fields are non-null
          expect(result!.vin).not.toBeNull()
          expect(result!.make).not.toBeNull()
          expect(result!.model).not.toBeNull()
          expect(result!.year).not.toBeNull()
          expect(result!.decoderSource).not.toBeNull()
          // All 12 premium fields are defined (not undefined) — they should be null
          for (const key of PREMIUM_FIELD_KEYS) {
            expect(result![key]).not.toBeUndefined()
          }
        }),
        { numRuns: 30 }
      )
    })
  })
})
