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
  LogOut,
  UserCheck,
  Building,
  UserCog,
  Rocket,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar } from '@/components/ui';

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const permissions = usePermissions();

  // Customer assessments and Customers only visible to Manager, Director, Admin
  const canViewCustomers = user?.roles?.some(r => ['admin', 'director', 'manager'].includes(r)) ?? false;

  // Build navigation based on permissions
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, show: true },
    { name: 'Customers', href: '/customers', icon: Building, show: canViewCustomers },
    { name: 'Candidates', href: '/candidates', icon: Users, show: permissions.canViewCandidates },
    { name: 'Requirements', href: '/requirements', icon: Briefcase, show: permissions.canViewRequirements },
    { name: 'Interviews', href: '/interviews', icon: Calendar, show: permissions.canViewInterviews },
    { name: 'Client Meetings', href: '/client-meetings', icon: UserCheck, show: canViewCustomers },
    { name: 'Contracts', href: '/contracts', icon: FileText, show: permissions.canViewContracts },
    { name: 'Consultants', href: '/consultants', icon: UserCog, show: canViewCustomers },
    { name: 'Missions', href: '/missions', icon: Rocket, show: canViewCustomers },
  ].filter(item => item.show);

  const bottomNavigation = [
    { name: 'Organisation', href: '/organisation', icon: Building2, show: permissions.canViewOrganisation },
    { name: 'Settings', href: '/settings', icon: Settings, show: true },
  ].filter(item => item.show);

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
            <span className="text-white font-semibold">RecruitHub</span>
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
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
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
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="py-4 px-3 space-y-1 border-t border-brand-slate-800">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-brand-slate-800 text-white' 
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
          );
        })}
      </div>

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
