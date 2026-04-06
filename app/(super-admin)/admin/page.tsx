// app/(super-admin)/admin/page.tsx

import prisma from '@/app/lib/db';
import { DEFAULT_CURRENCY, LOCALE, PLAN_IDS, PRICING_PLANS } from '@/lib/constants';
import { Activity, Banknote, CreditCard, DollarSign, Layers, Users } from 'lucide-react';
import { DashboardActions } from '../_components/dashboard-actions';
import { DashboardCard } from '../_components/dashboard-card';
import { RecentActivity, type ActivityItem } from '../_components/recent-activity';
import { RevenueChart, type RevenuePoint } from '../_components/revenue-chart';
import { SystemStatus, type SystemHealthData } from '../_components/system-status';
import { UserGrowthChart, type UserDataPoint } from '../_components/user-growth-chart';

// --- Helpers ---

const formatCurrency = (amount: number) => {
  const localeString = LOCALE.replace('_', '-');
  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
  }).format(amount);
};

function timeAgo(date: Date) {
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Data Fetching Logic ---

async function getAdminData() {
  const now = new Date();
  
  // 1. SYSTEM HEALTH CHECK
  const start = performance.now();
  let dbStatus: 'online' | 'degraded' | 'offline' = 'online';
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'offline'; }
  const latency = Math.round(performance.now() - start);
  const healthData: SystemHealthData = { database: dbStatus, latency };

  // 2. TIMELINE DATA (Last 12 Months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const revenueData: RevenuePoint[] = [];
  const userData: UserDataPoint[] = [];
  const monthIndexMap: Record<string, number> = {};

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleString('default', { month: 'short' });
    const yearStr = d.getFullYear().toString().slice(-2);
    const label = `${monthStr} '${yearStr}`;
    revenueData.unshift({ month: label, value: 0 });
    userData.unshift({ month: label, value: 0 });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthIndexMap[key] = 11 - i;
  }

  const proPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.pro);
  const proPlusPlan = PRICING_PLANS.find(p => p.id === PLAN_IDS.proplus);

  const [subRevenueRowsPro, subRevenueRowsProPlus, userGrowthRows] = await Promise.all([
    proPlan
      ? prisma.$queryRaw<{ month: Date; count: bigint }[]>`
          SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
          FROM "Subscription"
          WHERE "status" = 'active'
            AND "createdAt" >= ${twelveMonthsAgo}
            AND "planId" = ${proPlan.stripePriceId}
          GROUP BY month
          ORDER BY month
        `
      : Promise.resolve([] as { month: Date; count: bigint }[]),
    proPlusPlan
      ? prisma.$queryRaw<{ month: Date; count: bigint }[]>`
          SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
          FROM "Subscription"
          WHERE "status" = 'active'
            AND "createdAt" >= ${twelveMonthsAgo}
            AND "planId" = ${proPlusPlan.stripePriceId}
          GROUP BY month
          ORDER BY month
        `
      : Promise.resolve([] as { month: Date; count: bigint }[]),
    prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
      FROM "User"
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY month
      ORDER BY month
    `,
  ]);

  subRevenueRowsPro.forEach(row => {
    const d = new Date(row.month);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const index = monthIndexMap[key];
    if (index === undefined) return;
    const count = Number(row.count);
    if (proPlan) {
      revenueData[index].value += count * Number(proPlan.price);
    }
  });

  subRevenueRowsProPlus.forEach(row => {
    const d = new Date(row.month);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const index = monthIndexMap[key];
    if (index === undefined) return;
    const count = Number(row.count);
    if (proPlusPlan) {
      revenueData[index].value += count * Number(proPlusPlan.price);
    }
  });

  userGrowthRows.forEach(row => {
    const d = new Date(row.month);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const index = monthIndexMap[key];
    if (index === undefined) return;
    const count = Number(row.count);
    userData[index].value += count;
  });

  // 3. RECENT ACTIVITY FEED
  const [newUsersFeed, newOrgsFeed, newSubsFeed, newProjectsFeed] = await Promise.all([
    prisma.user.findMany({ take: 4, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.organization.findMany({ take: 4, orderBy: { createdAt: 'desc' }, where: {deletedAt: null}, select: { id: true, name: true, createdAt: true } }),
    prisma.subscription.findMany({ take: 4, orderBy: { createdAt: 'desc' }, where: { status: 'active' }, select: { stripeSubscriptionId: true, planId: true, createdAt: true, organization: { select: { name: true } } } }),
    prisma.project.findMany({ take: 4, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true, organization: { select: { name: true } } } }),
  ]);

  const rawActivities: { sortDate: Date | string; data: ActivityItem }[] = [];
  
  newUsersFeed.forEach(u => rawActivities.push({ 
    sortDate: u.createdAt, 
    data: { id: `u-${u.id}`, type: 'user_join', title: u.name || 'New User', description: u.email, time: timeAgo(u.createdAt), initials: (u.name || 'U').substring(0, 2).toUpperCase() } 
  }));

  newOrgsFeed.forEach(o => rawActivities.push({ 
    sortDate: o.createdAt, 
    data: { id: `o-${o.id}`, type: 'org_create', title: o.name, description: 'New Workspace created', time: timeAgo(o.createdAt), initials: o.name.substring(0, 2).toUpperCase() } 
  }));

  newSubsFeed.forEach(s => { 
    const plan = PRICING_PLANS.find(p => p.stripePriceId === s.planId); 
    rawActivities.push({ 
      sortDate: s.createdAt, 
      data: { id: `s-${s.stripeSubscriptionId}`, type: 'sub_new', title: s.organization?.name || 'Unknown Org', description: `Upgraded to ${plan?.title || 'Pro'}`, time: timeAgo(s.createdAt), initials: '$', meta: plan?.price ? `$${plan.price}` : undefined } 
    }); 
  });

  newProjectsFeed.forEach(p => rawActivities.push({ 
    sortDate: p.createdAt, 
    data: { id: `p-${p.id}`, type: 'project_create', title: p.name, description: `In ${p.organization?.name || 'Workspace'}`, time: timeAgo(p.createdAt), initials: 'P' } 
  }));

  const activityList = rawActivities
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    .map(item => item.data)
    .slice(0, 6);

  // 4. TOP LEVEL STATS
  const totalUsers = await prisma.user.count();
  const totalOrgs = await prisma.organization.count({ where: { deletedAt: null } });
  
  let proRevenue = 0;
  let proPlusRevenue = 0;
  let activeProCount = 0;
  let activeProPlusCount = 0;

  if (proPlan) {
    const proSubCountRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Subscription"
      WHERE "status" = 'active'
        AND "planId" = ${proPlan.stripePriceId}
    `;
    const proSubCount = proSubCountRows.length > 0 ? Number(proSubCountRows[0].count) : 0;
    activeProCount = proSubCount;
    proRevenue = activeProCount * Number(proPlan.price);
  }

  if (proPlusPlan) {
    const proPlusSubCountRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Subscription"
      WHERE "status" = 'active'
        AND "planId" = ${proPlusPlan.stripePriceId}
    `;
    const proPlusSubCount = proPlusSubCountRows.length > 0 ? Number(proPlusSubCountRows[0].count) : 0;
    activeProPlusCount = proPlusSubCount;
    proPlusRevenue = activeProPlusCount * Number(proPlusPlan.price);
  }
  
  const totalRevenue = proRevenue + proPlusRevenue;

  // Growth %
  const thirtyDaysAgo = new Date(); 
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsersCount = await prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
  const growthPercentage = (totalUsers - newUsersCount) > 0 
    ? ((newUsersCount / (totalUsers - newUsersCount)) * 100).toFixed(1) 
    : '100';

  return {
    stats: { totalUsers, totalOrgs, activeProCount, activeProPlusCount, proRevenue, proPlusRevenue, totalRevenue, growthPercentage },
    revenueChart: revenueData,
    userChart: userData,
    recentActivity: activityList,
    health: healthData
  };
}

// --- Main Page Component ---

export default async function AdminDashboardPage() {
  const data = await getAdminData();
  const { stats } = data;

  const cardStats = [
    { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), change: 'Lifetime est.', changeType: 'positive' as const, icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: 'Pro (MRR)', value: formatCurrency(stats.proRevenue), change: `${stats.activeProCount} subs`, changeType: 'positive' as const, icon: Layers, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
    { title: 'Pro Plus (MRR)', value: formatCurrency(stats.proPlusRevenue), change: 'Active Pro Plus Subs', changeType: 'positive' as const, icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: 'Total Users', value: stats.totalUsers.toLocaleString(), change: `+${stats.growthPercentage}% (30d)`, changeType: 'positive' as const, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Active Organizations', value: stats.totalOrgs.toLocaleString(), change: 'Workspaces', changeType: 'positive' as const, icon: Activity, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Active Subscriptions', value: (stats.activeProCount + stats.activeProPlusCount).toLocaleString(), change: 'Pro + Pro Plus', changeType: 'positive' as const, icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 md:px-8 pt-6 pb-4 md:pb-8">
        <div className="flex-1 space-y-8">
          
          {/* Header Area with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <DashboardActions data={data} />
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cardStats.map((stat, index) => (
              <DashboardCard 
                key={stat.title} 
                stat={{
                  ...stat,
                  // We pass the component itself, DashboardCard will render it
                  icon: <stat.icon className={`h-6 w-6 ${stat.color}`} />
                }} 
                index={index} 
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div id="user-analytics">
              <UserGrowthChart data={data.userChart} />
            </div>
            <div id="revenue-analytics">
              <RevenueChart data={data.revenueChart} className="h-full" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 items-stretch">
            <div className="h-full">
              <RecentActivity activities={data.recentActivity} className="h-full" />
            </div>
            <div className="h-full">
              <SystemStatus health={data.health} className="h-full" />
            </div>
          </div>
          

        </div>
      </div>
    </div>
  );
}
