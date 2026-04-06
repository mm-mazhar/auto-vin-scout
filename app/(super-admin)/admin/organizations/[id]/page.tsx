// app/(super-admin)/admin/organizations/[id]/page.tsx

import prisma from '@/app/lib/db';
import { stripe } from '@/app/lib/stripe';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Folder } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function OrgDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      subscription: true,
      members: { include: { user: true } },
      projects: { orderBy: { createdAt: 'desc' }, take: 10 },
      invites: { where: { status: 'PENDING' } }
    }
  });

  if (!org) return notFound();

  let invoices: {
    id: string;
    amount_paid: number;
    currency: string | null;
    status: string | null;
    hosted_invoice_url: string | null;
    number: string | null;
    created: number | null;
  }[] = [];

  if (org.stripeCustomerId) {
    const list = await stripe.invoices.list({ customer: org.stripeCustomerId, limit: 12 });
    invoices = list.data.map((inv) => ({
      id: inv.id,
      amount_paid: typeof inv.amount_paid === 'number' ? inv.amount_paid : 0,
      currency: inv.currency || 'usd',
      status: inv.status || null,
      hosted_invoice_url: inv.hosted_invoice_url || null,
      number: (inv.number as string | null) || null,
      created: typeof inv.created === 'number' ? inv.created : null,
    }));
  }

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/admin/organizations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          <p className="text-muted-foreground text-sm">{org.slug} • {org.id}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge
            className={`h-7 px-3 text-xs font-medium border ${
              org.subscription?.status === 'active'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {org.subscription?.status === 'active' ? 'Pro Plan' : 'Free Plan'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Members</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{org.members.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Credits Available</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{org.credits}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Projects</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{org.projects.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        
        {/* MEMBERS TAB */}
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Team Members</CardTitle><CardDescription>Users with access to this organization.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
                <TableBody>
                  {org.members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${m.user.email}`} />
                          <AvatarFallback>{m.user.email?.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div><div className="font-medium">{m.user.name || 'Unknown'}</div><div className="text-xs text-muted-foreground">{m.user.email}</div></div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="w-[90px] justify-center text-xs font-semibold tracking-wide">
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Projects</CardTitle><CardDescription>Recent projects created within this organization.</CardDescription></CardHeader>
            <CardContent>
               <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {org.projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium flex items-center gap-2"><Folder className="h-4 w-4 text-muted-foreground"/> {p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTION TAB */}
        <TabsContent value="subscription" className="mt-4">
          <Card>
             <CardHeader><CardTitle>Billing Details</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><span className="text-sm text-muted-foreground">Stripe Customer ID</span><p className="font-mono text-sm">{org.stripeCustomerId || 'N/A'}</p></div>
                   <div className="space-y-1"><span className="text-sm text-muted-foreground">Subscription ID</span><p className="font-mono text-sm">{org.subscription?.stripeSubscriptionId || 'N/A'}</p></div>
                   <div className="space-y-1"><span className="text-sm text-muted-foreground">Status</span><p className="capitalize">{org.subscription?.status || 'None'}</p></div>
                   <div className="space-y-1"><span className="text-sm text-muted-foreground">Current Period End</span><p>{org.subscription?.currentPeriodEnd ? new Date(org.subscription.currentPeriodEnd * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</p></div>
                </div>
                <Separator />
                <div className="pt-2">
                   <h4 className="text-sm font-medium mb-2">Invoice History</h4>
                   {invoices.length > 0 ? (
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Date</TableHead>
                           <TableHead>Invoice</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead>Amount</TableHead>
                           <TableHead>Link</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {invoices.map((inv) => {
                           const date = inv.created ? new Date(inv.created * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
                           const amount = (inv.amount_paid || 0) / 100;
                           return (
                             <TableRow key={inv.id}>
                               <TableCell className="text-sm text-muted-foreground">{date}</TableCell>
                               <TableCell className="font-mono text-sm">{inv.number || inv.id}</TableCell>
                               <TableCell className="text-sm capitalize">{inv.status || ''}</TableCell>
                               <TableCell className="text-sm">
                                 {amount.toLocaleString(undefined, { style: 'currency', currency: inv.currency || 'usd' })}
                               </TableCell>
                               <TableCell>
                                 {inv.hosted_invoice_url ? (
                                   <Link href={inv.hosted_invoice_url} target="_blank" className="text-xs text-primary underline">View</Link>
                                 ) : (
                                   <span className="text-xs text-muted-foreground">N/A</span>
                                 )}
                               </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                     </Table>
                   ) : (
                     <div className="text-sm text-muted-foreground">No subscription invoices found.</div>
                   )}
                </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
