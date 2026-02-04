import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui';
import { useUIStore } from '@/lib/stores/ui-store';

export function Layout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Sidebar />
      
      <main 
        className={`
          transition-all duration-300
          ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
        `}
      >
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
}
