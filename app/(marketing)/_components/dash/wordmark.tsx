// app/(marketing)/_components/dash/wordmark.tsx

import { cn } from '@/lib/utils'
import Link from 'next/link'

function DialMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 32 32' className={className} aria-hidden fill='none'>
      <path d='M5.2 22.5a12 12 0 1 1 21.6 0' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' />
      <path d='M16 18.5l6.4-7.2' stroke='var(--nd-emerald)' strokeWidth='2.6' strokeLinecap='round' />
      <circle cx='16' cy='18.5' r='2.6' fill='currentColor' />
      <path d='M9.4 10.9l1.3 1.3M16 7.6v1.8M22.6 10.9l-1.3 1.3' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href='/'
      aria-label='Auto VIN Scout, home'
      className={cn('group inline-flex items-center gap-2.5 text-(--nd-print)', className)}
    >
      <DialMark className='size-8 shrink-0 transition-transform duration-300 group-hover:-rotate-6' />
      <span className='nd-display text-[1.65rem] leading-none font-semibold tracking-[0.04em] uppercase'>
        Auto<span className='text-(--nd-print-2)'>VIN</span>Scout
      </span>
    </Link>
  )
}
