// app/(dashboard)/_components/StripePortalButton.tsx

'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

export function StripePortalButton() {
  const { show } = useToast()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.billing.createCustomerPortal.mutationOptions({
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  return (
    <Button 
      onClick={() => mutate({})} 
      disabled={isPending}
      className='h-8 text-xs px-3'
    >
      {isPending ? 'Loading...' : 'View payment details'}
    </Button>
  )
}
