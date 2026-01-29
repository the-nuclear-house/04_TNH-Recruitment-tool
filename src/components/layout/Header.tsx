import { Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input, Avatar } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-brand-grey-200/50 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side - Title or Search */}
      <div className="flex items-center gap-4">
        {title ? (
          <div>
            <h1 className="text-xl font-semibold text-brand-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-brand-grey-400">{subtitle}</p>
            )}
          </div>
        ) : (
          <div className="w-80">
            <Input
              isSearch
              placeholder="Search candidates, requirements..."
              onFocus={() => navigate('/search')}
              className="bg-brand-grey-100 border-transparent focus:bg-white"
            />
          </div>
        )}
      </div>

      {/* Right side - Actions and notifications */}
      <div className="flex items-center gap-4">
        {actions}
        
        <button className="relative p-2 rounded-lg text-brand-grey-400 hover:text-brand-slate-700 hover:bg-brand-grey-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange rounded-full" />
        </button>

        <div className="h-8 w-px bg-brand-grey-200" />

        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-brand-grey-100 transition-colors"
        >
          <Avatar 
            name={user?.full_name || 'User'} 
            src={user?.avatar_url}
            size="sm" 
          />
          <div className="text-left hidden lg:block">
            <p className="text-sm font-medium text-brand-slate-900">
              {user?.full_name}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
