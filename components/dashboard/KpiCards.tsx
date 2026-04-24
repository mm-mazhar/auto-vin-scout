// components/dashboard/KpiCards.tsx

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_IDS, type PlanId } from '@/lib/constants'
import { BarChart3, CreditCard, FileText, FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface KpiCardsProps {
  totalReports: number
  creditsRemaining: number
  creditsTotal: number
  reportsThisMonth: number
  activeProjects: number
  planId: PlanId | string
}

function UpgradeNudge() {
  return (
    <Link href='/dashboard/billing'>
      <Badge variant='destructive' className='text-xs'>
        Upgrade
      </Badge>
    </Link>
  )
}

function formatCreditsLabel(
  planId: string,
  creditsRemaining: number,
  creditsTotal: number
): string {
  if (planId === PLAN_IDS.basic) {
    return `${creditsRemaining} credits left`
  }
  if (planId === PLAN_IDS.free) {
    return `${creditsRemaining} / ${creditsTotal}`
  }
  return `${creditsRemaining} / ${creditsTotal}`
}

export function KpiCards({
  totalReports,
  creditsRemaining,
  creditsTotal,
  reportsThisMonth,
  activeProjects,
  planId,
}: KpiCardsProps) {
  const safeCredits = Math.max(0, creditsRemaining)
  const isFreePlan = planId === PLAN_IDS.free
  const showCreditsNudge = isFreePlan && safeCredits === 0
  const showMonthNudge = isFreePlan && reportsThisMonth > 0

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {/* Total Reports */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Reports</CardTitle>
          <FileText className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{totalReports}</div>
          <p className='text-xs text-muted-foreground mt-1'>Lifetime across org</p>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Credits</CardTitle>
          <CreditCard className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{safeCredits}</div>
          <div className='flex items-center gap-2 mt-1'>
            <p className='text-xs text-muted-foreground'>
              {planId === PLAN_IDS.basic
                ? 'credits left'
                : planId === PLAN_IDS.free
                  ? 'credits available'
                  : `${creditsTotal} included in plan`}
            </p>
            {showCreditsNudge && <UpgradeNudge />}
          </div>
        </CardContent>
      </Card>

      {/* Reports This Month */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Reports This Month</CardTitle>
          <BarChart3 className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{reportsThisMonth}</div>
          <div className='flex items-center gap-2 mt-1'>
            <p className='text-xs text-muted-foreground'>Current month</p>
            {showMonthNudge && <UpgradeNudge />}
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Active Projects</CardTitle>
          <FolderOpen className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{activeProjects}</div>
          <p className='text-xs text-muted-foreground mt-1'>In this organization</p>
        </CardContent>
      </Card>
    </div>
  )
}
