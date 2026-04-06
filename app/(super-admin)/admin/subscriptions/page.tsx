// app/(super-admin)/admin/subscriptions/page.tsx

import prisma from '@/app/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { DataPagination } from '../../_components/data-pagination';
import { SubscriptionTableToolbar } from '../../_components/subscription-table-toolbar';

export default async function SubscriptionsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = (searchParams.q as string) || '';

  const whereClause = query
    ? {
        OR: [
          { organization: { name: { contains: query, mode: 'insensitive' as const } } },
          { planId: { contains: query, mode: 'insensitive' as const } },
          { status: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {};

  // Run queries in parallel instead of transaction to avoid timeout
  const [subs, total] = await Promise.all([
    prisma.subscription.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    }),
    prisma.subscription.count({ where: whereClause }),
  ]);

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">Monitor recurring revenue and billing status.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5"/> Active Subscriptions</CardTitle></CardHeader>
        <CardContent>
          <SubscriptionTableToolbar />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((sub) => (
                  <TableRow key={sub.stripeSubscriptionId}>
                    <TableCell>
                      {sub.organization ? (
                        <Link href={`/admin/organizations/${sub.organization.id}`} className="font-medium hover:underline">
                          {sub.organization.name}
                        </Link>
                      ) : <span className="text-muted-foreground italic">Deleted Org</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sub.planId}</TableCell>
                    <TableCell>
                      <Badge
                        className={`w-[90px] justify-center text-xs font-semibold capitalize border ${
                          sub.status === 'active'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(sub.currentPeriodEnd * 1000).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
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
