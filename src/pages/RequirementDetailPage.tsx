import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
  Building2,
  Calendar,
  MapPin,
  PoundSterling,
  Shield,
  Briefcase,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  Select,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { usePermissions } from '@/hooks/usePermissions';
import { requirementsService, usersService } from '@/lib/services';

const statusConfig: Record<string, { label: string; colour: string; bgColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100' },
  opportunity: { label: 'Opportunity', colour: 'text-amber-700', bgColour: 'bg-amber-100' },
  won: { label: 'Won', colour: 'text-green-600', bgColour: 'bg-green-50' },
  lost: { label: 'Lost', colour: 'text-red-700', bgColour: 'bg-red-100' },
  cancelled: { label: 'Cancelled', colour: 'text-slate-500', bgColour: 'bg-slate-100' },
};

const clearanceLabels: Record<string, string> = {
  none: 'None Required',
  bpss: 'BPSS',
  ctc: 'CTC',
  sc: 'SC',
  esc: 'eSC',
  dv: 'DV',
  edv: 'eDV',
  doe_q: 'DOE Q',
  doe_l: 'DOE L',
};

const disciplineLabels: Record<string, string> = {
  electrical: 'Electrical Engineering',
  mechanical: 'Mechanical Engineering',
  civil: 'Civil Engineering',
  software: 'Software Engineering',
  systems: 'Systems Engineering',
  nuclear: 'Nuclear Engineering',
  chemical: 'Chemical Engineering',
  structural: 'Structural Engineering',
  other: 'Other',
};

export function RequirementDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const permissions = usePermissions();
  
  const [requirement, setRequirement] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reqData, usersData] = await Promise.all([
        requirementsService.getById(id!),
        usersService.getAll(),
      ]);
      
      setRequirement(reqData);
      if (reqData?.manager_id) {
        const mgr = usersData.find(u => u.id === reqData.manager_id);
        setManager(mgr);
      }
    } catch (error) {
      console.error('Error loading requirement:', error);
      toast.error('Error', 'Failed to load requirement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await requirementsService.update(id!, { status: newStatus });
      setRequirement((prev: any) => ({ ...prev, status: newStatus }));
      toast.success('Status Updated', `Requirement status changed to ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error', 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Loading..." />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading requirement...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="min-h-screen">
        <Header title="Requirement Not Found" />
        <div className="p-6">
          <EmptyState
            title="Requirement not found"
            description="The requirement you're looking for doesn't exist."
            action={{
              label: 'Back to Requirements',
              onClick: () => navigate('/requirements'),
            }}
          />
        </div>
      </div>
    );
  }

  const config = statusConfig[requirement.status] || statusConfig.opportunity;

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Header
        title="Requirement Details"
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/requirements')}
          >
            Back
          </Button>
        }
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className={requirement.status === 'active' ? 'bg-green-50' : ''}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-brand-slate-900">
                  {requirement.customer}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColour} ${config.colour}`}>
                  {config.label}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {requirement.fte_count} FTE{requirement.fte_count !== 1 ? 's' : ''}
                </span>
                {requirement.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {requirement.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {formatDate(requirement.created_at)}
                </span>
              </div>
            </div>

            {/* Quick Status Change - only for managers */}
            {permissions.canEditRequirements ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-brand-grey-400">Status:</span>
                <Select
                  options={[
                    { value: 'opportunity', label: 'Opportunity' },
                    { value: 'active', label: 'Active' },
                    { value: 'won', label: 'Won' },
                    { value: 'lost', label: 'Lost' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  value={requirement.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                />
              </div>
            ) : (
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColour} ${config.colour}`}>
                {config.label}
              </span>
            )}
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {requirement.industry && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Industry</p>
                    <p className="text-sm text-brand-slate-700 capitalize">{requirement.industry}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-brand-grey-400" />
                <div>
                  <p className="text-xs text-brand-grey-400">Engineering Discipline</p>
                  <p className="text-sm text-brand-slate-700">
                    {disciplineLabels[requirement.engineering_discipline] || requirement.engineering_discipline}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-brand-grey-400" />
                <div>
                  <p className="text-xs text-brand-grey-400">Clearance Required</p>
                  <p className="text-sm text-brand-slate-700">
                    {clearanceLabels[requirement.clearance_required] || 'None'}
                  </p>
                </div>
              </div>
              
              {requirement.max_day_rate && (
                <div className="flex items-center gap-3">
                  <PoundSterling className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Max Day Rate</p>
                    <p className="text-sm text-brand-slate-700">£{requirement.max_day_rate}/day</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Right Column */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {manager ? (
                <div>
                  <p className="text-xs text-brand-grey-400 mb-1">Assigned Manager</p>
                  <p className="text-sm font-medium text-brand-slate-700">{manager.full_name}</p>
                  <p className="text-xs text-brand-grey-400">{manager.email}</p>
                </div>
              ) : (
                <p className="text-sm text-brand-grey-400">No manager assigned</p>
              )}
            </div>
          </Card>
        </div>

        {/* Skills */}
        {requirement.skills && requirement.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {requirement.skills.map((skill: string) => (
                <Badge key={skill} variant="cyan">{skill}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Description */}
        {requirement.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <p className="text-brand-slate-600 leading-relaxed whitespace-pre-wrap">
              {requirement.description}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
