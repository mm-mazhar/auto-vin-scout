// app/(super-admin)/_components/dashboard-card.tsx

'use client';

import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { memo } from 'react';

interface DashboardCardProps {
  stat: {
    title: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
    icon: React.ReactNode; // ✅ Changed from ComponentType to ReactNode
    bgColor: string;
  };
  index: number;
}

export const DashboardCard = memo(({ stat, index }: DashboardCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-3 ${stat.bgColor}`}>
          {/* ✅ Render the passed JSX directly */}
          {stat.icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
          {stat.changeType === 'positive' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{stat.change}</span>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold">{stat.value}</h3>
        <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
      </div>
    </motion.div>
  );
});
DashboardCard.displayName = 'DashboardCard';
