// app/(dashboard)/_components/project-switcher.tsx

'use client'

import { ChevronsUpDown, Folder, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

import { CreateProjectDialog } from '@/app/(dashboard)/_components/create-project-dialog'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/app/(dashboard)/_components/sidebar'
import { switchProject } from '@/app/actions/cookie-actions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { ROLES, type OrganizationRole } from '@/lib/constants'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  slug: string
}

function ProjectRowActions({
  project,
  userRole,
  onClose,
}: {
  project: Project
  userRole: OrganizationRole | string
  onClose: () => void
}) {
  const [openRename, setOpenRename] = React.useState(false)
  const [openDelete, setOpenDelete] = React.useState(false)
  const [name, setName] = React.useState(project.name)
  const router = useRouter()
  const { show } = useToast()

  const canManage = userRole === ROLES.OWNER || userRole === ROLES.ADMIN

  const updateMutation = useORPCMutation(() =>
    orpc.project.updateName.mutationOptions({
      onSuccess: () => {
        show({ title: 'Saved', description: 'Project renamed successfully', variant: 'success' })
        setOpenRename(false)
        onClose()
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
        onClose()
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  if (!canManage) return null

  return (
    <>
      <div className='flex items-center gap-1 ml-auto'>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenRename(true) }}
          className='flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
          aria-label={`Rename ${project.name}`}
        >
          <Pencil className='size-3' />
        </button>
        {userRole === ROLES.OWNER && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpenDelete(true) }}
            className='flex items-center justify-center rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 className='size-3' />
          </button>
        )}
      </div>

      <Dialog open={openRename} onOpenChange={setOpenRename}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Update this project&apos;s name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ projectId: project.id, name }) }}>
            <div className='grid gap-4 py-4'>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='rename-input' className='text-right'>Name</Label>
                <Input
                  id='rename-input'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className='col-span-3'
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='submit' size='sm' disabled={updateMutation.isPending}>
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
            <DialogDescription>This action cannot be undone. All reports in this project will be lost.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); deleteMutation.mutate({ projectId: project.id }) }}>
            <DialogFooter>
              <Button variant='outline' size='sm' type='button' onClick={() => setOpenDelete(false)}>
                Cancel
              </Button>
              <Button type='submit' variant='destructive' size='sm' disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ProjectSwitcher({
  projects,
  activeProjectId,
  orgId,
  userRole = ROLES.MEMBER,
}: {
  projects: Project[]
  activeProjectId?: string
  orgId: string
  userRole?: OrganizationRole | string
}) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const canManage = userRole === ROLES.OWNER || userRole === ROLES.ADMIN

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                <Folder className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>
                  {activeProject ? activeProject.name : 'Select Project'}
                </span>
                <span className='truncate text-xs'>
                  {activeProject ? 'Active Project' : 'No project selected'}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs'>
              Projects
            </DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => {
                  if (project.id === activeProjectId) return
                  startTransition(async () => {
                    await switchProject(project.id)
                  })
                }}
                className='gap-2 p-2 group'
                disabled={isPending}
              >
                <div className='flex size-6 items-center justify-center rounded-md border shrink-0'>
                  <Folder className='size-3.5 shrink-0' />
                </div>
                <span className='flex-1 truncate'>{project.name}</span>
                {isPending && (
                  <Loader2 className='size-4 animate-spin shrink-0' />
                )}
                {project.id === activeProjectId && !isPending && (
                  <div className='size-2 rounded-full bg-primary shrink-0' />
                )}
                {canManage && (
                  <ProjectRowActions
                    project={project}
                    userRole={userRole}
                    onClose={() => setDropdownOpen(false)}
                  />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {canManage && (
              <DropdownMenuItem className='gap-2 p-2' onClick={() => setOpen(true)}>
                <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                  <Plus className='size-4' />
                </div>
                <div className='font-medium'>Create Project</div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateProjectDialog orgId={orgId} open={open} onOpenChange={setOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
