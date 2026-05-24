// tests/property/engine-agent-scoring.test.ts

/**
 * Property-based tests: Engine Agent tier classification and score computation.
 *
 * Validates: Requirements 3.1–3.10, 4.1–4.8
 *
 * Tests the pure functions classifyTier and computeScore across random inputs
 * to verify scoring bounds, tier classification correctness, mileage modifier
 * application, and determinism.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

import {
  classifyTier,
  computeScore,
} from '@/lib/services/risk-engine/agents/2-engine-agent'

// --- Types (mirrored from agent internals for test arbitraries) ---

interface EngineData {
  make: string
  cylinders: number | null
  isTurbo: boolean
  isSupercharged: boolean
  fuelTypePrimary: string | null
  fuelTypeSecondary: string | null
  electrificationLevel: string | null
  engineDesc: string | null
}

type ComplexityTier = 'TIER_1_SIMPLE' | 'TIER_2_MODERATE' | 'TIER_3_HIGH'

// --- Constants (mirrored for test logic) ---

const LUXURY_COMPLEX_BRANDS = [
  'BMW', 'MERCEDES-BENZ', 'AUDI', 'PORSCHE',
  'LAND ROVER', 'JAGUAR', 'MASERATI', 'ALFA ROMEO',
]

// --- Arbitraries ---

const tierArb: fc.Arbitrary<ComplexityTier> = fc.constantFrom(
  'TIER_1_SIMPLE' as ComplexityTier,
  'TIER_2_MODERATE' as ComplexityTier,
  'TIER_3_HIGH' as ComplexityTier,
)

const mileageArb = fc.integer({ min: 0, max: 500_000 })

const nonLuxuryMakeArb = fc.constantFrom(
  'TOYOTA', 'HONDA', 'FORD', 'CHEVROLET', 'HYUNDAI', 'KIA', 'NISSAN', 'SUBARU',
)

const luxuryMakeArb = fc.constantFrom(...LUXURY_COMPLEX_BRANDS)

/**
 * Generates EngineData that triggers at least one Tier 3 condition.
 */
const tier3EngineDataArb: fc.Arbitrary<EngineData> = fc.oneof(
  // Luxury brand
  luxuryMakeArb.map((make): EngineData => ({
    make,
    cylinders: 4,
    isTurbo: false,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // Supercharged
  nonLuxuryMakeArb.map((make): EngineData => ({
    make,
    cylinders: 6,
    isTurbo: false,
    isSupercharged: true,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // Turbo with 6+ cylinders
  fc.tuple(nonLuxuryMakeArb, fc.integer({ min: 6, max: 12 })).map(([make, cyl]): EngineData => ({
    make,
    cylinders: cyl,
    isTurbo: true,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // 8+ cylinders (no turbo)
  fc.tuple(nonLuxuryMakeArb, fc.integer({ min: 8, max: 16 })).map(([make, cyl]): EngineData => ({
    make,
    cylinders: cyl,
    isTurbo: false,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // PHEV/EV electrification
  fc.tuple(nonLuxuryMakeArb, fc.constantFrom('PHEV', 'EV', 'BEV')).map(([make, elec]): EngineData => ({
    make,
    cylinders: 4,
    isTurbo: false,
    isSupercharged: false,
    fuelTypePrimary: 'Electric',
    fuelTypeSecondary: null,
    electrificationLevel: elec,
    engineDesc: null,
  })),
)

/**
 * Generates EngineData that triggers Tier 2 but NOT Tier 3.
 * - Non-luxury make
 * - Not supercharged
 * - Not turbo with 6+ cyl
 * - Not 8+ cyl
 * - Not PHEV/EV
 * - At least one Tier 2 condition holds
 */
const tier2EngineDataArb: fc.Arbitrary<EngineData> = fc.oneof(
  // Turbo with ≤4 cylinders (non-luxury)
  fc.tuple(nonLuxuryMakeArb, fc.constantFrom(3, 4)).map(([make, cyl]): EngineData => ({
    make,
    cylinders: cyl,
    isTurbo: true,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // Turbo with null cylinders (non-luxury)
  nonLuxuryMakeArb.map((make): EngineData => ({
    make,
    cylinders: null,
    isTurbo: true,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // NA with exactly 6 cylinders (non-luxury, not supercharged)
  nonLuxuryMakeArb.map((make): EngineData => ({
    make,
    cylinders: 6,
    isTurbo: false,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: null,
    engineDesc: null,
  })),
  // Toyota/Honda standard hybrid (non-PHEV)
  fc.constantFrom('TOYOTA', 'HONDA').map((make): EngineData => ({
    make,
    cylinders: 4,
    isTurbo: false,
    isSupercharged: false,
    fuelTypePrimary: 'Gasoline',
    fuelTypeSecondary: null,
    electrificationLevel: 'Hybrid',
    engineDesc: null,
  })),
)

/**
 * Generates EngineData that triggers ONLY Tier 1 (no Tier 3 or Tier 2 conditions).
 * - Non-luxury make (not Toyota/Honda with hybrid)
 * - Not supercharged
 * - Not turbo
 * - Cylinders < 6 (or null but not turbo)
 * - Not PHEV/EV
 * - Not hybrid Toyota/Honda
 */
const tier1EngineDataArb: fc.Arbitrary<EngineData> = fc.tuple(
  nonLuxuryMakeArb.filter((m) => m !== 'TOYOTA' && m !== 'HONDA'),
  fc.constantFrom(3, 4, null),
).map(([make, cyl]): EngineData => ({
  make,
  cylinders: cyl as number | null,
  isTurbo: false,
  isSupercharged: false,
  fuelTypePrimary: 'Gasoline',
  fuelTypeSecondary: null,
  electrificationLevel: null,
  engineDesc: null,
}))

// --- Property Tests ---

describe('EngineAgent Tier Classification & Score Computation (Property-Based)', () => {
  /**
   * Property 1: Score is always bounded [0, 100]
   * Validates: Requirements 4.7, 4.8
   */
  it('Property 1: computeScore always returns a value in [0, 100]', () => {
    fc.assert(
      fc.property(tierArb, mileageArb, (tier, mileage) => {
        const score = computeScore(tier, mileage)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }),
      { numRuns: 200 },
    )
  })

  /**
   * Property 2: Tier 3 classification is triggered by any single Tier 3 condition
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   */
  it('Property 2: classifyTier returns TIER_3_HIGH when any Tier 3 condition holds', () => {
    fc.assert(
      fc.property(tier3EngineDataArb, mileageArb, (data, mileage) => {
        const tier = classifyTier(data, mileage)
        expect(tier).toBe('TIER_3_HIGH')
      }),
      { numRuns: 200 },
    )
  })

  /**
   * Property 3: Tier 2 classification applies when no Tier 3 condition holds
   * Validates: Requirements 3.6, 3.7, 3.8
   */
  it('Property 3: classifyTier returns TIER_2_MODERATE when no Tier 3 but a Tier 2 condition holds', () => {
    fc.assert(
      fc.property(tier2EngineDataArb, mileageArb, (data, mileage) => {
        const tier = classifyTier(data, mileage)
        expect(tier).toBe('TIER_2_MODERATE')
      }),
      { numRuns: 200 },
    )
  })

  /**
   * Property 4: Tier 1 is the default when no higher tier applies
   * Validates: Requirements 3.9
   */
  it('Property 4: classifyTier returns TIER_1_SIMPLE when no Tier 3 or Tier 2 condition holds', () => {
    fc.assert(
      fc.property(tier1EngineDataArb, mileageArb, (data, mileage) => {
        const tier = classifyTier(data, mileage)
        expect(tier).toBe('TIER_1_SIMPLE')
      }),
      { numRuns: 200 },
    )
  })

  /**
   * Property 5: Score equals base plus correct mileage modifier
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   */
  it('Property 5: computeScore equals min(base + modifier, 100) for any tier and mileage', () => {
    fc.assert(
      fc.property(tierArb, mileageArb, (tier, mileage) => {
        const score = computeScore(tier, mileage)

        let expectedBase: number
        let modifier = 0

        switch (tier) {
          case 'TIER_1_SIMPLE':
            expectedBase = 15
            if (mileage > 150_000) modifier = 10
            break
          case 'TIER_2_MODERATE':
            expectedBase = 35
            if (mileage >= 80_000 && mileage <= 120_000) modifier = 25
            else if (mileage > 120_000) modifier = 15
            break
          case 'TIER_3_HIGH':
            expectedBase = 55
            if (mileage >= 80_000 && mileage <= 120_000) modifier = 35
            else if (mileage > 120_000) modifier = 25
            break
        }

        const expected = Math.min(expectedBase! + modifier, 100)
        expect(score).toBe(expected)
      }),
      { numRuns: 200 },
    )
  })

  /**
   * Property 6: Classification is deterministic
   * Validates: Requirements 3.10
   */
  it('Property 6: classifyTier is deterministic — same inputs always produce same result', () => {
    const anyEngineDataArb: fc.Arbitrary<EngineData> = fc.oneof(
      tier3EngineDataArb,
      tier2EngineDataArb,
      tier1EngineDataArb,
    )

    fc.assert(
      fc.property(anyEngineDataArb, mileageArb, (data, mileage) => {
        const result1 = classifyTier(data, mileage)
        const result2 = classifyTier(data, mileage)
        const result3 = classifyTier(data, mileage)
        expect(result1).toBe(result2)
        expect(result2).toBe(result3)
      }),
      { numRuns: 200 },
    )
  })
})
