// app/(dashboard)/dashboard/page.tsx

import { CreateProjectDialog } from '@/app/(dashboard)/_components/create-project-dialog'
import { ProjectActions } from '@/app/(dashboard)/_components/project-actions'
import { createClient } from '@/app/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRPCCaller } from '@/lib/orpc/rsc-client'
import { Folder } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/get-started')
  }

  const rpc = await getRPCCaller()

  const cookieStore = await cookies()
  const currentOrgId = cookieStore.get('current-org-id')?.value
  const organizations = await rpc.org.list() as { id: string; members: { role: string }[] }[]
  
  // Validate that the user is actually a member of the organization in the cookie
  const isMember = currentOrgId && organizations.some((org: { id: string }) => org.id === currentOrgId)
  const effectiveOrgId = isMember ? currentOrgId : (organizations[0]?.id ?? null)

  const effectiveOrg = effectiveOrgId ? organizations.find((o: { id: string }) => o.id === effectiveOrgId) : null
  const userRole = effectiveOrg?.members[0]?.role

  if (!effectiveOrgId) {
    return (
      <div className='flex h-[50vh] flex-col items-center justify-center gap-4'>
        <p className='text-muted-foreground'>No organization found.</p>
      </div>
    )
  }

  // Use ProjectService directly to fetch projects for the effective organization.
  // This avoids issues where the RPC context might be using a stale cookie (e.g. pointing to a deleted org).
  const { ProjectService } = await import('@/lib/services/project-service')
  const projects = await ProjectService.getOrganizationProjects(user.id, effectiveOrgId) as { id: string; name: string; slug: string; updatedAt: Date }[]

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold tracking-tight'>Projects</h2>
        <div>
          <CreateProjectDialog orgId={effectiveOrgId} />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className='flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent'>
            <Folder className='h-6 w-6 text-foreground' />
          </div>
          <h3 className='mt-4 text-lg font-semibold'>No projects yet</h3>
          <p className='mb-4 mt-2 text-sm text-muted-foreground max-w-sm'>
            Create your first project to start building.
          </p>
          <CreateProjectDialog orgId={effectiveOrgId} />
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {projects.map((project: { id: string; name: string; slug: string; updatedAt: Date }) => (
            <Card key={project.id} className='hover:bg-muted/50 transition-colors'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  {project.name}
                </CardTitle>
                <ProjectActions projectId={project.id} defaultName={project.name} userRole={userRole} />
              </CardHeader>
              <CardContent>
                <div className='text-xs text-muted-foreground'>
                  slug: {project.slug}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
