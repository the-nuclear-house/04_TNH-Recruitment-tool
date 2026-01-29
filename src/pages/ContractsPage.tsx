import { Header } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';
import { FileText } from 'lucide-react';

export function ContractsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Contracts"
        subtitle="Manage contract drafts and approvals"
      />
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No contracts yet"
            description="Contract drafts will appear here when candidates reach the offer stage."
          />
        </Card>
      </div>
    </div>
  );
}
