// app/(marketing)/_components/dash/vfd.tsx

import { cn } from '@/lib/utils'

/**
 * A vacuum-fluorescent readout. Numerals use seven-segment cells with their
 * unlit segments ghosted behind, the way a real VFD does; DSEG renders "!" as
 * a full-width blank so padded cells stay aligned. Letters use a condensed
 * face instead, because segment letterforms (D as "]", V as "\/") misread.
 */
export function Vfd({
  value,
  cells,
  face = 'text',
  align = 'right',
  tone = 'lit',
  className,
  label,
}: {
  value: string
  cells?: number
  face?: '7' | 'text'
  align?: 'left' | 'right'
  tone?: 'lit' | 'dim' | 'amber' | 'red'
  className?: string
  label?: string
}) {
  const upper = value.toUpperCase()
  const toneAttr = tone === 'lit' ? undefined : tone

  if (face === 'text') {
    const unlit = '–'.repeat(cells ?? 8)
    return (
      <span
        className={cn('nd-vfd', className)}
        data-face='text'
        data-tone={toneAttr}
        data-unlit={upper ? undefined : ''}
        title={value || undefined}
      >
        <span aria-hidden>{upper || unlit}</span>
        <span className='sr-only'>{label ?? value}</span>
      </span>
    )
  }

  const width = cells ?? value.length
  const text = align === 'right' ? upper.padStart(width, ' ').slice(-width) : upper.padEnd(width, ' ').slice(0, width)

  return (
    <span className={cn('nd-vfd', className)} data-face='7' data-tone={toneAttr} data-ghost={text.replace(/[^.]/g, '8')}>
      <span aria-hidden>{text.replace(/ /g, '!')}</span>
      <span className='sr-only'>{label ?? value}</span>
    </span>
  )
}
