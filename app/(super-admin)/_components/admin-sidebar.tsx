// app/(super-admin)/_components/admin-sidebar.tsx

'use client';

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from '@/app/(dashboard)/_components/sidebar';
import { createClient } from '@/app/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, BarChart3, Building2, ChevronDown, ChevronsUpDown, CreditCard, LayoutDashboard, LogOut, Settings, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useEffect, useState } from 'react';

// Main menu items (not in Dashboard section)
const mainMenuItems = [
  { title: 'Users', icon: Users, href: '/admin/users' },
  { title: 'Organizations', icon: Building2, href: '/admin/organizations' },
  { title: 'Subscriptions', icon: CreditCard, href: '/admin/subscriptions' },
  { title: 'Settings', icon: Settings, href: '#' },
];

// Dashboard submenu items
const dashboardItems = [
  { title: 'Overview', icon: LayoutDashboard, href: '/admin' },
  { title: 'Revenue Analytics', icon: BarChart3, href: '/admin#revenue-analytics' },
  { title: 'User Analytics', icon: Users, href: '/admin#user-analytics' },
];

type AdminUser = {
  name: string;
  email: string;
  avatar: string;
};

// ... (AdminSidebarUser function remains exactly the same as before) ...
function AdminSidebarUser() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || (u.email as string) || 'User';
      const avatar = (u.user_metadata?.avatar_url as string) || 'https://github.com/shadcn.png';
      setUser({ name, email: (u.email as string) || '', avatar });
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="relative data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">SA</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0" side="right" align="end" sideOffset={4} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuLabel className="p-0">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">SA</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to User&apos;s Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export const AdminSidebar = memo(() => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.includes('#')) {
      e.preventDefault();
      const [basePath, hash] = href.split('#');
      const id = hash;

      if (pathname !== basePath) {
        router.push(href);
        return;
      }

      const element = document.getElementById(id);
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', href);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r overflow-x-hidden">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="focus-visible:ring-0 focus-visible:ring-offset-0">
              <Link href="/admin">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Super Admin</span>
                  <span className="truncate text-xs">Control Center</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard Collapsible Section */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="focus-visible:ring-0 focus-visible:ring-offset-0">
                      <LayoutDashboard className="shrink-0" />
                      <span className="truncate">Dashboard</span>
                      <ChevronDown className="ml-auto shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="space-y-0.5">
                      {dashboardItems.map((item) => (
                        <SidebarMenuItem key={`${item.href}-${item.title}`}>
                          <SidebarMenuButton asChild size="sm" className="focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-xs pl-8">
                            <Link
                              href={item.href}
                              onClick={(e) => handleLinkClick(e, item.href)}
                            >
                              <item.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Other Menu Items */}
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={`${item.href}-${item.title}`}>
                  <SidebarMenuButton asChild className="focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Link
                      href={item.href}
                      onClick={(e) => handleLinkClick(e, item.href)}
                    >
                      <item.icon className="shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AdminSidebarUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});
AdminSidebar.displayName = 'AdminSidebar';
