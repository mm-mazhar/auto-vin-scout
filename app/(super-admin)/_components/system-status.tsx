// app/(super-admin)/_components/system-status.tsx

'use client';

import { memo } from 'react';
import { Activity, Database, HardDrive, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type SystemHealthData = {
  database: 'online' | 'degraded' | 'offline';
  latency: number;
};

type SystemStatusProps = {
  className?: string;
  health: SystemHealthData; // ✅ Accept health data
};

function getStatusClasses(status: string) {
  if (status === 'online') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  if (status === 'degraded') return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  return 'bg-red-500/15 text-red-600 border-red-500/30';
}

function getDotClasses(status: string) {
  if (status === 'online') return 'bg-emerald-500';
  if (status === 'degraded') return 'bg-amber-500';
  return 'bg-red-500';
}

export const SystemStatus = memo(({ className, health }: SystemStatusProps) => {
  
  const items = [
    {
      id: 'server',
      label: 'App Server',
      description: 'Vercel Region (iad1)',
      icon: Server,
      status: 'online', // Vercel is usually online if this page loads
      displayStatus: 'Online'
    },
    {
      id: 'database',
      label: 'Database',
      description: 'Supabase Postgres',
      icon: Database,
      status: health.database,
      displayStatus: health.database === 'online' ? 'Healthy' : 'Issues'
    },
    {
      id: 'api',
      label: 'Response Time',
      description: `DB Latency: ${health.latency}ms`,
      icon: Activity,
      // Simple logic: > 500ms is degraded
      status: health.latency > 500 ? 'degraded' : 'online', 
      displayStatus: health.latency < 200 ? 'Fast' : 'Normal'
    },
    {
      id: 'storage',
      label: 'Storage',
      description: 'Managed by Supabase',
      icon: HardDrive,
      status: 'online', // Hard to measure external storage easily
      displayStatus: 'Auto-scaling' 
    },
  ];

  return (
    <Card className={`h-full flex flex-col ${className ?? ''}`}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">System Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 grid gap-3 grid-cols-1 md:grid-cols-2 auto-rows-fr flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex h-full items-start gap-3 rounded-xl border bg-muted/40 px-3 py-3"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-background border">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium leading-none whitespace-nowrap">{item.label}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusClasses(
                      item.status,
                    )}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${getDotClasses(item.status)}`} />
                    {item.displayStatus}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate" title={item.description}>
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

SystemStatus.displayName = 'SystemStatus';
