// app/(marketing)/_components/header.tsx

'use client'
import { createClient } from '@/app/lib/supabase/client'
import { Themetoggle } from '@/components/Themetoggle'
import { ToastProvider } from '@/components/ToastProvider'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import { cn } from '@/lib/utils'
import { type User } from '@supabase/supabase-js'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import LogoutButton from './HeaderLogoutButton'
import SiteLogo from './Sitelogo'

const menuItems = [
  { name: 'Features', href: '/#features' },
  { name: 'Solution', href: '#link' },
  { name: 'Pricing', href: '/#pricing' },
  { name: 'About', href: '/about' },
]

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)

  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const getUser = async () => {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      setIsLoading(false)
    }

    getUser()
  }, [])

  React.useEffect(() => {
    const setup = async () => {
      const supabase = await createClient()
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null)
        }
      )
      return () => listener.subscription.unsubscribe()
    }
    const cleanupPromise = setup()
    return () => {
      // Ensure cleanup when component unmounts
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup()
      })
    }
  }, [])

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className='fixed z-20 w-full px-2'
      >
        <div
          className={cn(
            'mx-auto mt-1 max-w-6xl px-5 rounded-2xl border border-transparent relative overflow-hidden',
            isScrolled && 'bg-background/50 backdrop-blur-lg border'
          )}
        >
          {isScrolled ? (
            <ShineBorder borderWidth={1} duration={20} shineColor={['var(--primary)']} />
          ) : null}
          <div className='relative flex flex-wrap items-center justify-between gap-6 py-2 lg:gap-0 lg:py-3'>
            <div className='flex w-full justify-between lg:w-auto'>
              <SiteLogo />

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                className='relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden'
              >
                <Menu className='in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200' />
                <X className='in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200' />
              </button>
            </div>

            <div className='absolute inset-0 m-auto hidden size-fit lg:block'>
              <ul className='flex gap-8 text-sm'>
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className='text-muted-foreground hover:text-primary block duration-150'
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className='bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent'>
              <div className='lg:hidden'>
                <ul className='space-y-6 text-base'>
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className='text-muted-foreground hover:text-primary block duration-150'
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {isLoading ? null : (
                <div className='flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit'>
                  {user ? (
                    <>
                      <Button
                        asChild
                        variant='default'
                        size='sm'
                        // className={cn(isScrolled && 'lg:hidden')}
                      >
                        <Link href='/dashboard'>
                          <span>Dashboard</span>
                        </Link>
                      </Button>
                      <LogoutButton />
                      
                      <ToastProvider>
                        <Themetoggle isAuthenticated={true} />
                      </ToastProvider>
                    </>
                  ) : (
                    <>
                     
                      {/* <Button
                  asChild
                  variant='outline'
                  size='sm'
                  className={cn(isScrolled && 'lg:hidden')}
                >
                  <Link href='#'>
                    <span>Login</span>
                  </Link>
                </Button> */}
                      <Button
                        asChild
                        variant='default'
                        size='sm'
                        className={cn(isScrolled && 'lg:hidden')}
                      >
                        <Link href='/get-started'>
                          <span>Get Started</span>
                        </Link>
                      </Button>
                      {/* <Button
                  asChild
                  size='sm'
                  className={cn(isScrolled && 'lg:hidden')}
                >
                  <Link href='#'>
                    <span>Sign Up</span>
                  </Link>
                </Button> */}

                      <Button
                        asChild
                        size='sm'
                        variant='default'
                        className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}
                      >
                        <Link href='/get-started'>
                          <span>Get Started</span>
                        </Link>
                      </Button>
                       <ToastProvider>
                        <Themetoggle isAuthenticated={false} />
                      </ToastProvider>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
