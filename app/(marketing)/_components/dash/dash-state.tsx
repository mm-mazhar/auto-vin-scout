// app/(marketing)/_components/dash/dash-state.tsx

'use client'

import { client } from '@/lib/orpc/client'
import type { VinPreviewOutput } from '@/lib/orpc/routers/vin'
import { useMutation } from '@tanstack/react-query'
import React from 'react'
import { RISK_VECTORS, SAMPLE_REPORT, bandForScore, type VectorId } from './vectors'

export type LampState = 'off' | 'test' | 'clear' | 'medium' | 'high' | 'pending'

export type DashPhase = 'off' | 'keyOn' | 'decoding' | 'decoded' | 'sample' | 'error'

export interface DashVehicle {
  vin: string
  year: number
  make: string
  model: string
  trim: string | null
  engine: string | null
}

export interface DashState {
  phase: DashPhase
  vehicle: DashVehicle | null
  recallCount: number | null
  score: number | null
  needle: number
  lamps: Record<VectorId, LampState>
  lines: string[]
  error: string | null
}

interface DashContextValue extends DashState {
  draft: string
  setDraft: (value: string) => void
  keyOn: () => void
  decode: (rawVin: string) => void
  reducedMotion: boolean
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

const allLamps = (state: LampState) =>
  Object.fromEntries(RISK_VECTORS.map((v) => [v.id, state])) as Record<VectorId, LampState>

const INITIAL_STATE: DashState = {
  phase: 'off',
  vehicle: null,
  recallCount: null,
  score: null,
  needle: 0,
  lamps: allLamps('off'),
  lines: ['AWAITING VIN'],
  error: null,
}

const DashContext = React.createContext<DashContextValue | null>(null)

export function normalizeVin(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function errorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown }
    return typeof code === 'string' ? code : null
  }
  return null
}

function errorLine(error: unknown): string {
  switch (errorCode(error)) {
    case 'TOO_MANY_REQUESTS':
      return 'TOO MANY LOOKUPS · WAIT A MINUTE'
    case 'NOT_FOUND':
      return 'NHTSA COULD NOT DECODE THIS VIN'
    case 'BAD_REQUEST':
      return 'CHECK THE VIN CHARACTERS'
    default:
      return 'LOOKUP FAILED · TRY AGAIN'
  }
}

function lampForScore(score: number | undefined): LampState {
  if (score === undefined) return 'pending'
  const band = bandForScore(score)
  return band === 'low' ? 'clear' : band
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function DashProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DashState>(INITIAL_STATE)
  const [draft, setDraftState] = React.useState('')
  const setDraft = React.useCallback((value: string) => setDraftState(normalizeVin(value).slice(0, 17)), [])
  const reducedMotion = useReducedMotion()
  const timers = React.useRef<number[]>([])
  const runId = React.useRef(0)
  const keyedOn = React.useRef(false)

  const preview = useMutation<VinPreviewOutput, Error, { vin: string }>({
    mutationFn: (input) => client.vin.preview(input),
  })
  const requestPreview = preview.mutateAsync

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  React.useEffect(() => clearTimers, [clearTimers])

  const at = React.useCallback(
    (ms: number, run: number, update: (prev: DashState) => DashState) => {
      const delay = reducedMotion ? Math.min(ms, 60) : ms
      timers.current.push(
        window.setTimeout(() => {
          if (runId.current === run) setState(update)
        }, delay)
      )
    },
    [reducedMotion]
  )

  const startRun = React.useCallback(() => {
    clearTimers()
    runId.current += 1
    return runId.current
  }, [clearTimers])

  const settleLamps = React.useCallback(
    (run: number, startMs: number, target: (id: VectorId) => LampState) => {
      RISK_VECTORS.forEach((vector, index) => {
        at(startMs + index * 110, run, (prev) => ({
          ...prev,
          lamps: { ...prev.lamps, [vector.id]: target(vector.id) },
        }))
      })
      return startMs + RISK_VECTORS.length * 110
    },
    [at]
  )

  const keyOn = React.useCallback(() => {
    if (keyedOn.current) return
    keyedOn.current = true
    const run = startRun()
    setState((prev) => ({ ...prev, phase: 'keyOn', lamps: allLamps('test'), needle: 100 }))
    at(900, run, (prev) => ({ ...prev, needle: 0 }))
    const done = settleLamps(run, 1000, () => 'off')
    at(done, run, (prev) => ({ ...prev, phase: 'off' }))
  }, [at, settleLamps, startRun])

  const runSample = React.useCallback(
    (run: number) => {
      setState({
        ...INITIAL_STATE,
        phase: 'decoding',
        lamps: allLamps('test'),
        needle: 100,
        lines: ['SAMPLE REPORT', 'REPLAYING MAY 2026'],
      })
      at(700, run, (prev) => ({
        ...prev,
        vehicle: {
          vin: SAMPLE_REPORT.vin,
          year: SAMPLE_REPORT.year,
          make: SAMPLE_REPORT.make,
          model: SAMPLE_REPORT.model,
          trim: null,
          engine: null,
        },
      }))
      at(1100, run, (prev) => ({ ...prev, needle: SAMPLE_REPORT.score, score: SAMPLE_REPORT.score }))
      const done = settleLamps(run, 1200, (id) => lampForScore(SAMPLE_REPORT.vectors[id]))
      at(done, run, (prev) => ({
        ...prev,
        phase: 'sample',
        lines: ['SAMPLE REPORT', '4 OF 8 LAMPS SCORED', `SCORE ${SAMPLE_REPORT.score} · LOW`],
      }))
    },
    [at, settleLamps]
  )

  const decode = React.useCallback(
    (rawVin: string) => {
      const vin = normalizeVin(rawVin)
      const run = startRun()

      if (!VIN_PATTERN.test(vin)) {
        setState({
          ...INITIAL_STATE,
          phase: 'error',
          lines: ['17 CHARACTERS', 'NO I, O OR Q'],
          error: 'A VIN has 17 letters and numbers, and never uses I, O or Q.',
        })
        return
      }

      if (vin === SAMPLE_REPORT.vin) {
        runSample(run)
        return
      }

      setState({
        ...INITIAL_STATE,
        phase: 'decoding',
        lamps: allLamps('test'),
        needle: 100,
        lines: ['VIN ACCEPTED', 'NHTSA VPIC ···'],
      })

      const minimumLampTest = new Promise((resolve) =>
        window.setTimeout(resolve, reducedMotion ? 0 : 1300)
      )

      Promise.all([requestPreview({ vin }), minimumLampTest])
        .then(([result]) => {
          if (runId.current !== run) return
          setState((prev) => ({
            ...prev,
            needle: 0,
            vehicle: {
              vin: result.vin,
              year: result.year,
              make: result.make,
              model: result.model,
              trim: result.trim,
              engine: result.engineDesc,
            },
            recallCount: result.modelRecallCount,
            lines: [
              'DECODE OK',
              result.modelRecallCount === null
                ? 'RECALLS · NO DATA'
                : `MODEL-YR RECALLS ${String(result.modelRecallCount).padStart(2, '0')}`,
            ],
          }))
          const done = settleLamps(run, 300, () => 'pending')
          at(done, run, (prev) => ({
            ...prev,
            phase: 'decoded',
            lines: [...prev.lines, 'FULL SCORE · 1 CREDIT'],
          }))
        })
        .catch((error: unknown) => {
          if (runId.current !== run) return
          setState({
            ...INITIAL_STATE,
            phase: 'error',
            lines: [errorLine(error)],
            error: error instanceof Error ? error.message : 'The lookup failed.',
          })
        })
    },
    [at, reducedMotion, requestPreview, runSample, settleLamps, startRun]
  )

  const value = React.useMemo<DashContextValue>(
    () => ({ ...state, draft, setDraft, keyOn, decode, reducedMotion }),
    [state, draft, setDraft, keyOn, decode, reducedMotion]
  )

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>
}

export function useDash(): DashContextValue {
  const context = React.useContext(DashContext)
  if (!context) throw new Error('useDash must be used inside <DashProvider>')
  return context
}
