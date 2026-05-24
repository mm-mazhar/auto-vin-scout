// tests/property/engine-agent-extraction.test.ts

/**
 * Property-based tests: Engine Agent data extraction functions.
 *
 * Validates: Requirements 2.4, 2.5, 2.6, 2.7, 4.9, 5.3
 *
 * Tests the pure extraction functions (detectTurboHeuristic, extractEngineData,
 * extractLatestMileage) and fallback narrative completeness across random inputs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

// --- Mocks (must be before imports that use them) ---

const mockCreate = vi.fn()
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } }
    constructor() {}
  },
}))

const mockGenerateContent = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent }
    constructor() {}
  },
}))

vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: () => ({
    primary: { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'test-model' },
    fallback: { provider: 'google', model: 'gemini-test' },
    temperature: 0.1,
    maxTokens: 400,
    systemInstruction: 'Test system instruction',
  }),
}))

import {
  detectTurboHeuristic,
  extractEngineData,
  extractLatestMileage,
} from '@/lib/services/risk-engine/agents/2-engine-agent'
import { EngineAgent } from '@/lib/services/risk-engine/agents/2-engine-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Arbitraries ---

const TURBO_KEYWORDS = ['TURBO', 'ECOBOOST', 'TFSI', 'TSI']

const nullableStringArb = fc.option(fc.string({ minLength: 0, maxLength: 40 }), { nil: null })

/**
 * Generates a string that does NOT contain any turbo/supercharged keywords (case-insensitive).
 */
const cleanStringArb = fc.string({ minLength: 0, maxLength: 30 }).filter((s) => {
  const upper = s.toUpperCase()
  return !TURBO_KEYWORDS.some((kw) => upper.includes(kw)) && !upper.includes('SUPERCHARGED')
})

const nullableCleanStringArb = fc.option(cleanStringArb, { nil: null })

const dateArb = fc.integer({ min: 2015, max: 2025 }).chain((year) =>
  fc.integer({ min: 0, max: 364 }).map((dayOffset) => {
    const d = new Date(year, 0, 1)
    d.setDate(d.getDate() + dayOffset)
    return d
  })
)

const listingEntryArb = fc.record({
  externalListingId: fc.string({ minLength: 1, maxLength: 20 }),
  price: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  miles: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  msrp: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  dom: fc.option(fc.integer({ min: 0, max: 365 }), { nil: null }),
  statusDate: fc.option(dateArb, { nil: null }),
  firstSeenAt: fc.option(dateArb, { nil: null }),
  lastSeenAt: fc.option(dateArb, { nil: null }),
  sellerType: fc.option(fc.constantFrom('dealer', 'fsbo', 'auction'), { nil: null }),
  sellerName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  city: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  state: fc.option(fc.string({ minLength: 2, maxLength: 2 }), { nil: null }),
  latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
  longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
  isCertified: fc.option(fc.boolean(), { nil: null }),
})

const vehicleArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  vin: fc.string({ minLength: 17, maxLength: 17 }),
  make: fc.string({ minLength: 1, maxLength: 20 }),
  model: fc.string({ minLength: 1, maxLength: 20 }),
  year: fc.integer({ min: 1990, max: 2025 }),
  trim: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  engineDesc: nullableStringArb,
  engineCylinders: fc.option(fc.constantFrom('3', '4', '5', '6', '8', '10', '12', 'N/A'), { nil: null }),
  turbo: fc.option(fc.constantFrom('Yes', 'No', null), { nil: null }),
  fuelTypePrimary: fc.option(fc.constantFrom('Gasoline', 'Diesel', 'Electric', 'Flex Fuel'), { nil: null }),
  fuelTypeSecondary: fc.option(fc.constantFrom('Gasoline', 'Electric', null), { nil: null }),
  electrificationLevel: fc.option(fc.constantFrom('Hybrid', 'PHEV', 'EV', 'BEV', null), { nil: null }),
  engineModel: nullableStringArb,
  decoderSource: fc.constantFrom('vpic', 'nhtsa', 'manual'),
})

// --- Property Tests ---

describe('EngineAgent Data Extraction (Property-Based)', () => {
  /**
   * Property 7: Turbo heuristic keyword detection is correct
   * Validates: Requirements 2.4, 2.5
   */
  describe('Property 7: detectTurboHeuristic keyword detection', () => {
    it('turboField "Yes" (case-insensitive) → isTurbo=true, isSupercharged=false', () => {
      const yesVariants = fc.constantFrom('Yes', 'yes', 'YES', 'yEs')

      fc.assert(
        fc.property(yesVariants, nullableStringArb, nullableStringArb, (turboField, engineModel, engineDesc) => {
          const result = detectTurboHeuristic(turboField, engineModel, engineDesc)
          expect(result.isTurbo).toBe(true)
          expect(result.isSupercharged).toBe(false)
        }),
        { numRuns: 200 },
      )
    })

    it('"SUPERCHARGED" in engineModel/engineDesc (turboField not "Yes") → isSupercharged=true, isTurbo=false', () => {
      const nonYesTurboField = fc.option(
        fc.string({ minLength: 0, maxLength: 10 }).filter((s) => s.toUpperCase() !== 'YES'),
        { nil: null },
      )
      const superchargedStringArb = fc.constantFrom(
        'SUPERCHARGED V8', '5.0L Supercharged', 'supercharged engine',
        'V8 SUPERCHARGED AWD', 'Supercharged 3.0L',
      )

      fc.assert(
        fc.property(
          nonYesTurboField,
          fc.oneof(
            // SUPERCHARGED in engineModel
            fc.tuple(superchargedStringArb, nullableCleanStringArb).map(([em, ed]) => ({ engineModel: em, engineDesc: ed })),
            // SUPERCHARGED in engineDesc
            fc.tuple(nullableCleanStringArb, superchargedStringArb).map(([em, ed]) => ({ engineModel: em, engineDesc: ed })),
          ),
          (turboField, { engineModel, engineDesc }) => {
            const result = detectTurboHeuristic(turboField, engineModel, engineDesc)
            expect(result.isSupercharged).toBe(true)
            expect(result.isTurbo).toBe(false)
          },
        ),
        { numRuns: 200 },
      )
    })

    it('TURBO/ECOBOOST/TFSI/TSI in engineModel/engineDesc (no "Yes" turboField, no SUPERCHARGED) → isTurbo=true', () => {
      const nonYesTurboField = fc.option(
        fc.string({ minLength: 0, maxLength: 10 }).filter((s) => s.toUpperCase() !== 'YES'),
        { nil: null },
      )
      const turboKeywordStringArb = fc.constantFrom(
        '2.0L Turbo I4', 'EcoBoost 2.7L', '2.0 TFSI', '1.8 TSI',
        'TURBO DIESEL', 'Twin Turbo V6', 'ecoboost',
      )

      fc.assert(
        fc.property(
          nonYesTurboField,
          fc.oneof(
            // Keyword in engineModel
            fc.tuple(turboKeywordStringArb, nullableCleanStringArb).map(([em, ed]) => ({ engineModel: em, engineDesc: ed })),
            // Keyword in engineDesc
            fc.tuple(nullableCleanStringArb, turboKeywordStringArb).map(([em, ed]) => ({ engineModel: em, engineDesc: ed })),
          ),
          (turboField, { engineModel, engineDesc }) => {
            const result = detectTurboHeuristic(turboField, engineModel, engineDesc)
            expect(result.isTurbo).toBe(true)
            expect(result.isSupercharged).toBe(false)
          },
        ),
        { numRuns: 200 },
      )
    })
  })

  /**
   * Property 8: extractEngineData is pure (no mutation)
   * Validates: Requirements 2.6, 2.7
   */
  describe('Property 8: extractEngineData purity', () => {
    it('does not mutate the input vehicle object', () => {
      fc.assert(
        fc.property(vehicleArb, (vehicle) => {
          // Deep clone to compare after call
          const originalSnapshot = JSON.parse(JSON.stringify(vehicle))

          extractEngineData(vehicle)

          // Every property should remain unchanged
          expect(vehicle).toEqual(originalSnapshot)
        }),
        { numRuns: 200 },
      )
    })

    it('returned EngineData.make is the uppercased version of vehicle.make', () => {
      fc.assert(
        fc.property(vehicleArb, (vehicle) => {
          const result = extractEngineData(vehicle)
          expect(result.make).toBe(vehicle.make.toUpperCase())
        }),
        { numRuns: 200 },
      )
    })
  })

  /**
   * Property 9: Mileage extraction returns the most recent non-null miles
   * Validates: Requirements 4.9
   */
  describe('Property 9: extractLatestMileage correctness', () => {
    it('returns the miles from the entry with the most recent date (lastSeenAt or statusDate fallback)', () => {
      // Generate a listing history with at least one non-null miles entry
      const listingWithMilesArb = fc.array(listingEntryArb, { minLength: 1, maxLength: 15 })
        .filter((arr) => arr.some((e) => e.miles !== null))

      fc.assert(
        fc.property(listingWithMilesArb, (history) => {
          const result = extractLatestMileage(history)

          // Manually compute expected: sort by date desc, find first non-null miles
          const sorted = [...history].sort((a, b) => {
            const dateA = a.lastSeenAt ?? a.statusDate
            const dateB = b.lastSeenAt ?? b.statusDate
            if (!dateA && !dateB) return 0
            if (!dateA) return 1
            if (!dateB) return -1
            return dateB.getTime() - dateA.getTime()
          })

          let expectedMiles = 0
          for (const entry of sorted) {
            if (entry.miles !== null) {
              expectedMiles = entry.miles
              break
            }
          }

          expect(result).toBe(expectedMiles)
        }),
        { numRuns: 200 },
      )
    })

    it('returns 0 for empty arrays', () => {
      const result = extractLatestMileage([])
      expect(result).toBe(0)
    })

    it('returns 0 when all entries have null miles', () => {
      const allNullMilesArb = fc.array(
        listingEntryArb.map((entry) => ({ ...entry, miles: null })),
        { minLength: 1, maxLength: 10 },
      )

      fc.assert(
        fc.property(allNullMilesArb, (history) => {
          const result = extractLatestMileage(history)
          expect(result).toBe(0)
        }),
        { numRuns: 200 },
      )
    })
  })

  /**
   * Property 10: Fallback narrative is always non-empty for any label
   * Validates: Requirements 5.3
   */
  describe('Property 10: Fallback narrative non-empty for any label', () => {
    let agent: EngineAgent

    beforeEach(() => {
      vi.clearAllMocks()
      // Force LLM failures so fallback narratives are used
      mockCreate.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateContent.mockRejectedValue(new Error('LLM unavailable'))
      agent = new EngineAgent()
      delete process.env.OPENROUTER_API_KEY
      delete process.env.GOOGLE_API_KEY
    })

    it('narrative is always a non-empty string when LLM fails', async () => {
      const labelArb = fc.constantFrom('Low', 'Medium', 'High') as fc.Arbitrary<'Low' | 'Medium' | 'High'>

      // Map labels to vehicle configs that produce the corresponding score ranges
      const inputForLabelArb = labelArb.map((label): AgentInput => {
        switch (label) {
          case 'Low':
            // Tier 1, low mileage → score 15 → Low
            return {
              reportId: 'pbt-report',
              vehicle: {
                id: 'v-001', vin: '1HGBH41JXMN109186', make: 'Toyota', model: 'Corolla',
                year: 2020, trim: 'LE', engineDesc: '1.8L I4', decoderSource: 'vpic',
                engineCylinders: '4', turbo: null, fuelTypePrimary: 'Gasoline',
                fuelTypeSecondary: null, electrificationLevel: null, engineModel: '2ZR-FE',
              },
              recalls: [],
              listingHistory: [{ externalListingId: 'l1', price: 20000, miles: 30000, msrp: null, dom: null, statusDate: new Date('2024-01-01'), firstSeenAt: null, lastSeenAt: new Date('2024-01-01'), sellerType: null, sellerName: null, city: null, state: null, latitude: null, longitude: null, isCertified: null }],
              safetyRating: null,
            }
          case 'Medium':
            // Tier 2, in the hump → score 60 → Medium
            return {
              reportId: 'pbt-report',
              vehicle: {
                id: 'v-002', vin: '1HGBH41JXMN109186', make: 'Ford', model: 'Focus',
                year: 2017, trim: 'ST', engineDesc: '2.0L Turbo I4', decoderSource: 'vpic',
                engineCylinders: '4', turbo: 'Yes', fuelTypePrimary: 'Gasoline',
                fuelTypeSecondary: null, electrificationLevel: null, engineModel: 'EcoBoost',
              },
              recalls: [],
              listingHistory: [{ externalListingId: 'l2', price: 15000, miles: 95000, msrp: null, dom: null, statusDate: new Date('2024-01-01'), firstSeenAt: null, lastSeenAt: new Date('2024-01-01'), sellerType: null, sellerName: null, city: null, state: null, latitude: null, longitude: null, isCertified: null }],
              safetyRating: null,
            }
          case 'High':
            // Tier 3 (luxury), in the hump → score 90 → High
            return {
              reportId: 'pbt-report',
              vehicle: {
                id: 'v-003', vin: '1HGBH41JXMN109186', make: 'BMW', model: '340i',
                year: 2017, trim: null, engineDesc: '3.0L Turbo I6', decoderSource: 'vpic',
                engineCylinders: '6', turbo: 'Yes', fuelTypePrimary: 'Gasoline',
                fuelTypeSecondary: null, electrificationLevel: null, engineModel: 'B58',
              },
              recalls: [],
              listingHistory: [{ externalListingId: 'l3', price: 25000, miles: 100000, msrp: null, dom: null, statusDate: new Date('2024-01-01'), firstSeenAt: null, lastSeenAt: new Date('2024-01-01'), sellerType: null, sellerName: null, city: null, state: null, latitude: null, longitude: null, isCertified: null }],
              safetyRating: null,
            }
        }
      })

      await fc.assert(
        fc.asyncProperty(inputForLabelArb, async (input) => {
          const result = await agent.execute(input)
          expect(result.narrative).toBeDefined()
          expect(typeof result.narrative).toBe('string')
          expect(result.narrative.length).toBeGreaterThan(0)
        }),
        { numRuns: 200 },
      )
    })
  })
})
