import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Building2,
  Users,
  MapPin,
  PoundSterling,
  Calendar,
  Clock,
  User,
  ChevronDown,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  Select,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/lib/stores/ui-store';

// Types
type RequirementStatus = 'active' | 'opportunity' | 'cancelled' | 'lost' | 'won';
type SecurityClearance = 'none' | 'bpss' | 'ctc' | 'sc' | 'esc' | 'dv' | 'edv' | 'doe_q' | 'doe_l';
type EngineeringDiscipline = 'electrical' | 'mechanical' | 'civil' | 'software' | 'systems' | 'nuclear' | 'chemical' | 'structural' | 'other';

interface Requirement {
  id: string;
  customer: string;
  industry: string;
  location: string;
  fte_count: number;
  day_rate_min: number | null;
  day_rate_max: number | null;
  skills: string[];
  description: string | null;
  status: RequirementStatus;
  clearance_required: SecurityClearance;
  engineering_discipline: EngineeringDiscipline;
  manager_id: string;
  manager_name: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// Mock data
const mockRequirement: Requirement = {
  id: 'req-1',
  customer: 'BAE Systems',
  industry: 'Defence',
  location: 'London',
  fte_count: 3,
  day_rate_min: 450,
  day_rate_max: 550,
  skills: ['Python', 'AWS', 'Kubernetes', 'Security Clearance SC', 'Microservices', 'Docker'],
  description: 'Looking for senior backend engineers to work on mission-critical defence systems. The role involves designing and implementing secure, scalable backend services for classified projects. Candidates must be eligible for SC clearance and have strong experience with cloud infrastructure.',
  status: 'active',
  clearance_required: 'sc',
  engineering_discipline: 'software',
  manager_id: 'user-manager-001',
  manager_name: 'James Wilson',
  created_by_id: 'user-director-001',
  created_by_name: 'Sarah Thompson',
  created_at: '2025-01-05T09:00:00Z',
  updated_at: '2025-01-20T14:30:00Z',
};

// Mock linked candidates
const mockLinkedCandidates = [
  { id: '1', name: 'Sarah Chen', status: 'director_interview', match_score: 92 },
  { id: '2', name: 'James Wilson', status: 'technical_interview', match_score: 85 },
];

const statusConfig: Record<RequirementStatus, { label: string; colour: string; bgColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100' },
  opportunity: { label: 'Opportunity', colour: 'text-amber-700', bgColour: 'bg-amber-100' },
  won: { label: 'Won', colour: 'text-green-600', bgColour: 'bg-green-50' },
  lost: { label: 'Lost', colour: 'text-red-700', bgColour: 'bg-red-100' },
  cancelled: { label: 'Cancelled', colour: 'text-slate-500', bgColour: 'bg-slate-100' },
};

const statusOptions = [
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'active', label: 'Active' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

const clearanceLabels: Record<SecurityClearance, string> = {
  none: 'None',
  bpss: 'BPSS',
  ctc: 'CTC',
  sc: 'SC',
  esc: 'eSC',
  dv: 'DV',
  edv: 'eDV',
  doe_q: 'DOE Q',
  doe_l: 'DOE L',
};

const disciplineLabels: Record<EngineeringDiscipline, string> = {
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  civil: 'Civil',
  software: 'Software',
  systems: 'Systems',
  nuclear: 'Nuclear',
  chemical: 'Chemical',
  structural: 'Structural',
  other: 'Other',
};

function getDaysOpen(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const candidateStatusLabels: Record<string, string> = {
  technical_interview: 'Technical Interview',
  director_interview: 'Director Interview',
  offer: 'Offer Stage',
};

export function RequirementDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const permissions = usePermissions();
  const toast = useToast();

  // In real app, fetch by id
  const [requirement, setRequirement] = useState(mockRequirement);
  const daysOpen = getDaysOpen(requirement.created_at);

  const handleStatusChange = (newStatus: string) => {
    setRequirement(prev => ({ ...prev, status: newStatus as RequirementStatus }));
    toast.success('Status Updated', `Requirement status changed to ${statusConfig[newStatus as RequirementStatus].label}`);
  };

  return (
    <div className={`min-h-screen ${requirement.status === 'active' ? 'bg-green-50' : 'bg-brand-grey-100'}`}>
      <Header
        title="Requirement Details"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/requirements')}
            >
              Back
            </Button>
            {permissions.canEditRequirements && (
              <Button
                variant="secondary"
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={() => navigate(`/requirements/${id}/edit`)}
              >
                Edit Details
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className={requirement.status === 'active' ? 'bg-green-50 border-green-200' : requirement.status === 'won' ? 'bg-green-50/50' : ''}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-brand-slate-900">
                  {requirement.customer}
                </h1>
                {/* Quick Status Change */}
                {permissions.canEditRequirements ? (
                  <select
                    value={requirement.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${statusConfig[requirement.status].bgColour} ${statusConfig[requirement.status].colour}`}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[requirement.status].bgColour} ${statusConfig[requirement.status].colour}`}>
                    {statusConfig[requirement.status].label}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {requirement.industry}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {requirement.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {requirement.fte_count} FTE{requirement.fte_count !== 1 ? 's' : ''}
                </span>
                {requirement.day_rate_min && requirement.day_rate_max && (
                  <span className="flex items-center gap-1">
                    <PoundSterling className="h-4 w-4" />
                    £{requirement.day_rate_min} - £{requirement.day_rate_max}/day
                  </span>
                )}
                {requirement.clearance_required !== 'none' && (
                  <Badge variant="orange">
                    {clearanceLabels[requirement.clearance_required]} Required
                  </Badge>
                )}
                <Badge variant="grey">
                  {disciplineLabels[requirement.engineering_discipline]}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {['active', 'opportunity'].includes(requirement.status) && (
                <div className="text-right">
                  <span className="text-2xl font-bold text-amber-600">{daysOpen}</span>
                  <span className="text-sm text-brand-grey-400 ml-1">days open</span>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="mt-6 pt-6 border-t border-brand-grey-200">
            <h3 className="text-sm font-medium text-brand-slate-700 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {requirement.skills.map(skill => (
                <Badge key={skill} variant="cyan">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Description and Candidates */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Linked Candidates */}
            <Card>
              <CardHeader>
                <CardTitle>Linked Candidates</CardTitle>
                <Button variant="secondary" size="sm" onClick={() => navigate('/search')}>
                  Find Candidates
                </Button>
              </CardHeader>

              {mockLinkedCandidates.length === 0 ? (
                <p className="text-brand-grey-400 text-sm">
                  No candidates linked to this requirement yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {mockLinkedCandidates.map(candidate => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-brand-grey-100/50 hover:bg-brand-grey-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={candidate.name} size="sm" />
                        <div>
                          <p className="font-medium text-brand-slate-900">{candidate.name}</p>
                          <p className="text-sm text-brand-grey-400">
                            {candidateStatusLabels[candidate.status] || candidate.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-brand-green">
                          {candidate.match_score}% match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Meta Info */}
          <div className="space-y-6">
            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-brand-grey-400 mb-1">Assigned Manager</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={requirement.manager_name} size="sm" />
                    <span className="font-medium text-brand-slate-900">{requirement.manager_name}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-brand-grey-400 mb-1">Created By</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={requirement.created_by_name} size="sm" />
                    <span className="font-medium text-brand-slate-900">{requirement.created_by_name}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-brand-grey-400">Created</p>
                    <p className="text-brand-slate-700">{formatDate(requirement.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-brand-grey-400">Last Updated</p>
                    <p className="text-brand-slate-700">{formatDate(requirement.updated_at)}</p>
                  </div>
                </div>
                {['active', 'opportunity'].includes(requirement.status) && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-brand-grey-400">Time Open</p>
                      <p className="text-brand-orange font-medium">{daysOpen} days</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-grey-400">Positions</span>
                  <span className="font-medium text-brand-slate-900">{requirement.fte_count} FTEs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-grey-400">Candidates Linked</span>
                  <span className="font-medium text-brand-slate-900">{mockLinkedCandidates.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-grey-400">In Interview</span>
                  <span className="font-medium text-brand-slate-900">{mockLinkedCandidates.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-grey-400">Offers Made</span>
                  <span className="font-medium text-brand-slate-900">0</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
