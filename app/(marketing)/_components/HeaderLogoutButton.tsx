// app/(marketing)/_components/HeaderLogoutButton.tsx

'use client'

import { createClient } from '@/app/lib/supabase/client'
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
      type='button'
      onClick={handleLogout}
      className='nd-legend inline-flex h-10 cursor-pointer items-center rounded-md px-3 text-(--nd-print-2) transition-colors hover:text-(--nd-print)'
    >
      Log out
    </button>
  )
}

export default LogoutButton
