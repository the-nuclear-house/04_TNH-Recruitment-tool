import { Header } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';
import { Clock } from 'lucide-react';

export function TimesheetsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Timesheets" 
        subtitle="Consultant timesheet management and approvals"
      />
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="Coming Soon"
            description="The timesheet management feature is under development. Consultants will be able to submit monthly timesheets, and managers can approve them here."
          />
        </Card>
      </div>
    </div>
  );
}
