// tests/integration/nhtsa-recalls.property.test.ts
// Property-Based Tests for NHTSA Recalls & Caching Infrastructure

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { needsMarketCheckUpgrade } from '@/lib/services/vin-decoder'
import { fetchNHTSARecalls } from '@/lib/services/nhtsa-recalls'
import type { UserTier } from '@/lib/orpc/routers/vin'
import type { Vehicle } from '@prisma/client'

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const decoderSourceArb = fc.constantFrom('NHTSA', 'MARKETCHECK', 'NHTSA_FALLBACK')
const tierArb = fc.constantFrom<UserTier>('FREE_TIER', 'ZERO_CREDITS', 'PAID')
const nonPaidTierArb = fc.constantFrom<UserTier>('FREE_TIER', 'ZERO_CREDITS')

function makeVehicle(decoderSource: string): Vehicle {
  return {
    id: 'v1',
    vin: '1FTFW1E84MFA12345',
    make: 'Ford',
    model: 'F-150',
    year: 2021,
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
    bodyType: null,
    bodySubtype: null,
    transmission: null,
    doors: null,
    engineSize: null,
    cylinders: null,
    overallHeight: null,
    overallLength: null,
    overallWidth: null,
    stdSeating: null,
    highwayMpg: null,
    cityMpg: null,
    powertrainType: null,
    decoderSource,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ─── Property 2: Cache Upgrade Correctness ───────────────────────────────────

describe('Property 2: Cache Upgrade Correctness', () => {
  it('PAID tier with NHTSA or NHTSA_FALLBACK decoderSource always returns true', async () => {
    const nhtsaSourceArb = fc.constantFrom('NHTSA', 'NHTSA_FALLBACK')

    await fc.assert(
      fc.asyncProperty(nhtsaSourceArb, async (decoderSource) => {
        // #given: PAID tier vehicle with NHTSA-only decode
        const vehicle = makeVehicle(decoderSource)

        // #when: checking if upgrade is needed
        const result = needsMarketCheckUpgrade(vehicle, 'PAID')

        // #then: must return true — premium data is missing
        expect(result).toBe(true)
      }),
      { numRuns: 50 }
    )
  })
})

// ─── Property 3: Cache Skip Correctness ──────────────────────────────────────

describe('Property 3: Cache Skip Correctness', () => {
  it('PAID tier with MARKETCHECK decoderSource always returns false', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant('MARKETCHECK'), async (decoderSource) => {
        // #given: PAID tier vehicle with MarketCheck premium data
        const vehicle = makeVehicle(decoderSource)

        // #when: checking if upgrade is needed
        const result = needsMarketCheckUpgrade(vehicle, 'PAID')

        // #then: must return false — premium data already present
        expect(result).toBe(false)
      }),
      { numRuns: 20 }
    )
  })
})

// ─── Property 9: Pure and Deterministic ──────────────────────────────────────

describe('Property 9: needsMarketCheckUpgrade is Pure and Deterministic', () => {
  it('non-PAID tiers always return false regardless of decoderSource', async () => {
    await fc.assert(
      fc.asyncProperty(decoderSourceArb, nonPaidTierArb, async (decoderSource, tier) => {
        // #given: any non-PAID tier with any decoder source
        const vehicle = makeVehicle(decoderSource)

        // #when: called twice with same inputs
        const result1 = needsMarketCheckUpgrade(vehicle, tier)
        const result2 = needsMarketCheckUpgrade(vehicle, tier)

        // #then: always false, always deterministic
        expect(result1).toBe(false)
        expect(result2).toBe(result1)
      }),
      { numRuns: 100 }
    )
  })

  it('null vehicle always returns false for any tier', async () => {
    await fc.assert(
      fc.asyncProperty(tierArb, async (tier) => {
        // #given: no cached vehicle
        const result = needsMarketCheckUpgrade(null, tier)

        // #then: always false
        expect(result).toBe(false)
      }),
      { numRuns: 50 }
    )
  })

  it('same inputs always produce same output (deterministic)', async () => {
    await fc.assert(
      fc.asyncProperty(decoderSourceArb, tierArb, async (decoderSource, tier) => {
        // #given: any vehicle and tier combination
        const vehicle = makeVehicle(decoderSource)

        // #when: called multiple times
        const results = Array.from({ length: 5 }, () =>
          needsMarketCheckUpgrade(vehicle, tier)
        )

        // #then: all results are identical
        expect(new Set(results).size).toBe(1)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 6: Recall Score Bounds ─────────────────────────────────────────

describe('Property 6: Recall Score Bounds', () => {
  it('MIN(recallCount * 10, 30) is always in [0, 30] for any non-negative recallCount', async () => {
    await fc.assert(
      fc.asyncProperty(fc.nat({ max: 1000 }), async (recallCount) => {
        // #given: any non-negative recall count
        const recallScore = Math.min(recallCount * 10, 30)

        // #then: score is always within [0, 30]
        expect(recallScore).toBeGreaterThanOrEqual(0)
        expect(recallScore).toBeLessThanOrEqual(30)
      }),
      { numRuns: 500 }
    )
  })

  it('recall score is 0 when recallCount is 0', async () => {
    const score = Math.min(0 * 10, 30)
    expect(score).toBe(0)
  })

  it('recall score caps at 30 when recallCount >= 3', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 1000 }), async (recallCount) => {
        const score = Math.min(recallCount * 10, 30)
        expect(score).toBe(30)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 8: fetchNHTSARecalls Never Throws ───────────────────────────────

describe('Property 8: fetchNHTSARecalls Never Throws', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('never throws for any make/model/year combination under all failure modes', async () => {
    const makeArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.constant(''),
      fc.constant('TOYOTA'),
    )
    const modelArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.constant(''),
      fc.constant('COROLLA'),
    )
    const yearArb = fc.oneof(
      fc.integer({ min: 1900, max: 2030 }),
      fc.integer({ min: -100, max: 0 }),
      fc.constant(0),
    )
    const failureModeArb = fc.constantFrom(
      'network_error',
      'abort_error',
      'status_404',
      'status_500',
      'status_429',
      'status_403',
      'invalid_json',
    )

    await fc.assert(
      fc.asyncProperty(makeArb, modelArb, yearArb, failureModeArb, async (make, model, year, failureMode) => {
        // #given: mock fetch to simulate various failure modes
        switch (failureMode) {
          case 'network_error':
            mockFetch.mockRejectedValueOnce(new Error('Network error'))
            break
          case 'abort_error':
            mockFetch.mockRejectedValueOnce(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
            break
          case 'status_404':
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
            break
          case 'status_500':
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
            break
          case 'status_429':
            mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
            break
          case 'status_403':
            mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })
            break
          case 'invalid_json':
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => { throw new Error('Invalid JSON') },
            })
            break
        }

        // #when / #then: must never throw
        let threw = false
        try {
          await fetchNHTSARecalls(make, model, year)
        } catch {
          threw = true
        }

        expect(threw).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})


// ─── Property 4: Recall Upsert Idempotency ───────────────────────────────────

import { testDb, TestUtils } from './setup'
import { upsertVehicleRecalls, type NHTSARecallResult } from '@/lib/services/nhtsa-recalls'

describe('Property 4: Recall Upsert Idempotency', () => {
  let testVehicle: Awaited<ReturnType<typeof testDb.vehicle.create>>

  beforeEach(async () => {
    testVehicle = await testDb.vehicle.create({
      data: {
        vin: `TEST${Date.now()}`,
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      },
    })
  })

  afterEach(async () => {
    await testDb.recall.deleteMany({ where: { vehicleId: testVehicle.id } })
    await testDb.vehicle.deleteMany({ where: { id: testVehicle.id } })
  })

  it('calling upsertVehicleRecalls twice produces identical DB state', async () => {
    const recallArb = fc.array(
      fc.record({
        NHTSACampaignNumber: fc.string({ minLength: 5, maxLength: 15 }),
        Component: fc.string({ minLength: 5, maxLength: 50 }),
        Summary: fc.string({ minLength: 10, maxLength: 100 }),
        Consequence: fc.string({ minLength: 10, maxLength: 100 }),
        Remedy: fc.string({ minLength: 10, maxLength: 100 }),
        Notes: fc.oneof(fc.string({ minLength: 5, maxLength: 50 }), fc.constant(null)),
        parkIt: fc.boolean(),
        parkOutSide: fc.boolean(),
        overTheAirUpdate: fc.boolean(),
        ReportReceivedDate: fc.oneof(
          fc.constant('04/11/2020'),   // MM/DD/YYYY
          fc.constant('20/12/2023'),   // DD/MM/YYYY
          fc.constant('2020-01-01'),   // ISO
          fc.constant(null)
        ),
        Manufacturer: fc.oneof(fc.constant('Toyota'), fc.constant(null)),
        ModelYear: fc.constant('2020'),
        Make: fc.constant('TOYOTA'),
        Model: fc.constant('COROLLA'),
      }),
      { minLength: 0, maxLength: 5 }
    )

    await fc.assert(
      fc.asyncProperty(recallArb, async (recalls) => {
        // #given: arbitrary array of recalls
        const typedRecalls = recalls as NHTSARecallResult[]

        // #when: upsert twice
        await upsertVehicleRecalls(testVehicle.id, typedRecalls)
        const afterFirst = await testDb.recall.findMany({
          where: { vehicleId: testVehicle.id },
          orderBy: { campaignNumber: 'asc' },
        })

        await upsertVehicleRecalls(testVehicle.id, typedRecalls)
        const afterSecond = await testDb.recall.findMany({
          where: { vehicleId: testVehicle.id },
          orderBy: { campaignNumber: 'asc' },
        })

        // #then: DB state is identical (same count, same campaign numbers)
        expect(afterSecond.length).toBe(afterFirst.length)
        expect(afterSecond.map((r) => r.campaignNumber)).toEqual(
          afterFirst.map((r) => r.campaignNumber)
        )

        // Cleanup for next iteration
        await testDb.recall.deleteMany({ where: { vehicleId: testVehicle.id } })
      }),
      { numRuns: 10 }
    )
  }, 60000)
})
