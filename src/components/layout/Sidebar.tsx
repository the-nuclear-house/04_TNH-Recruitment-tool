import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  FileText,
  Settings,
  Search,
  Building2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
  UserCheck,
  Building,
  UserCog,
  Rocket,
  Ticket,
  Clock,
  CalendarDays,
  Gavel,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar } from '@/components/ui';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const permissions = usePermissions();
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['SALES', 'RECRUITMENT', 'OPERATIONS', 'HR', 'ADMIN'])
  );

  // Permission checks
  const canViewCustomers = user?.roles?.some(r => [
    'superadmin', 'admin', 
    'business_director', 'business_manager'
  ].includes(r)) ?? false;

  const isHR = user?.roles?.some(r => ['hr', 'hr_manager', 'admin', 'superadmin'].includes(r)) ?? false;
  
  const isAdmin = user?.roles?.some(r => ['admin', 'superadmin'].includes(r)) ?? false;

  // Top-level items (always visible)
  const topItems: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  ];

  // Build navigation groups based on permissions
  const navGroups: NavGroup[] = [
    {
      name: 'SALES',
      items: [
        { name: 'Customers', href: '/customers', icon: Building },
        { name: 'Customer Meetings', href: '/customer-meetings', icon: UserCheck },
        { name: 'Requirements', href: '/requirements', icon: Briefcase },
        { name: 'Bid Process', href: '/bids', icon: Gavel },
      ].filter(() => canViewCustomers),
    },
    {
      name: 'RECRUITMENT',
      items: [
        { name: 'Candidates', href: '/candidates', icon: Users },
        { name: 'Interviews', href: '/interviews', icon: Calendar },
        { name: 'Contracts', href: '/contracts', icon: FileText },
      ].filter(() => permissions.canViewCandidates),
    },
    {
      name: 'OPERATIONS',
      items: [
        { name: 'Consultants', href: '/consultants', icon: UserCog },
        { name: 'Missions', href: '/missions', icon: Rocket },
        { name: 'Timesheets', href: '/timesheets', icon: Clock },
      ].filter(() => canViewCustomers || isHR),
    },
    {
      name: 'HR',
      items: [
        { name: 'Leave Requests', href: '/leave-requests', icon: CalendarDays },
        { name: 'Tickets', href: '/tickets', icon: Ticket },
      ].filter(() => isHR),
    },
    {
      name: 'ADMIN',
      items: [
        { name: 'Organisation', href: '/organisation', icon: Building2 },
        { name: 'Settings', href: '/settings', icon: Settings },
      ].filter(() => isAdmin),
    },
  ].filter(group => group.items.length > 0);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const isItemActive = (href: string) => {
    return location.pathname === href || 
      (href !== '/' && location.pathname.startsWith(href));
  };

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-brand-slate-900 
        flex flex-col transition-all duration-300 z-40
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-brand-slate-800">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="TNH" className="h-8 w-8" />
            <span className="text-white font-semibold">Control Room</span>
          </div>
        )}
        {sidebarCollapsed && (
          <img src="/logo.svg" alt="TNH" className="h-8 w-8 mx-auto" />
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`
            p-1.5 rounded-lg text-brand-grey-400 hover:text-white hover:bg-brand-slate-800 
            transition-colors
            ${sidebarCollapsed ? 'rotate-180 mx-auto mt-2' : ''}
          `}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {/* Top items (Dashboard, Search) */}
        <div className="space-y-1 mb-4">
          {topItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isItemActive(item.href)
                  ? 'bg-brand-cyan text-white' 
                  : 'text-brand-grey-400 hover:text-white hover:bg-brand-slate-800'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Grouped navigation */}
        {navGroups.map((group) => (
          <div key={group.name} className="mb-2">
            {/* Group header */}
            {!sidebarCollapsed ? (
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-brand-grey-500 uppercase tracking-wider hover:text-brand-grey-300 transition-colors"
              >
                <span>{group.name}</span>
                {expandedGroups.has(group.name) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="h-px bg-brand-slate-700 my-2 mx-2" />
            )}

            {/* Group items */}
            {(sidebarCollapsed || expandedGroups.has(group.name)) && (
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${isItemActive(item.href)
                        ? 'bg-brand-cyan text-white' 
                        : 'text-brand-grey-400 hover:text-white hover:bg-brand-slate-800'
                      }
                      ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-brand-slate-800">
        <div 
          className={`
            flex items-center gap-3 p-2 rounded-lg
            ${sidebarCollapsed ? 'justify-center' : ''}
          `}
        >
          <Avatar 
            name={user?.full_name || 'User'} 
            src={user?.avatar_url}
            size="sm" 
          />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name}
              </p>
              <p className="text-xs text-brand-grey-400 truncate capitalize">
                {user?.roles?.join(', ') || 'No role'}
              </p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-brand-grey-400 hover:text-white hover:bg-brand-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {sidebarCollapsed && (
          <button
            onClick={() => signOut()}
            className="w-full mt-2 p-2 rounded-lg text-brand-grey-400 hover:text-white hover:bg-brand-slate-800 transition-colors flex justify-center"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
