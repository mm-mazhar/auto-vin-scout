// app/(marketing)/_components/lift/lift-hero.tsx
//
// Landing-page hero: a live 3D underbody on a lift with a steerable work lamp,
// paint-pen marks for what the lamp finds, and the VIN work order.

'use client'

import { VinWorkOrder } from '@/app/(marketing)/_components/vin-work-order'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SAMPLE_FINDINGS, type SampleFinding } from './findings'
import type { FindingFrame, LiftScene } from './lift-scene'

const POSTER = '/landing/lift-poster.jpg'
const LABEL_WIDTH = 230

type LiftHeroProps = {
  isAuthenticated: boolean
  offer: string
}

export function LiftHero({ isAuthenticated, offer }: LiftHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<LiftScene | null>(null)
  const markRefs = useRef(new Map<string, HTMLDivElement>())
  const [found, setFound] = useState<string[]>([])
  const [sceneState, setSceneState] = useState<'loading' | 'live' | 'poster'>('loading')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let scene: LiftScene | null = null
    let visible = true
    let foundKey = ''

    const probe = document.createElement('canvas')
    const hasWebGL = !!(probe.getContext('webgl2') || probe.getContext('webgl'))
    if (!hasWebGL) {
      setSceneState('poster')
      return
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onFrame = (frames: FindingFrame[]) => {
      const width = canvas.clientWidth
      const nowFound: string[] = []
      for (const f of frames) {
        const el = markRefs.current.get(f.id)
        if (f.found) nowFound.push(f.id)
        if (!el) continue
        const spec = SAMPLE_FINDINGS.find((s) => s.id === f.id)!
        let dx = spec.label.dx
        if (f.x + dx < 8) dx = 40
        if (f.x + dx + LABEL_WIDTH > width - 8) dx = -LABEL_WIDTH - 30
        el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)`
        el.style.setProperty('--lit', f.lit.toFixed(3))
        el.style.setProperty('--label-x', `${dx}px`)
        el.style.setProperty('--label-y', `${spec.label.dy}px`)
        el.dataset.found = String(f.found)
        el.dataset.onscreen = String(f.onScreen)
      }
      const key = nowFound.join(',')
      if (key !== foundKey) {
        foundKey = key
        setFound(nowFound)
      }
    }

    const sync = () => {
      if (!scene) return
      if (visible && document.visibilityState === 'visible' && !reducedMotion) scene.start()
      else scene.stop()
    }

    import('./lift-scene')
      .then(({ LiftScene }) => {
        if (cancelled) return
        try {
          scene = new LiftScene({
            canvas,
            findings: SAMPLE_FINDINGS.map(({ id, position }) => ({ id, position })),
            reducedMotion,
            onFrame,
          })
          sceneRef.current = scene
          setSceneState('live')
          sync()
        } catch {
          setSceneState('poster')
        }
      })
      .catch(() => setSceneState('poster'))

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', sync)

    return () => {
      cancelled = true
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      scene?.dispose()
      sceneRef.current = null
    }
  }, [])

  const focus = (finding: SampleFinding) => sceneRef.current?.focusFinding(finding.id)

  return (
    <section
      aria-labelledby='hero-title'
      className='relative isolate flex flex-col lg:block lg:h-[clamp(680px,calc(100svh-4rem),1040px)]'
    >
      {/* The lift bay */}
      <div className='relative h-[58svh] min-h-[340px] overflow-hidden lg:absolute lg:inset-0 lg:h-auto'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={POSTER}
          alt=''
          aria-hidden
          className='absolute inset-0 h-full w-full object-cover transition-opacity duration-700'
          style={{ opacity: sceneState === 'live' ? 0 : 1 }}
        />
        <canvas
          ref={canvasRef}
          aria-hidden
          className='absolute inset-0 block h-full w-full cursor-crosshair touch-pan-y'
          style={{ opacity: sceneState === 'live' ? 1 : 0 }}
        />
        <div aria-hidden className='pointer-events-none absolute inset-0'>
          {sceneState === 'live'
            ? SAMPLE_FINDINGS.map((f) => (
                <div
                  key={f.id}
                  ref={(el) => {
                    if (el) markRefs.current.set(f.id, el)
                    else markRefs.current.delete(f.id)
                  }}
                  className='lift-mark'
                  data-found='false'
                >
                  <svg className='lift-mark-ring' viewBox='-60 -36 120 72' width='120' height='72'>
                    <path d={ringPath(f.id)} pathLength={1} className='shop-mark-ring' />
                  </svg>
                  <div className='lift-mark-label'>
                    <span className='shop-mark-label block text-[1.75rem] leading-none'>
                      {f.tag} {f.score}
                    </span>
                    <span className='mt-1 block text-[0.82rem] leading-snug text-[var(--pen-white)] [text-shadow:0_1px_2px_rgb(0_0_0/0.9),0_0_10px_rgb(0_0_0/0.8)]'>
                      {f.note}
                    </span>
                  </div>
                </div>
              ))
            : null}
        </div>
        {/* Let the scene sink into the floor where the page continues on phones. */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--shop-floor)] lg:hidden'
        />
      </div>

      {/* Work order and the lamp's findings */}
      <div className='pointer-events-none relative z-10 mx-auto -mt-20 flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-10 sm:px-8 lg:mt-0 lg:h-full lg:flex-row lg:items-end lg:justify-between lg:pb-10'>
        <div className='shop-paper pointer-events-auto w-full max-w-[35rem] p-5 sm:p-7'>
          <div className='shop-paper-rule flex items-center justify-between border-b-2 pb-2'>
            <span className='shop-stencil-label shop-paper-print'>Pre-purchase inspection</span>
            <span className='shop-stencil-label shop-paper-print'>Work order</span>
          </div>
          <h1
            id='hero-title'
            className='shop-display mt-4 text-[clamp(2.6rem,1.7rem+3.2vw,4.25rem)] text-[var(--paper-ink)]'
          >
            Put it on the lift before you drive out.
          </h1>
          <p className='mt-4 max-w-[46ch] text-[1.02rem] leading-relaxed text-[#2a2c30]'>
            Paste the VIN from any listing. Eight inspectors work through the car&apos;s public
            record (flood zones, salvage auctions, odometer history, recalls, known failures) and
            hand back a risk score with the questions to ask the seller.
          </p>
          <div className='mt-5'>
            <VinWorkOrder isAuthenticated={isAuthenticated} />
          </div>
          <p className='shop-paper-rule mt-4 border-t pt-3 text-sm text-[#3a3d42]'>{offer}</p>
        </div>

        <aside
          aria-label='Sample findings'
          className='pointer-events-auto w-full max-w-[35rem] lg:max-w-[22rem] lg:pb-1'
        >
          <div className='flex items-baseline justify-between gap-3'>
            <h2 className='shop-stencil-label text-[var(--lift)]'>
              <span className='[@media(pointer:coarse)]:hidden'>Sweep the lamp under the car</span>
              <span className='hidden [@media(pointer:coarse)]:inline'>Tap a finding to light it</span>
            </h2>
            <span className='shop-stencil-label tabular-nums text-[var(--shop-text-dim)]' aria-live='polite'>
              {found.length} of {SAMPLE_FINDINGS.length} marked
            </span>
          </div>
          <ul className='mt-3 flex flex-wrap gap-2'>
            {SAMPLE_FINDINGS.map((f) => {
              const isFound = found.includes(f.id)
              return (
                <li key={f.id}>
                  <button
                    type='button'
                    onClick={() => focus(f)}
                    aria-pressed={isFound}
                    title={f.vector}
                    className='lift-chip'
                  >
                    {isFound ? <Check aria-hidden className='size-4' strokeWidth={3} /> : null}
                    <span>{f.tag}</span>
                    <span className='tabular-nums opacity-80'>{isFound ? f.score : '··'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className='mt-3 text-[0.8rem] leading-snug text-[var(--shop-text-dim)]'>
            Sample car. Findings and scores are illustrative, not a real vehicle&apos;s history.
          </p>
        </aside>
      </div>
    </section>
  )
}

/** A slightly uneven loop, the way a paint pen circles a part. */
function ringPath(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296)
  const pts: string[] = []
  const turns = 1.12
  const steps = 26
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns - 0.5
    const rx = 50 + (rand() - 0.5) * 6
    const ry = 26 + (rand() - 0.5) * 5
    pts.push(`${(Math.cos(t) * rx).toFixed(1)} ${(Math.sin(t) * ry - i * 0.12).toFixed(1)}`)
  }
  return `M ${pts[0]} ${pts
    .slice(1)
    .map((p) => `L ${p}`)
    .join(' ')}`
}
