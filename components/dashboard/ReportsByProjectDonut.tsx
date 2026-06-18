// components/dashboard/ReportsByProjectDonut.tsx

'use client'

import { CreateProjectDialog } from '@/app/(dashboard)/_components/create-project-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ROLES, type OrganizationRole } from '@/lib/constants'
import type { ProjectReportCount } from '@/lib/orpc/routers/dashboard'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Cell, Pie, PieChart } from 'recharts'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

interface ReportsByProjectDonutProps {
  data: ProjectReportCount[]
  orgId: string
  userRole: OrganizationRole | string
}

export function ReportsByProjectDonut({ data, orgId, userRole }: ReportsByProjectDonutProps) {
  const canManageProjects =
    userRole === ROLES.OWNER || userRole === ROLES.ADMIN

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const hasData = total > 0
  const isSingleProject = data.length <= 1

  // No data at all — empty state
  if (!hasData) {
    return (
      <Card className='col-span-2'>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>Reports by Project</CardTitle>
          <p className='text-xs text-muted-foreground'>Most useful on Core or Pro plans</p>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center h-48 gap-3'>
          <PieChartIcon className='h-8 w-8 text-muted-foreground' />
          <p className='text-sm text-muted-foreground text-center'>
            {isSingleProject
              ? 'Create more projects to compare report distribution'
              : 'No reports yet'}
          </p>
          {canManageProjects && <CreateProjectDialog orgId={orgId} />}
        </CardContent>
      </Card>
    )
  }

  const chartConfig = data.reduce<ChartConfig>((acc, project, i) => {
    acc[project.projectId] = {
      label: project.projectName,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }
    return acc
  }, {})

  return (
    <Card className='col-span-2'>
      <CardHeader>
        <CardTitle className='text-sm font-medium'>Reports by Project</CardTitle>
        <p className='text-xs text-muted-foreground'>Useful for different sets of lots/inventories</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className='h-48 w-full'>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => {
                    const count = Number(value)
                    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                    return <span>{count} reports ({pct}%)</span>
                  }}
                  nameKey='projectId'
                />
              }
            />
            <Pie
              data={data}
              dataKey='count'
              nameKey='projectId'
              cx='50%'
              cy='50%'
              innerRadius='55%'
              outerRadius='80%'
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.projectId}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey='projectId' />} />
          </PieChart>
        </ChartContainer>
        {isSingleProject && canManageProjects && (
          <div className='flex items-center justify-center gap-2 mt-2'>
            <p className='text-xs text-muted-foreground'>Add more projects to compare</p>
            <CreateProjectDialog orgId={orgId} />
          </div>
          
        )}
      </CardContent>
    </Card>
  )
}
