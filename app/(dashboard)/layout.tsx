// app/(dashboard)/layout.tsx

import { ClientAppSidebar } from '@/app/(dashboard)/_components/ClientAppSidebar'
import { SidebarProvider } from '@/app/(dashboard)/_components/sidebar'
import { TopBar } from '@/app/(dashboard)/_components/topbar'
import { getData } from '@/app/lib/db'
import { createClient } from '@/app/lib/supabase/server'
import { ToastProvider } from '@/components/ToastProvider'
import { QueryProvider } from '@/components/providers/query-provider'
import { PLAN_IDS, PRICING_PLANS, type PlanId, type PricingPlan } from '@/lib/constants'
import type { ProjectListOutput } from '@/lib/orpc/types'
import { ProjectService } from '@/lib/services/project-service'
import { slugify } from '@/lib/utils'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type CSSProperties, ReactNode } from 'react'


export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPER_ADMINS =
  process.env.SUPER_ADMIN_EMAILS?.split(',').map((email) => email.trim()).filter(Boolean) || []

async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const isSuperAdmin = !!(user.email && SUPER_ADMINS.includes(user.email))

  const userName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const [firstName, ...lastNameParts] = userName.split(' ')
  const lastName = lastNameParts.join(' ')

  const userRow = await getData({
    email: user.email as string,
    firstName: firstName,
    id: user.id,
    lastName: lastName,
    profileImage: user.user_metadata?.avatar_url,
  })

  const cookieStore = await cookies()
  const initialOpen = cookieStore.get('sidebar_state')?.value === 'true'
  
  // Multi-tenancy: Fetch organizations using oRPC RSC client
  const { getRPCCaller } = await import('@/lib/orpc/rsc-client')
  // const { OrganizationService } = await import('@/lib/services/organization-service')
  
  const rpc = await getRPCCaller()
  let organizations = await rpc.org.list() as { id: string; name: string; slug: string; members: { role: string }[]; isPrimary?: boolean }[]
  
  // Only attempt to create default organization if the user exists in DB (has createdAt)
  if (organizations.length === 0 && userRow?.createdAt) {
    const defaultOrgName = 'Default Organization'
    try {
      // Use oRPC to create the organization
      const newOrg = await rpc.org.create({ name: defaultOrgName })
      const defaultProjectName = 'Default Project'
      await ProjectService.createProject(
        user.id,
        newOrg.id,
        defaultProjectName,
        `${slugify(defaultProjectName)}-${user.id.substring(0, 8)}-${Date.now()}`
      )
      organizations = [newOrg]
    } catch (e) {
      console.error('[Dashboard Layout] Failed to create default organization:', e)
    }
  }
  
  const currentOrgId = cookieStore.get('current-org-id')?.value
  let currentOrganization = organizations.find((org: { id: string }) => org.id === currentOrgId)
  
  if (!currentOrganization && organizations.length > 0) {
    currentOrganization = organizations[0]
    try {
      const id = currentOrganization.id
      if (id) {
        cookieStore.set('current-org-id', id)
      }
    } catch {}
  }

  const effectiveOrgId = currentOrganization?.id

  // Fetch full billing details for current org
  const { default: prisma } = await import('@/app/lib/db')
  let orgBilling = null
  if (effectiveOrgId) {
      orgBilling = await prisma.organization.findUnique({
          where: { id: effectiveOrgId },
          include: { subscription: true }
      })
  }

  const resolvePlanId = async (
    planIdFromDb?: string | null
  ): Promise<PlanId | null> => {
    if (!planIdFromDb) return null
    if (planIdFromDb === PLAN_IDS.free) return PLAN_IDS.free
    const matched = PRICING_PLANS.find(
      (p: PricingPlan) => p.stripePriceId === planIdFromDb
    )
    return matched?.id ?? null
  }

  const currentPlan = await resolvePlanId(orgBilling?.subscription?.planId)
  const subStatus = orgBilling?.subscription?.status
  const creditsRemaining = (orgBilling?.credits as number | undefined) ?? 0
  
  // Logic fix: 
  // 'credits' in DB = Remaining Credits (Balance).
  // 'exhausted' should be true only if balance <= 0.
  // The old logic (creditsUsed >= creditsTotal) was treating 'credits' as 'consumed', which was wrong.
  
  const effectivePlan: PlanId =
    subStatus === 'active'
      ? (currentPlan ?? PLAN_IDS.free)
      : creditsRemaining > 0
        ? PLAN_IDS.basic
        : PLAN_IDS.free
  const creditsTotal = PRICING_PLANS.find((p) => p.id === effectivePlan)?.credits ?? 0
  
  const exhausted = creditsRemaining <= 0
  const renewalDate =
    orgBilling?.subscription?.currentPeriodEnd ??
    (orgBilling?.createdAt
      ? Math.floor(orgBilling.createdAt.getTime() / 1000) + 30 * 24 * 60 * 60
      : null)

  const { getActiveProjectId } = await import('@/lib/project-helper')

  let projects: ProjectListOutput = []
  
  if (effectiveOrgId) {
    try {
      // Use ProjectService directly to fetch projects for the effective organization.
      // This avoids issues where the RPC context might be using a stale cookie (e.g. pointing to a deleted org).
      projects = await ProjectService.getOrganizationProjects(user.id, effectiveOrgId)
    } catch (e) {
      console.error('[Dashboard Layout] Failed to fetch projects:', e)
    }
  }

  const activeProjectId = await getActiveProjectId(projects)

  const mappedOrgs = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: org.members[0]?.role || 'MEMBER'
  }))

  const mappedCurrentOrg = currentOrganization ? {
    id: currentOrganization.id,
    name: currentOrganization.name,
    slug: currentOrganization.slug,
    role: currentOrganization.members[0]?.role || 'MEMBER'
  } : null

  const requireFirstRunRename =
    Boolean(currentOrganization?.isPrimary) &&
    typeof currentOrganization?.slug === 'string' &&
    currentOrganization.slug.startsWith('default-organization-')

  const { FirstRunRenameOrgDialog } = await import('./_components/first-run-rename-org-dialog')

  return (
    <QueryProvider>
      <ToastProvider>
        <SidebarProvider
          defaultOpen={initialOpen}
          style={{ '--sidebar-width-icon': '3.25rem' } as CSSProperties}
        >
          <div className="flex min-h-screen w-full bg-background">
            {requireFirstRunRename && mappedCurrentOrg && (
              <FirstRunRenameOrgDialog
                open={true}
                orgId={mappedCurrentOrg.id}
                currentName={mappedCurrentOrg.name}
                currentSlug={mappedCurrentOrg.slug}
              />
            )}
          <ClientAppSidebar
          user={{
            name:
              (userRow?.name as string) ||
              (user.user_metadata?.full_name as string) ||
              (user.email as string) ||
              'User',
            email: (userRow?.email as string) || (user.email as string),
            avatar:
              (user.user_metadata?.avatar_url as string) ||
              'https://github.com/shadcn.png',
          }}
          isSuperAdmin={isSuperAdmin}
          currentPlanId={effectivePlan}
          organizations={mappedOrgs}
          currentOrganization={mappedCurrentOrg}
          projects={projects}
          activeProjectId={activeProjectId}
          creditsUsed={creditsRemaining}
          creditsTotal={creditsTotal}
          exhausted={exhausted}
        />
        <main className="flex-1 flex flex-col overflow-y-auto">
          <TopBar
            usageInfo={{
              creditsUsed: creditsRemaining,
              creditsTotal,
              renewalDate,
              currentPlanId: effectivePlan,
              exhausted,
            }}
            subscriptionStatus={subStatus ?? null}
          />
          <div className="px-4 md:px-8 pt-2 md:pt-4 pb-4 md:pb-8 flex-1">
            {children}
          </div>
          
        </main>
        </div>
        </SidebarProvider>
      </ToastProvider>
    </QueryProvider>
  )
}

export default DashboardGroupLayout
