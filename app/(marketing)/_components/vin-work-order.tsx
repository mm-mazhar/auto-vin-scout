// app/(marketing)/_components/vin-work-order.tsx
//
// The VIN field as it appears on a shop work order: a printed comb box, a
// character count, and one heavy button. Used in the hero and the closing
// section of the landing page.

'use client'

import { checkVin, normalizeVin, VIN_LENGTH, vinDestination } from '@/lib/vin'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

type VinWorkOrderProps = {
  isAuthenticated: boolean
  /** Visible label above the comb field. */
  label?: string
  buttonLabel?: string
}

export function VinWorkOrder({
  isAuthenticated,
  label = 'Vehicle identification number',
  buttonLabel = 'Inspect this VIN',
}: VinWorkOrderProps) {
  const router = useRouter()
  const id = useId()
  const [vin, setVin] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmMismatch, setConfirmMismatch] = useState(false)
  const [pending, setPending] = useState(false)

  const result = checkVin(vin)
  const checkDigitMismatch = result.status === 'ok' && !result.checkDigitMatches

  let message: { tone: 'info' | 'error' | 'warn'; text: string } | null = null
  if (result.status === 'invalid') {
    message = { tone: 'error', text: result.message }
  } else if (submitted && result.status === 'empty') {
    message = { tone: 'error', text: 'Paste the 17-character VIN from the listing, or read it off the windshield plate.' }
  } else if (submitted && result.status === 'incomplete') {
    message = {
      tone: 'error',
      text: `That's ${vin.length} characters. A VIN has 17, so ${result.remaining} ${result.remaining === 1 ? 'is' : 'are'} missing.`,
    }
  } else if (checkDigitMismatch) {
    message = {
      tone: 'warn',
      text: 'The check digit (9th character) doesn’t match the rest. Check for a typo, or inspect it anyway if the car was built outside North America.',
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (result.status !== 'ok') return
    if (checkDigitMismatch && !confirmMismatch) {
      setConfirmMismatch(true)
      return
    }
    setPending(true)
    router.push(vinDestination(vin, isAuthenticated))
  }

  const describedBy = `${id}-count${message ? ` ${id}-msg` : ''}`
  const invalid = result.status === 'invalid' || (submitted && result.status !== 'ok')

  return (
    <form onSubmit={onSubmit} noValidate className='space-y-3'>
      <div className='flex items-baseline justify-between gap-4'>
        <label htmlFor={`${id}-vin`} className='shop-stencil-label shop-paper-print'>
          {label}
        </label>
        <span id={`${id}-count`} className='shop-stencil-label shop-paper-print tabular-nums' aria-live='polite'>
          {vin.length} / {VIN_LENGTH}
        </span>
      </div>
      <div className='shop-comb-wrap'>
        <input
          id={`${id}-vin`}
          name='vin'
          className='shop-comb'
          value={vin}
          onChange={(e) => {
            setVin(normalizeVin(e.target.value))
            setConfirmMismatch(false)
          }}
          inputMode='text'
          autoCapitalize='characters'
          autoComplete='off'
          autoCorrect='off'
          spellCheck={false}
          maxLength={VIN_LENGTH + 6}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      </div>
      {message ? (
        <p
          id={`${id}-msg`}
          role={message.tone === 'error' ? 'alert' : 'status'}
          className='text-sm leading-snug'
          style={{ color: message.tone === 'error' ? '#9b1c14' : 'var(--paper-print)' }}
        >
          {message.text}
        </p>
      ) : null}
      <button type='submit' className='shop-button w-full sm:w-auto' disabled={pending} aria-disabled={pending}>
        {pending ? 'Opening the work order…' : checkDigitMismatch && confirmMismatch ? 'Inspect anyway' : buttonLabel}
        <ArrowRight aria-hidden className='size-5' strokeWidth={2.5} />
      </button>
    </form>
  )
}
