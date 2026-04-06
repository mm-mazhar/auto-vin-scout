// app/(dashboard)/_components/project-actions.tsx

'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export function ProjectActions({ projectId, defaultName, userRole }: { projectId: string; defaultName: string; userRole?: string }) {
  const [openRename, setOpenRename] = React.useState(false)
  const [openDelete, setOpenDelete] = React.useState(false)
  const [name, setName] = React.useState(defaultName)
  const router = useRouter()
  const { show } = useToast()

  const updateMutation = useORPCMutation(() =>
    orpc.project.updateName.mutationOptions({
      onSuccess: () => {
        show({ title: 'Saved', description: 'Project renamed successfully', variant: 'success' })
        setOpenRename(false)
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  const deleteMutation = useORPCMutation(() =>
    orpc.project.delete.mutationOptions({
      onSuccess: () => {
        show({ title: 'Deleted', description: 'Project deleted successfully', variant: 'success' })
        setOpenDelete(false)
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  function onSubmitRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateMutation.mutate({ projectId, name })
  }

  function onSubmitDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    deleteMutation.mutate({ projectId })
  }

  return (
    <div className='relative'>
      {userRole === 'MEMBER' ? (
        <div
          aria-label='Project actions disabled'
          className='text-muted-foreground/60 opacity-50 cursor-not-allowed flex items-center justify-center rounded-md p-1'
        >
          <MoreVertical className='h-4 w-4' />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              suppressHydrationWarning
              aria-label='Project actions'
              className='text-muted-foreground hover:text-foreground flex items-center justify-center rounded-md p-1 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'
            >
              <MoreVertical className='h-4 w-4' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-40 rounded-lg' align='end' side='bottom'>
            <DropdownMenuItem className='gap-2' onSelect={() => { setOpenRename(true) }}>
              Rename
            </DropdownMenuItem>
            {(userRole === 'ADMIN' || userRole === 'OWNER') && (
              <DropdownMenuItem className='gap-2 text-destructive' onSelect={() => { setOpenDelete(true) }}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={openRename} onOpenChange={setOpenRename}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Update this project&apos;s name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitRename}>
            <div className='grid gap-4 py-4'>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='name' className='text-right'>Name</Label>
                <Input 
                  id='name' 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className='col-span-3 border-input focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input' 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='submit' size='sm' disabled={updateMutation.isPending} className='focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0'>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitDelete}>
            <DialogFooter>
              <Button type='submit' variant='destructive' size='sm' disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
