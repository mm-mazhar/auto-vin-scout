// app/(dashboard)/_components/team-switcher.tsx

'use client'

import { Building2, ChevronsUpDown, Loader2, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/app/(dashboard)/_components/sidebar'
import { switchOrganization } from '@/app/actions/cookie-actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { CreateOrgDialog } from '@/app/(dashboard)/_components/create-org-dialog'

const MAX_ORGS_ENV = Number(process.env.NEXT_PUBLIC_MAX_ORGANIZATIONS_PER_USER)
const MAX_ORGS_PER_USER = Number.isFinite(MAX_ORGS_ENV) && MAX_ORGS_ENV > 0 ? MAX_ORGS_ENV : 1

export function TeamSwitcher({
  organizations,
  currentOrganization,
}: {
  organizations: {
    id: string
    name: string
    slug: string
    role: string
  }[]
  currentOrganization: {
    id: string
    name: string
    slug: string
    role: string
  } | null
}) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  if (!currentOrganization) {
    return null
  }

  const isPrivileged = currentOrganization.role === 'OWNER' || currentOrganization.role === 'ADMIN'
  const ownerOrgCount = organizations.filter((org) => org.role === 'OWNER').length
  const canCreateOrganization = ownerOrgCount < MAX_ORGS_PER_USER

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              suppressHydrationWarning
            >
              <div className='bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                <Building2 className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{currentOrganization.name}</span>
                <span className='truncate text-xs'>{currentOrganization.role}</span>
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
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => {
                  if (org.id === currentOrganization.id) return
                  startTransition(async () => {
                    await switchOrganization(org.id)
                  })
                }}
                className='gap-2 p-2'
                disabled={isPending}
              >
                <div className='flex size-6 items-center justify-center rounded-md border'>
                  <Building2 className='size-3.5 shrink-0' />
                </div>
                {org.name}
                {isPending && org.id !== currentOrganization.id && <Loader2 className='ml-auto size-4 animate-spin' />}
                {org.id === currentOrganization.id && (
                  <div className='ml-auto size-2 rounded-full bg-primary' />
                )}
              </DropdownMenuItem>
            ))}
            {canCreateOrganization && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='gap-2 p-2' onClick={() => setOpen(true)}>
                  <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                    <Plus className='size-4' />
                  </div>
                  <div className='font-medium'>Create Organization</div>
                </DropdownMenuItem>
              </>
            )}
            {isPrivileged && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/dashboard/settings/organization' className='gap-2 p-2 cursor-pointer'>
                    <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                      <Settings className='size-4' />
                    </div>
                    <div className='font-medium'>Organization Settings</div>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateOrgDialog open={open} onOpenChange={setOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
