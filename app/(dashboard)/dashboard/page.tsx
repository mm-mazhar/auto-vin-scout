// app/(dashboard)/dashboard/page.tsx

import { KpiCards } from '@/components/dashboard/KpiCards'
import { RecentReportsTable } from '@/components/dashboard/RecentReportsTable'
import { ReportsAreaChart } from '@/components/dashboard/ReportsAreaChart'
import { ReportsByProjectDonut } from '@/components/dashboard/ReportsByProjectDonut'
import { DemoCreditsBanner } from '@/components/dashboard/DemoCreditsBanner'
import { Card, CardContent } from '@/components/ui/card'
import { getActiveProjectId } from '@/lib/project-helper'
import { getRPCCaller, getRPCCallerForOrg } from '@/lib/orpc/rsc-client'
import { createClient } from '@/app/lib/supabase/server'
import { ProjectService } from '@/lib/services/project-service'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type {
  DashboardStats,
  DailyReportCount,
  ProjectReportCount,
  RecentReport,
} from '@/lib/orpc/routers/dashboard'
import { DEMO_CREDITS_AMOUNT, DEMO_CREDITS_ENABLED, PLAN_IDS, type OrganizationRole } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function SectionError({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className='flex items-center justify-center h-32 text-sm text-muted-foreground'>
        Failed to load {label}. Refresh to retry.
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const rpc = await getRPCCaller()

  // Resolve effective org from cookie + membership validation
  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value
  const organizations = (await rpc.org.list()) as {
    id: string
    members: { role: string }[]
  }[]

  const isMember =
    currentOrgId && organizations.some((org) => org.id === currentOrgId)
  const effectiveOrgId = isMember
    ? currentOrgId
    : (organizations[0]?.id ?? null)

  if (!effectiveOrgId) {
    return (
      <div className='flex h-[50vh] flex-col items-center justify-center gap-4'>
        <p className='text-muted-foreground'>No organization found.</p>
      </div>
    )
  }

  const effectiveOrg = organizations.find((o) => o.id === effectiveOrgId)
  const userRole = (effectiveOrg?.members[0]?.role ?? 'MEMBER') as OrganizationRole

  // Build a caller pinned to the resolved org — avoids cookie mismatch
  // where createContext() might resolve a different orgId than effectiveOrgId
  const orgRpc = getRPCCallerForOrg(user, effectiveOrgId, userRole)

  // Fetch projects (needed for activeProjectId + donut chart)
  const projects = (await ProjectService.getOrganizationProjects(
    user.id,
    effectiveOrgId
  )) as { id: string; name: string; slug: string; updatedAt: Date; createdAt: Date; organizationId: string }[]

  const activeProjectId = await getActiveProjectId(projects)

  // Fetch all dashboard data in parallel — each section has its own fallback
  let stats: DashboardStats | null = null
  let reportsOverTime: DailyReportCount[] = []
  let reportsByProject: ProjectReportCount[] = []
  let recentReports: RecentReport[] = []

  let statsError = false
  let chartError = false
  let donutError = false
  let tableError = false

  await Promise.allSettled([
    orgRpc.dashboard.stats().then((d: DashboardStats) => { stats = d }).catch(() => { statsError = true }),
    orgRpc.dashboard.reportsOverTime({ days: 90 }).then((d: DailyReportCount[]) => { reportsOverTime = d }).catch(() => { chartError = true }),
    orgRpc.dashboard.reportsByProject().then((d: ProjectReportCount[]) => { reportsByProject = d }).catch(() => { donutError = true }),
    orgRpc.dashboard.recentReports().then((d: RecentReport[]) => { recentReports = d }).catch(() => { tableError = true }),
  ])

  return (
    <div className='flex flex-1 flex-col gap-6 p-4 pt-0'>
      {/* Demo credits welcome banner — only shown to new users when feature flag is on */}
      {DEMO_CREDITS_ENABLED &&
        stats &&
        (stats as DashboardStats).planId === PLAN_IDS.basic &&
        (stats as DashboardStats).totalReports === 0 &&
        (stats as DashboardStats).creditsRemaining === DEMO_CREDITS_AMOUNT && (
          <DemoCreditsBanner credits={DEMO_CREDITS_AMOUNT} />
        )}

      {/* Row 1 — KPI Cards */}
      {(statsError || !stats) ? (
        <SectionError label='KPI stats' />
      ) : (
        <KpiCards
          totalReports={(stats as DashboardStats).totalReports}
          creditsRemaining={(stats as DashboardStats).creditsRemaining}
          creditsTotal={(stats as DashboardStats).creditsTotal}
          reportsThisMonth={(stats as DashboardStats).reportsThisMonth}
          activeProjects={(stats as DashboardStats).activeProjects}
          planId={(stats as DashboardStats).planId}
        />
      )}

      {/* Row 2 — Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
        {chartError ? (
          <div className='col-span-3'>
            <SectionError label='reports chart' />
          </div>
        ) : (
          <ReportsAreaChart data={reportsOverTime} />
        )}

        {donutError ? (
          <div className='col-span-2'>
            <SectionError label='project distribution' />
          </div>
        ) : (
          <ReportsByProjectDonut
            data={reportsByProject}
            orgId={effectiveOrgId}
            userRole={userRole}
          />
        )}
      </div>

      {/* Row 3 — Recent Reports (full width) */}
      <div className='grid grid-cols-1 gap-4'>
        {tableError ? (
          <SectionError label='recent reports' />
        ) : (
          <RecentReportsTable reports={recentReports} />
        )}
      </div>
    </div>
  )
}
