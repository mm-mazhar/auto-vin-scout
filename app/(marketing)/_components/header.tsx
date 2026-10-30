// app/(marketing)/_components/header.tsx
//
// Marketing navigation: a stencilled strip on lift-yellow steel.

'use client'

import { SITE_LOGO_LIGHT_PATH } from '@/app/(marketing)/_components/Sitelogo'
import { NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import { type User } from '@supabase/supabase-js'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import LogoutButton from './HeaderLogoutButton'

const menuItems = [
  { name: 'What we inspect', href: '/#inspection' },
  { name: 'How it works', href: '/#how-it-works' },
  { name: 'Pricing', href: '/#pricing' },
  { name: 'FAQs', href: '/faqs' },
  { name: 'About', href: '/about' },
]

interface HeroHeaderProps {
  initialUser: User | null
}

export function ShopLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const mark = size === 'lg' ? 'size-14' : 'size-10'
  const word = size === 'lg' ? 'text-[2.2rem]' : 'text-[1.65rem]'
  return (
    <>
      <span
        aria-hidden
        className={`${mark} shrink-0 bg-current`}
        style={{
          maskImage: `url(${SITE_LOGO_LIGHT_PATH})`,
          WebkitMaskImage: `url(${SITE_LOGO_LIGHT_PATH})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
      <span className={`shop-display ${word} leading-none`}>{NEXT_PUBLIC_SITE_NAME}</span>
    </>
  )
}

const linkClass =
  'text-[0.92rem] font-bold uppercase tracking-[0.05em] [font-variation-settings:"wdth"_80] decoration-2 underline-offset-[6px] hover:underline'

export const HeroHeader = ({ initialUser }: HeroHeaderProps) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  const actions = initialUser ? (
    <>
      <Link href='/dashboard' className='shop-button shop-button--ink min-h-10 px-4 text-[0.9rem]'>
        Dashboard
      </Link>
      <LogoutButton className={`${linkClass} cursor-pointer`} />
    </>
  ) : (
    <>
      <Link href='/get-started' className={linkClass}>
        Sign in
      </Link>
      <Link href='/#inspect' className='shop-button shop-button--ink min-h-10 px-4 text-[0.9rem]'>
        Inspect a VIN
      </Link>
    </>
  )

  return (
    <header className='shop-band sticky top-0 z-40 shadow-[0_8px_18px_-10px_rgb(0_0_0/0.7)]'>
      <nav aria-label='Main' className='mx-auto flex h-16 max-w-[92rem] items-center justify-between gap-6 px-4 sm:px-8'>
        <Link href='/' aria-label={`${NEXT_PUBLIC_SITE_NAME} home`} className='flex items-center gap-2.5'>
          <ShopLogo />
        </Link>

        <ul className='hidden items-center gap-7 lg:flex'>
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClass}>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className='hidden items-center gap-5 lg:flex'>{actions}</div>

        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls='shop-menu'
          aria-label={open ? 'Close menu' : 'Open menu'}
          className='-mr-2 grid size-11 place-items-center rounded lg:hidden'
        >
          {open ? <X className='size-7' strokeWidth={2.5} /> : <Menu className='size-7' strokeWidth={2.5} />}
        </button>
      </nav>

      {open ? (
        <div id='shop-menu' className='border-t-2 border-[var(--lift-ink)] lg:hidden'>
          <ul className='mx-auto flex max-w-[92rem] flex-col px-4 py-3 sm:px-8'>
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className='shop-display block py-2.5 text-[2rem]'
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className='mx-auto flex max-w-[92rem] items-center gap-5 px-4 pb-5 sm:px-8'>{actions}</div>
        </div>
      ) : null}
    </header>
  )
}
