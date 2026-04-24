// components/dashboard/ProjectPanel.tsx

import { CreateProjectDialog } from '@/app/(dashboard)/_components/create-project-dialog'
import { ProjectActions } from '@/app/(dashboard)/_components/project-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLES, type OrganizationRole } from '@/lib/constants'
import { Folder } from 'lucide-react'

interface Project {
  id: string
  name: string
  slug: string
  updatedAt: Date
}

interface ProjectPanelProps {
  projects: Project[]
  activeProjectId: string | undefined
  userRole: OrganizationRole | string
  orgId: string
}

export function ProjectPanel({
  projects,
  activeProjectId,
  userRole,
  orgId,
}: ProjectPanelProps) {
  const canManage = userRole === ROLES.OWNER || userRole === ROLES.ADMIN

  if (projects.length === 0) {
    return (
      <Card className='col-span-2'>
        <CardContent className='flex min-h-[200px] flex-col items-center justify-center gap-3 p-6'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-accent'>
            <Folder className='h-5 w-5 text-foreground' />
          </div>
          <p className='text-sm font-medium'>No projects yet</p>
          <p className='text-xs text-muted-foreground text-center'>
            Create your first project to start analyzing VINs.
          </p>
          {canManage && <CreateProjectDialog orgId={orgId} />}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='col-span-2 flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Projects</h3>
        {canManage && <CreateProjectDialog orgId={orgId} />}
      </div>
      <div className='flex flex-col gap-2'>
        {projects.map((project) => (
          <Card key={project.id} className='relative hover:bg-muted/50 transition-colors'>
            {project.id === activeProjectId && (
              <div className='absolute top-3 right-3 size-2 rounded-full bg-primary' />
            )}
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4'>
              <CardTitle className='text-sm font-medium pr-4'>{project.name}</CardTitle>
              {canManage && (
                <ProjectActions
                  projectId={project.id}
                  defaultName={project.name}
                  userRole={userRole}
                />
              )}
            </CardHeader>
            <CardContent className='px-4 pb-3'>
              <p className='text-xs text-muted-foreground truncate'>
                {project.slug}
              </p>
              <p className='text-xs text-muted-foreground'>
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
