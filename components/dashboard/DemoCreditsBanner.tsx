// components/dashboard/DemoCreditsBanner.tsx

import { Gift } from 'lucide-react'
import Link from 'next/link'

interface DemoCreditsBannerProps {
  credits: number
}

/**
 * Shown once to brand-new users who received demo credits on signup.
 * Disappears automatically after the first report is generated
 * (totalReports > 0 condition in dashboard/page.tsx).
 */
export function DemoCreditsBanner({ credits }: DemoCreditsBannerProps) {
  return (
    <div className='flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm'>
      <Gift className='mt-0.5 h-4 w-4 shrink-0 text-green-400' />
      <div className='flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2'>
        <span className='font-medium text-green-300'>
          You have {credits} free report{credits !== 1 ? 's' : ''} on us.
        </span>
        <span className='text-muted-foreground'>
          No card needed — just pick a VIN and run a full AI risk analysis to try it out.{' '}
          <Link
            href='/dashboard/billing'
            className='underline underline-offset-4 hover:text-foreground transition-colors'
          >
            Upgrade anytime
          </Link>{' '}
          when you're ready.
        </span>
      </div>
    </div>
  )
}
