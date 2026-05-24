// tests/integration/vin-decoder-nhtsa-first.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { decodeVinForTier } from '@/lib/services/vin-decoder'
import * as nhtsaDecoder from '@/lib/services/nhtsa-decoder'
import * as marketcheckDecoder from '@/lib/services/marketcheck-decoder'

const VALID_VIN = '1FTFW1E84MFA12345'

/**
 * NHTSA mock with specific values for fields that MarketCheck should never overwrite.
 */
const mockNHTSAData = {
  vin: VALID_VIN,
  make: 'Ford',
  model: 'F-150',
  year: 2021,
  trim: 'XL',
  engineDesc: '2.7L V6',
  driveType: '4WD',
  vehicleType: 'Truck',
  manufacturer: 'Ford Motor Company',
  plantCity: 'Dearborn',
  plantCountry: 'USA',
  engineModel: 'EcoBoost',
  engineCylinders: '6',
  fuelInjectionType: 'Direct Injection',
  fuelTypePrimary: 'Gasoline',
  fuelTypeSecondary: null,
  electrificationLevel: 'None',
  turbo: 'Twin Turbo',
}

/**
 * MarketCheck mock that includes shared fields (make, model, year) with DIFFERENT values
 * plus all 12 premium fields AND extra fields beyond the 12.
 */
const mockMarketCheckWithExtras = {
  vin: VALID_VIN,
  // Shared fields with DIFFERENT values than NHTSA
  make: 'FORD',
  model: 'F150',
  year: 2022,
  trim: 'Lariat',
  engineDesc: '3.5L V6 EcoBoost',
  driveType: 'AWD',
  vehicleType: 'Pickup',
  manufacturer: 'Ford Motor Co',
  plantCity: 'Kansas City',
  plantCountry: 'United States',
  engineModel: 'EcoBoost 3.5',
  engineCylinders: '6',
  fuelInjectionType: 'Port Injection',
  fuelTypePrimary: 'Premium Gasoline',
  fuelTypeSecondary: 'E85',
  electrificationLevel: 'Mild Hybrid',
  turbo: 'Single Turbo',
  // The 12 premium fields
  bodyType: null,

  bodySubtype: 'Crew Cab',
  transmission: '10-Speed Automatic',
  doors: 4,
  engineSize: 3.5,
  cylinders: 6,
  overallHeight: 77.2,
  overallLength: 231.9,
  overallWidth: 79.9,
  stdSeating: 6,
  highwayMpg: 26,
  cityMpg: 20,
  powertrainType: 'ICE',
  decoderSource: 'MARKETCHECK' as const,
}

/**
 * MarketCheck mock with partial premium fields (some null).
 */
const mockMarketCheckPartial = {
  vin: VALID_VIN,
  make: 'FORD',
  model: 'F150',
  year: 2022,
  trim: null,
  engineDesc: null,
  driveType: null,
  vehicleType: null,
  manufacturer: null,
  plantCity: null,
  plantCountry: null,
  engineModel: null,
  engineCylinders: null,
  fuelInjectionType: null,
  fuelTypePrimary: null,
  fuelTypeSecondary: null,
  electrificationLevel: null,
  turbo: null,
  // Only some premium fields populated
  bodyType: null,

  bodySubtype: 'SuperCrew',
  transmission: null,
  doors: 4,
  engineSize: null,
  cylinders: null,
  overallHeight: null,
  overallLength: 232.6,
  overallWidth: null,
  stdSeating: 5,
  highwayMpg: null,
  cityMpg: null,
  powertrainType: null,
  decoderSource: 'MARKETCHECK' as const,
}

describe('Premium Field Cherry-Picking (NHTSA-First Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('only cherry-picks the 12 premium fields from MarketCheck, ignoring extra shared fields', async () => {
    // #given: NHTSA returns base data, MarketCheck returns data with extra shared fields
    vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
    vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckWithExtras)

    // #when: Decode for PAID tier
    const result = await decodeVinForTier(VALID_VIN, 'PAID')

    // #then: NHTSA values used for shared fields (not MarketCheck's different values)
    expect(result).toBeDefined()
    expect(result!.make).toBe('Ford') // NHTSA value, not 'FORD'
    expect(result!.model).toBe('F-150') // NHTSA value, not 'F150'
    expect(result!.year).toBe(2021) // NHTSA value, not 2022
    expect(result!.trim).toBe('XL') // NHTSA value, not 'Lariat'
    expect(result!.engineDesc).toBe('2.7L V6') // NHTSA value
    expect(result!.driveType).toBe('AWD') // MarketCheck overrides NHTSA driveType
    expect(result!.vehicleType).toBe('Truck') // NHTSA value, not 'Pickup'

    // #then: Only the 12 premium fields come from MarketCheck
    expect(result!.bodySubtype).toBe('Crew Cab')
    expect(result!.transmission).toBe('10-Speed Automatic')
    expect(result!.doors).toBe(4)
    expect(result!.engineSize).toBe(3.5)
    expect(result!.cylinders).toBe(6)
    expect(result!.overallHeight).toBe(77.2)
    expect(result!.overallLength).toBe(231.9)
    expect(result!.overallWidth).toBe(79.9)
    expect(result!.stdSeating).toBe(6)
    expect(result!.highwayMpg).toBe(26)
    expect(result!.cityMpg).toBe(20)
    expect(result!.powertrainType).toBe('ICE')
  })

  it('preserves null premium fields when MarketCheck returns partial data', async () => {
    // #given: NHTSA returns full data, MarketCheck returns only some premium fields
    vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
    vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckPartial)

    // #when: Decode for PAID tier
    const result = await decodeVinForTier(VALID_VIN, 'PAID')

    // #then: Non-null premium fields are present
    expect(result).toBeDefined()
    expect(result!.bodySubtype).toBe('SuperCrew')
    expect(result!.doors).toBe(4)
    expect(result!.overallLength).toBe(232.6)
    expect(result!.stdSeating).toBe(5)

    // #then: Null premium fields remain null
    expect(result!.transmission).toBeNull()
    expect(result!.engineSize).toBeNull()
    expect(result!.cylinders).toBeNull()
    expect(result!.overallHeight).toBeNull()
    expect(result!.overallWidth).toBeNull()
    expect(result!.highwayMpg).toBeNull()
    expect(result!.cityMpg).toBeNull()
    expect(result!.powertrainType).toBeNull()

    // #then: decoderSource still MARKETCHECK since MarketCheck returned data
    expect(result!.decoderSource).toBe('MARKETCHECK')
  })

  it('NHTSA fields are never overwritten by MarketCheck values', async () => {
    // #given: NHTSA has specific values for manufacturer, turbo, plantCity, engineModel,
    //         fuelInjectionType, electrificationLevel. MarketCheck has DIFFERENT values for those.
    vi.spyOn(nhtsaDecoder, 'decodeVin').mockResolvedValue(mockNHTSAData)
    vi.spyOn(marketcheckDecoder, 'decodeVinMarketCheck').mockResolvedValue(mockMarketCheckWithExtras)

    // #when: Decode for PAID tier
    const result = await decodeVinForTier(VALID_VIN, 'PAID')

    // #then: NHTSA-exclusive fields always use NHTSA values
    expect(result).toBeDefined()
    expect(result!.manufacturer).toBe('Ford Motor Company') // NOT 'Ford Motor Co'
    expect(result!.turbo).toBe('Twin Turbo') // NOT 'Single Turbo'
    expect(result!.plantCity).toBe('Dearborn') // NOT 'Kansas City'
    expect(result!.engineModel).toBe('EcoBoost') // NOT 'EcoBoost 3.5'
    expect(result!.fuelInjectionType).toBe('Direct Injection') // NOT 'Port Injection'
    expect(result!.electrificationLevel).toBe('None') // NOT 'Mild Hybrid'

    // Also verify other NHTSA fields are preserved
    expect(result!.plantCountry).toBe('USA') // NOT 'United States'
    expect(result!.engineCylinders).toBe('6')
    expect(result!.fuelTypePrimary).toBe('Gasoline') // NOT 'Premium Gasoline'
    expect(result!.fuelTypeSecondary).toBeNull() // NOT 'E85'
  })
})
