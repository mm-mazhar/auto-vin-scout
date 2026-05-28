// lib/orpc/routers/vin.ts

import * as z from 'zod'
import { orgProcedure, adminProcedure } from '../procedures'
import { ORPCError } from '../server'
import { decodeVinForTier, needsMarketCheckUpgrade, type EnhancedVehicleData } from '@/lib/services/vin-decoder'
import { inngest, analyzeReportEvent } from '@/lib/inngest/client'
import type { PrismaClient } from '@prisma/client'
import type { VehicleData } from '@/lib/services/nhtsa-decoder'

/**
 * User tier types for organization classification
 */
export type UserTier = 'FREE_TIER' | 'ZERO_CREDITS' | 'PAID'

/**
 * Create a vehicle response object without saving to database
 * Used for free tier preview functionality
 * 
 * @param vehicleData - Enhanced vehicle data
 * @returns Vehicle details object with temporary ID
 */
function createVehicleResponse(vehicleData: EnhancedVehicleData) {
  return {
    id: `preview-${Date.now()}`, // Temporary ID for frontend
    vin: vehicleData.vin,
    make: vehicleData.make,
    model: vehicleData.model,
    year: vehicleData.year,
    trim: vehicleData.trim,
    engineDesc: vehicleData.engineDesc,
    driveType: vehicleData.driveType,
    vehicleType: vehicleData.vehicleType,
    manufacturer: vehicleData.manufacturer,
    plantCity: vehicleData.plantCity,
    plantCountry: vehicleData.plantCountry,
    engineModel: vehicleData.engineModel,
    engineCylinders: vehicleData.engineCylinders,
    fuelInjectionType: vehicleData.fuelInjectionType,
    fuelTypePrimary: vehicleData.fuelTypePrimary,
    fuelTypeSecondary: vehicleData.fuelTypeSecondary,
    electrificationLevel: vehicleData.electrificationLevel,
    turbo: vehicleData.turbo,
    // Premium fields
    bodyType: vehicleData.bodyType ?? null,
    bodySubtype: vehicleData.bodySubtype ?? null,
    transmission: vehicleData.transmission ?? null,
    doors: vehicleData.doors ?? null,
    engineSize: vehicleData.engineSize ?? null,
    cylinders: vehicleData.cylinders ?? null,
    overallHeight: vehicleData.overallHeight ?? null,
    overallLength: vehicleData.overallLength ?? null,
    overallWidth: vehicleData.overallWidth ?? null,
    stdSeating: vehicleData.stdSeating ?? null,
    highwayMpg: vehicleData.highwayMpg ?? null,
    cityMpg: vehicleData.cityMpg ?? null,
    powertrainType: vehicleData.powertrainType ?? null,
    decoderSource: vehicleData.decoderSource,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Handle Free Tier Flow
 * Returns NHTSA data without database saves for users with no subscription history
 * 
 * @param vehicleData - Enhanced vehicle data
 * @returns Free preview response with temporary vehicle ID
 */
function handleFreeTierFlow(vehicleData: EnhancedVehicleData): {
  reportId: null
  status: 'FREE_PREVIEW'
  vehicle: ReturnType<typeof createVehicleResponse>
  isPreview: true
} {
  return {
    reportId: null,
    status: 'FREE_PREVIEW' as const,
    vehicle: createVehicleResponse(vehicleData),
    isPreview: true as const,
  }
}

/**
 * Handle Paid Flow
 * Full analysis with database save, credit deduction, and risk assessment via Inngest
 * 
 * @param db - Prisma client instance
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param vehicleData - Enhanced vehicle data (NHTSA or MarketCheck)
 * @returns Full report response with PENDING status (Inngest will complete async)
 */
async function handlePaidFlow(db: PrismaClient, orgId: string, projectId: string, vehicleData: EnhancedVehicleData): Promise<{
  reportId: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  vehicle: ReturnType<typeof createVehicleResponse>
  isPreview: false
}> {
  // Database Transaction
  const result = await db.$transaction(async (tx) => {
    // Upsert Vehicle (update if exists, create if not)
    const vehicle = await tx.vehicle.upsert({
      where: { vin: vehicleData.vin },
      update: {
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        trim: vehicleData.trim,
        engineDesc: vehicleData.engineDesc,
        driveType: vehicleData.driveType,
        vehicleType: vehicleData.vehicleType,
        manufacturer: vehicleData.manufacturer,
        plantCity: vehicleData.plantCity,
        plantCountry: vehicleData.plantCountry,
        engineModel: vehicleData.engineModel,
        engineCylinders: vehicleData.engineCylinders,
        fuelInjectionType: vehicleData.fuelInjectionType,
        fuelTypePrimary: vehicleData.fuelTypePrimary,
        fuelTypeSecondary: vehicleData.fuelTypeSecondary,
        electrificationLevel: vehicleData.electrificationLevel,
        turbo: vehicleData.turbo,
        // Premium fields
        bodyType: vehicleData.bodyType,
        bodySubtype: vehicleData.bodySubtype,
        transmission: vehicleData.transmission,
        doors: vehicleData.doors,
        engineSize: vehicleData.engineSize,
        cylinders: vehicleData.cylinders,
        overallHeight: vehicleData.overallHeight,
        overallLength: vehicleData.overallLength,
        overallWidth: vehicleData.overallWidth,
        stdSeating: vehicleData.stdSeating,
        highwayMpg: vehicleData.highwayMpg,
        cityMpg: vehicleData.cityMpg,
        powertrainType: vehicleData.powertrainType,
        decoderSource: vehicleData.decoderSource,
      },
      create: {
        vin: vehicleData.vin,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        trim: vehicleData.trim,
        engineDesc: vehicleData.engineDesc,
        driveType: vehicleData.driveType,
        vehicleType: vehicleData.vehicleType,
        manufacturer: vehicleData.manufacturer,
        plantCity: vehicleData.plantCity,
        plantCountry: vehicleData.plantCountry,
        engineModel: vehicleData.engineModel,
        engineCylinders: vehicleData.engineCylinders,
        fuelInjectionType: vehicleData.fuelInjectionType,
        fuelTypePrimary: vehicleData.fuelTypePrimary,
        fuelTypeSecondary: vehicleData.fuelTypeSecondary,
        electrificationLevel: vehicleData.electrificationLevel,
        turbo: vehicleData.turbo,
        // Premium fields
        bodyType: vehicleData.bodyType,
        bodySubtype: vehicleData.bodySubtype,
        transmission: vehicleData.transmission,
        doors: vehicleData.doors,
        engineSize: vehicleData.engineSize,
        cylinders: vehicleData.cylinders,
        overallHeight: vehicleData.overallHeight,
        overallLength: vehicleData.overallLength,
        overallWidth: vehicleData.overallWidth,
        stdSeating: vehicleData.stdSeating,
        highwayMpg: vehicleData.highwayMpg,
        cityMpg: vehicleData.cityMpg,
        powertrainType: vehicleData.powertrainType,
        decoderSource: vehicleData.decoderSource,
      },
    })

    // Create Report with PENDING status
    const report = await tx.report.create({
      data: {
        status: 'PENDING',
        organizationId: orgId,
        projectId: projectId,
        vehicleId: vehicle.id,
      },
    })

    // Decrement Organization Credits by 1
    await tx.organization.update({
      where: { id: orgId },
      data: {
        credits: {
          decrement: 1,
        },
      },
    })

    return { report, vehicle }
  })

  // Dispatch Inngest event for async risk assessment.
  // Only PAID tier (users with credits) trigger Inngest.
  // Requirements: 6.1, 6.2, 6.3, 6.4
  await inngest.send(
    analyzeReportEvent.create({
      reportId: result.report.id,
      orgId,
      vehicleId: result.vehicle.id,
      vehicleMake: result.vehicle.make,
      vehicleModel: result.vehicle.model,
      vehicleYear: result.vehicle.year,
    })
  )

  return {
    reportId: result.report.id,
    status: result.report.status as 'PENDING' | 'COMPLETED' | 'FAILED',
    vehicle: {
      ...result.vehicle,
      decoderSource: result.vehicle.decoderSource as 'NHTSA' | 'MARKETCHECK' | 'NHTSA_FALLBACK',
    },
    isPreview: false as const,
  }
}

/**
 * Handle Zero Credits Flow
 * Save to database but no risk assessment for users with subscription history but no credits
 * 
 * @param db - Prisma client instance
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param vehicleData - Enhanced vehicle data (NHTSA or MarketCheck)
 * @returns Zero credits response
 */
async function handleZeroCreditsFlow(db: PrismaClient, orgId: string, projectId: string, vehicleData: EnhancedVehicleData): Promise<{
  reportId: string
  status: 'ZERO_CREDITS'
  vehicle: ReturnType<typeof createVehicleResponse>
  isPreview: true
}> {
  const result = await db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.upsert({
      where: { vin: vehicleData.vin },
      update: {
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        trim: vehicleData.trim,
        engineDesc: vehicleData.engineDesc,
        driveType: vehicleData.driveType,
        vehicleType: vehicleData.vehicleType,
        manufacturer: vehicleData.manufacturer,
        plantCity: vehicleData.plantCity,
        plantCountry: vehicleData.plantCountry,
        engineModel: vehicleData.engineModel,
        engineCylinders: vehicleData.engineCylinders,
        fuelInjectionType: vehicleData.fuelInjectionType,
        fuelTypePrimary: vehicleData.fuelTypePrimary,
        fuelTypeSecondary: vehicleData.fuelTypeSecondary,
        electrificationLevel: vehicleData.electrificationLevel,
        turbo: vehicleData.turbo,
        // Premium fields
        bodyType: vehicleData.bodyType,
        bodySubtype: vehicleData.bodySubtype,
        transmission: vehicleData.transmission,
        doors: vehicleData.doors,
        engineSize: vehicleData.engineSize,
        cylinders: vehicleData.cylinders,
        overallHeight: vehicleData.overallHeight,
        overallLength: vehicleData.overallLength,
        overallWidth: vehicleData.overallWidth,
        stdSeating: vehicleData.stdSeating,
        highwayMpg: vehicleData.highwayMpg,
        cityMpg: vehicleData.cityMpg,
        powertrainType: vehicleData.powertrainType,
        decoderSource: vehicleData.decoderSource,
      },
      create: {
        vin: vehicleData.vin,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        trim: vehicleData.trim,
        engineDesc: vehicleData.engineDesc,
        driveType: vehicleData.driveType,
        vehicleType: vehicleData.vehicleType,
        manufacturer: vehicleData.manufacturer,
        plantCity: vehicleData.plantCity,
        plantCountry: vehicleData.plantCountry,
        engineModel: vehicleData.engineModel,
        engineCylinders: vehicleData.engineCylinders,
        fuelInjectionType: vehicleData.fuelInjectionType,
        fuelTypePrimary: vehicleData.fuelTypePrimary,
        fuelTypeSecondary: vehicleData.fuelTypeSecondary,
        electrificationLevel: vehicleData.electrificationLevel,
        turbo: vehicleData.turbo,
        // Premium fields
        bodyType: vehicleData.bodyType,
        bodySubtype: vehicleData.bodySubtype,
        transmission: vehicleData.transmission,
        doors: vehicleData.doors,
        engineSize: vehicleData.engineSize,
        cylinders: vehicleData.cylinders,
        overallHeight: vehicleData.overallHeight,
        overallLength: vehicleData.overallLength,
        overallWidth: vehicleData.overallWidth,
        stdSeating: vehicleData.stdSeating,
        highwayMpg: vehicleData.highwayMpg,
        cityMpg: vehicleData.cityMpg,
        powertrainType: vehicleData.powertrainType,
        decoderSource: vehicleData.decoderSource,
      },
    })

    const report = await tx.report.create({
      data: {
        status: 'ZERO_CREDITS',
        organizationId: orgId,
        projectId: projectId,
        vehicleId: vehicle.id,
      },
    })

    return { report, vehicle }
  })

  return {
    reportId: result.report.id,
    status: result.report.status as 'ZERO_CREDITS',
    vehicle: {
      ...result.vehicle,
      decoderSource: result.vehicle.decoderSource as 'NHTSA' | 'MARKETCHECK' | 'NHTSA_FALLBACK',
    },
    isPreview: true as const,
  }
}

/**
 * Determine user tier based on organization credits and subscription history
 * 
 * Business Logic:
 * - PAID: credits > 0
 * - ZERO_CREDITS: credits = 0 AND has subscription history
 * - FREE_TIER: credits = 0 AND no subscription history
 * 
 * @param db - Prisma client instance
 * @param orgId - Organization ID to check
 * @returns Promise<UserTier> - The determined user tier
 */
async function determineUserTier(db: PrismaClient, orgId: string): Promise<UserTier> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { 
      credits: true,
      subscription: true
    }
  })
  
  if (!org) {
    throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
  }
  
  if (org.credits > 0) return 'PAID'
  if (org.subscription) return 'ZERO_CREDITS'
  return 'FREE_TIER'
}

/**
 * VIN validation schema
 * VIN must be exactly 17 characters and match the pattern (no I, O, Q characters)
 * Validates: Requirements 1.1, 1.2, 1.3
 */
export const vinSchema = z
  .string()
  .length(17, 'VIN must be exactly 17 characters')
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN must contain only valid characters (no I, O, or Q)')

/**
 * Report status enum matching Prisma schema
 * Includes new status values for free tier preview functionality
 */
export const reportStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'FREE_PREVIEW', 'ZERO_CREDITS'])

/**
 * Recall display schema for UI rendering
 */
export const recallDisplaySchema = z.object({
  id: z.string(),
  campaignNumber: z.string(),
  component: z.string(),
  summary: z.string(),
  consequence: z.string(),
  remedy: z.string(),
  parkIt: z.boolean(),
  parkOutSide: z.boolean(),
  overTheAirUpdate: z.boolean(),
  reportReceivedDate: z.string().nullable(),
  manufacturer: z.string().nullable(),
})

/**
 * RiskVectorResult display schema for UI rendering
 */
export const riskVectorResultSchema = z.object({
  id: z.string(),
  vectorIndex: z.number(),
  vectorName: z.string(),
  score: z.number().min(0).max(100),
  label: z.string(),
  weight: z.number(),
  narrative: z.string(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
})

/**
 * VehicleListingHistory display schema for UI rendering
 */
export const vehicleListingHistorySchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  externalListingId: z.string(),
  price: z.number().nullable(),
  miles: z.number().nullable(),
  msrp: z.number().nullable(),
  sellerType: z.string().nullable(),
  inventoryType: z.string().nullable(),
  isCertified: z.boolean().nullable(),
  exteriorColor: z.string().nullable(),
  interiorColor: z.string().nullable(),
  dom: z.number().nullable(),
  statusDate: z.date().nullable(),
  firstSeenAt: z.date().nullable(),
  lastSeenAt: z.date().nullable(),
  sellerName: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  source: z.string().nullable(),
  vdpUrl: z.string().nullable(),
  dataSource: z.string().nullable(),
  fetchedAt: z.date(),
})

/**
 * VehicleSafetyRating display schema for NHTSA crash test data
 * Validates: Requirements 7.2
 */
export const vehicleSafetyRatingSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  nhtsaVehicleId: z.number().nullable(),
  vehicleDescription: z.string().nullable(),

  // Top-level ratings
  overallRating: z.string().nullable(),
  overallFrontCrashRating: z.string().nullable(),
  overallSideCrashRating: z.string().nullable(),
  rolloverRating: z.string().nullable(),

  // Granular crash test fields
  frontCrashDriversideRating: z.string().nullable(),
  frontCrashPassengersideRating: z.string().nullable(),
  sideCrashDriversideRating: z.string().nullable(),
  sideCrashPassengersideRating: z.string().nullable(),
  sidePoleCrashRating: z.string().nullable(),
  rolloverPossibility: z.number().nullable(),
  dynamicTipResult: z.string().nullable(),

  // ADAS fields
  nhtsaElectronicStabilityControl: z.string().nullable(),
  nhtsaForwardCollisionWarning: z.string().nullable(),
  nhtsaLaneDepartureWarning: z.string().nullable(),

  // Reputation fields
  complaintsCount: z.number().nullable(),
  investigationCount: z.number().nullable(),

  // Media
  frontCrashPicture: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Vehicle details output schema
 * Represents decoded vehicle information from NHTSA vPIC API and MarketCheck API
 */
export const vehicleDetailsSchema = z.object({
  id: z.string(),
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  trim: z.string().nullable(),
  engineDesc: z.string().nullable(),
  driveType: z.string().nullable(),
  vehicleType: z.string().nullable(),
  manufacturer: z.string().nullable(),
  plantCity: z.string().nullable(),
  plantCountry: z.string().nullable(),
  engineModel: z.string().nullable(),
  engineCylinders: z.string().nullable(),
  fuelInjectionType: z.string().nullable(),
  fuelTypePrimary: z.string().nullable(),
  fuelTypeSecondary: z.string().nullable(),
  electrificationLevel: z.string().nullable(),
  turbo: z.string().nullable(),
  
  // Premium fields from MarketCheck API
  bodySubtype: z.string().nullable(),
  transmission: z.string().nullable(),
  doors: z.number().nullable(),
  engineSize: z.number().nullable(),
  cylinders: z.number().nullable(),
  overallHeight: z.number().nullable(),
  overallLength: z.number().nullable(),
  overallWidth: z.number().nullable(),
  stdSeating: z.number().nullable(),
  highwayMpg: z.number().nullable(),
  cityMpg: z.number().nullable(),
  powertrainType: z.string().nullable(),
  
  // Decoder source tracking
  decoderSource: z.enum(['NHTSA', 'MARKETCHECK', 'NHTSA_FALLBACK']),

  // Recalls (populated for PAID tier reports)
  recalls: z.array(recallDisplaySchema).optional(),

  // Listing history (populated when included in query)
  listingHistory: z.array(vehicleListingHistorySchema).optional(),

  // Safety rating (populated when included in query)
  safetyRating: vehicleSafetyRatingSchema.nullable().optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Report with vehicle details output schema
 * Used for listing reports with associated vehicle information
 */
export const reportWithVehicleSchema = z.object({
  id: z.string(),
  status: reportStatusSchema,
  organizationId: z.string(),
  projectId: z.string(),
  vehicleId: z.string(),
  riskScore: z.number().min(0).max(100).nullable(),
  riskLabel: z.enum(['Low', 'Moderate', 'Elevated', 'High']).nullable(),
  riskNarrative: z.string().nullable(),
  isAiFallback: z.boolean().default(false),
  marketData: z.any().nullable(),
  environmentalData: z.any().nullable(),
  executiveSummary: z.string().nullable(),
  negotiationScript: z.string().nullable(),
  pricePrediction: z.string().nullable().optional().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
  vehicle: vehicleDetailsSchema,
  vectorResults: z.array(riskVectorResultSchema),
})

/**
 * Input schema for analyze procedure
 * Validates: Requirements 1.1, 1.2, 1.3, 9.1
 */
export const analyzeInputSchema = z.object({
  vin: vinSchema,
  projectId: z.string().min(1, 'Project ID is required'),
})

/**
 * Output schema for analyze procedure
 * Supports free tier preview functionality with nullable reportId and isPreview flag
 * Validates: Requirements 6.3, 9.2
 */
export const analyzeOutputSchema = z.union([
  z.object({
    reportId: z.string(),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
    vehicle: vehicleDetailsSchema,
    isPreview: z.literal(false),
  }),
  z.object({
    reportId: z.string(),
    status: z.literal('ZERO_CREDITS'),
    vehicle: vehicleDetailsSchema,
    isPreview: z.literal(true),
  }),
  z.object({
    reportId: z.null(),
    status: z.literal('FREE_PREVIEW'),
    vehicle: vehicleDetailsSchema,
    isPreview: z.literal(true),
  }),
])

/**
 * Input schema for list procedure
 * Validates: Requirements 8.1, 9.1
 */
export const listInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
})

/**
 * Output schema for list procedure
 * Validates: Requirements 8.2, 8.3, 8.4, 9.2
 */
export const listOutputSchema = z.array(reportWithVehicleSchema)

/**
 * Input schema for delete procedure
 */
export const deleteInputSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
})

/**
 * Output schema for delete procedure
 */
export const deleteOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

/**
 * Input schema for listingHistory procedure
 */
export const listingHistoryInputSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
})

/**
 * Output schema for listingHistory procedure
 */
export const listingHistoryOutputSchema = z.array(vehicleListingHistorySchema)

/**
 * VIN Router
 * Provides type-safe procedures for VIN analysis and report listing
 * Validates: Requirements 9.1, 9.2, 9.3
 */
export const vinRouter = {
  /**
   * Analyze a VIN and create a report
   * 
   * This procedure:
   * 1. Validates VIN format (17 chars, no I/O/Q)
   * 2. Checks organization credits
   * 3. Verifies project ownership
   * 4. Decodes VIN via NHTSA vPIC API
   * 5. Creates vehicle and report records atomically
   * 6. Schedules background risk assessment
   * 
   * Validates: Requirements 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.5, 5.1-5.3, 6.1-6.4, 7.1-7.2
   */
  analyze: orgProcedure
    .input(analyzeInputSchema)
    .output(analyzeOutputSchema)
    .route({
      method: 'POST',
      path: '/vin/analyze',
      summary: 'Analyze VIN',
      description: 'Analyzes a VIN and creates a report with vehicle details',
    })
    .handler(async ({ input, context }) => {
      const { vin, projectId } = input
      const { db, orgId } = context

      // Step 1: Get organization with subscription info
      const organization = await db.organization.findUnique({
        where: { id: orgId },
        select: { 
          credits: true,
          subscription: {
            select: { stripeSubscriptionId: true, status: true }
          }
        },
      })

      if (!organization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found',
        })
      }

      // Step 2: Verify project ownership
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          organizationId: orgId,
        },
      })

      if (!project) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Project not found',
        })
      }

      // Step 3: Determine user tier
      const tier = await determineUserTier(db, orgId)

      // Step 4: Decode VIN using tier-appropriate decoder with smart cache check
      // For PAID tier: check if existing Vehicle record needs MarketCheck upgrade
      // (prevents NHTSA-only cached records from blocking premium data for paid users)
      const existingVehicle = await db.vehicle.findUnique({ where: { vin } })

      let vehicleData: EnhancedVehicleData | null

      if (needsMarketCheckUpgrade(existingVehicle, tier)) {
        // PAID user with NHTSA-only cached record — upgrade via NHTSA-first flow
        vehicleData = await decodeVinForTier(vin, 'PAID')
      } else if (existingVehicle?.decoderSource === 'MARKETCHECK' && tier === 'PAID') {
        // Cache hit — premium data already present, skip MarketCheck call
        vehicleData = existingVehicle as unknown as EnhancedVehicleData
      } else {
        vehicleData = await decodeVinForTier(vin, tier)
      }

      if (!vehicleData) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid VIN or decode failed',
        })
      }

      // Step 5: Determine flow based on credits and subscription history
      const hasCredits = organization.credits > 0
      const hasSubscriptionHistory = organization.subscription !== null

      if (hasCredits) {
        // PAID FLOW: Full analysis with DB save, credit deduction, and Inngest dispatch
        return await handlePaidFlow(db, orgId, projectId, vehicleData)
      } else if (hasSubscriptionHistory) {
        // ZERO CREDITS FLOW: Save to DB but no Inngest dispatch (no risk assessment)
        return await handleZeroCreditsFlow(db, orgId, projectId, vehicleData)
      } else {
        // FREE TIER FLOW: No DB save, no Inngest dispatch, just return NHTSA data
        return handleFreeTierFlow(vehicleData)
      }
    }),

  /**
   * List all reports for a project
   * 
   * Returns all VIN analysis reports for the specified project,
   * including associated vehicle details, ordered by creation date descending.
   * 
   * Validates: Requirements 8.1-8.5
   */
  list: orgProcedure
    .input(listInputSchema)
    .output(listOutputSchema)
    .route({
      method: 'GET',
      path: '/vin/list',
      summary: 'List reports',
      description: 'Returns all VIN analysis reports for a project',
    })
    .handler(async ({ input, context }) => {
      const { projectId } = input
      const { db, orgId } = context

      // Step 1: Verify project ownership
      // Validates: Requirements 8.1
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          organizationId: orgId,
        },
      })

      if (!project) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Project not found',
        })
      }

      // Step 2: Query reports with vehicle relation
      // Validates: Requirements 8.2, 8.3, 8.4, 8.5
      const reports = await db.report.findMany({
        where: {
          projectId: projectId,
          organizationId: orgId,
        },
        include: {
          vehicle: {
            include: {
              recalls: true,
              listingHistory: { orderBy: { statusDate: 'asc' } },
              safetyRating: true,
            },
          },
          vectorResults: {
            orderBy: { vectorIndex: 'asc' },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Cast riskLabel to match the expected enum type, handling legacy values
      return reports.map((report) => ({
        ...report,
        vehicle: {
          ...report.vehicle,
          decoderSource: report.vehicle.decoderSource as 'NHTSA' | 'MARKETCHECK' | 'NHTSA_FALLBACK',
        },
        executiveSummary: report.executiveSummary ?? null,
        negotiationScript: report.negotiationScript ?? null,
        pricePrediction: report.pricePrediction ?? null,
        vectorResults: report.vectorResults,
        riskLabel: (() => {
          if (!report.riskLabel) return null
          // Handle legacy values
          if (report.riskLabel === 'Low Risk') return 'Low'
          if (report.riskLabel === 'Medium Risk') return 'Moderate'
          if (report.riskLabel === 'High Risk') return 'High'
          // Handle current enum values
          if (['Low', 'Moderate', 'Elevated', 'High'].includes(report.riskLabel)) {
            return report.riskLabel as 'Low' | 'Moderate' | 'Elevated' | 'High'
          }
          // Default fallback
          return null
        })(),
      }))
    }),

  /**
   * Delete a report
   * 
   * Deletes a report from the database. Only accessible to users with OWNER or ADMIN roles.
   * The report must belong to the user's organization.
   */
  delete: adminProcedure
    .input(deleteInputSchema)
    .output(deleteOutputSchema)
    .route({
      method: 'DELETE',
      path: '/vin/delete',
      summary: 'Delete report',
      description: 'Deletes a VIN analysis report (OWNER/ADMIN only)',
    })
    .handler(async ({ input, context }) => {
      const { reportId } = input
      const { db, orgId } = context

      // Step 1: Verify report exists and belongs to the organization
      const report = await db.report.findFirst({
        where: {
          id: reportId,
          organizationId: orgId,
        },
      })

      if (!report) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Report not found',
        })
      }

      // Step 2: Delete the report
      await db.report.delete({
        where: {
          id: reportId,
        },
      })

      return {
        success: true,
        message: 'Report deleted successfully',
      }
    }),

  /**
   * Get listing history for a vehicle
   * 
   * Returns all historical listings for a vehicle, sorted chronologically.
   * Enforces organization-level access control.
   */
  listingHistory: orgProcedure
    .input(listingHistoryInputSchema)
    .output(listingHistoryOutputSchema)
    .route({
      method: 'GET',
      path: '/vin/listing-history',
      summary: 'Get listing history',
      description: 'Returns all historical listings for a vehicle',
    })
    .handler(async ({ input, context }) => {
      const { vehicleId } = input
      const { db, orgId } = context

      // Verify vehicle belongs to a report owned by this organization
      const report = await db.report.findFirst({
        where: {
          vehicleId,
          organizationId: orgId,
        },
        select: { id: true },
      })

      if (!report) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Vehicle not found or not accessible',
        })
      }

      // Return listings sorted chronologically (ascending)
      return db.vehicleListingHistory.findMany({
        where: { vehicleId },
        orderBy: { statusDate: 'asc' },
      })
    }),
}

/**
 * Type exports for client consumption
 */
export type VinRouter = typeof vinRouter
export type AnalyzeInput = z.infer<typeof analyzeInputSchema>
export type AnalyzeOutput = z.infer<typeof analyzeOutputSchema>
export type ListInput = z.infer<typeof listInputSchema>
export type ListOutput = z.infer<typeof listOutputSchema>
export type DeleteInput = z.infer<typeof deleteInputSchema>
export type DeleteOutput = z.infer<typeof deleteOutputSchema>
export type VehicleDetails = z.infer<typeof vehicleDetailsSchema>
export type ReportWithVehicle = z.infer<typeof reportWithVehicleSchema>
export type ReportStatus = z.infer<typeof reportStatusSchema>
export type RecallDisplay = z.infer<typeof recallDisplaySchema>
export type RiskVectorResultDisplay = z.infer<typeof riskVectorResultSchema>
export type VehicleListingHistoryDisplay = z.infer<typeof vehicleListingHistorySchema>
export type VehicleSafetyRatingDisplay = z.infer<typeof vehicleSafetyRatingSchema>
export type ListingHistoryInput = z.infer<typeof listingHistoryInputSchema>
export type ListingHistoryOutput = z.infer<typeof listingHistoryOutputSchema>

/**
 * Export the determineUserTier function for use in other parts of the application
 */
export { determineUserTier }
