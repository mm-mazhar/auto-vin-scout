// app/(marketing)/_components/dash/demo-vins.tsx

'use client'

import { useDash } from './dash-state'
import { DEMO_VINS } from './vectors'

export function DemoVins() {
  const { setDraft, decode, phase } = useDash()
  return (
    <div className='flex flex-wrap items-center justify-center gap-x-3 gap-y-2'>
      <span className='nd-legend text-(--nd-print-3)'>Try</span>
      {DEMO_VINS.map(({ vin, label }) => (
        <button
          key={vin}
          type='button'
          disabled={phase === 'decoding'}
          onClick={() => {
            setDraft(vin)
            decode(vin)
          }}
          className='group inline-flex items-center gap-2 rounded-md border border-(--nd-rule) px-3 py-1.5 font-mono text-sm tracking-wide text-(--nd-print-2) transition-colors hover:border-(--nd-vfd-dim) hover:text-(--nd-print) disabled:opacity-60'
        >
          {vin}
          {label ? (
            <span className='nd-legend text-[0.75rem] text-(--nd-emerald) group-hover:text-(--nd-vfd)'>{label}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
