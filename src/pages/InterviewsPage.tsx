import { Header } from '@/components/layout';
import { Card, EmptyState, Button } from '@/components/ui';
import { Calendar, Plus } from 'lucide-react';

export function InterviewsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Interviews"
        subtitle="Manage scheduled interviews and feedback"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Schedule Interview
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No interviews scheduled"
            description="Schedule interviews with candidates to move them through your pipeline."
            action={{
              label: 'Schedule Interview',
              onClick: () => {},
            }}
          />
        </Card>
      </div>
    </div>
  );
}
