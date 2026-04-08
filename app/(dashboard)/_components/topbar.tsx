// app/(dashboard)/_components/topbar.tsx

'use client'

import { SidebarTrigger } from '@/app/(dashboard)/_components/sidebar'
import { Themetoggle } from '@/components/Themetoggle'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CREDIT_REMINDER_THRESHOLD, PLAN_IDS, type PlanId } from '@/lib/constants'
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  CreditCard,
  Database,
  FileText,
  Home,
  Settings,
} from 'lucide-react'
// keep the commented off code
// import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

export function TopBar({
  usageInfo,
  subscriptionStatus,
}: {
  usageInfo?: {
    creditsUsed: number
    creditsTotal: number
    renewalDate?: number | null
    currentPlanId?: PlanId | null
    exhausted?: boolean
  }
  subscriptionStatus?: string | null
}) {
  void subscriptionStatus
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const startIndex = Math.max(parts.indexOf('dashboard'), 0)
  const trail = parts.slice(startIndex)
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    data: 'Data',
    documents: 'Documents',
    settings: 'Settings',
    billing: 'Billing',
    organization: 'Organization',
  }
  const icons: Record<string, React.ElementType> = {
    dashboard: ChartNoAxesCombined,
    data: Database,
    documents: FileText,
    settings: Settings,
    billing: CreditCard,
    organization: Building2,
  }

  let acc = ''
  const crumbElements: React.ReactNode[] = []
  trail.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === trail.length - 1
    const label = labels[seg] ?? seg
    const Icon = icons[seg]
    if (idx > 0) {
      crumbElements.push(<BreadcrumbSeparator key={`sep-${idx}`} />)
    }
    crumbElements.push(
      <BreadcrumbItem key={`item-${acc}`}>
        {isLast ? (
          <BreadcrumbPage className='flex items-center gap-1.5'>
            {Icon && <Icon className='size-3.5' />}
            {label}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={acc} className='flex items-center gap-1.5'>
            {Icon && <Icon className='size-3.5' />}
            {label}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    )
  })

  return (
    <header className='flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b'>
      <div className='flex items-center gap-2'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className='mr-2 data-[orientation=vertical]:h-4'
        />
        <Breadcrumb>
          <BreadcrumbList className='text-sm h-10 items-center hidden md:flex'>
            <BreadcrumbItem>
              <BreadcrumbLink href='/' className='flex items-center gap-1.5'>
                <Home className='size-3.5' />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {trail.length > 0 && <BreadcrumbSeparator />}
            {crumbElements}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className='flex items-center gap-2'>
        {usageInfo ? (
          (() => {
            const id = usageInfo.currentPlanId
            const base =
              id === PLAN_IDS.dealerplus
                ? 'Dealer Plus'
                : id === PLAN_IDS.dealercore
                  ? 'Dealer Core'
                  : id === PLAN_IDS.pro
                    ? 'Pro Plan'
                    : id === PLAN_IDS.basic
                      ? 'Basic Report'
                      : 'Free'
            return (
              <Badge className='h-8 px-3 text-sm font-medium leading-none'>
                {base}
              </Badge>
            )
          })()
        ) : null}
        {usageInfo && (
          <span className='inline-flex items-center h-8 px-1 rounded-md bg-primary text-primary-foreground font-medium text-sm border leading-none'>
            Credits: {usageInfo.creditsUsed ?? 0}
          </span>
        )}
        {/* keep the commented off */}
        {/* {usageInfo?.creditsUsed === 0 ? (
          <Link href='/dashboard/billing' className='inline-flex items-center h-8 px-3 rounded-md bg-primary text-primary-foreground font-medium text-sm border border-primary leading-none'>
            Renew Now
          </Link>
        ) : null} */}
        {usageInfo ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {(() => {
                const remaining = usageInfo.creditsUsed ?? 0
                const showNotification = usageInfo.exhausted || (remaining <= CREDIT_REMINDER_THRESHOLD)
                let tooltipText = `Credits: ${remaining}`
                if (usageInfo.exhausted || remaining === 0) {
                  tooltipText = 'Renew Now or Upgrade'
                } else if (remaining <= CREDIT_REMINDER_THRESHOLD) {
                  tooltipText = 'Low Credits'
                }
                return (
                  <a
                    href='/dashboard/billing'
                    aria-label='Notifications'
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-medium text-sm border border-primary leading-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0${showNotification ? ' relative after:content-[""] after:absolute after:-top-0.5 after:-right-0.5 after:size-2 after:rounded-full after:bg-destructive' : ''}`}
                    data-tooltip-text={tooltipText}
                  >
                    <Bell className='size-4' />
                  </a>
                )
              })()}
            </TooltipTrigger>
            {(() => {
              const remaining = usageInfo.creditsUsed ?? 0
              let tooltipText = `Credits: ${remaining}`
              if (usageInfo.exhausted || remaining === 0) {
                tooltipText = 'Renew Now or Upgrade'
              } else if (remaining <= CREDIT_REMINDER_THRESHOLD) {
                tooltipText = 'Low Credits'
              }
              return <TooltipContent sideOffset={8}>{tooltipText}</TooltipContent>
            })()}
          </Tooltip>
        ) : null}
        <Themetoggle isAuthenticated={true} />
      </div>
    </header>
  )
}
