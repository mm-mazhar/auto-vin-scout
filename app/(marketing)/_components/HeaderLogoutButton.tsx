// app/(marketing)/_components/HeaderLogoutButton.tsx

'use client'

import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'

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
