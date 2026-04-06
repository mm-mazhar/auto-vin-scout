// app/auth/callback/route.ts
// Auth callback route to handle OAuth and email verification
// with invite token support

import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { InvitationService } from '@/lib/services/invitation-service'
import { OrganizationService } from '@/lib/services/organization-service'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle both code-based (OAuth) and token_hash-based (email) auth
  const code = searchParams.get('code')

  if (token_hash && type) {
    // Email verification/magic link flow
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          const [firstName, ...lastNameParts] = userName.split(' ')
          const lastName = lastNameParts.join(' ')
          const dbUser = await getData({
            id: user.id,
            email: user.email as string,
            firstName,
            lastName,
            profileImage: (user.user_metadata?.avatar_url as string | undefined),
          })

          if (!dbUser?.createdAt) {
             console.error('[Auth Callback] Warning: User was not persisted to DB. Invite acceptance might fail.')
          }
          
          // Check for invite token in URL or Cookie
          let inviteToken: string | null = null
          const inviteMatch = next.match(/\/invite\/([a-f0-9]{32,})/)
          
          if (inviteMatch) {
            inviteToken = inviteMatch[1]
          } else {
            const cookieStore = await cookies()
            const cookieToken = cookieStore.get('invite_token')?.value
            if (cookieToken) {
              console.log('[Auth Callback] Found backup invite token in cookie:', cookieToken)
              inviteToken = cookieToken
            }
          }

          if (inviteToken) {
            try {
              console.log('[Auth Callback] Detected invite token:', inviteToken, 'User:', user.id)
              const member = await InvitationService.acceptInvite(inviteToken, user.id)
              console.log('[Auth Callback] Invite accepted successfully. Member:', member.id)
              const res = NextResponse.redirect(`${origin}/dashboard`)
              res.cookies.set('current-org-id', member.organizationId)
              // Clear the backup cookie
              res.cookies.delete('invite_token')
              return res
            } catch (e) {
              console.error('[Auth Callback] Invite acceptance failed:', e)
            }
          } else {
             console.log('[Auth Callback] No invite token found in next param:', next)
          }
          const orgs = await OrganizationService.getUserOrganizations(user.id)
          const firstOrgId = orgs[0]?.id
          const res = NextResponse.redirect(`${origin}${next}`)
          if (firstOrgId) {
            res.cookies.set('current-org-id', firstOrgId)
          }
          return res
        } catch {}
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  } else if (code) {
    // OAuth flow (Google, etc.)
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          const [firstName, ...lastNameParts] = userName.split(' ')
          const lastName = lastNameParts.join(' ')
          const dbUser = await getData({
            id: user.id,
            email: user.email as string,
            firstName,
            lastName,
            profileImage: (user.user_metadata?.avatar_url as string | undefined),
          })

          if (!dbUser?.createdAt) {
             console.error('[Auth Callback OAuth] Warning: User was not persisted to DB. Invite acceptance might fail.')
          }
          // Regex to match /invite/TOKEN (allowing absolute URLs or relative paths)
          let inviteToken: string | null = null
          const inviteMatch = next.match(/\/invite\/([a-f0-9]{32,})/)
          if (inviteMatch) {
            inviteToken = inviteMatch[1]
          } else {
            const cookieStore = await cookies()
            const cookieToken = cookieStore.get('invite_token')?.value
            if (cookieToken) {
              inviteToken = cookieToken
            }
          }

          if (inviteToken) {
            try {
              console.log('[Auth Callback OAuth] Detected invite token:', inviteToken, 'User:', user.id)
              const member = await InvitationService.acceptInvite(inviteToken, user.id)
              console.log('[Auth Callback OAuth] Invite accepted successfully. Member:', member.id)
              const res = NextResponse.redirect(`${origin}/dashboard`)
              res.cookies.set('current-org-id', member.organizationId)
              res.cookies.delete('invite_token')
              return res
            } catch (e) {
              console.error('[Auth Callback OAuth] Invite acceptance failed:', e)
            }
          } else {
             console.log('[Auth Callback OAuth] No invite token found in next param:', next)
          }
          const orgs = await OrganizationService.getUserOrganizations(user.id)
          const firstOrgId = orgs[0]?.id
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'
          const url = isLocalEnv
            ? `${origin}${next}`
            : (forwardedHost ? `https://${forwardedHost}${next}` : `${origin}${next}`)
          const res = NextResponse.redirect(url)
          if (firstOrgId) {
            res.cookies.set('current-org-id', firstOrgId)
          }
          return res
        } catch {}
      }
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
