// app/(marketing)/layout.tsx

import FooterSection from '@/app/(marketing)/_components/footer'
import { HeroHeader } from '@/app/(marketing)/_components/header'
import { createClient } from '@/app/lib/supabase/server'
import { ToastProvider } from '@/components/ToastProvider'
import { QueryProvider } from '@/components/providers/query-provider'
import { NIGHT_DASH_FONT_VARIABLES } from './fonts'

import './night-dash.css'

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
        <div className='dark'>
          <div className={`theme-green nd ${NIGHT_DASH_FONT_VARIABLES} flex min-h-screen flex-col`}>
            <HeroHeader initialUser={user} />
            <main className='flex-1'>{children}</main>
            <FooterSection />
          </div>
        </div>
      </ToastProvider>
    </QueryProvider>
  )
}
