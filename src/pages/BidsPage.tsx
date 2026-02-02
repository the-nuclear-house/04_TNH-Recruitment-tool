import { Header } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';
import { Gavel } from 'lucide-react';

export function BidsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Bid Process" 
        subtitle="Manage fixed-price bids and proposals"
      />
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<Gavel className="h-12 w-12" />}
            title="Coming Soon"
            description="The bid process management feature is under development. This will allow you to track fixed-price bids from qualification through to award."
          />
        </Card>
      </div>
    </div>
  );
}
