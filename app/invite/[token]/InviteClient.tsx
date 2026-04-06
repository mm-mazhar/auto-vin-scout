// app/invite/[token]/InviteClient.tsx
// Client component to handle invite token acceptance
// and redirect to dashboard on success

'use client'

import { useEffect, useState } from 'react'
import { acceptInviteAction } from '../actions'
import { ShineBorder } from '@/components/ui/shine-border'
import SiteLogo from '@/app/(marketing)/_components/Sitelogo'

export function InviteClient({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const accept = async () => {
      const result = await acceptInviteAction(token)
      if (result?.error) {
        setError(result.error)
      }
    }
    accept()
  }, [token])

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='w-full max-w-md p-8 border rounded-lg text-center space-y-4'>
          <h1 className='text-xl font-bold text-destructive'>Error</h1>
          <p>{error}</p>
          <a href='/dashboard' className='text-primary hover:underline'>
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='w-full max-w-md p-8 border rounded-lg relative overflow-hidden text-center space-y-6'>
        <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
        <div className='flex justify-center'>
          <SiteLogo />
        </div>
        <h1 className='text-2xl font-bold'>Joining Organization...</h1>
        <p className='text-muted-foreground'>Please wait while we process your invitation.</p>
      </div>
    </div>
  )
}
