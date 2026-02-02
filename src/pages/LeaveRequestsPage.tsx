import { Header } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';
import { CalendarDays } from 'lucide-react';

export function LeaveRequestsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Leave Requests" 
        subtitle="Manage annual leave, sick leave, and other absence requests"
      />
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<CalendarDays className="h-12 w-12" />}
            title="Coming Soon"
            description="The leave request management feature is under development. Consultants will be able to request leave, and managers can approve requests here."
          />
        </Card>
      </div>
    </div>
  );
}
