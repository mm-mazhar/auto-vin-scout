// app/(dashboard)/_components/create-org-dialog.tsx

'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { client } from '@/lib/orpc/client'
import { setCurrentOrganization } from '@/app/actions/cookie-actions'
import { useMutation } from '@tanstack/react-query'

interface CreateOrgResponse {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = React.useState('')
  const router = useRouter()
  const { show } = useToast()

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (input: { name: string }) => {
   
  return (await (client as any).org.create(input)) as CreateOrgResponse
  },
    onSuccess: async (data) => {
      show({ title: 'Created', description: 'Organization created successfully', variant: 'success' })
      onOpenChange(false)
      setName('')
      // Set the current org without redirecting to avoid NEXT_REDIRECT error
      await setCurrentOrganization(data.id)
      // Then navigate client-side
      router.push('/dashboard')
      router.refresh()
    },
    onError: (err: Error) => {
      show({ title: 'Error', description: err.message, variant: 'error' })
    },
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutate({ name })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='name' className='text-right'>
                Name
              </Label>
              <Input
                id='name'
                placeholder='Acme Inc.'
                className='col-span-3 focus-visible:ring-0 focus-visible:ring-offset-0'
                required
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <p className='col-span-4 text-xs text-muted-foreground'>Up to 20 characters</p>
            
            {error && <p className='text-red-500 text-sm'>{(error as Error).message}</p>}
          </div>
          <DialogFooter>
            <Button type='submit' disabled={isPending} className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
              {isPending ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
