// app/(dashboard)/dashboard/reports/[reportId]/page.tsx

import { notFound } from 'next/navigation'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { ReportPage } from '@/app/(dashboard)/_components/report-page'
import { ProjectService } from '@/lib/services/project-service'
import { getActiveProjectId } from '@/lib/project-helper'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import { decodeVin } from '@/lib/services/nhtsa-decoder'
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
          decoderSource: 'NHTSA' as const,
          safetyRating: null,
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
    
    return <ReportPage report={report} projectId={activeProjectId} />
  } catch (error) {
    console.error('Error fetching report:', error)
    notFound()
  }
}