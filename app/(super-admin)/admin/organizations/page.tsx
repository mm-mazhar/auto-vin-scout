// app/(super-admin)/admin/organizations/page.tsx

import prisma from '@/app/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Eye } from 'lucide-react';
import Link from 'next/link';
import { DataPagination } from '../../_components/data-pagination';
import { OrgTableToolbar } from '../../_components/org-table-toolbar';

function formatDateGB(date: Date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function OrganizationsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = (searchParams.q as string) || '';

  const whereClause = query ? {
    OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      { slug: { contains: query, mode: 'insensitive' as const } },
    ],
    deletedAt: null
  } : { deletedAt: null };

  // Run queries in parallel without transaction for better performance
  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, projects: true } },
        subscription: { select: { planId: true, status: true } }
      }
    }),
    prisma.organization.count({ where: whereClause }),
  ]);

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">Manage workspaces and tenant data.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5"/> All Organizations</CardTitle></CardHeader>
        <CardContent>
          <OrgTableToolbar />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Name</TableHead>
                  <TableHead className="w-[70px] pl-4 md:pl-6">View</TableHead>
                  <TableHead className="w-[140px] md:px-16">Subscription</TableHead>
                  <TableHead className="w-[90px] md:px-16">Members</TableHead>
                  <TableHead className="w-[90px] md:px-16">Projects</TableHead>
                  <TableHead className="w-[90px] md:px-16">Credits</TableHead>
                  <TableHead className="w-[120px] md:px-16">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground">{org.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pl-4 md:pl-6">
                      <Link href={`/admin/organizations/${org.id}`} className="text-muted-foreground hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                    <TableCell className="md:px-16">
                      {org.subscription?.status === 'active' ? (
                        <Badge className="w-[90px] justify-center text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-[90px] justify-center text-xs font-medium">
                          Free
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="md:px-16">{org._count.members}</TableCell>
                    <TableCell className="md:px-16">{org._count.projects}</TableCell>
                    <TableCell className="md:px-16">{org.credits}</TableCell>
                    <TableCell className="md:px-16 text-muted-foreground">
                      {formatDateGB(org.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination total={total} currentPage={page} limit={limit} />
        </CardContent>
      </Card>
    </div>
  );
}
