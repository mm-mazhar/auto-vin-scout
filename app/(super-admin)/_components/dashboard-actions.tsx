// app/(super-admin)/_components/dashboard-actions.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Download, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ActivityItem } from './recent-activity';
import type { RevenuePoint } from './revenue-chart';
import type { UserDataPoint } from './user-growth-chart';

type AdminStats = {
  totalUsers: number;
  totalOrgs: number;
  activeProCount: number;
  activeProPlusCount: number;
  proRevenue: number;
  proPlusRevenue: number;
  totalRevenue: number;
  growthPercentage: string;
};

type AdminDashboardData = {
  stats: AdminStats;
  revenueChart: RevenuePoint[];
  userChart: UserDataPoint[];
  recentActivity: ActivityItem[];
};

export function DashboardActions({ data }: { data: AdminDashboardData }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    if (!data) return;

    const { stats, revenueChart, userChart, recentActivity } = data;
    const timestamp = new Date().toISOString().split('T')[0];

    let csvContent = `data:text/csv;charset=utf-8,`;

    // 1. Summary Stats
    csvContent += `SUMMARY METRICS\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Revenue,${stats.totalRevenue}\n`;
    csvContent += `Pro Plus (MRR),${stats.proPlusRevenue}\n`;
    csvContent += `Pro (MRR),${stats.proRevenue}\n`;
    csvContent += `Total Users,${stats.totalUsers}\n`;
    csvContent += `Active Orgs,${stats.totalOrgs}\n\n`;

    // 2. Revenue History
    csvContent += `REVENUE HISTORY (Last 12 Months)\n`;
    csvContent += `Month,Revenue\n`;
    revenueChart.forEach((row) => {
      csvContent += `${row.month},${row.value}\n`;
    });
    csvContent += `\n`;

    // 3. User Growth History
    csvContent += `USER GROWTH HISTORY\n`;
    csvContent += `Month,New Users\n`;
    userChart.forEach((row) => {
      csvContent += `${row.month},${row.value}\n`;
    });
    csvContent += `\n`;

    // 4. Recent Activity
    csvContent += `RECENT ACTIVITY LOG\n`;
    csvContent += `Title,Description,Time\n`;
    recentActivity.forEach((act) => {
      const safeTitle = `"${act.title}"`;
      const safeDescription = `"${act.description}"`;
      csvContent += `${safeTitle},${safeDescription},${act.time}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admin-report-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleRefresh} 
        className="h-8 gap-2 text-xs"
      >
        <RotateCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleExport} 
        className="h-8 gap-2 text-xs"
      >
        <Download className="size-3.5" />
        Export Data
      </Button>
    </div>
  );
}
