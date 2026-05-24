// tests/integration/nhtsa-decoder-turbo-exploration.test.ts

/**
 * Bug Condition Exploration Test: Turbo Field Dropped From Decode Output
 *
 * Validates: Requirements 1.1, 1.2
 *
 * This test surfaces the bug condition where the NHTSA API returns a Turbo
 * field with a meaningful value, but decodeVin() silently drops it because
 * the VehicleData interface has no `turbo` property.
 *
 * EXPECTED: This test FAILS on unfixed code (confirms the bug exists).
 * After the fix is applied, this test will PASS (confirms the fix works).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { decodeVin } from '@/lib/services/nhtsa-decoder'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('Bug Condition: Turbo Field Dropped From Decode Output', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 1: Bug Condition - Turbo Field Dropped
   *
   * Bug condition: isBugCondition(input) where input.Results[0].Turbo is a
   * non-null, non-empty, non-"Not Applicable" string.
   *
   * Expected behavior: result.turbo === normalizeValue(input.Results[0].Turbo)
   * and result.turbo !== undefined
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('should return turbo field when API response contains Turbo: "Yes"', async () => {
    // #given: Mock NHTSA API response with Turbo: "Yes" alongside all valid fields
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
          FuelInjectionType: 'Direct',
          FuelTypePrimary: 'Gasoline',
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
          Turbo: 'Yes',
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Decode a VIN for a turbocharged vehicle
    const result = await decodeVin('1FTFW1E84MFA12345')

    // #then: result should not be null and should have turbo === "Yes"
    expect(result).not.toBeNull()
    expect((result as any).turbo).toBeDefined()
    expect((result as any).turbo).toBe('Yes')
  })

  it('should return turbo field when API response contains Turbo: "Turbocharger"', async () => {
    // #given: Mock NHTSA API response with Turbo: "Turbocharger"
    const mockResponse = {
      Results: [
        {
          Make: 'Volkswagen',
          Model: 'Golf GTI',
          ModelYear: '2022',
          Trim: 'SE',
          DriveType: 'FWD',
          VehicleType: 'PASSENGER CAR',
          Manufacturer: 'VOLKSWAGEN AG',
          PlantCity: 'Wolfsburg',
          PlantCountry: 'GERMANY',
          EngineModel: 'EA888',
          EngineCylinders: '4',
          FuelInjectionType: 'Direct',
          FuelTypePrimary: 'Gasoline',
          FuelTypeSecondary: null,
          ElectrificationLevel: null,
          Turbo: 'Turbocharger',
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    // #when: Decode a VIN for a turbocharged vehicle
    const result = await decodeVin('WVWZZZ3CZWE123456')

    // #then: result should not be null and should have turbo === "Turbocharger"
    expect(result).not.toBeNull()
    expect((result as any).turbo).toBeDefined()
    expect((result as any).turbo).toBe('Turbocharger')
  })

  /**
   * Property-based test: For any non-null, non-empty, non-"Not Applicable"
   * Turbo value, decodeVin() should return it in the result.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('should capture any meaningful Turbo value from API response (property-based)', async () => {
    const turboValueArb = fc.oneof(
      fc.constant('Yes'),
      fc.constant('Turbocharger'),
      fc.constant('Twin Turbo'),
      fc.constant('Variable Geometry Turbo'),
      fc.string({ minLength: 1, maxLength: 30, unit: 'grapheme' })
        .filter((s) => s.trim() !== '' && s !== 'Not Applicable')
    )

    await fc.assert(
      fc.asyncProperty(turboValueArb, async (turboValue) => {
        vi.clearAllMocks()

        // #given: Mock NHTSA API response with a meaningful Turbo value
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
              FuelInjectionType: 'Direct',
              FuelTypePrimary: 'Gasoline',
              FuelTypeSecondary: null,
              ElectrificationLevel: null,
              Turbo: turboValue,
            },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

        // #when: Decode a VIN
        const result = await decodeVin('1FTFW1E84MFA12345')

        // #then: result should not be null and turbo should equal the normalized value
        expect(result).not.toBeNull()
        expect((result as any).turbo).toBeDefined()
        expect((result as any).turbo).toBe(turboValue.trim())
      }),
      { numRuns: 20 }
    )
  })
})
