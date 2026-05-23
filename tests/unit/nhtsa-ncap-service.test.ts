// tests/unit/nhtsa-ncap-service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mock Prisma ---
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/app/lib/db', () => ({
  default: {
    vehicleSafetyRating: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

// --- Mock global fetch ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  NhtsaNcapService,
  type VehicleInput,
  type NhtsaVehicleResult,
} from '@/lib/services/nhtsa-ncap-service'

// --- Test Helpers ---

function makeVehicle(overrides: Partial<VehicleInput> = {}): VehicleInput {
  return {
    id: 'vehicle-test-001',
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    driveType: 'Front-Wheel Drive',
    doors: 4,
    vehicleType: null,
    bodySubtype: null,
    ...overrides,
  }
}

function makeNhtsaResults(
  descriptions: string[]
): NhtsaVehicleResult[] {
  return descriptions.map((desc, i) => ({
    VehicleId: 14799 + i,
    VehicleDescription: desc,
    ModelYear: 2020,
    Make: 'Toyota',
    Model: 'Corolla',
  }))
}

function makeSafetyRatingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rating-001',
    vehicleId: 'vehicle-test-001',
    nhtsaVehicleId: 14799,
    vehicleDescription: '2020 Toyota Corolla 4 DR FWD',
    overallRating: '5',
    overallFrontCrashRating: '4',
    overallSideCrashRating: '5',
    rolloverRating: '4',
    frontCrashDriversideRating: '4',
    frontCrashPassengersideRating: '4',
    sideCrashDriversideRating: '5',
    sideCrashPassengersideRating: '5',
    sidePoleCrashRating: '5',
    rolloverPossibility: 0.109,
    dynamicTipResult: 'No Tip',
    nhtsaElectronicStabilityControl: 'Standard',
    nhtsaForwardCollisionWarning: 'Optional',
    nhtsaLaneDepartureWarning: 'Optional',
    complaintsCount: 12,
    investigationCount: 0,
    frontCrashPicture: 'https://example.com/crash.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

describe('NhtsaNcapService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Cache Level 1: vehicleId hit ─────────────────────────────────────────

  describe('Cache Level 1 - vehicleId hit', () => {
    it('returns cached record immediately without calling fetch', async () => {
      const cachedRecord = makeSafetyRatingRecord()
      mockFindUnique.mockResolvedValue(cachedRecord)

      const vehicle = makeVehicle()
      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(vehicle)

      expect(result).toEqual(cachedRecord)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { vehicleId: vehicle.id },
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ─── matchBestNhtsaId: Keyword Extraction & Scoring ────────────────────────

  describe('matchBestNhtsaId', () => {
    it('matches FWD + 4 doors over AWD + 4 doors', () => {
      const results = makeNhtsaResults([
        '2020 Toyota Corolla 4 DR AWD',
        '2020 Toyota Corolla 4 DR FWD',
      ])
      const vehicle = makeVehicle({
        driveType: 'Front-Wheel Drive',
        doors: 4,
      })

      const bestId = NhtsaNcapService.matchBestNhtsaId(results, vehicle)

      // FWD vehicle should match "4 DR FWD" (score 2) over "4 DR AWD" (score 1)
      expect(bestId).toBe(14800) // second result
    })

    it('falls back to first result when all vehicle fields are null', () => {
      const results = makeNhtsaResults([
        '2020 Toyota Corolla 4 DR FWD',
        '2020 Toyota Corolla 4 DR AWD',
      ])
      const vehicle = makeVehicle({
        driveType: null,
        doors: null,
        vehicleType: null,
        bodySubtype: null,
      })

      const bestId = NhtsaNcapService.matchBestNhtsaId(results, vehicle)

      // No keywords → all scores 0 → fallback to first result
      expect(bestId).toBe(14799)
    })

    it('matches SUV body type in description', () => {
      const results = makeNhtsaResults([
        '2020 Toyota RAV4 4 DR FWD',
        '2020 Toyota RAV4 SUV AWD',
      ])
      const vehicle = makeVehicle({
        driveType: 'All-Wheel Drive',
        doors: null,
        vehicleType: null,
        bodySubtype: 'Sport Utility Vehicle (SUV)',
      })

      const bestId = NhtsaNcapService.matchBestNhtsaId(results, vehicle)

      // AWD + SUV → "SUV AWD" matches both keywords (score 2) vs "4 DR FWD" (score 0)
      expect(bestId).toBe(14800)
    })

    it('prefers bodySubtype over vehicleType for keyword extraction', () => {
      const results = makeNhtsaResults([
        '2020 Honda Civic HB FWD',
        '2020 Honda Civic SDN FWD',
      ])
      const vehicle = makeVehicle({
        driveType: 'Front-Wheel Drive',
        doors: null,
        vehicleType: 'Sedan', // would map to SDN
        bodySubtype: 'Hatchback', // takes priority → HB
      })

      const bestId = NhtsaNcapService.matchBestNhtsaId(results, vehicle)

      // bodySubtype "Hatchback" → "HB", so "HB FWD" (score 2) beats "SDN FWD" (score 1)
      expect(bestId).toBe(14799)
    })

    it('handles RWD drive type correctly', () => {
      const results = makeNhtsaResults([
        '2020 BMW 3 Series 4 DR RWD',
        '2020 BMW 3 Series 4 DR AWD',
      ])
      const vehicle = makeVehicle({
        driveType: 'Rear-Wheel Drive',
        doors: 4,
      })

      const bestId = NhtsaNcapService.matchBestNhtsaId(results, vehicle)

      // RWD + 4 DR → "4 DR RWD" (score 2) vs "4 DR AWD" (score 1)
      expect(bestId).toBe(14799)
    })

    it('handles 4WD drive type mapping', () => {
      const results = makeNhtsaResults([
        '2020 Jeep Wrangler 4WD',
        '2020 Jeep Wrangler 2WD',
      ])
      const vehicle = makeVehicle({
        driveType: '4WD/4-Wheel Drive/4x4',
        doors: null,
      })

      const bestId = NhtsaNcapService.matchBestNhtsaId(results, vehicle)

      // 4WD → "4WD" (score 1) vs "2WD" (score 0)
      expect(bestId).toBe(14799)
    })
  })

  // ─── API Failure Handling ──────────────────────────────────────────────────

  describe('API failure handling', () => {
    it('returns null when fetch throws a network error', async () => {
      mockFindUnique.mockResolvedValue(null) // cache miss
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(makeVehicle())

      expect(result).toBeNull()
    })

    it('returns null when model lookup API returns non-200', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValue({ ok: false, status: 500 })

      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(makeVehicle())

      expect(result).toBeNull()
    })

    it('returns null when ratings detail API returns non-200', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockFindFirst.mockResolvedValue(null) // cache level 2 miss

      // First fetch: model lookup succeeds
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({
          Count: 1,
          Message: '',
          Results: [{ VehicleId: 14799, VehicleDescription: '2020 Toyota Corolla 4 DR FWD', ModelYear: 2020, Make: 'Toyota', Model: 'Corolla' }],
        })
      )
      // Second fetch: ratings detail fails
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })

      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(makeVehicle())

      expect(result).toBeNull()
    })

    it('returns null when ratings detail fetch throws', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockFindFirst.mockResolvedValue(null)

      // First fetch: model lookup succeeds
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({
          Count: 1,
          Message: '',
          Results: [{ VehicleId: 14799, VehicleDescription: '2020 Toyota Corolla 4 DR FWD', ModelYear: 2020, Make: 'Toyota', Model: 'Corolla' }],
        })
      )
      // Second fetch: network error
      mockFetch.mockRejectedValueOnce(new Error('Connection reset'))

      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(makeVehicle())

      expect(result).toBeNull()
    })
  })

  // ─── Zero Results: "Not Rated" Record ──────────────────────────────────────

  describe('Zero results - Not Rated record', () => {
    it('creates a "Not Rated" record when API returns empty Results', async () => {
      mockFindUnique.mockResolvedValue(null)
      const notRatedRecord = { id: 'nr-001', vehicleId: 'vehicle-test-001', nhtsaVehicleId: null }
      mockCreate.mockResolvedValue(notRatedRecord)

      mockFetch.mockResolvedValue(
        mockFetchResponse({ Count: 0, Message: '', Results: [] })
      )

      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(makeVehicle())

      expect(result).toEqual(notRatedRecord)
      expect(mockCreate).toHaveBeenCalledWith({
        data: { vehicleId: 'vehicle-test-001' },
      })
      // Should NOT call ratings detail API
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('creates a "Not Rated" record when Results is null/undefined', async () => {
      mockFindUnique.mockResolvedValue(null)
      const notRatedRecord = { id: 'nr-002', vehicleId: 'vehicle-test-001' }
      mockCreate.mockResolvedValue(notRatedRecord)

      mockFetch.mockResolvedValue(
        mockFetchResponse({ Count: 0, Message: '', Results: null })
      )

      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(makeVehicle())

      expect(result).toEqual(notRatedRecord)
      expect(mockCreate).toHaveBeenCalledWith({
        data: { vehicleId: 'vehicle-test-001' },
      })
    })
  })

  // ─── Cache Level 2: nhtsaVehicleId hit ─────────────────────────────────────

  describe('Cache Level 2 - nhtsaVehicleId hit', () => {
    it('copies ratings from existing record when nhtsaVehicleId matches', async () => {
      mockFindUnique.mockResolvedValue(null) // cache level 1 miss

      const existingRecord = makeSafetyRatingRecord({
        id: 'rating-other',
        vehicleId: 'vehicle-other-001',
      })
      mockFindFirst.mockResolvedValue(existingRecord)

      const copiedRecord = makeSafetyRatingRecord({
        id: 'rating-new',
        vehicleId: 'vehicle-test-001',
      })
      mockCreate.mockResolvedValue(copiedRecord)

      // Model lookup returns a result
      mockFetch.mockResolvedValue(
        mockFetchResponse({
          Count: 1,
          Message: '',
          Results: [{ VehicleId: 14799, VehicleDescription: '2020 Toyota Corolla 4 DR FWD', ModelYear: 2020, Make: 'Toyota', Model: 'Corolla' }],
        })
      )

      const vehicle = makeVehicle()
      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(vehicle)

      expect(result).toEqual(copiedRecord)
      // Should NOT call ratings detail API (only model lookup)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      // Should create a new record with copied rating fields
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'vehicle-test-001',
            nhtsaVehicleId: 14799,
            overallRating: '5',
          }),
        })
      )
    })
  })

  // ─── Full Flow: Cache Miss → Fetch → Upsert ───────────────────────────────

  describe('Full flow - cache miss to upsert', () => {
    it('fetches ratings and upserts when both caches miss', async () => {
      mockFindUnique.mockResolvedValue(null) // cache level 1 miss
      mockFindFirst.mockResolvedValue(null) // cache level 2 miss

      const upsertedRecord = makeSafetyRatingRecord()
      mockUpsert.mockResolvedValue(upsertedRecord)

      // First fetch: model lookup
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({
          Count: 1,
          Message: '',
          Results: [{ VehicleId: 14799, VehicleDescription: '2020 Toyota Corolla 4 DR FWD', ModelYear: 2020, Make: 'Toyota', Model: 'Corolla' }],
        })
      )
      // Second fetch: ratings detail
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({
          Count: 1,
          Message: '',
          Results: [{
            VehicleDescription: '2020 Toyota Corolla 4 DR FWD',
            OverallRating: '5',
            OverallFrontCrashRating: '4',
            OverallSideCrashRating: '5',
            RolloverRating: '4',
            FrontCrashDriversideRating: '4',
            FrontCrashPassengersideRating: '4',
            SideCrashDriversideRating: '5',
            SideCrashPassengersideRating: '5',
            SidePoleCrashRating: '5',
            RolloverPossibility: 0.109,
            DynamicTipResult: 'No Tip',
            NHTSAElectronicStabilityControl: 'Standard',
            NHTSAForwardCollisionWarning: 'Optional',
            NHTSALaneDepartureWarning: 'Optional',
            ComplaintsCount: 12,
            InvestigationCount: 0,
            VehiclePicture: 'https://example.com/crash.png',
          }],
        })
      )

      const vehicle = makeVehicle()
      const result = await NhtsaNcapService.fetchAndSaveSafetyRatings(vehicle)

      expect(result).toEqual(upsertedRecord)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vehicleId: 'vehicle-test-001' },
          create: expect.objectContaining({
            vehicleId: 'vehicle-test-001',
            nhtsaVehicleId: 14799,
            overallRating: '5',
            vehicleDescription: '2020 Toyota Corolla 4 DR FWD',
          }),
        })
      )
    })

    it('URL-encodes make and model in the API call', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValue(
        mockFetchResponse({ Count: 0, Message: '', Results: [] })
      )
      mockCreate.mockResolvedValue({ id: 'nr', vehicleId: 'v1' })

      const vehicle = makeVehicle({
        make: 'Mercedes-Benz',
        model: 'C-Class/AMG C 43',
      })

      await NhtsaNcapService.fetchAndSaveSafetyRatings(vehicle)

      const fetchUrl = mockFetch.mock.calls[0][0] as string
      expect(fetchUrl).toContain('Mercedes-Benz')
      expect(fetchUrl).toContain('C-Class%2FAMG%20C%2043') // slash and space encoded
    })
  })
})
