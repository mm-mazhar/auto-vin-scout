// app/(dashboard)/_components/create-project-dialog.tsx

'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

 
export function CreateProjectDialog({
  orgId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  orgId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }
  const [error, setError] = React.useState('')
  const [name, setName] = React.useState('')
  const router = useRouter()
  const { show } = useToast()

  // oRPC mutation hook for creating projects
  const createProjectMutation = useORPCMutation(() =>
    orpc.project.create.mutationOptions({
      onSuccess: () => {
        show({
          title: 'Project created',
          description: 'Your new project has been created successfully.',
          variant: 'success',
        })
        setOpen(false)
        setName('')
        setError('')
        router.refresh()
      },
      onError: (err: Error) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create project'
        setError(errorMessage)
        show({
          title: 'Error',
          description: errorMessage,
          variant: 'error',
        })
      },
    })
  )

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    
    // Use oRPC mutation to create project
    createProjectMutation.mutate({ name })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button suppressHydrationWarning className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
            <Plus className='mr-2 h-4 w-4' />
            Create Project
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project in this organization.
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
                name='name'
                placeholder='My Awesome Project'
                className='col-span-3 focus-visible:ring-0 focus-visible:ring-offset-0'
                required
                maxLength={20}
                value={name}
                onChange={handleNameChange}
              />
            </div>
            <p className='col-span-4 text-xs text-muted-foreground'>Up to 20 characters</p>
            
            {error && <p className='text-red-500 text-sm'>{error}</p>}
          </div>
          <DialogFooter>
            <Button type='submit' disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
