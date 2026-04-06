// app/(dashboard)/_components/project-switcher.tsx

'use client'

import { ChevronsUpDown, Folder, Loader2, Plus } from 'lucide-react'
import * as React from 'react'

import { CreateProjectDialog } from '@/app/(dashboard)/_components/create-project-dialog'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/app/(dashboard)/_components/sidebar'
import { switchProject } from '@/app/actions/cookie-actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ProjectSwitcher({
  projects,
  activeProjectId,
  orgId,
}: {
  projects: {
    id: string
    name: string
    slug: string
  }[]
  activeProjectId?: string
  orgId: string
}) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
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
                className='gap-2 p-2'
                disabled={isPending}
              >
                <div className='flex size-6 items-center justify-center rounded-md border'>
                  <Folder className='size-3.5 shrink-0' />
                </div>
                {project.name}
                {isPending && project.id !== activeProjectId && (
                  <Loader2 className='ml-auto size-4 animate-spin' />
                )}
                {project.id === activeProjectId && (
                  <div className='ml-auto size-2 rounded-full bg-primary' />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className='gap-2 p-2' onClick={() => setOpen(true)}>
              <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium'>Create Project</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateProjectDialog orgId={orgId} open={open} onOpenChange={setOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
