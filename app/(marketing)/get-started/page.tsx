// app/(marketing)/get-started/page.tsx

import { EmailAuthForm } from '@/app/(marketing)/_components/auth/EmailAuthForm'
import { GoogleAuthButton } from '@/app/(marketing)/_components/auth/GoogleAuthButton'
import { createClient } from '@/app/lib/supabase/server'
import { CREDITS_SIGNUP_BONUS } from '@/lib/constants'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Sign in',
}

/** The VIN the visitor typed on the landing page, if `next` carries one. */
function vinFromNext(next?: string) {
  if (!next) return null
  const match = next.match(/[?&]vin=([A-HJ-NPR-Z0-9]{17})\b/i)
  return match ? match[1].toUpperCase() : null
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(next ?? '/dashboard')
  }

  const vin = vinFromNext(next)

  return (
    <section className='relative isolate min-h-[calc(100svh-4rem)] px-4 py-16 sm:px-8 lg:py-24'>
      <Image
        src='/landing/shop-bay.jpg'
        alt=''
        fill
        priority
        sizes='100vw'
        className='-z-10 object-cover object-[50%_60%]'
      />
      <div aria-hidden className='absolute inset-0 -z-10 bg-black/60' />

      <div className='mx-auto w-full max-w-md overflow-hidden rounded-[4px] bg-[var(--shop-floor-raised)] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.85)]'>
        <div className='shop-band px-7 py-4'>
          <p className='shop-stencil-label'>{vin ? 'Your car is waiting on the lift' : 'Sign in or create an account'}</p>
          {vin ? <p className='mt-1 font-[family-name:var(--font-vin)] text-[1.15rem] font-semibold tracking-[0.12em]'>{vin}</p> : null}
        </div>

        <div className='space-y-6 p-7'>
          <div>
            <h1 className='shop-display text-[3rem]'>Get started</h1>
            <p className='mt-2 text-[var(--shop-text-dim)]'>
              {CREDITS_SIGNUP_BONUS === 1
                ? 'New accounts get their first full report free.'
                : `New accounts get ${CREDITS_SIGNUP_BONUS} full reports free.`}{' '}
              Same email next time signs you back in.
            </p>
          </div>

          <GoogleAuthButton next={next} />

          <div className='flex items-center gap-3 text-xs uppercase tracking-[0.08em] text-[var(--shop-text-dim)]'>
            <span className='h-px flex-1 bg-[var(--shop-rule)]' />
            Or use your email
            <span className='h-px flex-1 bg-[var(--shop-rule)]' />
          </div>

          <EmailAuthForm next={next} />

          <p className='text-xs leading-relaxed text-[var(--shop-text-dim)]'>
            By signing up, you agree to our{' '}
            <Link href='/terms' className='underline hover:text-[var(--lift)]'>
              Terms
            </Link>{' '}
            and{' '}
            <Link href='/privacy-policy' className='underline hover:text-[var(--lift)]'>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
