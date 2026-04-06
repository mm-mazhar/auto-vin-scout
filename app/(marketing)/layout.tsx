// app/(marketing)/layout.tsx

import FooterSection from '@/app/(marketing)/_components/footer'
import { HeroHeader } from '@/app/(marketing)/_components/header'
import { createClient } from '@/app/lib/supabase/server'
import { ToastProvider } from '@/components/ToastProvider'
import { QueryProvider } from '@/components/providers/query-provider'

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
        <div className='flex min-h-screen flex-col'>
          <HeroHeader initialUser={user} />
          <main>{children}</main>
          <FooterSection isAuthenticated={!!user} />
        </div>
      </ToastProvider>
    </QueryProvider>
  )
}
