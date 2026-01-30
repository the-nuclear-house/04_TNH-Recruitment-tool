import { Header } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';
import { UserCog } from 'lucide-react';

export function ConsultantsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Consultants" subtitle="Manage your active consultants" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <EmptyState
            icon={<UserCog className="h-12 w-12" />}
            title="Consultants Module"
            description="This module will manage active consultants who have signed contracts. Coming soon."
          />
        </Card>
      </div>
    </div>
  );
}
