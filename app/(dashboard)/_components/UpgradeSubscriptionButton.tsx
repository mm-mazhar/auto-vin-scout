// app/(dashboard)/_components/UpgradeSubscriptionButton.tsx

'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { type PlanId } from '@/lib/constants'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { useState } from 'react'

type Props = {
  planId: PlanId
  hasActiveSubscription: boolean
}

export function UpgradeSubscriptionButton({ planId, hasActiveSubscription }: Props) {
  const [open, setOpen] = useState(false)
  const { show } = useToast()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.billing.createSubscription.mutationOptions({
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  const handleUpgrade = () => {
    mutate({ planId })
  }

  if (!hasActiveSubscription) {
    return (
      <Button 
        onClick={handleUpgrade} 
        disabled={isPending}
        className='h-8 text-xs px-3'
      >
        {isPending ? 'Processing...' : 'Upgrade now'}
      </Button>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className='h-8 text-xs px-3'>Upgrade now</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            You already have an active subscription. If you proceed, your existing subscription will be canceled immediately, but you can retain your remaining credits.
            <br /><br />
            Are you sure you want to upgrade?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpgrade} disabled={isPending}>
            {isPending ? 'Processing...' : 'Confirm Upgrade'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
