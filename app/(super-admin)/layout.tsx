// app/(super-admin)/layout.tsx

import { SidebarProvider } from '@/app/(dashboard)/_components/sidebar';
import { createClient } from '@/app/lib/supabase/server';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/ToastProvider';
import { redirect } from 'next/navigation';
import { AdminSidebar } from './_components/admin-sidebar';
import { DashboardHeader } from './_components/dashboard-header';

const SUPER_ADMINS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return redirect('/get-started')
  if (!user.email || !SUPER_ADMINS.includes(user.email)) return redirect('/dashboard') 

  return (
    <QueryProvider>
      <ToastProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AdminSidebar /> 
            <main className="flex-1 flex flex-col overflow-y-auto"> {/* ✅ Flex col to stack header */}
              <DashboardHeader />
              {children}
            </main>
          </div>
        </SidebarProvider>
      </ToastProvider>
    </QueryProvider>
  )
}