// app/(dashboard)/dashboard/reports/[reportId]/page.tsx

import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { ReportPage } from '@/app/(dashboard)/_components/report-page'
import { ProjectService } from '@/lib/services/project-service'
import { getActiveProjectId } from '@/lib/project-helper'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import { decodeVin } from '@/lib/services/nhtsa-decoder'
import prisma from '@/app/lib/db'
import { retryStaleJobs, acquireJobSlot, completeJob, failJob } from '@/lib/services/job-queue'
import { fetchNHTSARecalls, upsertVehicleRecalls } from '@/lib/services/nhtsa-recalls'
import { RiskEngineService } from '@/lib/services/risk-engine'
import type { ReportWithVehicle } from '@/lib/orpc/routers/vin'

interface ReportPageProps {
  params: Promise<{
    reportId: string
  }>
  searchParams: Promise<{
    vin?: string
    project?: string
  }>
}

export default async function ReportPageRoute({ params, searchParams }: ReportPageProps) {
  const { reportId } = await params
  const { vin, project } = await searchParams
  
  try {
    // Get current user and organization context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      notFound()
    }

    const cookieStore = await cookies()
    const currentOrgId = cookieStore.get('current-org-id')?.value
    
    if (!currentOrgId) {
      notFound()
    }

    // Get projects for the current organization
    const projects = await ProjectService.getOrganizationProjects(user.id, currentOrgId)
    const activeProjectId = await getActiveProjectId(projects)
    
    if (!activeProjectId) {
      notFound()
    }

    // Check if this is a preview report (starts with 'preview-')
    if (reportId.startsWith('preview-')) {
      // Handle free tier preview
      if (!vin || !project) {
        notFound()
      }
      
      // Verify project ownership
      const userProject = projects.find(p => p.id === project)
      if (!userProject) {
        notFound()
      }
      
      // Decode VIN using NHTSA API
      const vehicleData = await decodeVin(vin)
      if (!vehicleData) {
        notFound()
      }
      
      // Create preview report object
      const previewReport = {
        reportId: null,
        status: 'FREE_PREVIEW' as const,
        vehicle: {
          id: `preview-${Date.now()}`,
          vin: vehicleData.vin,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          trim: vehicleData.trim,
          engine: vehicleData.engine,
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isPreview: true as const,
      }
      
      return <ReportPage report={previewReport} projectId={project} />
    }

    // Handle regular reports (existing logic)
    const rpc = await getRPCCaller()
    const allReports = await rpc.vin.list({ 
      projectId: activeProjectId
    })
    
    const report = allReports.find((r: ReportWithVehicle) => r.id === reportId)
    
    if (!report) {
      notFound()
    }

    // If report is PENDING, check if there's a stuck PENDING job and retry it
    if (report.status === 'PENDING') {
      const pendingJob = await prisma.jobQueue.findFirst({
        where: { reportId, status: 'PENDING' },
      })

      if (pendingJob) {
        after(async () => {
          await retryStaleJobs()
          const acquired = await acquireJobSlot(pendingJob.orgId, pendingJob.id)
          if (!acquired) return

          try {
            const vehicle = await prisma.vehicle.findUnique({ where: { id: report.vehicleId } })
            if (vehicle) {
              const recallsResponse = await fetchNHTSARecalls(vehicle.make, vehicle.model, vehicle.year)
              if (recallsResponse && recallsResponse.Count > 0) {
                await upsertVehicleRecalls(vehicle.id, recallsResponse.results)
              }
              await new Promise((resolve) => setTimeout(resolve, 200))
            }
            await RiskEngineService.generateRiskAssessment(reportId)
            await completeJob(pendingJob.id)
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            await failJob(pendingJob.id, msg)
            await prisma.report.update({ where: { id: reportId }, data: { status: 'FAILED' } })
              .catch(() => {})
          }
        })
      }
    }
    
    return <ReportPage report={report} projectId={activeProjectId} />
  } catch (error) {
    console.error('Error fetching report:', error)
    notFound()
  }
}