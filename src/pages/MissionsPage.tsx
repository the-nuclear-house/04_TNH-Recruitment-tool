import { Header } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';
import { Rocket } from 'lucide-react';

export function MissionsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Missions" subtitle="Track consultant assignments and projects" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <EmptyState
            icon={<Rocket className="h-12 w-12" />}
            title="Missions Module"
            description="This module will track consultant assignments to client projects. Coming soon."
          />
        </Card>
      </div>
    </div>
  );
}
