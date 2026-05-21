// tests/integration/marketcheck-history-service.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  MarketCheckHistoryService,
  MarketCheckHistoryServiceError,
  MarketCheckTimeoutError,
} from '@/lib/services/marketcheck-history-service'
import type { MarketCheckListingRaw } from '@/lib/services/marketcheck-history-service'

// Mock global.fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock prisma
vi.mock('@/app/lib/db', () => {
  return {
    default: {
      vehicleListingHistory: {
        upsert: vi.fn(),
      },
    },
  }
})

import prisma from '@/app/lib/db'

const TEST_VIN = '1HGBH41JXMN109186'
const TEST_VEHICLE_ID = 'vehicle-test-id-001'

// --- Helpers ---

function makeListing(overrides: Partial<MarketCheckListingRaw> = {}): MarketCheckListingRaw {
  return {
    id: `listing-${Math.random().toString(36).substr(2, 8)}`,
    price: 25000,
    miles: 45000,
    msrp: 30000,
    seller_type: 'dealer',
    inventory_type: 'used',
    is_certified: false,
    exterior_color: 'Black',
    interior_color: 'Gray',
    dom: 30,
    status_date: 1700000000, // Unix timestamp (seconds)
    first_seen_at: 1699900000,
    last_seen_at: 1700100000,
    seller_name: 'Test Dealer',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    latitude: '30.2672',
    longitude: '-97.7431',
    source: 'dealer_website',
    vdp_url: 'https://example.com/listing',
    data_source: 'marketcheck',
    ...overrides,
  }
}

function mockSuccessResponse(data: MarketCheckListingRaw[]) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

function mockErrorResponse(status: number, body = '') {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  }
}

describe('MarketCheckHistoryService', () => {
  const mockUpsert = prisma.vehicleListingHistory.upsert as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Default upsert mock: return a DB-shaped record
    mockUpsert.mockImplementation(async ({ create }) => ({
      id: `db-${Math.random().toString(36).substr(2, 8)}`,
      ...create,
      fetchedAt: new Date(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Test 1: Successful single-page fetch (< 50 records) — upserts and sorts chronologically', async () => {
    // #given: API returns 3 listings (less than PAGE_SIZE of 50)
    const listings = [
      makeListing({ id: 'L1', status_date: 1700300000 }),
      makeListing({ id: 'L2', status_date: 1700100000 }),
      makeListing({ id: 'L3', status_date: 1700200000 }),
    ]
    mockFetch.mockResolvedValueOnce(mockSuccessResponse(listings))

    // #when: Fetch and persist
    const result = await MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)

    // #then: Should upsert all 3 records
    expect(mockUpsert).toHaveBeenCalledTimes(3)

    // #then: Should return results sorted ascending by statusDate
    expect(result).toHaveLength(3)
    for (let i = 1; i < result.length; i++) {
      const prevDate = result[i - 1].statusDate?.getTime() ?? 0
      const currDate = result[i].statusDate?.getTime() ?? 0
      expect(currDate).toBeGreaterThanOrEqual(prevDate)
    }

    // #then: Should only make one fetch call (single page, < 50 records)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('Test 2: Successful multi-page fetch (pagination) — processes all pages', async () => {
    // #given: Page 1 returns exactly 50 records (triggers next page), page 2 returns 10
    const page1Listings = Array.from({ length: 50 }, (_, i) =>
      makeListing({ id: `P1-${i}`, status_date: 1700000000 + i * 1000 })
    )
    const page2Listings = Array.from({ length: 10 }, (_, i) =>
      makeListing({ id: `P2-${i}`, status_date: 1700100000 + i * 1000 })
    )

    mockFetch
      .mockResolvedValueOnce(mockSuccessResponse(page1Listings))
      .mockResolvedValueOnce(mockSuccessResponse(page2Listings))

    // #when: Fetch and persist
    const result = await MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)

    // #then: Should make 2 fetch calls (page 1 + page 2)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // #then: Should upsert all 60 records
    expect(mockUpsert).toHaveBeenCalledTimes(60)

    // #then: Should return all 60 records
    expect(result).toHaveLength(60)
  })

  it('Test 3: Empty response (200 + []) — returns empty array without error', async () => {
    // #given: API returns an empty array
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([]))

    // #when: Fetch and persist
    const result = await MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)

    // #then: Should return empty array
    expect(result).toEqual([])

    // #then: Should not call upsert
    expect(mockUpsert).not.toHaveBeenCalled()

    // #then: Should only make one fetch call
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('Test 4: Error response (401) — throws MarketCheckHistoryServiceError with correct statusCode', async () => {
    // #given: API returns 401 Unauthorized
    mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'))

    // #when/#then: Should throw typed error with correct statusCode
    let caughtError: unknown
    try {
      await MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(MarketCheckHistoryServiceError)
    expect((caughtError as MarketCheckHistoryServiceError).statusCode).toBe(401)
  })

  it('Test 5: Error response (429) — throws MarketCheckHistoryServiceError', async () => {
    // #given: API returns 429 Too Many Requests
    mockFetch.mockResolvedValueOnce(mockErrorResponse(429, 'Rate limit exceeded'))

    // #when/#then: Should throw typed error with correct statusCode
    let caughtError: unknown
    try {
      await MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(MarketCheckHistoryServiceError)
    expect((caughtError as MarketCheckHistoryServiceError).statusCode).toBe(429)
  })

  it('Test 6: Timeout handling — throws MarketCheckTimeoutError', async () => {
    // #given: Fetch throws an AbortError (simulating timeout via AbortController)
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    mockFetch.mockRejectedValueOnce(abortError)

    // #when/#then: Should throw MarketCheckTimeoutError
    await expect(
      MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)
    ).rejects.toThrow(MarketCheckTimeoutError)
  })

  it('Test 7: Chronological sort — descending input is returned ascending by statusDate', async () => {
    // #given: API returns listings in descending order (newest first)
    const listings = [
      makeListing({ id: 'D1', status_date: 1700300000 }), // newest
      makeListing({ id: 'D2', status_date: 1700200000 }),
      makeListing({ id: 'D3', status_date: 1700100000 }), // oldest
    ]
    mockFetch.mockResolvedValueOnce(mockSuccessResponse(listings))

    // #when: Fetch and persist
    const result = await MarketCheckHistoryService.fetchAndPersist(TEST_VIN, TEST_VEHICLE_ID)

    // #then: Output should be sorted ascending by statusDate
    expect(result).toHaveLength(3)
    const dates = result.map((r) => r.statusDate?.getTime() ?? 0)
    expect(dates[0]).toBeLessThan(dates[1])
    expect(dates[1]).toBeLessThan(dates[2])

    // Verify the oldest is first, newest is last
    expect(result[0].externalListingId).toBe('D3')
    expect(result[2].externalListingId).toBe('D1')
  })
})
