import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  FileText, 
  StickyNote, 
  CheckSquare,
  Users,
  Settings,
  LogOut
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { title: 'لوحة التحكم', url: '/dashboard', icon: LayoutDashboard },
  { title: 'المواد', url: '/subjects', icon: BookOpen },
  { title: 'الجلسات', url: '/sessions', icon: Calendar },
  { title: 'الواجبات', url: '/assignments', icon: FileText },
  { title: 'الملاحظات', url: '/notes', icon: StickyNote },
  { title: 'المهام', url: '/todos', icon: CheckSquare },
];

const adminNavItems = [
  { title: 'المستخدمين', url: '/admin/users', icon: Users },
  { title: 'الإعدادات', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { profile, hasRole, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = hasRole('admin');

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar 
      className="border-l border-border bg-sidebar"
      side="right"
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg">منصة التعلم</span>
              <span className="text-xs text-muted-foreground">Education Platform</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="mx-4" />

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>
              الإدارة
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink 
                        to={item.url} 
                        end 
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="w-10 h-10 border-2 border-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'مستخدم'}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.points || 0} نقطة
              </p>
            </div>
          )}
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={signOut}
              className="flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
