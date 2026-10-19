// app/(marketing)/_components/dash/trip-log-section.tsx

'use client'

import { cn } from '@/lib/utils'
import React from 'react'
import { Vfd } from './vfd'

const STEPS = [
  { title: 'Decode', body: 'NHTSA vPIC, or MarketCheck on paid plans: make, model, year, engine, plant.' },
  { title: 'Recalls', body: 'NHTSA recall campaigns for the model year, with park-it urgency flags.' },
  { title: 'Market history', body: 'Every marketplace listing: price, mileage, seller type, days on market.' },
  { title: 'Safety', body: 'NCAP crash ratings, ADAS features, complaints and investigations.' },
  { title: 'Flood & weather', body: 'FEMA disaster declarations, checked against Open-Meteo rainfall.' },
  { title: 'Public signals', body: 'Search results for this exact VIN, regional theft chatter, owner forums.' },
  { title: 'Eight agents', body: 'Each risk vector scored 0–100, all eight in parallel.' },
  { title: 'Synthesis', body: 'A plain-language summary and a negotiation script for the seller.' },
]

function useStepProgress(count: number) {
  const ref = React.useRef<HTMLOListElement>(null)
  const [current, setCurrent] = React.useState(-1)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    let frame = 0
    const update = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const viewport = window.innerHeight
      const start = viewport * 0.85
      const end = viewport * 0.3
      const progress = (start - rect.top) / (start - end + rect.height * 0.5)
      setCurrent(Math.min(count - 1, Math.max(-1, Math.floor(progress * count))))
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [count])

  return [ref, current] as const
}

export function TripLogSection() {
  const [ref, current] = useStepProgress(STEPS.length)

  return (
    <section id='how-it-reads' aria-labelledby='trip-heading' className='scroll-mt-24 border-y border-(--nd-rule) bg-(--nd-cowl) px-4 py-24 sm:px-6 lg:py-28'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='grid gap-6 lg:grid-cols-2 lg:items-end'>
          <h2 id='trip-heading' className='nd-display max-w-[16ch] text-[2.6rem] text-(--nd-print) sm:text-[3.4rem]'>
            How a report gets built.
          </h2>
          <p className='max-w-[52ch] text-lg leading-relaxed text-(--nd-print-2) lg:justify-self-end'>
            One VIN starts a durable pipeline. When a source fails, the report still completes and tells you
            which reading is missing instead of guessing.
          </p>
        </div>

        <ol ref={ref} className='relative mt-16 grid gap-y-10 md:grid-cols-4 md:gap-x-8 lg:grid-cols-8 lg:gap-x-5'>
          <span aria-hidden className='absolute top-[1.15rem] right-0 left-0 hidden h-px bg-(--nd-rule-strong) lg:block' />
          {STEPS.map((step, index) => {
            const state = index < current ? 'done' : index === current ? 'current' : 'ahead'
            return (
              <li key={step.title} className='relative' aria-current={state === 'current' ? 'step' : undefined}>
                <div className='relative flex items-center gap-3 bg-(--nd-cowl) pr-3 lg:inline-flex'>
                  <Vfd
                    value={String(index + 1).padStart(2, '0')}
                    face='7'
                    tone={state === 'current' ? 'lit' : 'dim'}
                    className={cn('text-[1.5rem] transition-opacity duration-300', state === 'ahead' && 'opacity-50')}
                    label={`Step ${index + 1}`}
                  />
                </div>
                <h3
                  className={cn(
                    'nd-display mt-4 text-[1.55rem] transition-colors duration-300',
                    state === 'current' ? 'text-(--nd-vfd)' : state === 'done' ? 'text-(--nd-print-2)' : 'text-(--nd-print)'
                  )}
                >
                  {step.title}
                </h3>
                <p className='mt-2 text-base leading-relaxed text-(--nd-print-2)'>{step.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
