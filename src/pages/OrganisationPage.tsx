import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Avatar, Badge } from '@/components/ui';
import { Plus, Users, Building2 } from 'lucide-react';

export function OrganisationPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Organisation"
        subtitle="Manage team members, business units, and approval workflows"
      />
      <div className="p-6 space-y-6">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Add Member
            </Button>
          </CardHeader>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-grey-100/50">
              <div className="flex items-center gap-3">
                <Avatar name="Demo User" size="md" />
                <div>
                  <p className="font-medium text-brand-slate-900">Demo User</p>
                  <p className="text-sm text-brand-grey-400">demo@company.com</p>
                </div>
              </div>
              <Badge variant="cyan">Admin</Badge>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-brand-grey-400">
            Add team members to grant them access to the recruitment system. You can assign roles and permissions to control what each member can do.
          </p>
        </Card>

        {/* Business Units */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Units
            </CardTitle>
            <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
              Add Unit
            </Button>
          </CardHeader>
          
          <p className="text-sm text-brand-grey-400">
            No business units configured yet. Create business units to organise your team and define approval workflows.
          </p>
        </Card>
      </div>
    </div>
  );
}
