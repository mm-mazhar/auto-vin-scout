// app/(marketing)/_components/header.tsx

'use client'

import { cn } from '@/lib/utils'
import { type User } from '@supabase/supabase-js'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { Wordmark } from './dash/wordmark'
import LogoutButton from './HeaderLogoutButton'

const MENU_ITEMS = [
  { name: 'How it reads', href: '/#lamps' },
  { name: 'Sample report', href: '/#sample' },
  { name: 'Pricing', href: '/#pricing' },
  { name: 'FAQs', href: '/faqs' },
  { name: 'About', href: '/about' },
]

interface HeroHeaderProps {
  initialUser: User | null
}

export const HeroHeader = ({ initialUser }: HeroHeaderProps) => {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const primaryAction = initialUser ? (
    <Link
      href='/dashboard'
      className='nd-legend inline-flex h-10 items-center rounded-md bg-(--nd-emerald) px-4 font-semibold text-(--nd-emerald-ink) transition-colors hover:bg-(--nd-emerald-hover)'
    >
      Dashboard
    </Link>
  ) : (
    <Link
      href='/get-started'
      className='nd-legend inline-flex h-10 items-center rounded-md border border-(--nd-rule-strong) px-4 text-(--nd-print) transition-colors hover:border-(--nd-vfd-dim)'
    >
      Sign in
    </Link>
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-(--nd-ground) transition-colors duration-300',
        scrolled || menuOpen ? 'border-(--nd-rule)' : 'border-transparent'
      )}
    >
      <nav aria-label='Main' className='mx-auto flex h-16 max-w-[1288px] items-center justify-between gap-6 px-4 sm:px-6 lg:h-[4.5rem]'>
        <Wordmark />

        <ul className='hidden items-center gap-8 lg:flex'>
          {MENU_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className='nd-legend text-(--nd-print-2) transition-colors hover:text-(--nd-print)'
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className='hidden items-center gap-3 lg:flex'>
          {primaryAction}
          {initialUser ? <LogoutButton /> : null}
        </div>

        <button
          type='button'
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls='nd-mobile-menu'
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className='-mr-2 grid size-11 place-items-center rounded-md text-(--nd-print) lg:hidden'
        >
          {menuOpen ? <X className='size-6' /> : <Menu className='size-6' />}
        </button>
      </nav>

      <div
        id='nd-mobile-menu'
        hidden={!menuOpen}
        className='border-t border-(--nd-rule) bg-(--nd-ground) px-4 pt-2 pb-6 sm:px-6 lg:hidden'
      >
        <ul className='flex flex-col'>
          {MENU_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className='nd-display block border-b border-(--nd-rule) py-4 text-[1.6rem] text-(--nd-print)'
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className='mt-6 flex items-center gap-3'>
          {primaryAction}
          {initialUser ? <LogoutButton /> : null}
        </div>
      </div>
    </header>
  )
}
