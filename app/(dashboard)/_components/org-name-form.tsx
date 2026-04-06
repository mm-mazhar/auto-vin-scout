// app/(dashboard)/_components/org-name-form.tsx

'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export function OrgNameForm({ defaultName }: { orgId: string; defaultName: string }) {
  const { show } = useToast()
  const router = useRouter()
  const [name, setName] = React.useState(defaultName)

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.org.updateName.mutationOptions({
      onSuccess: () => {
        show({ title: 'Saved', description: 'Organization name updated', variant: 'success' })
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error', duration: 3000 })
      },
    })
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ name })
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='grid gap-1'>
        <Label htmlFor='name'>Name</Label>
        <Input 
          id='name' 
          value={name} 
          onChange={(e) => setName(e.target.value.slice(0, 11))}
          className='max-w-md' 
          maxLength={11} 
        />
      </div>

      <Button type='submit' disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
