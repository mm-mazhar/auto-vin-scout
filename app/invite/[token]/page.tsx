// app/invite/[token]/page.tsx

import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteClient } from './InviteClient'

export default async function AcceptInvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect(`/get-started?next=/invite/${params.token}`)
  }

  // Pre-fetch user data to ensure record exists (mirroring previous logic)
  try {
    const fullName = (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || ''
    const firstName = fullName.split(' ')[0] || ''
    const lastName = fullName.split(' ').slice(1).join(' ') || ''
    await getData({ id: user.id, email: user.email as string, firstName, lastName })
  } catch (e) {
    console.error('[Invite Page] Failed to ensure user data:', e)
  }

  return <InviteClient token={params.token} />
}
