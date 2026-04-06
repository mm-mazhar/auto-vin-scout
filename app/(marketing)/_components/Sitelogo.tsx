// app/(marketing)/_components/Sitelogo.tsx

'use client'

import { NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import Link from 'next/link'

export const SITE_LOGO_DARK_PATH = '/autovinscout-logo-dark-01.png'
export const SITE_LOGO_LIGHT_PATH = '/autovinscout-logo-light-01.png'
export const SITE_LOGO_PATH = SITE_LOGO_DARK_PATH

const SiteLogo = () => {
  return (
    <Link
      href='/'
      aria-label='home'
      className='group flex min-w-0 items-center justify-center gap-2'
    >
      <span className='relative flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.03]'>
        <span
          aria-hidden='true'
          className='bg-primary h-10 w-10 sm:h-12 sm:w-12 lg:h-[6.5rem] lg:w-[6.5rem]'
          style={{
            maskImage: `url(${SITE_LOGO_LIGHT_PATH})`,
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            maskSize: 'contain',
            WebkitMaskImage: `url(${SITE_LOGO_LIGHT_PATH})`,
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            WebkitMaskSize: 'contain',
          }}
        />
      </span>
      <h1 className='truncate whitespace-nowrap text-base font-semibold tracking-tight text-foreground sm:text-lg lg:text-2xl'>
        {NEXT_PUBLIC_SITE_NAME}
      </h1>
    </Link>
  )
}

export default SiteLogo
