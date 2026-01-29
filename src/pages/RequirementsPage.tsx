import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Building2, Calendar, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Avatar,
  EmptyState,
  Select,
} from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

// Types
type RequirementStatus = 'active' | 'opportunity' | 'cancelled' | 'lost' | 'won';

interface Requirement {
  id: string;
  customer: string;
  industry: string;
  location: string;
  fte_count: number;
  budget_min: number | null;
  budget_max: number | null;
  skills: string[];
  description: string | null;
  status: RequirementStatus;
  manager_id: string;
  manager_name: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// Mock managers for the dashboard
const mockManagers = [
  { id: 'user-manager-001', name: 'James Wilson', fte_count: 8 },
  { id: 'user-manager-002', name: 'Rebecca Taylor', fte_count: 5 },
  { id: 'user-manager-003', name: 'David Kumar', fte_count: 12 },
  { id: 'user-director-001', name: 'Sarah Thompson', fte_count: 3 },
];

// Mock requirements data
const mockRequirements: Requirement[] = [
  {
    id: 'req-1',
    customer: 'BAE Systems',
    industry: 'Defence',
    location: 'London',
    fte_count: 3,
    budget_min: 80000,
    budget_max: 100000,
    skills: ['Python', 'AWS', 'Security Clearance SC'],
    description: 'Looking for senior backend engineers to work on mission-critical defence systems.',
    status: 'active',
    manager_id: 'user-manager-001',
    manager_name: 'James Wilson',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2025-01-05T09:00:00Z',
    updated_at: '2025-01-20T14:30:00Z',
  },
  {
    id: 'req-2',
    customer: 'Barclays',
    industry: 'Finance',
    location: 'London',
    fte_count: 5,
    budget_min: 90000,
    budget_max: 120000,
    skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka'],
    description: 'Digital transformation project requiring experienced Java developers.',
    status: 'active',
    manager_id: 'user-manager-001',
    manager_name: 'James Wilson',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-18T11:00:00Z',
  },
  {
    id: 'req-3',
    customer: 'NHS Digital',
    industry: 'Healthcare',
    location: 'Leeds',
    fte_count: 2,
    budget_min: 70000,
    budget_max: 85000,
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    description: 'Frontend developers needed for patient portal modernisation.',
    status: 'opportunity',
    manager_id: 'user-manager-002',
    manager_name: 'Rebecca Taylor',
    created_by_id: 'user-manager-001',
    created_by_name: 'James Wilson',
    created_at: '2025-01-15T14:00:00Z',
    updated_at: '2025-01-15T14:00:00Z',
  },
  {
    id: 'req-4',
    customer: 'Rolls Royce',
    industry: 'Aerospace',
    location: 'Derby',
    fte_count: 4,
    budget_min: 85000,
    budget_max: 110000,
    skills: ['C++', 'Embedded Systems', 'Real-time Systems'],
    description: 'Embedded software engineers for engine control systems.',
    status: 'won',
    manager_id: 'user-manager-003',
    manager_name: 'David Kumar',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2025-01-10T16:00:00Z',
  },
  {
    id: 'req-5',
    customer: 'Vodafone',
    industry: 'Telecoms',
    location: 'Manchester',
    fte_count: 3,
    budget_min: 75000,
    budget_max: 95000,
    skills: ['Kubernetes', 'Terraform', 'Azure', 'DevOps'],
    description: 'Cloud infrastructure team expansion.',
    status: 'lost',
    manager_id: 'user-manager-002',
    manager_name: 'Rebecca Taylor',
    created_by_id: 'user-manager-002',
    created_by_name: 'Rebecca Taylor',
    created_at: '2024-11-20T11:00:00Z',
    updated_at: '2025-01-05T09:00:00Z',
  },
  {
    id: 'req-6',
    customer: 'GCHQ',
    industry: 'Government',
    location: 'Cheltenham',
    fte_count: 8,
    budget_min: 95000,
    budget_max: 130000,
    skills: ['Python', 'Machine Learning', 'Security Clearance DV'],
    description: 'Data scientists and ML engineers for classified projects.',
    status: 'active',
    manager_id: 'user-manager-003',
    manager_name: 'David Kumar',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2025-01-18T08:00:00Z',
    updated_at: '2025-01-22T10:00:00Z',
  },
];

const statusLabels: Record<RequirementStatus, string> = {
  active: 'Active',
  opportunity: 'Opportunity',
  cancelled: 'Cancelled',
  lost: 'Lost',
  won: 'Won',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getDaysOpen(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusBadgeVariant(status: RequirementStatus): 'green' | 'cyan' | 'orange' | 'gold' | 'grey' | 'red' {
  switch (status) {
    case 'active': return 'green';
    case 'opportunity': return 'cyan';
    case 'won': return 'gold';
    case 'lost': return 'grey';
    case 'cancelled': return 'red';
    default: return 'grey';
  }
}

export function RequirementsPage() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedManager, setSelectedManager] = useState<string | null>(null);

  // Calculate FTE counts per manager for active/opportunity requirements
  const managerFTEData = mockManagers.map(manager => {
    const managerReqs = mockRequirements.filter(
      r => r.manager_id === manager.id && ['active', 'opportunity'].includes(r.status)
    );
    const totalFTE = managerReqs.reduce((sum, r) => sum + r.fte_count, 0);
    return {
      ...manager,
      fte_count: totalFTE,
      requirement_count: managerReqs.length,
    };
  }).sort((a, b) => b.fte_count - a.fte_count);

  const maxFTE = Math.max(...managerFTEData.map(m => m.fte_count), 1);
  const totalFTE = managerFTEData.reduce((sum, m) => sum + m.fte_count, 0);

  // Filter requirements
  const filteredRequirements = mockRequirements.filter(req => {
    const matchesSearch = !searchQuery ||
      req.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || req.status === statusFilter;
    const matchesManager = !selectedManager || req.manager_id === selectedManager;
    return matchesSearch && matchesStatus && matchesManager;
  });

  return (
    <div className="min-h-screen">
      <Header
        title="Requirements"
        subtitle={`${mockRequirements.length} requirements · ${totalFTE} FTEs across active opportunities`}
        actions={
          permissions.canCreateRequirements ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/requirements/new')}
            >
              New Requirement
            </Button>
          ) : null
        }
      />

      <div className="p-6 space-y-6">
        {/* Manager FTE Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              FTEs by Manager
            </CardTitle>
            <span className="text-sm text-brand-grey-400">
              Active & Opportunity requirements only
            </span>
          </CardHeader>

          <div className="space-y-3">
            {managerFTEData.map(manager => (
              <button
                key={manager.id}
                onClick={() => setSelectedManager(selectedManager === manager.id ? null : manager.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedManager === manager.id
                    ? 'bg-brand-cyan/10 ring-2 ring-brand-cyan'
                    : 'hover:bg-brand-grey-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={manager.name} size="sm" />
                    <span className="font-medium text-brand-slate-900">{manager.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-brand-slate-900">{manager.fte_count}</span>
                    <span className="text-sm text-brand-grey-400 ml-1">FTEs</span>
                    <span className="text-sm text-brand-grey-400 ml-2">
                      ({manager.requirement_count} req{manager.requirement_count !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-brand-grey-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-cyan rounded-full transition-all"
                    style={{ width: `${(manager.fte_count / maxFTE) * 100}%` }}
                  />
                </div>
              </button>
            ))}
          </div>

          {selectedManager && (
            <div className="mt-4 pt-4 border-t border-brand-grey-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedManager(null)}
              >
                Clear filter
              </Button>
            </div>
          )}
        </Card>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                isSearch
                placeholder="Search customer, industry, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Filter by status"
            />
          </div>
        </Card>

        {/* Requirements List */}
        {filteredRequirements.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No requirements found"
            description={selectedManager ? "This manager has no matching requirements." : "Try adjusting your filters or create a new requirement."}
            action={
              permissions.canCreateRequirements
                ? {
                    label: 'Create Requirement',
                    onClick: () => navigate('/requirements/new'),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredRequirements.map(requirement => (
              <Card
                key={requirement.id}
                hover
                className="cursor-pointer"
                onClick={() => navigate(`/requirements/${requirement.id}`)}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-brand-slate-900">
                        {requirement.customer}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(requirement.status)}>
                        {statusLabels[requirement.status]}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {requirement.industry}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {requirement.fte_count} FTE{requirement.fte_count !== 1 ? 's' : ''}
                      </span>
                      <span>{requirement.location}</span>
                      {requirement.budget_min && requirement.budget_max && (
                        <span>
                          {formatCurrency(requirement.budget_min)} - {formatCurrency(requirement.budget_max)}
                        </span>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {requirement.skills.slice(0, 5).map(skill => (
                        <Badge key={skill} variant="grey" size="sm">
                          {skill}
                        </Badge>
                      ))}
                      {requirement.skills.length > 5 && (
                        <span className="text-xs text-brand-grey-400">
                          +{requirement.skills.length - 5} more
                        </span>
                      )}
                    </div>

                    {requirement.description && (
                      <p className="text-sm text-brand-slate-600 line-clamp-2">
                        {requirement.description}
                      </p>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-row md:flex-col items-start md:items-end gap-4 md:gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar name={requirement.manager_name} size="sm" />
                      <span className="text-brand-slate-700">{requirement.manager_name}</span>
                    </div>
                    <div className="text-brand-grey-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {formatDate(requirement.created_at)}
                      </div>
                      <div className="text-right">
                        {['active', 'opportunity'].includes(requirement.status) && (
                          <span className="text-brand-orange">
                            Open {getDaysOpen(requirement.created_at)} days
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
