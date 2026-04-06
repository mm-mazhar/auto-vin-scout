// app/(dashboard)/dashboard/documents/page.tsx

import { getRPCCaller } from '@/lib/orpc/rsc-client'
import type { ProjectListOutput } from '@/lib/orpc/types'
import { getActiveProjectId } from '@/lib/project-helper'

export default async function DocumentsPage() {
  const rpc = await getRPCCaller()
  const projects: ProjectListOutput = await rpc.project.list()
  const activeProjectId = await getActiveProjectId(projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">
        Documents for Project: {activeProject ? activeProject.name : 'No project selected'}
      </h1>
      <div className="bg-muted/50 min-h-[40vh] rounded-xl" />
    </div>
  )
}
