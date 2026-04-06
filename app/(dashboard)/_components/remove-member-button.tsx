// app/(dashboard)/_components/remove-member-button.tsx

'use client'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  targetUserId: string
  targetRole: string
  currentUserId: string
  currentUserRole: string
}

export function RemoveMemberButton({
  targetUserId,
  targetRole,
  currentUserId,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false)
  const { show } = useToast()
  const router = useRouter()

  const canRemove = (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && targetRole !== 'OWNER' && targetUserId !== currentUserId

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.org.removeMember.mutationOptions({
      onSuccess: () => {
        setOpen(false)
        show({ title: 'Member removed', description: 'Access revoked', duration: 2500 })
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, duration: 3000, variant: 'error' })
      },
    })
  )

  if (!canRemove) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant='destructive' size='sm' className='h-7 px-3'>
          Revoke
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this member?</AlertDialogTitle>
          <AlertDialogDescription>
            This revokes access to the organization. Projects and data remain. You can invite them again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            disabled={isPending}
            onClick={() => mutate({ targetUserId })}
          >
            {isPending ? 'Removing...' : 'Confirm'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
