// components/Submitbuttons.tsx

'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Trash } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { useTheme } from 'next-themes'
import * as React from 'react'

export function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <>
      {pending ? (
        <Button disabled className='w-fit'>
          <Loader2 className='mr-2 w-4 h-4 animate-spin' /> Please Wait
        </Button>
      ) : (
        <Button className='w-fit' type='submit'>
          Save Now
        </Button>
      )}
    </>
  )
}

export function StripeSubscriptionCreationButton() {
  const { pending } = useFormStatus()

  return (
    <>
      {pending ? (
        <Button disabled className='w-full'>
          <Loader2 className='mr-2 w-4 h-4 animate-spin' /> Please Wait
        </Button>
      ) : (
        <Button type='submit' className='w-full'>
          Subscribe
        </Button>
      )}
    </>
  )
}

export function StripePortal() {
  const { pending } = useFormStatus()

  return (
    <>
      {pending ? (
        <Button disabled className='w-fit'>
          <Loader2 className='mr-2 w-4 h-4 animate-spin' /> Please Wait
        </Button>
      ) : (
        <Button className='w-fit' type='submit'>
          View payment details
        </Button>
      )}
    </>
  )
}

export function TrashDelete() {
  const { pending } = useFormStatus()

  return (
    <>
      {pending ? (
        <Button variant={'destructive'} size='icon' disabled>
          <Loader2 className='h-4 w-4 animate-spin' />
        </Button>
      ) : (
        <Button variant={'destructive'} size='icon' type='submit'>
          <Trash className='h-4 w-4' />
        </Button>
      )}
    </>
  )
}

export function SettingsSubmitButton() {
  const { pending } = useFormStatus()
  const { setTheme } = useTheme()
  const onClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const form = (e.currentTarget as HTMLButtonElement).form
    if (!form) return
    const fd = new FormData(form)
    const value = fd.get('theme') as 'light' | 'dark' | 'system' | null
    if (value) setTheme(value)
  }, [setTheme])

  return (
    <>
      {pending ? (
        <Button disabled className='w-fit'>
          <Loader2 className='mr-2 w-4 h-4 animate-spin' /> Please Wait
        </Button>
      ) : (
        <Button className='w-fit' type='submit' onClick={onClick}>
          Save Now
        </Button>
      )}
    </>
  )
}
