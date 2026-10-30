// app/(marketing)/layout.tsx

import FooterSection from '@/app/(marketing)/_components/footer'
import { HeroHeader } from '@/app/(marketing)/_components/header'
import { createClient } from '@/app/lib/supabase/server'
import { ToastProvider } from '@/components/ToastProvider'
import { QueryProvider } from '@/components/providers/query-provider'
import { cn } from '@/lib/utils'
import { Archivo, Big_Shoulders_Stencil, Caveat_Brush, JetBrains_Mono } from 'next/font/google'

import './shop.css'

const stencil = Big_Shoulders_Stencil({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-stencil',
  display: 'swap',
})
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})
const vin = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-vin',
  display: 'swap',
})
const pen = Caveat_Brush({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pen',
  display: 'swap',
})

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <QueryProvider>
      <ToastProvider>
        {/* The shop is always lit the same way; `dark` keeps shared UI parts in step. */}
        <div
          className={cn(
            'shop dark flex min-h-screen flex-col',
            stencil.variable,
            archivo.variable,
            vin.variable,
            pen.variable,
          )}
        >
          <HeroHeader initialUser={user} />
          <main className='flex-1'>{children}</main>
          <FooterSection isAuthenticated={!!user} />
        </div>
      </ToastProvider>
    </QueryProvider>
  )
}
