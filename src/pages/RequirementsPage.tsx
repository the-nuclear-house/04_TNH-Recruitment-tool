import { Header } from '@/components/layout';
import { Card, EmptyState, Button } from '@/components/ui';
import { Briefcase, Plus } from 'lucide-react';

export function RequirementsPage() {
  
  return (
    <div className="min-h-screen">
      <Header 
        title="Requirements"
        subtitle="Manage customer requirements and open positions"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Requirement
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No requirements yet"
            description="Create your first requirement to start matching candidates to customer needs."
            action={{
              label: 'Create Requirement',
              onClick: () => {},
            }}
          />
        </Card>
      </div>
    </div>
  );
}
