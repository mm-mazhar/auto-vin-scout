// app/(dashboard)/_components/app-sidebar.tsx

'use client'

import * as React from 'react'

import { NavMain } from '@/app/(dashboard)/_components/nav-main'
import { NavUser } from '@/app/(dashboard)/_components/nav-user'
import { ProjectSwitcher } from '@/app/(dashboard)/_components/project-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/app/(dashboard)/_components/sidebar'
import { TeamSwitcher } from '@/app/(dashboard)/_components/team-switcher'
import { type PlanId } from '@/lib/constants'
import { ChartNoAxesCombined, Database, FileText } from 'lucide-react'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: ChartNoAxesCombined },
]

const projectItems = [
  { name: 'Data', href: '/dashboard/data', icon: Database },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
]


export function AppSidebar({
  user,
  currentPlanId,
  organizations,
  currentOrganization,
  projects,
  activeProjectId,
  creditsUsed,
  creditsTotal,
  exhausted,
  isSuperAdmin,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string; email: string; avatar: string }
  currentPlanId?: PlanId | null
  organizations?: { id: string; name: string; slug: string; role: string }[]
  currentOrganization?: { id: string; name: string; slug: string; role: string } | null
  projects?: { id: string; name: string; slug: string }[]
  activeProjectId?: string
  creditsUsed?: number
  creditsTotal?: number
  exhausted?: boolean
  isSuperAdmin?: boolean
}) {
  const pathname = usePathname()
  const mappedNavMain = navItems.map((n) => ({
    title: n.name,
    url: n.href,
    icon: n.icon,
    isActive: n.href === '/dashboard' ? pathname === n.href : pathname.startsWith(n.href),
  }))

  const mappedProjectItems = projectItems.map((n) => ({
    title: n.name,
    url: n.href,
    icon: n.icon,
    isActive: pathname.startsWith(n.href),
  }))

  const finalUser = user ?? {
    name: 'User',
    email: '',
    avatar: 'https://github.com/shadcn.png',
  }

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader className='pt-4'>
        <TeamSwitcher
          organizations={organizations || []}
          currentOrganization={currentOrganization || null}
        />
        {currentOrganization && (
          <ProjectSwitcher
            projects={projects || []}
            activeProjectId={activeProjectId}
            orgId={currentOrganization.id}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mappedNavMain} label="Platform" />
        {activeProjectId && (
          <NavMain items={mappedProjectItems} label="Project" />
        )}
      </SidebarContent>
      <SidebarFooter className='pb-4'>
        <NavUser
          user={finalUser}
          currentPlanId={currentPlanId}
          creditsUsed={creditsUsed}
          creditsTotal={creditsTotal}
          exhausted={exhausted}
          role={currentOrganization?.role}
          isSuperAdmin={isSuperAdmin}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
