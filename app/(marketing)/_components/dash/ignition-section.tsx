// app/(marketing)/_components/dash/ignition-section.tsx

'use client'

import React from 'react'
import { useDash } from './dash-state'

export function IgnitionSection() {
  const { draft, setDraft, decode, reducedMotion } = useDash()

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    decode(draft)
    document.getElementById('top')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <section aria-labelledby='ignition-heading' className='border-t border-(--nd-rule) bg-(--nd-cowl) px-4 py-24 sm:px-6 lg:py-32'>
      <div className='mx-auto flex max-w-[1240px] flex-col items-center text-center'>
        <h2 id='ignition-heading' className='nd-display text-[3rem] text-(--nd-print) sm:text-[4.4rem]'>
          Turn the key.
        </h2>
        <p className='mt-4 max-w-[44ch] text-lg leading-relaxed text-(--nd-print-2)'>
          Paste the VIN from the listing. The decode is free and needs no account.
        </p>

        <form onSubmit={onSubmit} className='mt-10 flex w-full max-w-[40rem] flex-col gap-3 sm:flex-row' noValidate>
          <label htmlFor='ignition-vin' className='sr-only'>
            Vehicle identification number
          </label>
          <input
            id='ignition-vin'
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete='off'
            autoCapitalize='characters'
            spellCheck={false}
            maxLength={20}
            placeholder='17-character VIN'
            className='h-14 flex-1 rounded-md border border-(--nd-rule-strong) bg-[oklch(0.1_0.012_170)] px-4 font-mono text-[1.25rem] font-semibold tracking-[0.08em] text-(--nd-vfd) transition-colors outline-none placeholder:font-(family-name:--font-nd-legend) placeholder:text-base placeholder:font-medium placeholder:tracking-[0.12em] placeholder:text-(--nd-print-3) placeholder:uppercase hover:border-(--nd-vfd-dim) focus-visible:border-(--nd-vfd)'
          />
          <button
            type='submit'
            className='nd-legend h-14 rounded-md bg-(--nd-emerald) px-8 font-semibold text-(--nd-emerald-ink) transition-colors hover:bg-(--nd-emerald-hover)'
          >
            Decode
          </button>
        </form>
      </div>
    </section>
  )
}
