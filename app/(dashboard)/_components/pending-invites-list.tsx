// app/(dashboard)/_components/pending-invites-list.tsx

'use client'

import { useToast } from '@/components/ToastProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

type InviteRow = {
  id: string
  email: string
  name?: string | null
  role: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | string
  expiresAt: string
  link: string
}

export function PendingInvitesList({ invites }: { invites: InviteRow[] }) {
  const router = useRouter()
  const { show } = useToast()

  const revokeMutation = useORPCMutation(() =>
    orpc.org.revokeInvite.mutationOptions({
      onSuccess: (_: unknown, variables: { inviteId: string }) => {
        const invite = invites.find(i => i.id === variables.inviteId)
        show({ title: 'Invite canceled', description: invite?.email, duration: 2500 })
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, duration: 3000 })
      },
    })
  )

  const deleteMutation = useORPCMutation(() =>
    orpc.org.deleteInvite.mutationOptions({
      onSuccess: () => {
        show({ title: 'Invite removed', description: 'Invite removed from list', duration: 2500 })
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, duration: 3000 })
      },
    })
  )

  const resendMutation = useORPCMutation(() =>
    orpc.org.resendInvite.mutationOptions({
      onSuccess: (_: unknown, variables: { inviteId: string }) => {
        const invite = invites.find(i => i.id === variables.inviteId)
        show({ title: 'Invite re-sent', description: `Email sent to ${invite?.email}`, duration: 2500 })
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, duration: 3000 })
      },
    })
  )

  function statusVariant(status: string): React.ComponentProps<typeof Badge>['variant'] {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'REVOKED':
        return 'outline'
      case 'ACCEPTED':
        return 'default'
      default:
        return 'outline'
    }
  }

  const isLoading = (inviteId: string, action: 'revoke' | 'delete' | 'resend') => {
    if (action === 'revoke') return revokeMutation.isPending && (revokeMutation.variables as { inviteId: string } | undefined)?.inviteId === inviteId
    if (action === 'delete') return deleteMutation.isPending && (deleteMutation.variables as { inviteId: string } | undefined)?.inviteId === inviteId
    if (action === 'resend') return resendMutation.isPending && (resendMutation.variables as { inviteId: string } | undefined)?.inviteId === inviteId
    return false
  }

  const isAnyLoading = (inviteId: string) => 
    isLoading(inviteId, 'revoke') || isLoading(inviteId, 'delete') || isLoading(inviteId, 'resend')

  return (
    <div className='space-y-4'>
      {invites.map((invite) => (
        <div key={invite.id} className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <Avatar>
              <AvatarFallback>IN</AvatarFallback>
            </Avatar>
            <div>
              <p className='text-sm font-medium leading-none'>{invite.name || invite.email}</p>
              {invite.name && <p className='text-xs text-muted-foreground'>{invite.email}</p>}
              <p className='text-sm text-muted-foreground'>{invite.role}</p>
              <p className='text-xs text-muted-foreground flex items-center gap-2'>
                <span>Link: {invite.link}</span>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label='Copy link'
                  className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(invite.link)
                      show({ title: 'Link copied', description: invite.email, duration: 2000 })
                    } catch {
                      show({ title: 'Copy failed', description: 'Unable to copy link', duration: 2500 })
                    }
                  }}
                >
                  <Copy className='size-4' />
                </Button>
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant={statusVariant(invite.status)} className='h-6 px-3 leading-none'>
              <span className='relative top-[1px]'>{invite.status}</span>
            </Badge>
            <Button
              variant='outline'
              size='sm'
              className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
              disabled={isAnyLoading(invite.id) || invite.status !== 'PENDING'}
              onClick={() => revokeMutation.mutate({ inviteId: invite.id })}
            >
              {isLoading(invite.id, 'revoke') ? 'Cancelling...' : 'Cancel Invite'}
            </Button>
            {invite.status === 'REVOKED' && (
              <Button
                variant='outline'
                size='sm'
                className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-red-500 hover:text-red-600'
                disabled={isAnyLoading(invite.id)}
                onClick={() => deleteMutation.mutate({ inviteId: invite.id })}
              >
                {isLoading(invite.id, 'delete') ? 'Removing...' : 'Remove from list'}
              </Button>
            )}
            <Button
              variant='secondary'
              size='sm'
              className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
              disabled={isAnyLoading(invite.id) || invite.status === 'ACCEPTED'}
              onClick={() => resendMutation.mutate({ inviteId: invite.id })}
            >
              {isLoading(invite.id, 'resend') ? 'Re-Inviting...' : 'Re-Invite'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
