// app/(marketing)/_components/dash/cluster.tsx

'use client'

import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import React from 'react'
import { barlowCondensed, barlowSemiCondensed } from '../../fonts'
import { CLUSTER, DIAL_ONLY, cowlSvgPath, lampBox, placeIn, type Box } from './cluster-geometry'
import { useDash, type DashPhase, type LampState } from './dash-state'
import { TelltaleGlyph } from './telltale-glyph'
import { Vfd } from './vfd'
import { BAND_LABEL, RISK_VECTORS, SAMPLE_REPORT, bandForScore } from './vectors'

const ClusterScene = dynamic(() => import('./cluster-scene'), { ssr: false })

const FULL_REPORT_HREF = '/get-started?next=/dashboard'

const LAMP_TEXT: Record<LampState, string> = {
  off: '',
  test: '',
  clear: 'Clear',
  medium: 'Medium',
  high: 'High',
  pending: 'In report',
}

const LAMP_GLYPH_CLASS: Record<LampState, string> = {
  off: 'text-(--nd-print-3)/40',
  test: 'text-(--nd-amber)',
  clear: 'text-(--nd-print-3)/40',
  medium: 'text-(--nd-amber)',
  high: 'text-(--nd-red)',
  pending: 'text-(--nd-print-3)/40',
}

function inset(box: Box, x: number, y = x): Box {
  return { x: box.x + x, y: box.y + y, w: box.w - x * 2, h: box.h - y * 2 }
}

function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    const list = window.matchMedia(query)
    setMatches(list.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T>(null)
  const [inView, setInView] = React.useState(true)
  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, inView]
}

function dialStatus(phase: DashPhase, score: number | null): { text: string; tone: string } {
  if (phase === 'sample' && score !== null) {
    const band = bandForScore(score)
    const tone = band === 'low' ? 'text-(--nd-emerald)' : band === 'medium' ? 'text-(--nd-amber)' : 'text-(--nd-red)'
    return { text: `${BAND_LABEL[band]} risk · sample`, tone }
  }
  switch (phase) {
    case 'decoding':
      return { text: 'Reading traces', tone: 'text-(--nd-print-2)' }
    case 'decoded':
      return { text: 'Scored in the full report', tone: 'text-(--nd-print-2)' }
    case 'error':
      return { text: 'No signal', tone: 'text-(--nd-amber)' }
    default:
      return { text: 'Risk index · 0–100', tone: 'text-(--nd-print-3)' }
  }
}

/* ---------- shared readout pieces ---------- */

function VehicleReadout({ compact = false }: { compact?: boolean }) {
  const { vehicle, phase } = useDash()
  const powered = phase !== 'off' || vehicle !== null
  const cells = compact ? 12 : 10
  const rows = [
    { label: 'Year', value: vehicle ? String(vehicle.year) : '', face: '7' as const, cells: 4 },
    { label: 'Make', value: vehicle?.make ?? '', face: 'text' as const, cells },
    { label: 'Model', value: vehicle?.model ?? '', face: 'text' as const, cells },
  ]
  return (
    <div className='flex h-full flex-col'>
      <div className='nd-legend flex items-baseline justify-between text-(--nd-print-3) [font-size:max(10px,0.85cqw)]'>
        <span>Vehicle</span>
        <span>{vehicle?.vin === SAMPLE_REPORT.vin ? 'Sample' : 'NHTSA vPIC'}</span>
      </div>
      <dl className='mt-[1.1cqw] flex flex-1 flex-col justify-between'>
        {rows.map((row) => (
          <div key={row.label}>
            <dt className='nd-legend text-(--nd-print-3) [font-size:max(10px,0.75cqw)]'>{row.label}</dt>
            <dd className='mt-[0.35cqw]'>
              <Vfd
                value={row.value}
                cells={row.cells}
                face={row.face}
                align='left'
                tone={powered ? 'lit' : 'dim'}
                label={row.value || `${row.label} not decoded`}
                className={row.face === '7' ? '[font-size:max(18px,2.3cqw)]' : 'block [font-size:max(15px,1.85cqw)]'}
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function TripComputer({ idPrefix }: { idPrefix: string }) {
  const { lines, phase, draft, setDraft, decode, error } = useDash()
  const inputId = `${idPrefix}-vin`
  const errorId = `${idPrefix}-vin-error`
  const visibleLines = lines.slice(-2)
  const busy = phase === 'decoding'

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    decode(draft)
  }

  return (
    <form onSubmit={onSubmit} className='flex h-full flex-col' noValidate>
      <div className='nd-legend flex items-baseline justify-between text-(--nd-print-3) [font-size:max(10px,0.85cqw)]'>
        <label htmlFor={inputId}>Trip computer · enter VIN</label>
        <span>Free</span>
      </div>
      <output
        htmlFor={inputId}
        aria-live='polite'
        className='mt-[0.9cqw] flex min-h-[3.2cqw] flex-col justify-center gap-[0.35cqw]'
      >
        {visibleLines.map((line, index) => (
          <span key={`${line}-${index}`} className='nd-print-line block'>
            <Vfd
              value={line}
              align='left'
              tone={phase === 'error' ? 'amber' : 'lit'}
              className='block [font-size:max(11px,1.12cqw)]'
            />
          </span>
        ))}
      </output>
      <div className='mt-auto flex flex-col gap-[0.7cqw]'>
        <input
          id={inputId}
          name='vin'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete='off'
          autoCapitalize='characters'
          spellCheck={false}
          inputMode='text'
          maxLength={20}
          placeholder='17-character VIN'
          aria-invalid={phase === 'error' ? true : undefined}
          aria-describedby={phase === 'error' ? errorId : undefined}
          className={cn(
            'w-full rounded-[0.5cqw] border bg-[oklch(0.1_0.012_170)] px-[0.9cqw] py-[0.6cqw] text-(--nd-vfd) outline-none transition-colors',
            'font-mono font-semibold tracking-[0.08em] [font-size:max(13px,1.2cqw)]',
            'placeholder:font-(family-name:--font-nd-legend) placeholder:font-medium placeholder:tracking-[0.12em] placeholder:uppercase placeholder:text-(--nd-print-3)',
            'border-(--nd-rule-strong) hover:border-(--nd-vfd-dim) focus-visible:border-(--nd-vfd) focus-visible:outline-none',
            phase === 'error' && 'border-(--nd-amber)'
          )}
        />
        {phase === 'error' && error ? (
          <p id={errorId} className='sr-only'>
            {error}
          </p>
        ) : null}
        {phase === 'decoded' ? (
          <div className='flex gap-[0.6cqw]'>
            <Link
              href={FULL_REPORT_HREF}
              className='nd-legend flex flex-1 items-center justify-center rounded-[0.5cqw] bg-(--nd-emerald) py-[0.7cqw] font-semibold text-(--nd-emerald-ink) transition-colors hover:bg-(--nd-emerald-hover) [font-size:max(11px,0.95cqw)]'
            >
              Full report · 1 credit
            </Link>
            <button
              type='submit'
              className='nd-legend rounded-[0.5cqw] border border-(--nd-rule-strong) px-[0.9cqw] text-(--nd-print-2) transition-colors hover:border-(--nd-vfd-dim) hover:text-(--nd-print) [font-size:max(11px,0.95cqw)]'
            >
              Decode
            </button>
          </div>
        ) : (
          <button
            type='submit'
            disabled={busy}
            className='nd-legend rounded-[0.5cqw] bg-(--nd-emerald) py-[0.7cqw] font-semibold text-(--nd-emerald-ink) transition-[background-color,opacity] hover:bg-(--nd-emerald-hover) disabled:cursor-progress disabled:opacity-70 [font-size:max(11px,0.95cqw)]'
          >
            {busy ? 'Decoding…' : 'Decode'}
          </button>
        )}
      </div>
    </form>
  )
}

function DialReadout() {
  const { score, phase } = useDash()
  const status = dialStatus(phase, score)
  const tone = score === null ? 'dim' : bandForScore(score) === 'low' ? 'lit' : bandForScore(score) === 'medium' ? 'amber' : 'red'
  return (
    <div className='flex h-full flex-col items-center justify-start'>
      <Vfd
        value={score === null ? '' : String(score)}
        cells={3}
        face='7'
        tone={tone}
        label={score === null ? 'No score yet' : `Risk score ${score} of 100`}
        className='[font-size:max(28px,3.6cqw)]'
      />
      <span className={cn('nd-legend mt-[0.8cqw] whitespace-nowrap [font-size:max(10px,0.85cqw)]', status.tone)}>
        {status.text}
      </span>
    </div>
  )
}

function LampGlyph({ index, className }: { index: number; className?: string }) {
  const { lamps } = useDash()
  const vector = RISK_VECTORS[index]
  const state = lamps[vector.id]
  return (
    <TelltaleGlyph
      id={vector.id}
      title={`${vector.lampLabel}${LAMP_TEXT[state] ? `: ${LAMP_TEXT[state]}` : ''}`}
      className={cn('transition-colors duration-150', LAMP_GLYPH_CLASS[state], className)}
    />
  )
}

function LampCaption({ index }: { index: number }) {
  const { lamps, phase } = useDash()
  const vector = RISK_VECTORS[index]
  const state = lamps[vector.id]
  const text = state === 'pending' && phase === 'sample' ? 'Not scored' : LAMP_TEXT[state]
  const stateTone =
    state === 'medium' ? 'text-(--nd-amber)' : state === 'high' ? 'text-(--nd-red)' : state === 'clear' ? 'text-(--nd-emerald)' : 'text-(--nd-print-3)'
  return (
    <span className='flex flex-col items-center text-center leading-tight'>
      <span className='nd-legend text-(--nd-print-2) [font-size:max(10px,0.85cqw)]'>{vector.lampLabel}</span>
      <span className={cn('nd-legend mt-1 min-h-[1.2em] [font-size:max(10px,0.8cqw)]', stateTone)}>{text}</span>
    </span>
  )
}

/* ---------- static fallback (SSR, no WebGL, before the scene loads) ---------- */

function StaticCluster() {
  const { dial, leftPod, rightPod } = CLUSTER
  return (
    <svg viewBox={`0 0 ${CLUSTER.width} ${CLUSTER.height}`} className='absolute inset-0 size-full' aria-hidden>
      <defs>
        <linearGradient id='nd-chrome' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#e7ecec' />
          <stop offset='0.5' stopColor='#7d8686' />
          <stop offset='1' stopColor='#c5cccb' />
        </linearGradient>
      </defs>
      <path d={cowlSvgPath(0)} fill='#131918' />
      <path d={cowlSvgPath(CLUSTER.rimInset)} fill='#090d0c' />
      {[leftPod, rightPod].map((pod) => (
        <rect key={pod.x} x={pod.x + 3} y={pod.y + 3} width={pod.w - 6} height={pod.h - 6} rx={16} fill='#030706' stroke='url(#nd-chrome)' strokeWidth={7} />
      ))}
      <circle cx={dial.cx} cy={dial.cy} r={dial.face} fill='#0e1312' />
      <circle cx={dial.cx} cy={dial.cy} r={(dial.face + dial.bezel) / 2} fill='none' stroke='url(#nd-chrome)' strokeWidth={dial.bezel - dial.face} />
      {RISK_VECTORS.map((vector, index) => {
        const box = lampBox(index)
        return <rect key={vector.id} x={box.x} y={box.y} width={box.w} height={box.h} rx={10} fill='#050807' stroke='#1c2322' strokeWidth={3} />
      })}
    </svg>
  )
}

function StaticDial() {
  const { dial } = DIAL_ONLY
  return (
    <svg viewBox={`0 0 ${DIAL_ONLY.width} ${DIAL_ONLY.height}`} className='absolute inset-0 size-full' aria-hidden>
      <circle cx={dial.cx} cy={dial.cy} r={236} fill='#131918' />
      <circle cx={dial.cx} cy={dial.cy} r={dial.face} fill='#0e1312' />
      <circle cx={dial.cx} cy={dial.cy} r={(dial.face + dial.bezel) / 2} fill='none' stroke='#9aa3a2' strokeWidth={dial.bezel - dial.face} />
    </svg>
  )
}

/* ---------- the two layouts ---------- */

function useScene(enabled: boolean) {
  const { keyOn, reducedMotion } = useDash()
  const [ready, setReady] = React.useState(false)
  const [settled, setSettled] = React.useState(false)
  const onReady = React.useCallback(() => setReady(true), [])
  const onSettled = React.useCallback(() => {
    setSettled(true)
    keyOn()
  }, [keyOn])

  React.useEffect(() => {
    if (!enabled) return
    const fallback = window.setTimeout(() => keyOn(), 2500)
    return () => window.clearTimeout(fallback)
  }, [enabled, keyOn])

  React.useEffect(() => {
    if (!ready || settled) return
    const fallback = window.setTimeout(() => setSettled(true), 3000)
    return () => window.clearTimeout(fallback)
  }, [ready, settled])

  return {
    ready,
    readoutsVisible: !ready || settled || reducedMotion,
    onReady,
    onSettled,
  }
}

function WideCluster({ mountScene }: { mountScene: boolean }) {
  const dash = useDash()
  const [ref, inView] = useInView<HTMLDivElement>()
  const scene = useScene(mountScene)

  return (
    <div className='mx-auto w-full max-w-[1120px]'>
      <div
        ref={ref}
        className='relative w-full [container-type:inline-size]'
        style={{ aspectRatio: `${CLUSTER.width} / ${CLUSTER.height}` }}
      >
        <div className={cn('absolute inset-0 transition-opacity duration-700', scene.ready && 'opacity-0')}>
          <StaticCluster />
        </div>
        {mountScene ? (
          <div className={cn('absolute inset-0 opacity-0 transition-opacity duration-500', scene.ready && 'opacity-100')}>
            <ClusterScene
              variant='wide'
              needle={dash.needle}
              lamps={dash.lamps}
              reducedMotion={dash.reducedMotion}
              active={inView}
              numeralFamily={barlowCondensed.style.fontFamily}
              legendFamily={barlowSemiCondensed.style.fontFamily}
              onReady={scene.onReady}
              onSettled={scene.onSettled}
            />
          </div>
        ) : null}

        <div className='absolute' style={placeIn(CLUSTER, inset(CLUSTER.rightPod, 22, 18))}>
          <TripComputer idPrefix='wide' />
        </div>

        <div className={cn('pointer-events-none absolute inset-0 transition-opacity duration-500', scene.readoutsVisible ? 'opacity-100' : 'opacity-0')}>
          <div className='absolute' style={placeIn(CLUSTER, inset(CLUSTER.leftPod, 22, 18))}>
            <VehicleReadout />
          </div>
          <div
            className='absolute'
            style={placeIn(CLUSTER, { x: CLUSTER.dial.cx - 110, y: CLUSTER.dial.cy + 58, w: 220, h: 90 })}
          >
            <DialReadout />
          </div>
          {RISK_VECTORS.map((vector, index) => {
            const box = lampBox(index)
            return (
              <div key={vector.id} className='absolute grid place-items-center' style={placeIn(CLUSTER, box)}>
                <LampGlyph index={index} className='size-[2.5cqw]' />
              </div>
            )
          })}
          <svg viewBox={`0 0 ${CLUSTER.width} ${CLUSTER.height}`} className='pointer-events-none absolute inset-0 size-full' aria-hidden>
            <defs>
              <linearGradient id='nd-glare' x1='0' y1='0' x2='0.18' y2='1'>
                <stop offset='0' stopColor='white' stopOpacity='0.05' />
                <stop offset='0.3' stopColor='white' stopOpacity='0.012' />
                <stop offset='0.42' stopColor='white' stopOpacity='0' />
              </linearGradient>
            </defs>
            <path d={cowlSvgPath(CLUSTER.rimInset)} fill='url(#nd-glare)' />
          </svg>
        </div>
      </div>

      <ul className='relative mt-3 w-full [container-type:inline-size]' style={{ height: '3.4cqw' }} aria-label='Risk lamps'>
        {RISK_VECTORS.map((vector, index) => {
          const box = lampBox(index)
          return (
            <li
              key={vector.id}
              className='absolute top-0'
              style={{ left: `${((box.x - 20) / CLUSTER.width) * 100}%`, width: `${((box.w + 40) / CLUSTER.width) * 100}%` }}
            >
              <LampCaption index={index} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CompactCluster({ mountScene }: { mountScene: boolean }) {
  const dash = useDash()
  const [ref, inView] = useInView<HTMLDivElement>()
  const scene = useScene(mountScene)

  return (
    <div className='mx-auto flex w-full max-w-md flex-col gap-4'>
      <div
        ref={ref}
        className='relative mx-auto aspect-square w-full max-w-[22rem] [container-type:inline-size]'
      >
        <div className={cn('absolute inset-0 transition-opacity duration-700', scene.ready && 'opacity-0')}>
          <StaticDial />
        </div>
        {mountScene ? (
          <div className={cn('absolute inset-0 opacity-0 transition-opacity duration-500', scene.ready && 'opacity-100')}>
            <ClusterScene
              variant='dial'
              needle={dash.needle}
              lamps={dash.lamps}
              reducedMotion={dash.reducedMotion}
              active={inView}
              numeralFamily={barlowCondensed.style.fontFamily}
              legendFamily={barlowSemiCondensed.style.fontFamily}
              onReady={scene.onReady}
              onSettled={scene.onSettled}
            />
          </div>
        ) : null}
        <div
          className={cn('absolute transition-opacity duration-500 [container-type:normal]', scene.readoutsVisible ? 'opacity-100' : 'opacity-0')}
          style={placeIn(DIAL_ONLY, { x: DIAL_ONLY.dial.cx - 75, y: DIAL_ONLY.dial.cy + 58, w: 150, h: 90 })}
        >
          <CompactDialReadout />
        </div>
      </div>

      <section className='rounded-2xl border border-(--nd-rule-strong) bg-[oklch(0.1_0.012_170)] p-4 [container-type:inline-size]' aria-label='Trip computer'>
        <div className='[&_.nd-legend]:text-[11px] [&_.nd-vfd]:text-[13px] [&_input]:text-[15px] [&_input]:py-3 [&_input]:px-3 [&_button]:py-3 [&_a]:py-3 [&_button]:text-[12px] [&_a]:text-[12px] [&_input]:rounded-lg [&_button]:rounded-lg [&_a]:rounded-lg'>
          <div className='min-h-[11.5rem]'>
            <TripComputer idPrefix='compact' />
          </div>
        </div>
      </section>

      <section className='rounded-2xl border border-(--nd-rule-strong) bg-[oklch(0.1_0.012_170)] p-4 [container-type:inline-size]' aria-label='Vehicle'>
        <div className='min-h-[9.5rem] [&_.nd-legend]:text-[11px] [&_dd_.nd-vfd]:text-[16px] [&_dd_.nd-vfd[data-face="7"]]:text-[22px]'>
          <VehicleReadout compact />
        </div>
      </section>

      <ul className='grid grid-cols-4 gap-x-2 gap-y-4 rounded-2xl border border-(--nd-rule) p-4' aria-label='Risk lamps'>
        {RISK_VECTORS.map((vector, index) => (
          <li key={vector.id} className='flex flex-col items-center gap-1.5 [&_.nd-legend]:text-[10px]'>
            <LampGlyph index={index} className='size-7' />
            <LampCaption index={index} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CompactDialReadout() {
  return (
    <div className='h-full [container-type:inline-size] [&_.nd-legend]:text-[9px] [&_.nd-legend]:tracking-[0.1em] [&_.nd-vfd]:text-[26px]'>
      <DialReadout />
    </div>
  )
}

export function Cluster() {
  const wide = useMediaQuery('(min-width: 900px)')
  return (
    <>
      <div className='hidden min-[900px]:block'>
        <WideCluster mountScene={wide === true} />
      </div>
      <div className='min-[900px]:hidden'>
        <CompactCluster mountScene={wide === false} />
      </div>
    </>
  )
}
