// app/(dashboard)/_components/RenewSubscriptionButton.tsx

'use client'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { useState } from 'react'

export function RenewSubscriptionButton() {
  const [open, setOpen] = useState(false)
  const { show } = useToast()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.billing.renewSubscription.mutationOptions({
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className='h-8 text-xs px-3'>Renew Now</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Renew Subscription Early?</AlertDialogTitle>
          <AlertDialogDescription>
            This will take you to Stripe to <strong>immediately</strong> renew your subscription.
            <br /><br />
            • You can confirm payment details.<br />
            • A new billing cycle will start immediately.<br />
            • New credits will be added to your account.<br />
            • Any remaining days in your current cycle will be forfeited.
            <br /><br />
            Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button 
            disabled={isPending} 
            onClick={() => mutate({})}
          >
            {isPending ? 'Processing...' : 'Confirm Renewal'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
