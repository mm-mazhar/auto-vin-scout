// tests/integration/vin-decoder-unified.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { decodeVinForTier } from '@/lib/services/vin-decoder'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'

const VALID_VIN = '1FTFW1E84MFA12345'

const mockNHTSAData = {
  vin: VALID_VIN,
  make: 'Ford',
  model: 'F-150',
  year: 2021,
  trim: 'XL',
  engine: '2.7L V6',
  driveType: '4WD',
  vehicleType: 'Truck',
  manufacturer: 'Ford Motor Company',
  plantCity: 'Dearborn',
  plantCountry: 'USA',
  engineModel: 'EcoBoost',
  engineCylinders: '6',
  fuelInjectionType: null,
  fuelTypePrimary: 'Gasoline',
  fuelTypeSecondary: null,
  electrificationLevel: null,
}

const mockMarketCheckData = {
  ...mockNHTSAData,
  bodySubtype: 'Crew',
  transmission: 'Automatic',
  doors: 4,
  engineSize: 2.7,
  cylinders: 6,
  overallHeight: 77.2,
  overallLength: 231.9,
  overallWidth: 79.9,
  stdSeating: 6,
  highwayMpg: 27,
  cityMpg: 24,
  powertrainType: 'Combustion',
  decoderSource: 'MARKETCHECK' as const,
}

describe('Unified VIN Decoder Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('FREE_TIER', () => {
    it('Test 1: FREE_TIER uses NHTSA only and never calls MarketCheck', async () => {
      // #given: Mocked NHTSA decoder and spy on MarketCheck
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const marketCheckSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

      // #when: Decode for FREE_TIER
      const result = await decodeVinForTier(VALID_VIN, 'FREE_TIER')

      // #then: Should use NHTSA and never call MarketCheck
      expect(result).toBeDefined()
      expect(result?.decoderSource).toBe('NHTSA')
      expect(nhtsaDecoder.decodeVin).toHaveBeenCalledOnce()
      expect(marketCheckSpy).not.toHaveBeenCalled()
    })

    it('Test 2: FREE_TIER returns null when NHTSA fails', async () => {
      // #given: NHTSA decoder returns null
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(null)

      // #when: Decode for FREE_TIER
      const result = await decodeVinForTier(VALID_VIN, 'FREE_TIER')

      // #then: Should return null
      expect(result).toBeNull()
    })
  })

  describe('ZERO_CREDITS', () => {
    it('Test 3: ZERO_CREDITS uses NHTSA only and never calls MarketCheck', async () => {
      // #given: Mocked NHTSA decoder and spy on MarketCheck
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const marketCheckSpy = vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck')

      // #when: Decode for ZERO_CREDITS
      const result = await decodeVinForTier(VALID_VIN, 'ZERO_CREDITS')

      // #then: Should use NHTSA and never call MarketCheck
      expect(result?.decoderSource).toBe('NHTSA')
      expect(marketCheckSpy).not.toHaveBeenCalled()
    })
  })

  describe('PAID tier', () => {
    it('Test 4: PAID tier uses MarketCheck on success', async () => {
      // #given: MarketCheck returns premium data
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckData)
      const nhtSASpy = vi.spyOn(nhtsaDecoder, 'decodeVin')

      // #when: Decode for PAID tier
      const result = await decodeVinForTier(VALID_VIN, 'PAID')

      // #then: Should use MarketCheck and not call NHTSA
      expect(result).toBeDefined()
      expect(result?.decoderSource).toBe('MARKETCHECK')
      expect(result?.bodySubtype).toBe('Crew')
      expect(result?.transmission).toBe('Automatic')
      expect(result?.doors).toBe(4)
      expect(nhtSASpy).not.toHaveBeenCalled()
    })

    it('Test 5: PAID tier falls back to NHTSA when MarketCheck returns null', async () => {
      // #given: MarketCheck returns null, NHTSA returns data
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)

      // #when: Decode for PAID tier
      const result = await decodeVinForTier(VALID_VIN, 'PAID')

      // #then: Should fallback to NHTSA with NHTSA_FALLBACK source
      expect(result).toBeDefined()
      expect(result?.decoderSource).toBe('NHTSA_FALLBACK')
      expect(result?.make).toBe('Ford')
      expect(nhtsaDecoder.decodeVin).toHaveBeenCalledOnce()
    })

    it('Test 6: PAID tier falls back to NHTSA when MarketCheck throws', async () => {
      // #given: MarketCheck throws an error, NHTSA returns data
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockRejectedValue(
        new Error('MarketCheck API error')
      )
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)

      // #when: Decode for PAID tier
      const result = await decodeVinForTier(VALID_VIN, 'PAID')

      // #then: Should fallback to NHTSA with NHTSA_FALLBACK source
      expect(result?.decoderSource).toBe('NHTSA_FALLBACK')
      expect(nhtsaDecoder.decodeVin).toHaveBeenCalledOnce()
    })

    it('Test 7: PAID tier returns null when both decoders fail', async () => {
      // #given: Both decoders fail
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(null)

      // #when: Decode for PAID tier
      const result = await decodeVinForTier(VALID_VIN, 'PAID')

      // #then: Should return null
      expect(result).toBeNull()
    })
  })

  describe('Fallback logging', () => {
    it('Test 12: logs warning when MarketCheck returns null and fallback occurs', async () => {
      // #given: MarketCheck returns null, NHTSA returns data, console.warn is spied on
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // #when: Decode for PAID tier
      await decodeVinForTier(VALID_VIN, 'PAID')

      // #then: Should log a warning about the fallback
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(VALID_VIN)
      )
    })

    it('Test 13: logs error when MarketCheck throws and fallback occurs', async () => {
      // #given: MarketCheck throws, NHTSA returns data, console.error is spied on
      const marketCheckError = new Error('Connection refused')
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockRejectedValue(marketCheckError)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // #when: Decode for PAID tier
      await decodeVinForTier(VALID_VIN, 'PAID')

      // #then: Should log the error with the VIN and message
      expect(errorSpy).toHaveBeenCalledWith(
        'MarketCheck decoder failed:',
        expect.objectContaining({
          vin: VALID_VIN,
          error: marketCheckError.message,
        })
      )
    })
  })

  describe('DecoderSource consistency', () => {
    it('Test 8: decoderSource is NHTSA for FREE_TIER', async () => {
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const result = await decodeVinForTier(VALID_VIN, 'FREE_TIER')
      expect(result?.decoderSource).toBe('NHTSA')
    })

    it('Test 9: decoderSource is NHTSA for ZERO_CREDITS', async () => {
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const result = await decodeVinForTier(VALID_VIN, 'ZERO_CREDITS')
      expect(result?.decoderSource).toBe('NHTSA')
    })

    it('Test 10: decoderSource is MARKETCHECK for PAID with successful MarketCheck', async () => {
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckData)
      const result = await decodeVinForTier(VALID_VIN, 'PAID')
      expect(result?.decoderSource).toBe('MARKETCHECK')
    })

    it('Test 11: decoderSource is NHTSA_FALLBACK for PAID with failed MarketCheck', async () => {
      vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(null)
      vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
      const result = await decodeVinForTier(VALID_VIN, 'PAID')
      expect(result?.decoderSource).toBe('NHTSA_FALLBACK')
    })
  })
})
