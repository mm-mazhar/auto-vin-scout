// app/(dashboard)/_components/LogoutButton.tsx

'use client'

import { createClient } from '@/app/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className='w-full flex items-center gap-2 px-2 py-1.5 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent'
    >
      <LogOut className='w-4 h-4' />
      <span>Log out</span>
    </button>
  )
}
