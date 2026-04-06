// app/(marketing)/get-started/page.tsx

import { EmailAuthForm } from '@/app/(marketing)/_components/auth/EmailAuthForm'
import { GoogleAuthButton } from '@/app/(marketing)/_components/auth/GoogleAuthButton'
import SiteLogo from '@/app/(marketing)/_components/Sitelogo'
import { createClient } from '@/app/lib/supabase/server'
import { ShineBorder } from '@/components/ui/shine-border'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  console.log('[GetStarted Page] Received next param:', next)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(next ?? '/dashboard')
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='w-full max-w-md space-y-8 p-8 border rounded-lg relative overflow-hidden'>
        <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
      
        <div className='text-center space-y-6'>
          <div className='flex justify-center'>
            <SiteLogo />
          </div>
          <h1 className='text-3xl font-bold'>Welcome</h1>
          <p className='mt-2 text-muted-foreground'>Sign in to your account</p>
        </div>

        <div className='space-y-4'>
          <GoogleAuthButton next={next} />

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with email
              </span>
            </div>
          </div>

          <EmailAuthForm next={next} />
        </div>

        <div className='text-center text-sm text-muted-foreground space-y-4'>
          <p className='text-xs'>
            By signing up, you agree to our
            <Link href='/terms' className='underline hover:text-primary ml-1'>
              Terms & Conditions
            </Link>
            ,
            <Link href='/privacy-policy' className='underline hover:text-primary ml-1'>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
      
    </div>
  )
}
