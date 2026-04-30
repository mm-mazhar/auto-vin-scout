// lib/services/nhtsa-recalls.ts

import prisma from '@/app/lib/db'

const NHTSA_RECALLS_BASE_URL = 'https://api.nhtsa.gov/recalls/recallsByVehicle'
const NHTSA_TIMEOUT_MS = 10000

export interface NHTSARecallResult {
  NHTSACampaignNumber: string
  Component: string
  Summary: string
  Consequence: string
  Remedy: string
  Notes: string | null
  parkIt: boolean
  parkOutSide: boolean
  overTheAirUpdate: boolean
  ReportReceivedDate: string | null
  Manufacturer: string | null
  ModelYear: string
  Make: string
  Model: string
}

export interface NHTSARecallsResponse {
  Count: number
  Message: string
  results: NHTSARecallResult[]
}

const EMPTY_RESPONSE: NHTSARecallsResponse = { Count: 0, Message: '', results: [] }

export async function fetchNHTSARecalls(
  make: string,
  model: string,
  year: number
): Promise<NHTSARecallsResponse | null> {
  const url = `${NHTSA_RECALLS_BASE_URL}?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), NHTSA_TIMEOUT_MS)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return EMPTY_RESPONSE
    }

    if (!response.ok) {
      console.warn(`[NHTSARecalls] API returned status ${response.status} for ${make} ${model} ${year}`)
      return null
    }

    const data = (await response.json()) as NHTSARecallsResponse

    if (!data.results || data.results.length === 0) {
      return EMPTY_RESPONSE
    }

    return data
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[NHTSARecalls] Request timed out for ${make} ${model} ${year}`)
    } else {
      console.warn(`[NHTSARecalls] Request failed for ${make} ${model} ${year}:`, error)
    }
    return null
  }
}

export async function upsertVehicleRecalls(
  vehicleId: string,
  recalls: NHTSARecallResult[]
): Promise<number> {
  if (recalls.length === 0) return 0

  const now = new Date()
  let upserted = 0

  for (const recall of recalls) {
    try {
      await prisma.recall.upsert({
        where: { campaignNumber: recall.NHTSACampaignNumber },
        create: {
          vehicleId,
          campaignNumber: recall.NHTSACampaignNumber,
          component: recall.Component,
          summary: recall.Summary,
          consequence: recall.Consequence,
          remedy: recall.Remedy,
          notes: recall.Notes ?? null,
          parkIt: recall.parkIt ?? false,
          parkOutSide: recall.parkOutSide ?? false,
          overTheAirUpdate: recall.overTheAirUpdate ?? false,
          reportReceivedDate: recall.ReportReceivedDate ?? null,
          manufacturer: recall.Manufacturer ?? null,
          fetchedAt: now,
        },
        update: {
          component: recall.Component,
          summary: recall.Summary,
          consequence: recall.Consequence,
          remedy: recall.Remedy,
          notes: recall.Notes ?? null,
          parkIt: recall.parkIt ?? false,
          parkOutSide: recall.parkOutSide ?? false,
          overTheAirUpdate: recall.overTheAirUpdate ?? false,
          reportReceivedDate: recall.ReportReceivedDate ?? null,
          manufacturer: recall.Manufacturer ?? null,
          fetchedAt: now,
        },
      })
      upserted++
    } catch (error) {
      console.warn(`[NHTSARecalls] Failed to upsert recall ${recall.NHTSACampaignNumber}:`, error)
    }
  }

  return upserted
}
