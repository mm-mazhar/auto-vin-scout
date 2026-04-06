// app/(super-admin)/_components/recent-activity.tsx

'use client';

import { memo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  UserPlus, 
  Building2, 
  CreditCard, 
  FolderPlus, 
  type LucideIcon 
} from 'lucide-react';

export type ActivityType = 'user_join' | 'org_create' | 'sub_new' | 'project_create';

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;      // e.g. "Alice Smith" or "Acme Corp"
  description: string; // e.g. "Joined the platform"
  time: string;
  avatar?: string;
  initials: string;
  meta?: string;      // e.g. "$15"
};

type RecentActivityProps = {
  className?: string;
  activities: ActivityItem[];
};

// Configuration for icons and colors based on activity type
const CONFIG: Record<ActivityType, { icon: LucideIcon; color: string; bg: string }> = {
  user_join: { 
    icon: UserPlus, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10' 
  },
  org_create: { 
    icon: Building2, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10' 
  },
  sub_new: { 
    icon: CreditCard, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10' 
  },
  project_create: { 
    icon: FolderPlus, 
    color: 'text-purple-500', 
    bg: 'bg-purple-500/10' 
  },
};

export const RecentActivity = memo(({ className, activities }: RecentActivityProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Live Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col gap-5">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
        ) : (
          activities.map((item) => {
            const config = CONFIG[item.type] || CONFIG.user_join;
            const Icon = config.icon;

            return (
              <div key={item.id} className="flex items-start gap-3 relative group">
                {/* Custom Icon Avatar */}
                <div className={`relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full items-center justify-center border ${config.bg}`}>
                   <Icon className={`h-4 w-4 ${config.color}`} />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none truncate pr-4">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.description}
                    </p>
                    {item.meta && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${config.bg} ${config.color}`}>
                        {item.meta}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});

RecentActivity.displayName = 'RecentActivity';