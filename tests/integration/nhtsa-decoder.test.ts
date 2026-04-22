// tests/integration/nhtsa-decoder.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { decodeVin } from '@/lib/services/nhtsa-decoder'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('NHTSA Decoder Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Test 1: Successful decode with complete data', async () => {
    // #given: Mock NHTSA API response with complete vehicle data
    const mockResponse = {
      Results: [
        {
          Make: 'Toyota',
          Model: 'Camry',
          ModelYear: '2020',
          Trim: 'LE',
          DriveType: 'FWD',
          VehicleType: 'PASSENGER CAR',
          Manufacturer: 'TOYOTA MOTOR CORPORATION',
          PlantCity: 'Georgetown',
          PlantCountry: 'UNITED STATES (USA)',
          EngineModel: '2AR-FE',
          EngineCylinders: '4',
          FuelInjectionType: 'Direct',
          FuelTypePrimary: 'Gasoline',
          FuelTypeSecondary: null,
          ElectrificationLevel: 'Not Applicable',
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Decode a valid VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return complete vehicle data with normalized values
    expect(result).toBeDefined()
    expect(result?.vin).toBe('1HGBH41JXMN109186')
    expect(result?.make).toBe('Toyota')
    expect(result?.model).toBe('Camry')
    expect(result?.year).toBe(2020)
    expect(result?.trim).toBe('LE')
    expect(result?.driveType).toBe('FWD')
    expect(result?.vehicleType).toBe('PASSENGER CAR')
    expect(result?.manufacturer).toBe('TOYOTA MOTOR CORPORATION')
    expect(result?.plantCity).toBe('Georgetown')
    expect(result?.plantCountry).toBe('UNITED STATES (USA)')
    expect(result?.engineModel).toBe('2AR-FE')
    expect(result?.engineCylinders).toBe('4')
    expect(result?.fuelInjectionType).toBe('Direct')
    expect(result?.fuelTypePrimary).toBe('Gasoline')
    expect(result?.fuelTypeSecondary).toBeNull()
    expect(result?.electrificationLevel).toBeNull() // "Not Applicable" normalized to null
    expect(result?.engine).toBe('4-cylinder 2AR-FE Direct Gasoline')
  })

  it('Test 2: Successful decode with minimal data (only required fields)', async () => {
    // #given: Mock NHTSA API response with only required fields
    const mockResponse = {
      Results: [
        {
          Make: 'Honda',
          Model: 'Civic',
          ModelYear: '2018',
          Trim: null,
          DriveType: null,
          VehicleType: null,
          Manufacturer: null,
          PlantCity: null,
          PlantCountry: null,
          EngineModel: null,
          EngineCylinders: null,
          FuelInjectionType: null,
          FuelTypePrimary: null,
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Decode a valid VIN
    const result = await decodeVin('2HGFC2F59JH123456')

    // #then: Should return vehicle data with only required fields populated
    expect(result).toBeDefined()
    expect(result?.make).toBe('Honda')
    expect(result?.model).toBe('Civic')
    expect(result?.year).toBe(2018)
    expect(result?.trim).toBeNull()
    expect(result?.driveType).toBeNull()
    expect(result?.vehicleType).toBeNull()
    expect(result?.manufacturer).toBeNull()
    expect(result?.plantCity).toBeNull()
    expect(result?.plantCountry).toBeNull()
    expect(result?.engineModel).toBeNull()
    expect(result?.engineCylinders).toBeNull()
    expect(result?.fuelInjectionType).toBeNull()
    expect(result?.fuelTypePrimary).toBeNull()
    expect(result?.fuelTypeSecondary).toBeNull()
    expect(result?.electrificationLevel).toBeNull()
    expect(result?.engine).toBeNull()
  })

  it('Test 3: Engine description generation with partial data', async () => {
    // #given: Mock NHTSA API response with partial engine data
    const mockResponse = {
      Results: [
        {
          Make: 'Ford',
          Model: 'F-150',
          ModelYear: '2021',
          Trim: 'XLT',
          DriveType: '4WD',
          VehicleType: 'TRUCK',
          Manufacturer: 'FORD MOTOR COMPANY',
          PlantCity: 'Dearborn',
          PlantCountry: 'UNITED STATES (USA)',
          EngineModel: 'EcoBoost',
          EngineCylinders: '6',
          FuelInjectionType: null,
          FuelTypePrimary: 'Gasoline',
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Decode a valid VIN
    const result = await decodeVin('1FTFW1E84MFA12345')

    // #then: Should generate engine description from available fields
    expect(result).toBeDefined()
    expect(result?.engine).toBe('6-cylinder EcoBoost Gasoline')
  })

  it('Test 4: Normalize empty strings to null', async () => {
    // #given: Mock NHTSA API response with empty strings
    const mockResponse = {
      Results: [
        {
          Make: 'Tesla',
          Model: 'Model 3',
          ModelYear: '2022',
          Trim: '',
          DriveType: '  ',
          VehicleType: 'PASSENGER CAR',
          Manufacturer: 'TESLA, INC.',
          PlantCity: '',
          PlantCountry: 'UNITED STATES (USA)',
          EngineModel: '',
          EngineCylinders: '',
          FuelInjectionType: '',
          FuelTypePrimary: 'Electric',
          FuelTypeSecondary: '',
          ElectrificationLevel: 'BEV (Battery Electric Vehicle)',
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Decode a valid VIN
    const result = await decodeVin('5YJ3E1EA1JF123456')

    // #then: Should normalize empty strings to null
    expect(result).toBeDefined()
    expect(result?.trim).toBeNull()
    expect(result?.driveType).toBeNull()
    expect(result?.plantCity).toBeNull()
    expect(result?.engineModel).toBeNull()
    expect(result?.engineCylinders).toBeNull()
    expect(result?.fuelInjectionType).toBeNull()
    expect(result?.fuelTypeSecondary).toBeNull()
    expect(result?.electrificationLevel).toBe('BEV (Battery Electric Vehicle)')
  })

  it('Test 5: API returns non-200 status', async () => {
    // #given: Mock NHTSA API to return error status
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    // #when: Attempt to decode VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return null
    expect(result).toBeNull()
  })

  it('Test 6: API returns empty results array', async () => {
    // #given: Mock NHTSA API to return empty results
    const mockResponse = {
      Results: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Attempt to decode VIN
    const result = await decodeVin('INVALID_VIN_12345')

    // #then: Should return null
    expect(result).toBeNull()
  })

  it('Test 7: API returns missing required fields (Make)', async () => {
    // #given: Mock NHTSA API response missing Make
    const mockResponse = {
      Results: [
        {
          Make: null,
          Model: 'Unknown',
          ModelYear: '2020',
          Trim: null,
          DriveType: null,
          VehicleType: null,
          Manufacturer: null,
          PlantCity: null,
          PlantCountry: null,
          EngineModel: null,
          EngineCylinders: null,
          FuelInjectionType: null,
          FuelTypePrimary: null,
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Attempt to decode VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return null due to missing required field
    expect(result).toBeNull()
  })

  it('Test 8: API returns missing required fields (Model)', async () => {
    // #given: Mock NHTSA API response missing Model
    const mockResponse = {
      Results: [
        {
          Make: 'Toyota',
          Model: '',
          ModelYear: '2020',
          Trim: null,
          DriveType: null,
          VehicleType: null,
          Manufacturer: null,
          PlantCity: null,
          PlantCountry: null,
          EngineModel: null,
          EngineCylinders: null,
          FuelInjectionType: null,
          FuelTypePrimary: null,
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Attempt to decode VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return null due to missing required field
    expect(result).toBeNull()
  })

  it('Test 9: API returns invalid year', async () => {
    // #given: Mock NHTSA API response with invalid year
    const mockResponse = {
      Results: [
        {
          Make: 'Toyota',
          Model: 'Camry',
          ModelYear: 'INVALID',
          Trim: null,
          DriveType: null,
          VehicleType: null,
          Manufacturer: null,
          PlantCity: null,
          PlantCountry: null,
          EngineModel: null,
          EngineCylinders: null,
          FuelInjectionType: null,
          FuelTypePrimary: null,
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Attempt to decode VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return null due to invalid year
    expect(result).toBeNull()
  })

  it('Test 10: Network error during fetch', async () => {
    // #given: Mock fetch to throw network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    // #when: Attempt to decode VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return null and handle error gracefully
    expect(result).toBeNull()
  })

  it('Test 11: API returns malformed JSON', async () => {
    // #given: Mock fetch to return invalid JSON
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    // #when: Attempt to decode VIN
    const result = await decodeVin('1HGBH41JXMN109186')

    // #then: Should return null and handle error gracefully
    expect(result).toBeNull()
  })
})
