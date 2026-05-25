// tests/unit/risk-engine/corrosion-agent.property.test.ts

/**
 * Property-based tests for the CorrosionAgent (vectorIndex 4).
 *
 * Tests the Regional Corrosion & Environmental Stress agent's scoring invariants
 * using fast-check to generate arbitrary inputs and verify universal properties.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock ai-config to return a test config
vi.mock('@/lib/ai-config', () => ({
  getAgentConfig: vi.fn(() => ({
    primary: {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'test-model',
    },
    fallback: {
      provider: 'google',
      model: 'test-fallback-model',
    },
    temperature: 0.1,
    maxTokens: 400,
    systemInstruction: 'Test system instruction',
  })),
}))

// Mock OpenAI — always throw so we exercise fallback narrative path
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      },
    }
    constructor() {}
  },
}))

// Mock Google GenAI — always throw so we exercise fallback narrative path
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    }
    constructor() {}
  },
}))

import { CorrosionAgent } from '@/lib/services/risk-engine/agents/4-corrosion-agent'
import type { AgentInput } from '@/lib/services/risk-engine/types'

// --- Constants (mirrored for test generators) ---

const SALT_BELT_STATES = [
  'CT', 'DE', 'IL', 'IN', 'IA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MO', 'NH', 'NJ', 'NY', 'OH', 'PA', 'RI', 'VT', 'VA', 'WV',
  'WI', 'DC', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'MB', 'SK',
]

const SUN_BELT_STATES = ['FL', 'AZ', 'NV', 'NM', 'TX', 'LA', 'HI', 'UT']

const ALL_KNOWN_STATES = [...SALT_BELT_STATES, ...SUN_BELT_STATES, 'CA', 'OR', 'WA', 'CO', 'GA', 'NC', 'SC', 'TN', 'KY', 'AL', 'MS', 'AR', 'OK', 'KS', 'NE', 'SD', 'ND', 'MT', 'WY', 'ID', 'AK']

// --- Arbitraries ---

/** Generates a random state string (known states or arbitrary 2-char strings) */
const stateArb = fc.oneof(
  fc.constantFrom(...ALL_KNOWN_STATES),
  fc.string({ minLength: 2, maxLength: 2 }).map((s) => s.toUpperCase()),
)

/** Generates a state with random casing */
const mixedCaseStateArb = stateArb.chain((state) =>
  fc.constantFrom(
    state.toLowerCase(),
    state.toUpperCase(),
    state.charAt(0).toUpperCase() + state.charAt(1).toLowerCase(),
    state.charAt(0).toLowerCase() + state.charAt(1).toUpperCase(),
  )
)

/** Generates a single listing record with a non-null state */
const listingWithStateArb = (stateGen: fc.Arbitrary<string>) =>
  stateGen.map((state) => ({
    externalListingId: 'pbt-listing',
    price: null as number | null,
    miles: null as number | null,
    msrp: null as number | null,
    dom: null as number | null,
    statusDate: null as Date | null,
    firstSeenAt: null as Date | null,
    lastSeenAt: null as Date | null,
    sellerType: null as string | null,
    sellerName: null as string | null,
    city: null as string | null,
    state,
    latitude: null as number | null,
    longitude: null as number | null,
    isCertified: null as boolean | null,
  }))

/** Generates a listing with null state */
const nullStateListing = fc.constant({
  externalListingId: 'pbt-null-listing',
  price: null as number | null,
  miles: null as number | null,
  msrp: null as number | null,
  dom: null as number | null,
  statusDate: null as Date | null,
  firstSeenAt: null as Date | null,
  lastSeenAt: null as Date | null,
  sellerType: null as string | null,
  sellerName: null as string | null,
  city: null as string | null,
  state: null as string | null,
  latitude: null as number | null,
  longitude: null as number | null,
  isCertified: null as boolean | null,
})

/** Generates a listing history with a mix of valid and null states */
const listingHistoryArb = fc.array(
  fc.oneof(listingWithStateArb(stateArb), nullStateListing),
  { minLength: 0, maxLength: 25 },
)

/** Generates a listing history with only non-null states */
const nonNullListingHistoryArb = fc.array(
  listingWithStateArb(stateArb),
  { minLength: 1, maxLength: 25 },
)

/** Generates a listing history with mixed-case states */
const mixedCaseListingHistoryArb = fc.array(
  listingWithStateArb(mixedCaseStateArb),
  { minLength: 1, maxLength: 25 },
)

/** Builds a minimal AgentInput from a listing history */
function buildAgentInput(listingHistory: AgentInput['listingHistory']): AgentInput {
  return {
    reportId: 'pbt-report-001',
    vehicle: {
      id: 'pbt-vehicle-001',
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Accord',
      year: 2020,
      trim: null,
      engineDesc: null,
      engineCylinders: '4',
      turbo: null,
      fuelTypePrimary: 'Gasoline',
      fuelTypeSecondary: null,
      electrificationLevel: null,
      engineModel: null,
      decoderSource: 'nhtsa',
    },
    recalls: [],
    listingHistory,
    safetyRating: null,
  }
}

// --- Property Tests ---

describe('CorrosionAgent Property-Based Tests', () => {
  let agent: CorrosionAgent

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new CorrosionAgent()
    // Ensure no real API keys are set so LLM always falls back
    delete process.env.OPENROUTER_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  /**
   * Property 1: Score determinism
   *
   * For any listing history input, calling execute() multiple times with the
   * same input SHALL always produce the same score and label.
   *
   * **Validates: Requirements 1.4, 4.4, 4.5**
   */
  describe('Property 1: Score determinism', () => {
    it('execute() produces identical score and label on repeated calls with the same input', async () => {
      await fc.assert(
        fc.asyncProperty(listingHistoryArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)

          const result1 = await agent.execute(input)
          const result2 = await agent.execute(input)

          expect(result1.score).toBe(result2.score)
          expect(result1.label).toBe(result2.label)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: Percentage bounds
   *
   * For any listing history (including empty), saltBeltPercent and sunBeltPercent
   * SHALL always be in the range [0.0, 1.0].
   *
   * **Validates: Requirements 2.3, 2.4**
   */
  describe('Property 2: Percentage bounds', () => {
    it('saltBeltPercent and sunBeltPercent are always in [0.0, 1.0]', async () => {
      await fc.assert(
        fc.asyncProperty(listingHistoryArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)

          const metadata = result.metadata as Record<string, unknown>
          const saltBeltPercent = metadata.saltBeltPercent as number
          const sunBeltPercent = metadata.sunBeltPercent as number

          expect(saltBeltPercent).toBeGreaterThanOrEqual(0.0)
          expect(saltBeltPercent).toBeLessThanOrEqual(1.0)
          expect(sunBeltPercent).toBeGreaterThanOrEqual(0.0)
          expect(sunBeltPercent).toBeLessThanOrEqual(1.0)
        }),
        { numRuns: 150 }
      )
    })
  })

  /**
   * Property 3: Case-insensitive state matching
   *
   * For any listing history containing state abbreviations in mixed case,
   * the computed saltBeltPercent and sunBeltPercent SHALL be identical to
   * the same input with all states in UPPERCASE.
   *
   * **Validates: Requirements 1.1, 1.4**
   */
  describe('Property 3: Case-insensitive state matching', () => {
    it('percentages match the UPPERCASE-normalized equivalent regardless of input casing', async () => {
      await fc.assert(
        fc.asyncProperty(mixedCaseListingHistoryArb, async (listingHistory) => {
          const mixedInput = buildAgentInput(listingHistory)

          // Create the UPPERCASE-normalized equivalent
          const uppercaseHistory = listingHistory.map((l) => ({
            ...l,
            state: l.state?.toUpperCase() ?? null,
          }))
          const uppercaseInput = buildAgentInput(uppercaseHistory)

          const mixedResult = await agent.execute(mixedInput)
          const uppercaseResult = await agent.execute(uppercaseInput)

          const mixedMeta = mixedResult.metadata as Record<string, unknown>
          const upperMeta = uppercaseResult.metadata as Record<string, unknown>

          expect(mixedMeta.saltBeltPercent).toBe(upperMeta.saltBeltPercent)
          expect(mixedMeta.sunBeltPercent).toBe(upperMeta.sunBeltPercent)
          expect(mixedResult.score).toBe(uppercaseResult.score)
          expect(mixedResult.label).toBe(uppercaseResult.label)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 4: Null state exclusion
   *
   * For any listing history, listings with state === null SHALL NOT affect
   * the saltBeltPercent or sunBeltPercent calculations. Adding null-state
   * listings SHALL NOT change the score.
   *
   * **Validates: Requirements 1.2, 1.3, 7.1, 7.2**
   */
  describe('Property 4: Null state exclusion', () => {
    it('injecting additional null-state listings does not change the score', async () => {
      await fc.assert(
        fc.asyncProperty(
          nonNullListingHistoryArb,
          fc.integer({ min: 1, max: 10 }),
          async (listingHistory, nullCount) => {
            const baseInput = buildAgentInput(listingHistory)

            // Inject additional null-state listings
            const nullListings = Array.from({ length: nullCount }, () => ({
              externalListingId: 'pbt-injected-null',
              price: null as number | null,
              miles: null as number | null,
              msrp: null as number | null,
              dom: null as number | null,
              statusDate: null as Date | null,
              firstSeenAt: null as Date | null,
              lastSeenAt: null as Date | null,
              sellerType: null as string | null,
              sellerName: null as string | null,
              city: null as string | null,
              state: null as string | null,
              latitude: null as number | null,
              longitude: null as number | null,
              isCertified: null as boolean | null,
            }))

            const augmentedInput = buildAgentInput([...listingHistory, ...nullListings])

            const baseResult = await agent.execute(baseInput)
            const augmentedResult = await agent.execute(augmentedInput)

            expect(augmentedResult.score).toBe(baseResult.score)
            expect(augmentedResult.label).toBe(baseResult.label)

            const baseMeta = baseResult.metadata as Record<string, unknown>
            const augMeta = augmentedResult.metadata as Record<string, unknown>
            expect(augMeta.saltBeltPercent).toBe(baseMeta.saltBeltPercent)
            expect(augMeta.sunBeltPercent).toBe(baseMeta.sunBeltPercent)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 5: Heuristic tier ordering
   *
   * For any valid saltBeltPercent/sunBeltPercent pairs, the heuristic matrix
   * SHALL evaluate in strict priority order:
   * - salt-high (>0.60) → score 85
   * - salt-medium (0.25–0.60) → score 55
   * - sun-medium (>0.80) → score 45
   * - otherwise → score 15
   *
   * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
   */
  describe('Property 5: Heuristic tier ordering', () => {
    it('salt-high always yields score 85', async () => {
      // Generate listing histories where saltBeltPercent > 0.60
      const saltHighArb = fc.integer({ min: 4, max: 20 }).chain((total) => {
        const saltNeeded = Math.floor(total * 0.61) + 1 // Ensure > 60%
        const remaining = total - saltNeeded
        return fc.tuple(
          fc.array(fc.constantFrom(...SALT_BELT_STATES), { minLength: saltNeeded, maxLength: saltNeeded }),
          fc.array(fc.constantFrom('CA', 'OR', 'WA', 'CO', 'GA'), { minLength: remaining, maxLength: remaining }),
        ).map(([saltStates, otherStates]) =>
          [...saltStates, ...otherStates].map((state) => ({
            externalListingId: 'pbt-tier',
            price: null as number | null,
            miles: null as number | null,
            msrp: null as number | null,
            dom: null as number | null,
            statusDate: null as Date | null,
            firstSeenAt: null as Date | null,
            lastSeenAt: null as Date | null,
            sellerType: null as string | null,
            sellerName: null as string | null,
            city: null as string | null,
            state,
            latitude: null as number | null,
            longitude: null as number | null,
            isCertified: null as boolean | null,
          }))
        )
      })

      await fc.assert(
        fc.asyncProperty(saltHighArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)
          expect(result.score).toBe(85)
          expect(result.label).toBe('High')
        }),
        { numRuns: 100 }
      )
    })

    it('salt-medium always yields score 55', async () => {
      // Generate listing histories where 0.25 <= saltBeltPercent <= 0.60
      const saltMediumArb = fc.integer({ min: 4, max: 20 }).chain((total) => {
        const minSalt = Math.ceil(total * 0.25)
        const maxSalt = Math.floor(total * 0.60)
        if (minSalt > maxSalt) return fc.constant([] as AgentInput['listingHistory'])
        return fc.integer({ min: minSalt, max: maxSalt }).chain((saltCount) => {
          const remaining = total - saltCount
          return fc.tuple(
            fc.array(fc.constantFrom(...SALT_BELT_STATES), { minLength: saltCount, maxLength: saltCount }),
            // Use non-salt, non-sun states for the remainder
            fc.array(fc.constantFrom('CA', 'OR', 'WA', 'CO', 'GA', 'NC', 'SC', 'TN', 'KY'), { minLength: remaining, maxLength: remaining }),
          ).map(([saltStates, otherStates]) =>
            [...saltStates, ...otherStates].map((state) => ({
              externalListingId: 'pbt-tier',
              price: null as number | null,
              miles: null as number | null,
              msrp: null as number | null,
              dom: null as number | null,
              statusDate: null as Date | null,
              firstSeenAt: null as Date | null,
              lastSeenAt: null as Date | null,
              sellerType: null as string | null,
              sellerName: null as string | null,
              city: null as string | null,
              state,
              latitude: null as number | null,
              longitude: null as number | null,
              isCertified: null as boolean | null,
            }))
          )
        })
      })

      await fc.assert(
        fc.asyncProperty(saltMediumArb, async (listingHistory) => {
          if (listingHistory.length === 0) return // Skip degenerate case
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)
          expect(result.score).toBe(55)
          expect(result.label).toBe('Medium')
        }),
        { numRuns: 100 }
      )
    })

    it('sun-medium always yields score 45 when no salt tier is triggered', async () => {
      // Generate listing histories where sunBeltPercent > 0.80 and saltBeltPercent < 0.25
      const sunMediumArb = fc.integer({ min: 5, max: 20 }).chain((total) => {
        const sunNeeded = Math.floor(total * 0.81) + 1 // Ensure > 80%
        const remaining = total - sunNeeded
        // Remaining must be non-salt, non-sun to keep saltBeltPercent < 0.25
        const maxSaltAllowed = Math.ceil(total * 0.25) - 1
        return fc.tuple(
          fc.array(fc.constantFrom(...SUN_BELT_STATES), { minLength: sunNeeded, maxLength: sunNeeded }),
          fc.array(fc.constantFrom('CA', 'OR', 'WA', 'CO', 'GA', 'NC', 'SC', 'TN', 'KY'), { minLength: remaining, maxLength: remaining }),
        ).filter(([sunStates, otherStates]) => {
          // Verify salt belt percent < 0.25 (other states shouldn't be in salt belt)
          const allStates = [...sunStates, ...otherStates]
          const saltCount = allStates.filter((s) => SALT_BELT_STATES.includes(s)).length
          return saltCount / allStates.length < 0.25
        }).map(([sunStates, otherStates]) =>
          [...sunStates, ...otherStates].map((state) => ({
            externalListingId: 'pbt-tier',
            price: null as number | null,
            miles: null as number | null,
            msrp: null as number | null,
            dom: null as number | null,
            statusDate: null as Date | null,
            firstSeenAt: null as Date | null,
            lastSeenAt: null as Date | null,
            sellerType: null as string | null,
            sellerName: null as string | null,
            city: null as string | null,
            state,
            latitude: null as number | null,
            longitude: null as number | null,
            isCertified: null as boolean | null,
          }))
        )
      })

      await fc.assert(
        fc.asyncProperty(sunMediumArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)
          expect(result.score).toBe(45)
          expect(result.label).toBe('Medium')
        }),
        { numRuns: 100 }
      )
    })

    it('low tier yields score 15 when no threshold is met', async () => {
      // Generate listing histories where saltBeltPercent < 0.25 and sunBeltPercent <= 0.80
      // Use only non-belt states
      const lowTierArb = fc.array(
        fc.constantFrom('CA', 'OR', 'WA', 'CO', 'GA', 'NC', 'SC', 'TN', 'KY', 'AL', 'MS', 'AR', 'OK', 'KS', 'NE', 'SD', 'ND', 'MT', 'WY', 'ID', 'AK'),
        { minLength: 1, maxLength: 20 },
      ).map((states) =>
        states.map((state) => ({
          externalListingId: 'pbt-tier',
          price: null as number | null,
          miles: null as number | null,
          msrp: null as number | null,
          dom: null as number | null,
          statusDate: null as Date | null,
          firstSeenAt: null as Date | null,
          lastSeenAt: null as Date | null,
          sellerType: null as string | null,
          sellerName: null as string | null,
          city: null as string | null,
          state,
          latitude: null as number | null,
          longitude: null as number | null,
          isCertified: null as boolean | null,
        }))
      )

      await fc.assert(
        fc.asyncProperty(lowTierArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)
          expect(result.score).toBe(15)
          expect(result.label).toBe('Low')
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 6: Result contract invariants
   *
   * For any execution of the CorrosionAgent, the returned result SHALL have
   * vectorIndex=4, vectorName="Regional Corrosion & Environmental Stress",
   * weight=0.05, a non-empty narrative, and metadata containing all required fields.
   *
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.6, 4.7**
   */
  describe('Property 6: Result contract invariants', () => {
    it('result always has correct vectorIndex, vectorName, weight, non-empty narrative, and all metadata fields', async () => {
      await fc.assert(
        fc.asyncProperty(listingHistoryArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)

          // Contract invariants
          expect(result.vectorIndex).toBe(4)
          expect(result.vectorName).toBe('Regional Corrosion & Environmental Stress')
          expect(result.weight).toBe(0.05)
          expect(result.narrative).toBeTruthy()
          expect(result.narrative.length).toBeGreaterThan(0)

          // Score and label validity
          expect(result.score).toBeGreaterThanOrEqual(0)
          expect(result.score).toBeLessThanOrEqual(100)
          expect(['Low', 'Medium', 'High']).toContain(result.label)

          // Metadata fields
          const metadata = result.metadata as Record<string, unknown>
          expect(metadata).toBeDefined()
          expect(metadata).toHaveProperty('saltBeltPercent')
          expect(metadata).toHaveProperty('sunBeltPercent')
          expect(metadata).toHaveProperty('uniqueStates')
          expect(metadata).toHaveProperty('validListingCount')
          expect(metadata).toHaveProperty('totalListingCount')
          expect(metadata).toHaveProperty('usedFallbackNarrative')

          // Type checks on metadata values
          expect(typeof metadata.saltBeltPercent).toBe('number')
          expect(typeof metadata.sunBeltPercent).toBe('number')
          expect(Array.isArray(metadata.uniqueStates)).toBe(true)
          expect(typeof metadata.validListingCount).toBe('number')
          expect(typeof metadata.totalListingCount).toBe('number')
          expect(typeof metadata.usedFallbackNarrative).toBe('boolean')
        }),
        { numRuns: 150 }
      )
    })
  })

  /**
   * Property 7: Empty input safety
   *
   * For any empty listing history or listing history where all states are null,
   * the agent SHALL return score=15 and label="Low" without throwing an error.
   *
   * **Validates: Requirements 3.1, 7.1, 7.2, 7.4**
   */
  describe('Property 7: Empty input safety', () => {
    it('empty listing history returns score=15, label="Low" without throwing', async () => {
      const input = buildAgentInput([])
      const result = await agent.execute(input)

      expect(result.score).toBe(15)
      expect(result.label).toBe('Low')
    })

    it('all-null-state listing histories return score=15, label="Low" without throwing', async () => {
      const allNullArb = fc.array(nullStateListing, { minLength: 1, maxLength: 20 })

      await fc.assert(
        fc.asyncProperty(allNullArb, async (listingHistory) => {
          const input = buildAgentInput(listingHistory)
          const result = await agent.execute(input)

          expect(result.score).toBe(15)
          expect(result.label).toBe('Low')

          const metadata = result.metadata as Record<string, unknown>
          expect(metadata.saltBeltPercent).toBe(0)
          expect(metadata.sunBeltPercent).toBe(0)
          expect(metadata.validListingCount).toBe(0)
        }),
        { numRuns: 100 }
      )
    })
  })
})
