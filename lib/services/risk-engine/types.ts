// lib/services/risk-engine/types.ts

import type { VehicleSafetyRating } from '@prisma/client'

export type RiskLabel = 'Low' | 'Medium' | 'High'

export interface RiskVectorResult {
  vectorIndex: number
  vectorName: string
  score: number       // 0-100
  label: RiskLabel
  weight: number      // 0.0-1.0
  narrative: string
  metadata?: Record<string, unknown>
}

export interface FinalRiskAssessment {
  compositeScore: number    // 0-100 (weighted sum, capped)
  compositeLabel: RiskLabel
  executiveSummary: string
  negotiationScript: string
  vectorResults: RiskVectorResult[]
}

export interface AgentInput {
  reportId: string
  vehicle: {
    id: string
    vin: string
    make: string
    model: string
    year: number
    trim: string | null
    engineDesc: string | null
    engineCylinders: string | null
    turbo: string | null
    fuelTypePrimary: string | null
    fuelTypeSecondary: string | null
    electrificationLevel: string | null
    engineModel: string | null
    decoderSource: string
  }
  recalls: Array<{
    id: string
    campaignNumber: string
    component: string
    summary: string
    parkIt: boolean
    parkOutSide: boolean
  }>
  listingHistory: Array<{
    externalListingId: string
    price: number | null
    miles: number | null
    msrp: number | null
    dom: number | null
    statusDate: Date | null
    firstSeenAt: Date | null
    lastSeenAt: Date | null
    sellerType: string | null
    sellerName: string | null
    city: string | null
    state: string | null
    latitude: number | null
    longitude: number | null
    isCertified: boolean | null
  }>
  safetyRating: VehicleSafetyRating | null
}

/**
 * Contract that every risk agent must implement.
 * Agents are stateless — all data is passed in via AgentInput.
 */
export interface RiskAgent {
  readonly vectorIndex: number
  readonly vectorName: string
  readonly weight: number
  execute(input: AgentInput): Promise<RiskVectorResult>
}
