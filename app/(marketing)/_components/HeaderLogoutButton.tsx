// app/(marketing)/_components/HeaderLogoutButton.tsx

'use client'

import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { useRouter } from 'next/navigation'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (className) {
    return (
      <button type='button' onClick={handleLogout} className={className}>
        Log out
      </button>
    )
  }

  return (
    <Button
      onClick={handleLogout}
      variant='default'
      size='sm'
      className='cursor-pointer'
    >
      Logout
    </Button>
  )
}

export default LogoutButton
