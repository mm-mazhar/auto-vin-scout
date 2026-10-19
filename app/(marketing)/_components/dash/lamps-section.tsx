// app/(marketing)/_components/dash/lamps-section.tsx

import { cn } from '@/lib/utils'
import { TelltaleGlyph } from './telltale-glyph'
import { Vfd } from './vfd'
import { RISK_VECTORS, type RiskVector } from './vectors'

const BY_WEIGHT = [...RISK_VECTORS].sort((a, b) => b.weight - a.weight)

const WELL_SIZE: Record<number, string> = {
  0.25: 'size-[4.6rem]',
  0.2: 'size-[4.1rem]',
  0.15: 'size-[3.7rem]',
  0.1: 'size-[3.3rem]',
  0.05: 'size-[2.9rem]',
}

const NAME_SIZE: Record<number, string> = {
  0.25: 'text-[2rem]',
  0.2: 'text-[1.8rem]',
  0.15: 'text-[1.6rem]',
  0.1: 'text-[1.45rem]',
  0.05: 'text-[1.3rem]',
}

function WeightGauge({ weight }: { weight: number }) {
  const lit = Math.round(weight * 20)
  return (
    <div className='flex flex-col items-end gap-2'>
      <Vfd value={`${Math.round(weight * 100)}`} cells={2} face='7' className='text-[1.6rem]' label={`${Math.round(weight * 100)} percent of the score`} />
      <div className='flex gap-[3px]' aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn('h-1.5 w-3 rounded-[1px]', i < lit ? 'bg-(--nd-vfd)' : 'bg-(--nd-vfd-ghost)')} />
        ))}
      </div>
    </div>
  )
}

function LampEntry({ vector }: { vector: RiskVector }) {
  return (
    <li className='grid grid-cols-[5rem_1fr_auto] items-center gap-x-5 border-t border-(--nd-rule) py-6'>
      <span
        className={cn(
          'relative grid place-items-center justify-self-center overflow-hidden rounded-[0.55rem] border border-[oklch(0.38_0.012_175)] bg-[linear-gradient(172deg,oklch(1_0_0/0.13)_0%,oklch(1_0_0/0.04)_34%,transparent_36%),radial-gradient(130%_100%_at_50%_100%,oklch(0.24_0.03_168),oklch(0.06_0.01_175)_70%)] text-(--nd-print) shadow-[0_0_0_3px_oklch(0.12_0.008_175),0_0_0_4px_oklch(0.3_0.01_175),inset_0_1px_0_oklch(1_0_0/0.22),inset_0_-10px_18px_oklch(0_0_0/0.6)] [&>svg]:opacity-90',
          WELL_SIZE[vector.weight]
        )}
      >
        <TelltaleGlyph id={vector.id} className='size-[55%]' />
      </span>
      <div>
        <h3 className={cn('nd-display text-(--nd-print)', NAME_SIZE[vector.weight])}>{vector.name}</h3>
        <p className='mt-1.5 max-w-[38ch] text-base leading-relaxed text-(--nd-print-2)'>{vector.reads}</p>
      </div>
      <WeightGauge weight={vector.weight} />
    </li>
  )
}

export function LampsSection() {
  const half = Math.ceil(BY_WEIGHT.length / 2)
  return (
    <section id='lamps' aria-labelledby='lamps-heading' className='scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end'>
          <h2 id='lamps-heading' className='nd-display max-w-[14ch] text-[2.6rem] text-(--nd-print) sm:text-[3.4rem]'>
            Eight lamps, each reading a different trace.
          </h2>
          <p className='max-w-[52ch] text-lg leading-relaxed text-(--nd-print-2) lg:justify-self-end'>
            Every full report scores the car 0–100 on eight independent vectors and weights them into one composite.
            Mileage is the exposure multiplier across all of them: the longer a car has been exposed, the more each risk counts.
          </p>
        </div>

        <div className='mt-14 grid gap-x-16 lg:grid-cols-2'>
          <ul>
            {BY_WEIGHT.slice(0, half).map((vector) => (
              <LampEntry key={vector.id} vector={vector} />
            ))}
          </ul>
          <ul>
            {BY_WEIGHT.slice(half).map((vector) => (
              <LampEntry key={vector.id} vector={vector} />
            ))}
          </ul>
        </div>

        <div className='mt-4 flex flex-col gap-6 border-t border-(--nd-rule) pt-8 md:flex-row md:items-center md:justify-between'>
          <p className='text-base text-(--nd-print-2)'>
            Composite = Σ score × weight, capped at 100.
          </p>
          <ul className='flex flex-wrap gap-x-8 gap-y-3' aria-label='Score bands'>
            <li className='flex items-center gap-2.5'>
              <span className='h-1.5 w-6 rounded-[1px] bg-(--nd-emerald)' aria-hidden />
              <span className='nd-legend text-(--nd-print)'>0–30 Low</span>
              <span className='text-sm text-(--nd-print-3)'>standard wear</span>
            </li>
            <li className='flex items-center gap-2.5'>
              <span className='h-1.5 w-6 rounded-[1px] bg-(--nd-amber)' aria-hidden />
              <span className='nd-legend text-(--nd-print)'>31–70 Medium</span>
              <span className='text-sm text-(--nd-print-3)'>caution advised</span>
            </li>
            <li className='flex items-center gap-2.5'>
              <span className='h-1.5 w-6 rounded-[1px] bg-(--nd-red)' aria-hidden />
              <span className='nd-legend text-(--nd-print)'>71–100 High</span>
              <span className='text-sm text-(--nd-print-3)'>probable hidden damage</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
