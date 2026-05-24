// tests/integration/nhtsa-decoder-turbo-preservation.test.ts

/**
 * Preservation Property Tests: Existing 16 NHTSA Fields Unchanged
 *
 * **Validates: Requirements 3.1, 3.3, 3.4**
 *
 * These tests verify that all existing fields continue to be parsed and
 * returned correctly. They run on UNFIXED code and MUST PASS — confirming
 * the baseline behavior that must be preserved after the turbo fix.
 *
 * Observation-first methodology:
 * - decodeVin() correctly returns all 16 existing NHTSA fields
 * - normalizeValue("Not Applicable") → null
 * - normalizeValue("") → null
 * - normalizeValue("  Ford  ") → "Ford"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { decodeVin } from '@/lib/services/nhtsa-decoder'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

/**
 * Reference implementation of normalizeValue for property assertions.
 * Mirrors the logic in nhtsa-decoder.ts:
 * - null/undefined → null
 * - empty or whitespace-only → null
 * - "Not Applicable" → null
 * - otherwise → trimmed string
 */
function expectedNormalize(value: string | null | undefined): string | null {
  if (!value || value.trim() === '' || value === 'Not Applicable') {
    return null
  }
  return value.trim()
}

/**
 * Arbitrary for generating non-empty, non-"Not Applicable" string values
 * that represent valid NHTSA field data.
 */
const validFieldValueArb = fc.oneof(
  fc.constant('Toyota'),
  fc.constant('Ford'),
  fc.constant('Honda'),
  fc.constant('Chevrolet'),
  fc.constant('BMW'),
  fc.constant('Direct Injection'),
  fc.constant('Sequential Fuel Injection'),
  fc.constant('Gasoline'),
  fc.constant('Diesel'),
  fc.constant('Electric'),
  fc.constant('FWD'),
  fc.constant('4WD'),
  fc.constant('AWD'),
  fc.constant('RWD'),
  fc.constant('PASSENGER CAR'),
  fc.constant('TRUCK'),
  fc.constant('SUV'),
  fc.constant('BEV (Battery Electric Vehicle)'),
  fc.string({ minLength: 1, maxLength: 30, unit: 'grapheme' })
    .filter((s) => s.trim() !== '' && s !== 'Not Applicable')
)

/**
 * Arbitrary for generating nullable field values (including null, empty,
 * "Not Applicable", and valid strings).
 */
const nullableFieldValueArb = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.constant('  '),
  fc.constant('Not Applicable'),
  validFieldValueArb
)

/**
 * Arbitrary for a valid model year string (4-digit number).
 */
const validYearArb = fc.integer({ min: 1980, max: 2030 }).map(String)

/**
 * Arbitrary for a valid engine cylinders value.
 */
const validCylindersArb = fc.oneof(
  fc.constant('3'),
  fc.constant('4'),
  fc.constant('6'),
  fc.constant('8'),
  fc.constant('10'),
  fc.constant('12')
)

describe('Preservation: Existing 16 NHTSA Fields Unchanged', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 2: Preservation - All 16 existing fields match normalizeValue()
   *
   * For random valid NHTSA API responses, all 16 existing fields in the
   * returned VehicleData match normalizeValue() applied to the corresponding
   * API field.
   *
   * **Validates: Requirements 3.1, 3.3, 3.4**
   */
  it('all 16 existing fields match normalizeValue() for random valid API responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        validFieldValueArb,       // Make (required, must be non-null/non-empty)
        validFieldValueArb,       // Model (required)
        validYearArb,             // ModelYear (required, valid year)
        nullableFieldValueArb,    // Trim
        nullableFieldValueArb,    // DriveType
        nullableFieldValueArb,    // VehicleType
        nullableFieldValueArb,    // Manufacturer
        nullableFieldValueArb,    // PlantCity
        nullableFieldValueArb,    // PlantCountry
        nullableFieldValueArb,    // EngineModel
        fc.oneof(fc.constant(null), validCylindersArb), // EngineCylinders
        nullableFieldValueArb,    // FuelInjectionType
        nullableFieldValueArb,    // FuelTypePrimary
        nullableFieldValueArb,    // FuelTypeSecondary
        nullableFieldValueArb,    // ElectrificationLevel
        async (
          make, model, modelYear, trim, driveType, vehicleType,
          manufacturer, plantCity, plantCountry, engineModel,
          engineCylinders, fuelInjectionType, fuelTypePrimary,
          fuelTypeSecondary, electrificationLevel
        ) => {
          vi.clearAllMocks()

          const mockResponse = {
            Results: [
              {
                Make: make,
                Model: model,
                ModelYear: modelYear,
                Trim: trim,
                DriveType: driveType,
                VehicleType: vehicleType,
                Manufacturer: manufacturer,
                PlantCity: plantCity,
                PlantCountry: plantCountry,
                EngineModel: engineModel,
                EngineCylinders: engineCylinders,
                FuelInjectionType: fuelInjectionType,
                FuelTypePrimary: fuelTypePrimary,
                FuelTypeSecondary: fuelTypeSecondary,
                ElectrificationLevel: electrificationLevel,
              },
            ],
          }

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
          })

          const result = await decodeVin('1HGBH41JXMN109186')

          // Result should not be null since Make, Model, Year are all valid
          expect(result).not.toBeNull()

          // Verify all 16 fields match normalizeValue() applied to API fields
          expect(result!.make).toBe(expectedNormalize(make))
          expect(result!.model).toBe(expectedNormalize(model))
          expect(result!.year).toBe(parseInt(modelYear, 10))
          expect(result!.trim).toBe(expectedNormalize(trim))
          expect(result!.driveType).toBe(expectedNormalize(driveType))
          expect(result!.vehicleType).toBe(expectedNormalize(vehicleType))
          expect(result!.manufacturer).toBe(expectedNormalize(manufacturer))
          expect(result!.plantCity).toBe(expectedNormalize(plantCity))
          expect(result!.plantCountry).toBe(expectedNormalize(plantCountry))
          expect(result!.engineModel).toBe(expectedNormalize(engineModel))
          expect(result!.engineCylinders).toBe(expectedNormalize(engineCylinders))
          expect(result!.fuelInjectionType).toBe(expectedNormalize(fuelInjectionType))
          expect(result!.fuelTypePrimary).toBe(expectedNormalize(fuelTypePrimary))
          expect(result!.fuelTypeSecondary).toBe(expectedNormalize(fuelTypeSecondary))
          expect(result!.electrificationLevel).toBe(expectedNormalize(electrificationLevel))

          // engine is a composite field — verify it's a string or null
          if (engineCylinders || engineModel || fuelInjectionType || fuelTypePrimary) {
            expect(result!.engineDesc).not.toBeNull()
          } else {
            expect(result!.engineDesc).toBeNull()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * fuelInjectionType is always independent of any Turbo value in the response.
   *
   * Even if the API response contains a Turbo field, fuelInjectionType should
   * only reflect the FuelInjectionType API field value.
   *
   * **Validates: Requirements 3.3**
   */
  it('fuelInjectionType is independent of any Turbo value in the response', async () => {
    const turboValueArb = fc.oneof(
      fc.constant(null),
      fc.constant(''),
      fc.constant('Not Applicable'),
      fc.constant('Yes'),
      fc.constant('Turbocharger'),
      fc.constant('Twin Turbo'),
      fc.constant('Variable Geometry Turbo')
    )

    const fuelInjectionArb = fc.oneof(
      fc.constant(null),
      fc.constant(''),
      fc.constant('Direct Injection'),
      fc.constant('Sequential Fuel Injection'),
      fc.constant('Multi-Point Fuel Injection'),
      fc.constant('Throttle Body Injection')
    )

    await fc.assert(
      fc.asyncProperty(
        turboValueArb,
        fuelInjectionArb,
        async (turboValue, fuelInjectionValue) => {
          vi.clearAllMocks()

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
                FuelInjectionType: fuelInjectionValue,
                FuelTypePrimary: 'Gasoline',
                FuelTypeSecondary: null,
                ElectrificationLevel: null,
                // Include Turbo field in the raw response (even though unfixed code ignores it)
                Turbo: turboValue,
              },
            ],
          }

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
          })

          const result = await decodeVin('1FTFW1E84MFA12345')

          expect(result).not.toBeNull()

          // fuelInjectionType must ONLY reflect the FuelInjectionType API field,
          // never be influenced by the Turbo field
          expect(result!.fuelInjectionType).toBe(expectedNormalize(fuelInjectionValue))
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * When Make/Model/Year are null/empty, decodeVin() returns null (failure case preserved).
   *
   * **Validates: Requirements 3.4**
   */
  it('returns null when Make is null or empty', async () => {
    const emptyMakeArb = fc.oneof(
      fc.constant(null),
      fc.constant(''),
      fc.constant('  '),
      fc.constant('Not Applicable')
    )

    await fc.assert(
      fc.asyncProperty(emptyMakeArb, async (makeValue) => {
        vi.clearAllMocks()

        const mockResponse = {
          Results: [
            {
              Make: makeValue,
              Model: 'Camry',
              ModelYear: '2020',
              Trim: 'LE',
              DriveType: 'FWD',
              VehicleType: 'PASSENGER CAR',
              Manufacturer: 'TOYOTA',
              PlantCity: 'Georgetown',
              PlantCountry: 'UNITED STATES (USA)',
              EngineModel: '2AR-FE',
              EngineCylinders: '4',
              FuelInjectionType: 'Direct',
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

        const result = await decodeVin('1HGBH41JXMN109186')
        expect(result).toBeNull()
      }),
      { numRuns: 10 }
    )
  })

  it('returns null when Model is null or empty', async () => {
    const emptyModelArb = fc.oneof(
      fc.constant(null),
      fc.constant(''),
      fc.constant('  '),
      fc.constant('Not Applicable')
    )

    await fc.assert(
      fc.asyncProperty(emptyModelArb, async (modelValue) => {
        vi.clearAllMocks()

        const mockResponse = {
          Results: [
            {
              Make: 'Toyota',
              Model: modelValue,
              ModelYear: '2020',
              Trim: 'LE',
              DriveType: 'FWD',
              VehicleType: 'PASSENGER CAR',
              Manufacturer: 'TOYOTA',
              PlantCity: 'Georgetown',
              PlantCountry: 'UNITED STATES (USA)',
              EngineModel: '2AR-FE',
              EngineCylinders: '4',
              FuelInjectionType: 'Direct',
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

        const result = await decodeVin('1HGBH41JXMN109186')
        expect(result).toBeNull()
      }),
      { numRuns: 10 }
    )
  })

  it('returns null when Year is null, empty, or non-numeric', async () => {
    const invalidYearArb = fc.oneof(
      fc.constant(null),
      fc.constant(''),
      fc.constant('  '),
      fc.constant('Not Applicable'),
      fc.constant('INVALID'),
      fc.constant('abc')
    )

    await fc.assert(
      fc.asyncProperty(invalidYearArb, async (yearValue) => {
        vi.clearAllMocks()

        const mockResponse = {
          Results: [
            {
              Make: 'Toyota',
              Model: 'Camry',
              ModelYear: yearValue,
              Trim: 'LE',
              DriveType: 'FWD',
              VehicleType: 'PASSENGER CAR',
              Manufacturer: 'TOYOTA',
              PlantCity: 'Georgetown',
              PlantCountry: 'UNITED STATES (USA)',
              EngineModel: '2AR-FE',
              EngineCylinders: '4',
              FuelInjectionType: 'Direct',
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

        const result = await decodeVin('1HGBH41JXMN109186')
        expect(result).toBeNull()
      }),
      { numRuns: 10 }
    )
  })
})
