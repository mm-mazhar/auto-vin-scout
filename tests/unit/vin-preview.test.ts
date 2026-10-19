// tests/unit/vin-preview.test.ts

import { describe, expect, it, vi } from 'vitest'
import type { VehicleData } from '@/lib/services/nhtsa-decoder'
import type { NHTSARecallsResponse } from '@/lib/services/nhtsa-recalls'
import { createVinPreviewService } from '@/lib/services/vin-preview'

const VIN = '5YFBPRBE3LP067431'

const vehicle: VehicleData = {
  vin: VIN,
  make: 'TOYOTA',
  model: 'Corolla',
  year: 2020,
  trim: 'LE',
  engineDesc: '4-cylinder 2ZR-FAE',
  driveType: 'FWD',
  vehicleType: 'PASSENGER CAR',
  manufacturer: null,
  plantCity: null,
  plantCountry: null,
  engineModel: '2ZR-FAE',
  engineCylinders: '4',
  fuelInjectionType: null,
  fuelTypePrimary: 'Gasoline',
  fuelTypeSecondary: null,
  electrificationLevel: null,
  turbo: null,
}

function recalls(count: number): NHTSARecallsResponse {
  return {
    Count: count,
    Message: '',
    results: Array.from({ length: count }, () => ({}) as NHTSARecallsResponse['results'][number]),
  }
}

function makeService(overrides: Partial<Parameters<typeof createVinPreviewService>[0]> = {}) {
  const deps = {
    decode: vi.fn(async () => vehicle),
    fetchRecalls: vi.fn(async () => recalls(2)),
    now: () => 0,
    ...overrides,
  }
  return { deps, getVinPreview: createVinPreviewService(deps) }
}

describe('createVinPreviewService', () => {
  it('returns identity plus the model-year recall count', async () => {
    // #given NHTSA decodes the VIN and reports two recalls
    const { getVinPreview } = makeService()

    // #when the preview is requested
    const preview = await getVinPreview(VIN)

    // #then identity and recall count are returned
    expect(preview).toMatchObject({ make: 'TOYOTA', model: 'Corolla', year: 2020, modelRecallCount: 2 })
  })

  it('returns null when NHTSA cannot decode the VIN', async () => {
    // #given an undecodable VIN
    const { getVinPreview } = makeService({ decode: vi.fn(async () => null) })

    // #when / #then no preview is produced
    expect(await getVinPreview(VIN)).toBeNull()
  })

  it('reports an unknown recall count when the recalls service is down', async () => {
    // #given the recalls service fails
    const { getVinPreview } = makeService({ fetchRecalls: vi.fn(async () => null) })

    // #when the preview is requested
    const preview = await getVinPreview(VIN)

    // #then the gap is surfaced as null rather than zero
    expect(preview?.modelRecallCount).toBeNull()
  })

  it('serves repeat lookups from cache', async () => {
    // #given a service that has already decoded the VIN
    const { deps, getVinPreview } = makeService()
    await getVinPreview(VIN)

    // #when the same VIN is requested again
    await getVinPreview(VIN)

    // #then NHTSA is only called once
    expect(deps.decode).toHaveBeenCalledTimes(1)
  })

  it('does not cache a preview with an unknown recall count', async () => {
    // #given the first lookup could not reach the recalls service
    const { deps, getVinPreview } = makeService({ fetchRecalls: vi.fn(async () => null) })
    await getVinPreview(VIN)

    // #when the VIN is requested again
    await getVinPreview(VIN)

    // #then NHTSA is retried
    expect(deps.decode).toHaveBeenCalledTimes(2)
  })
})
