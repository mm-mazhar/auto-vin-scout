// lib/services/nhtsa-ncap-service.ts

import prisma from '@/app/lib/db'
import type { VehicleSafetyRating } from '@prisma/client'

// --- NHTSA API Response Interfaces ---

/** Single vehicle result from the model lookup endpoint */
export interface NhtsaVehicleResult {
  VehicleId: number
  VehicleDescription: string
  ModelYear: number
  Make: string
  Model: string
}

/** Response from GET /SafetyRatings/modelyear/{year}/make/{make}/model/{model} */
export interface NhtsaModelLookupResponse {
  Count: number
  Message: string
  Results: NhtsaVehicleResult[]
}

/** Response from GET /SafetyRatings/VehicleId/{nhtsaVehicleId} */
export interface NhtsaRatingsDetailResponse {
  Count: number
  Message: string
  Results: Array<{
    VehicleDescription: string
    OverallRating: string
    OverallFrontCrashRating: string
    OverallSideCrashRating: string
    RolloverRating: string
    FrontCrashDriversideRating: string
    FrontCrashPassengersideRating: string
    SideCrashDriversideRating: string
    SideCrashPassengersideRating: string
    SidePoleCrashRating: string
    RolloverPossibility: number
    DynamicTipResult: string
    NHTSAElectronicStabilityControl: string
    NHTSAForwardCollisionWarning: string
    NHTSALaneDepartureWarning: string
    ComplaintsCount: number
    InvestigationCount: number
    VehiclePicture: string
  }>
}

// --- Vehicle Input Type ---

export type VehicleInput = {
  id: string
  make: string
  model: string
  year: number
  driveType: string | null
  doors: number | null
  vehicleType: string | null
  bodyType: string | null
  bodySubtype: string | null
}

// --- Keyword Mapping Constants ---

const DRIVE_TYPE_MAP: Record<string, string> = {
  'Front-Wheel Drive': 'FWD',
  'Rear-Wheel Drive': 'RWD',
  'All-Wheel Drive': 'AWD',
  '4WD/4-Wheel Drive/4x4': '4WD',
  '4x4': '4WD',
  'FWD': 'FWD',
  'RWD': 'RWD',
  'AWD': 'AWD',
  '4WD': '4WD',
}

const BODY_CLASS_MAP: Record<string, string> = {
  'Sport Utility Vehicle (SUV)': 'SUV',
  'SUV': 'SUV',
  'Hatchback': 'HB',
  'Sedan': 'SDN',
  'Wagon': 'WGN',
  'Convertible': 'CONV',
  'Coupe': 'CPE',
  'Pickup': 'PU',
  'Van': 'VAN',
  'Minivan': 'VAN',
}

// --- Service Class ---

export class NhtsaNcapService {
  /**
   * Fetches NHTSA safety ratings for a vehicle, using two-level caching.
   * Returns the persisted VehicleSafetyRating or null on failure.
   * NEVER throws — all errors are caught and return null.
   */
  static async fetchAndSaveSafetyRatings(
    vehicle: VehicleInput
  ): Promise<VehicleSafetyRating | null> {
    try {
      // --- Cache Level 1: check by vehicleId ---
      const existingRating = await prisma.vehicleSafetyRating.findUnique({
        where: { vehicleId: vehicle.id },
      })
      if (existingRating) {
        return existingRating
      }

      // --- Step A: Fetch NHTSA vehicle IDs for year/make/model ---
      const encodedMake = encodeURIComponent(vehicle.make)
      const encodedModel = encodeURIComponent(vehicle.model)
      const lookupUrl = `https://api.nhtsa.gov/SafetyRatings/modelyear/${vehicle.year}/make/${encodedMake}/model/${encodedModel}`

      let lookupResponse: Response
      try {
        lookupResponse = await fetch(lookupUrl)
      } catch {
        // Network error — return null, never throw
        return null
      }

      if (!lookupResponse.ok) {
        return null
      }

      const lookupData: NhtsaModelLookupResponse = await lookupResponse.json()

      // Zero results → create "Not Rated" record with all null ratings
      if (!lookupData.Results || lookupData.Results.length === 0) {
        const notRatedRecord = await prisma.vehicleSafetyRating.create({
          data: { vehicleId: vehicle.id },
        })
        return notRatedRecord
      }

      // --- Matching: find best sub-model ---
      const nhtsaVehicleId = NhtsaNcapService.matchBestNhtsaId(
        lookupData.Results,
        vehicle
      )

      // --- Cache Level 2: check by nhtsaVehicleId ---
      const existingByNhtsaId = await prisma.vehicleSafetyRating.findFirst({
        where: { nhtsaVehicleId },
      })

      if (existingByNhtsaId) {
        // Copy rating fields to current vehicle (exclude identity/relation fields)
        const {
          id: _id,
          vehicleId: _vehicleId,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...ratingFields
        } = existingByNhtsaId

        const copiedRecord = await prisma.vehicleSafetyRating.create({
          data: {
            vehicleId: vehicle.id,
            ...ratingFields,
          },
        })
        return copiedRecord
      }

      // --- Step B: Fetch full ratings for the matched nhtsaVehicleId ---
      const ratingsUrl = `https://api.nhtsa.gov/SafetyRatings/VehicleId/${nhtsaVehicleId}`

      let ratingsResponse: Response
      try {
        ratingsResponse = await fetch(ratingsUrl)
      } catch {
        // Network error — return null
        return null
      }

      if (!ratingsResponse.ok) {
        return null
      }

      const ratingsData: NhtsaRatingsDetailResponse =
        await ratingsResponse.json()

      if (!ratingsData.Results || ratingsData.Results.length === 0) {
        return null
      }

      const result = ratingsData.Results[0]
      const dbFields = NhtsaNcapService.mapNhtsaResultToDbFields(
        result,
        nhtsaVehicleId
      )

      // Upsert into VehicleSafetyRating table
      const upsertedRecord = await prisma.vehicleSafetyRating.upsert({
        where: { vehicleId: vehicle.id },
        create: {
          vehicleId: vehicle.id,
          ...dbFields,
        },
        update: dbFields,
      })

      return upsertedRecord
    } catch {
      // Catch-all: never throw from this method
      return null
    }
  }

  /**
   * Selects the best-matching NHTSA vehicle ID from API results
   * using keyword scoring against the vehicle's attributes.
   */
  static matchBestNhtsaId(
    apiResults: NhtsaVehicleResult[],
    vehicle: VehicleInput
  ): number {
    if (!apiResults.length) return 0

    const keywords = NhtsaNcapService.extractKeywords(vehicle)

    let bestId = apiResults[0].VehicleId
    let bestScore = 0

    for (const result of apiResults) {
      const score = NhtsaNcapService.scoreDescription(
        result.VehicleDescription,
        keywords
      )
      if (score > bestScore) {
        bestScore = score
        bestId = result.VehicleId
      }
    }

    return bestId
  }

  /**
   * Extracts scoring keywords from vehicle attributes.
   * Maps driveType → FWD/RWD/AWD/4WD, doors → "{N} DR",
   * vehicleType/bodySubtype → SUV/HB/SDN/WGN/CONV/CPE/PU/VAN.
   */
  private static extractKeywords(vehicle: VehicleInput): string[] {
    const keywords: string[] = []

    // Drive type mapping
    if (vehicle.driveType && DRIVE_TYPE_MAP[vehicle.driveType]) {
      keywords.push(DRIVE_TYPE_MAP[vehicle.driveType])
    }

    // Doors → "{N} DR"
    // NHTSA is inconsistent with hatchbacks: some use "5 HB" (Corolla), others "4 DR" (Civic).
    // When doors=5, generate both "5" and "4 DR" keywords to match either pattern.
    if (vehicle.doors != null && vehicle.doors > 0) {
      if (vehicle.doors === 5) {
        keywords.push('5')
        keywords.push('4 DR')
      } else {
        keywords.push(`${vehicle.doors} DR`)
      }
    }

    // Body class: prefer bodyType over bodySubtype over vehicleType
    const bodySource = vehicle.bodyType ?? vehicle.bodySubtype ?? vehicle.vehicleType
    if (bodySource && BODY_CLASS_MAP[bodySource]) {
      keywords.push(BODY_CLASS_MAP[bodySource])
    }

    return keywords
  }

  /**
   * Scores a NHTSA vehicle description against extracted keywords.
   * Returns count of case-insensitive keyword matches.
   */
  private static scoreDescription(
    description: string,
    keywords: string[]
  ): number {
    const upperDesc = description.toUpperCase()
    let score = 0

    for (const keyword of keywords) {
      if (upperDesc.includes(keyword.toUpperCase())) {
        score++
      }
    }

    return score
  }

  /**
   * Maps raw NHTSA ratings response fields to database column format.
   */
  private static mapNhtsaResultToDbFields(
    result: NhtsaRatingsDetailResponse['Results'][number],
    nhtsaVehicleId: number
  ) {
    return {
      nhtsaVehicleId,
      vehicleDescription: result.VehicleDescription,
      overallRating: result.OverallRating,
      overallFrontCrashRating: result.OverallFrontCrashRating,
      overallSideCrashRating: result.OverallSideCrashRating,
      rolloverRating: result.RolloverRating,
      frontCrashDriversideRating: result.FrontCrashDriversideRating,
      frontCrashPassengersideRating: result.FrontCrashPassengersideRating,
      sideCrashDriversideRating: result.SideCrashDriversideRating,
      sideCrashPassengersideRating: result.SideCrashPassengersideRating,
      sidePoleCrashRating: result.SidePoleCrashRating,
      rolloverPossibility: result.RolloverPossibility,
      dynamicTipResult: result.DynamicTipResult,
      nhtsaElectronicStabilityControl: result.NHTSAElectronicStabilityControl,
      nhtsaForwardCollisionWarning: result.NHTSAForwardCollisionWarning,
      nhtsaLaneDepartureWarning: result.NHTSALaneDepartureWarning,
      complaintsCount: result.ComplaintsCount,
      investigationCount: result.InvestigationCount,
      frontCrashPicture: result.VehiclePicture,
    }
  }
}
