// tests/integration/marketcheck-decoder.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { decodeVinMarketCheck } from '@/lib/services/marketcheck-decoder'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

const VALID_VIN = '1FTFW1E84MFA12345'

const fullMarketCheckResponse = {
  is_valid: true,
  decode_mode: 'fullVIN',
  year: 2021,
  make: 'Ford',
  model: 'F-150',
  trim: 'XL',
  body_type: 'Pickup',
  body_subtype: 'Crew',
  vehicle_type: 'Truck',
  transmission: 'Automatic',
  drivetrain: '4WD',
  fuel_type: 'Unleaded',
  engine: '2.7L V6',
  engine_size: 2.7,
  doors: 4,
  cylinders: 6,
  made_in: 'USA',
  overall_height: '77.2',   // string per API docs
  overall_length: '231.9',  // string per API docs
  overall_width: '79.9',    // string per API docs
  std_seating: '6',         // string per API docs
  highway_mpg: 27,
  city_mpg: 24,
  powertrain_type: 'Combustion',
}

describe('MarketCheck Decoder Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Test 1: Successful decode with all premium fields', async () => {
    // #given: Mock MarketCheck API response with all premium fields
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => fullMarketCheckResponse,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return complete vehicle data with all premium fields
    expect(result).toBeDefined()
    expect(result?.vin).toBe(VALID_VIN)
    expect(result?.make).toBe('Ford')
    expect(result?.model).toBe('F-150')
    expect(result?.year).toBe(2021)
    expect(result?.trim).toBe('XL')
    expect(result?.driveType).toBe('4WD')
    expect(result?.fuelTypePrimary).toBe('Unleaded')
    expect(result?.plantCountry).toBe('USA')
    // Premium fields
    expect(result?.bodySubtype).toBe('Crew')
    expect(result?.transmission).toBe('Automatic')
    expect(result?.doors).toBe(4)
    expect(result?.engineSize).toBe(2.7)
    expect(result?.cylinders).toBe(6)
    expect(result?.overallHeight).toBe(77.2)
    expect(result?.overallLength).toBe(231.9)
    expect(result?.overallWidth).toBe(79.9)
    expect(result?.stdSeating).toBe(6)
    expect(result?.highwayMpg).toBe(27)
    expect(result?.cityMpg).toBe(24)
    expect(result?.powertrainType).toBe('Combustion')
    expect(result?.decoderSource).toBe('MARKETCHECK')
  })

  it('Test 2: Successful decode with partial premium fields (nulls)', async () => {
    // #given: Mock MarketCheck API response with missing premium fields
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        vin: VALID_VIN,
        year: 2021,
        make: 'Ford',
        model: 'F-150',
        // No premium fields
      }),
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Premium fields should be null
    expect(result).toBeDefined()
    expect(result?.make).toBe('Ford')
    expect(result?.bodySubtype).toBeNull()
    expect(result?.transmission).toBeNull()
    expect(result?.doors).toBeNull()
    expect(result?.engineSize).toBeNull()
    expect(result?.cylinders).toBeNull()
    expect(result?.overallHeight).toBeNull()
    expect(result?.overallLength).toBeNull()
    expect(result?.overallWidth).toBeNull()
    expect(result?.stdSeating).toBeNull()
    expect(result?.highwayMpg).toBeNull()
    expect(result?.cityMpg).toBeNull()
    expect(result?.powertrainType).toBeNull()
    expect(result?.decoderSource).toBe('MARKETCHECK')
  })

  it('Test 3: Response without vin field uses the requested VIN', async () => {
    // #given: Mock MarketCheck API response without a vin field (real API behavior)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...fullMarketCheckResponse,
        // No vin field - real API doesn't return it
      }),
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should succeed and use the requested VIN
    expect(result).toBeDefined()
    expect(result?.vin).toBe(VALID_VIN)
  })

  it('Test 4: Authentication error (401) returns null', async () => {
    // #given: Mock MarketCheck API to return 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 5: Forbidden error (403) returns null', async () => {
    // #given: Mock MarketCheck API to return 403
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 6: Rate limit error (429) returns null', async () => {
    // #given: Mock MarketCheck API to return 429
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 7: Server error (500) returns null', async () => {
    // #given: Mock MarketCheck API to return 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 8: Service unavailable (503) returns null', async () => {
    // #given: Mock MarketCheck API to return 503
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 8b: Bad gateway (502) returns null', async () => {
    // #given: Mock MarketCheck API to return 502
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 8c: Unprocessable VIN (422) returns null', async () => {
    // #given: MarketCheck returns 422 when VIN is valid format but cannot be decoded
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ is_valid: true, code: 422, message: `Unable to decode ${VALID_VIN}` }),
    })

    // #when: Decode a VIN that MarketCheck cannot process
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers NHTSA fallback, not an error throw)
    expect(result).toBeNull()
  })

  it('Test 8d: Bad request (400) returns null', async () => {
    // #given: MarketCheck returns 400 for invalid VIN format
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    })

    // #when: Decode a VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 9: Timeout returns null', async () => {
    // #given: Mock fetch to simulate AbortError (timeout)
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    )

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null (triggers fallback)
    expect(result).toBeNull()
  })

  it('Test 10: Doors out of range is set to null', async () => {
    // #given: Mock response with doors value out of valid range (1-10)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...fullMarketCheckResponse,
        doors: 20, // Out of range
      }),
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Doors should be null (out of range)
    expect(result?.doors).toBeNull()
  })

  it('Test 11: Cylinders out of range is set to null', async () => {
    // #given: Mock response with cylinders value out of valid range (1-16)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...fullMarketCheckResponse,
        cylinders: 32, // Out of range
      }),
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Cylinders should be null (out of range)
    expect(result?.cylinders).toBeNull()
  })

  it('Test 12: Missing required fields returns null', async () => {
    // #given: Mock response missing make/model/year
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        vin: VALID_VIN,
        // Missing make, model, year
      }),
    })

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null
    expect(result).toBeNull()
  })

  it('Test 13: Network error returns null', async () => {
    // #given: Mock fetch to throw network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    // #when: Decode a valid VIN
    const result = await decodeVinMarketCheck(VALID_VIN)

    // #then: Should return null
    expect(result).toBeNull()
  })
})
