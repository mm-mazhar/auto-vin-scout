// app/(super-admin)/_components/dashboard-header.tsx

'use client';

import { SidebarTrigger } from '@/app/(dashboard)/_components/sidebar';
import { Themetoggle } from '@/components/Themetoggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import React from 'react';

export const DashboardHeader = memo(() => {
  const pathname = usePathname();
  
  // Split path into segments (e.g. /admin/users -> ['admin', 'users'])
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-8 sticky top-0 z-10">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      
      <Breadcrumb>
        <BreadcrumbList className="text-sm h-10 items-center hidden md:flex capitalize">
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin" className="flex items-center gap-1.5">
              <Home className="size-3.5" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {segments.map((segment, index) => {
            // Skip showing 'admin' as it's covered by Home
            if (segment === 'admin' && segments.length > 1) return null;
            
            const isLast = index === segments.length - 1;
            const href = `/${segments.slice(0, index + 1).join('/')}`;
            const title = segment.replace('-', ' '); // e.g. "user-analytics" -> "user analytics"

            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Themetoggle isAuthenticated={true} />
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';