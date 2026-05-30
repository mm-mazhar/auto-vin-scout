// app/(dashboard)/dashboard/reports/page.tsx

import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { ProjectService } from '@/lib/services/project-service'
import { getActiveProjectId } from '@/lib/project-helper'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/app/lib/db'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileBarChart, Car, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { CreateReportDialog } from '@/app/(dashboard)/_components/create-report-dialog'
import { ReportActionsMenu } from '@/app/(dashboard)/_components/report-actions-menu'
import type { ReportWithVehicle } from '@/lib/orpc/routers/vin'
import type { OrganizationRole } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReportsPage() {
  // Get current user and organization context
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return redirect('/get-started')
  }

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value
  
  if (!currentOrgId) {
    return redirect('/dashboard')
  }

  // Get user's role in the organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: currentOrgId,
        userId: user.id,
      },
    },
    select: {
      role: true,
    },
  })

  const userRole = membership?.role as OrganizationRole

  // Get projects for the current organization
  const projects = await ProjectService.getOrganizationProjects(user.id, currentOrgId)
  const activeProjectId = await getActiveProjectId(projects)
  
  if (!activeProjectId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <FileBarChart className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Project Selected</h3>
          <p className="text-muted-foreground">
            Please select a project to view VIN analysis reports.
          </p>
        </div>
      </div>
    )
  }

  // Get RPC caller and fetch reports
  const rpc = await getRPCCaller()
  const reports = await rpc.vin.list({ projectId: activeProjectId })

  const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    FREE_PREVIEW: 'Free Preview',
    ZERO_CREDITS: 'No Credits',
  }

  const getStatusLabel = (status: string) => STATUS_LABELS[status] ?? status

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'FREE_PREVIEW':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'ZERO_CREDITS':
        return <XCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default'
      case 'PENDING':
        return 'secondary'
      case 'FAILED':
        return 'destructive'
      case 'FREE_PREVIEW':
        return 'secondary'
      case 'ZERO_CREDITS':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getRiskBadgeVariant = (label: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (label) {
      case 'Low':
        return 'default'
      case 'Moderate':
        return 'secondary'
      case 'Elevated':
        return 'destructive'
      case 'High':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getRiskBadgeClassName = (label: string | null) => {
    switch (label) {
      case 'Low':
        return 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600'
      case 'Moderate':
        return 'bg-amber-600 text-white border-amber-600 hover:bg-amber-600'
      case 'Elevated':
      case 'High':
        return 'bg-red-600 text-white border-red-600 hover:bg-red-600'
      default:
        return ''
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">VIN Analysis Reports</h2>
          <p className="text-muted-foreground">
            View and manage vehicle analysis reports for your project
          </p>
        </div>
        <div>
          <CreateReportDialog projectId={activeProjectId} />
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-md border">
          <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <FileBarChart className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              Start analyzing vehicles by entering a VIN number to generate your first report.
            </p>
            <CreateReportDialog projectId={activeProjectId} />
          </div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Assessment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report: ReportWithVehicle) => (
                <TableRow key={report.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {report.vehicle.year} {report.vehicle.make} {report.vehicle.model}
                        </div>
                        {report.vehicle.trim && (
                          <div className="text-sm text-muted-foreground">
                            {report.vehicle.trim}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {report.vehicle.vin}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(report.status)}
                      <Badge variant={getStatusBadgeVariant(report.status)} className="text-xs">
                        {getStatusLabel(report.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.status === 'COMPLETED' && report.riskScore !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{report.riskScore}/100</span>
                        {report.riskLabel && (
                          <Badge variant="outline" className={`text-xs ${getRiskBadgeClassName(report.riskLabel)}`}>
                            {report.riskLabel}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/reports/${report.id}`}>
                          View Report
                        </Link>
                      </Button>
                      <ReportActionsMenu
                        reportId={report.id}
                        userRole={userRole}
                        vehicleInfo={`${report.vehicle.year} ${report.vehicle.make} ${report.vehicle.model}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}