// components/dashboard/RecentReportsTable.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RecentReport } from '@/lib/orpc/routers/dashboard'
import { FileSearch } from 'lucide-react'
import Link from 'next/link'

interface RecentReportsTableProps {
  reports: RecentReport[]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 30) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecentReportsTable({ reports }: RecentReportsTableProps) {
  const rows = reports.slice(0, 10)

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center h-48 gap-3'>
          <FileSearch className='h-8 w-8 text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>No reports yet</p>
          <Link
            href='/dashboard/reports'
            className='text-sm font-medium text-primary hover:underline'
          >
            Run your first report →
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-sm font-medium'>Recent Reports</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='pl-6'>VIN</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className='pr-6'>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((report) => (
              <TableRow key={report.id}>
                <TableCell className='pl-6'>
                  <Link
                    href={`/dashboard/reports/${report.projectSlug}`}
                    className='font-mono text-xs text-primary hover:underline'
                  >
                    {report.vin}
                  </Link>
                </TableCell>
                <TableCell className='text-sm'>{report.vehicleName}</TableCell>
                <TableCell className='text-sm text-muted-foreground'>
                  {report.projectName}
                </TableCell>
                <TableCell
                  className='text-sm text-muted-foreground'
                  title={formatFullDate(report.createdAt)}
                >
                  {formatRelativeTime(report.createdAt)}
                </TableCell>
                <TableCell className='pr-6 text-xs text-muted-foreground capitalize'>
                  {report.status.toLowerCase().replace('_', ' ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
