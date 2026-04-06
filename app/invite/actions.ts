// app/auth/callback/route.ts
// Auth callback route to handle OAuth and email verification
// with invite token support

'use server'

import { createClient } from '@/app/lib/supabase/server'
import { InvitationService } from '@/lib/services/invitation-service'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function acceptInviteAction(token: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'User not authenticated' }
  }

  try {
    console.log('[Invite Action] Accepting invite:', token, 'User:', user.id)
    const member = await InvitationService.acceptInvite(token, user.id)
    
    const cookieStore = await cookies()
    cookieStore.set('current-org-id', member.organizationId)
    
    console.log('[Invite Action] Invite accepted. Redirecting.')
  } catch (error) {
    console.error('[Invite Action] Failed:', error)
    return { error: error instanceof Error ? error.message : 'Failed to accept invite' }
  }

  redirect('/dashboard')
}
