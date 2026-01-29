import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Input, Button } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';

export function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen">
      <Header 
        title="Settings"
        subtitle="Manage your account and application preferences"
      />
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          
          <div className="space-y-4">
            <Input
              label="Full Name"
              defaultValue={user?.full_name || ''}
              disabled
            />
            <Input
              label="Email"
              defaultValue={user?.email || ''}
              disabled
            />
            <p className="text-sm text-brand-grey-400">
              Your profile information is managed through Microsoft 365.
            </p>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-slate-900">Email notifications</p>
                <p className="text-sm text-brand-grey-400">Receive emails about interview updates</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-slate-900">Approval requests</p>
                <p className="text-sm text-brand-grey-400">Get notified when you need to approve contracts</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
