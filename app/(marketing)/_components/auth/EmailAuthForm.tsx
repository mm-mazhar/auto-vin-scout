// app/(marketing)/_components/auth/EmailAuthForm.tsx

'use client'

import { validateEmail } from '@/app/actions/auth-check'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function EmailAuthForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const nextParam = next ?? searchParams.get('next') ?? '/dashboard'
  
  // Debug log
  console.log('[EmailAuthForm] next prop:', next)
  console.log('[EmailAuthForm] searchParams next:', searchParams.get('next'))
  console.log('[EmailAuthForm] effective nextParam:', nextParam)

  const handleMagicLink = async () => {
    setErrorMsg(null)
    setInfoMsg(null)
    setLoading(true)

    const validation = await validateEmail(email)

    if (!validation.valid) {
      setErrorMsg(validation.message || 'Invalid email')
      setLoading(false)
      return
    }

    // Check if nextParam is an invite link and set a backup cookie
    const inviteMatch = nextParam.match(/\/invite\/([a-f0-9]{32,})/)
    if (inviteMatch) {
      // Set a cookie that expires in 1 hour
      document.cookie = `invite_token=${inviteMatch[1]}; path=/; max-age=3600`
      console.log('[EmailAuthForm] Set backup invite_token cookie:', inviteMatch[1])
    }

    const targetEmail = email.trim()

    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
    } else {
      setInfoMsg('Check your inbox for the magic link')
    }
    setLoading(false)
  }

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type='email'
        className='focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
      />
      <Button
        className='w-full'
        onClick={handleMagicLink}
        disabled={loading || !email}
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </Button>

      {errorMsg && (
        <p className='text-sm text-destructive text-center mt-6'>{errorMsg}</p>
      )}

      <p className='text-center mt-3'>
        <Link href='/' className='text-xs hover:text-primary underline'>
          Back to Home
        </Link>
      </p>

      {infoMsg && (
        // <p className='text-sm text-muted-foreground text-center mt-6'>{infoMsg}</p>
        <p className='text-sm text-destructive text-center mt-6'>{infoMsg}</p>
      )}
    </div>
  )
}
