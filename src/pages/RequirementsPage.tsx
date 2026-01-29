import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Building2, Calendar, BarChart3, LayoutGrid } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

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

// Mock managers
const mockManagers = [
  { id: 'user-manager-001', name: 'James Wilson' },
  { id: 'user-manager-002', name: 'Rebecca Taylor' },
  { id: 'user-manager-003', name: 'David Kumar' },
  { id: 'user-director-001', name: 'Sarah Thompson' },
];

// Mock requirements data
const mockRequirements: Requirement[] = [
  {
    id: 'req-1',
    customer: 'BAE Systems',
    industry: 'Defence',
    location: 'London',
    fte_count: 3,
    day_rate_min: 450,
    day_rate_max: 550,
    skills: ['Python', 'AWS', 'Security Clearance SC'],
    description: 'Looking for senior backend engineers to work on mission-critical defence systems.',
    status: 'active',
    clearance_required: 'sc',
    engineering_discipline: 'software',
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
    day_rate_min: 500,
    day_rate_max: 650,
    skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka'],
    description: 'Digital transformation project requiring experienced Java developers.',
    status: 'active',
    clearance_required: 'bpss',
    engineering_discipline: 'software',
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
    day_rate_min: 400,
    day_rate_max: 480,
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    description: 'Frontend developers needed for patient portal modernisation.',
    status: 'opportunity',
    clearance_required: 'none',
    engineering_discipline: 'software',
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
    day_rate_min: 480,
    day_rate_max: 580,
    skills: ['C++', 'Embedded Systems', 'Real-time Systems'],
    description: 'Embedded software engineers for engine control systems.',
    status: 'won',
    clearance_required: 'sc',
    engineering_discipline: 'systems',
    manager_id: 'user-manager-003',
    manager_name: 'David Kumar',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2025-01-10T16:00:00Z',
  },
  {
    id: 'req-5',
    customer: 'EDF Energy',
    industry: 'Nuclear',
    location: 'Bristol',
    fte_count: 6,
    day_rate_min: 550,
    day_rate_max: 700,
    skills: ['Nuclear Safety', 'Systems Engineering', 'Regulatory'],
    description: 'Nuclear safety engineers for Hinkley Point C project.',
    status: 'active',
    clearance_required: 'dv',
    engineering_discipline: 'nuclear',
    manager_id: 'user-manager-003',
    manager_name: 'David Kumar',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2025-01-12T08:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'req-6',
    customer: 'Vodafone',
    industry: 'Telecoms',
    location: 'Manchester',
    fte_count: 3,
    day_rate_min: 420,
    day_rate_max: 520,
    skills: ['Kubernetes', 'Terraform', 'Azure', 'DevOps'],
    description: 'Cloud infrastructure team expansion.',
    status: 'lost',
    clearance_required: 'none',
    engineering_discipline: 'software',
    manager_id: 'user-manager-002',
    manager_name: 'Rebecca Taylor',
    created_by_id: 'user-manager-002',
    created_by_name: 'Rebecca Taylor',
    created_at: '2024-11-20T11:00:00Z',
    updated_at: '2025-01-05T09:00:00Z',
  },
  {
    id: 'req-7',
    customer: 'US DOE',
    industry: 'Government',
    location: 'Remote (US)',
    fte_count: 2,
    day_rate_min: 600,
    day_rate_max: 800,
    skills: ['Nuclear Engineering', 'Safety Analysis', 'DOE Regulations'],
    description: 'Nuclear engineers for DOE facility assessments.',
    status: 'opportunity',
    clearance_required: 'doe_q',
    engineering_discipline: 'nuclear',
    manager_id: 'user-director-001',
    manager_name: 'Sarah Thompson',
    created_by_id: 'user-director-001',
    created_by_name: 'Sarah Thompson',
    created_at: '2025-01-20T09:00:00Z',
    updated_at: '2025-01-20T09:00:00Z',
  },
  {
    id: 'req-8',
    customer: 'Network Rail',
    industry: 'Transport',
    location: 'Birmingham',
    fte_count: 4,
    day_rate_min: 400,
    day_rate_max: 500,
    skills: ['Electrical Design', 'Power Systems', 'Rail Standards'],
    description: 'Electrical engineers for signalling upgrades.',
    status: 'active',
    clearance_required: 'bpss',
    engineering_discipline: 'electrical',
    manager_id: 'user-manager-002',
    manager_name: 'Rebecca Taylor',
    created_by_id: 'user-manager-001',
    created_by_name: 'James Wilson',
    created_at: '2025-01-08T10:00:00Z',
    updated_at: '2025-01-19T14:00:00Z',
  },
];

const statusConfig: Record<RequirementStatus, { label: string; colour: string; bgColour: string; borderColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100', borderColour: 'border-l-green-500' },
  opportunity: { label: 'Opportunity', colour: 'text-cyan-700', bgColour: 'bg-cyan-100', borderColour: 'border-l-brand-cyan' },
  won: { label: 'Won', colour: 'text-amber-700', bgColour: 'bg-amber-100', borderColour: 'border-l-brand-gold' },
  lost: { label: 'Lost', colour: 'text-slate-500', bgColour: 'bg-slate-100', borderColour: 'border-l-slate-400' },
  cancelled: { label: 'Cancelled', colour: 'text-red-700', bgColour: 'bg-red-100', borderColour: 'border-l-red-500' },
};

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

const disciplineOptions = [
  { value: '', label: 'All Disciplines' },
  ...Object.entries(disciplineLabels).map(([value, label]) => ({ value, label })),
];

function getDaysOpen(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Vertical Bar Chart Component
function BarChart({ 
  data, 
  targetLine = 5,
  onBarClick,
  selectedId 
}: { 
  data: { id: string; name: string; value: number; count: number }[];
  targetLine?: number;
  onBarClick: (id: string | null) => void;
  selectedId: string | null;
}) {
  const maxValue = Math.max(...data.map(d => d.value), targetLine + 2);
  const chartHeight = 200;

  return (
    <div className="relative">
      {/* Chart area */}
      <div className="flex items-end justify-around gap-2" style={{ height: chartHeight }}>
        {data.map(item => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const isSelected = selectedId === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onBarClick(isSelected ? null : item.id)}
              className={`
                flex flex-col items-center gap-1 flex-1 max-w-[80px] transition-all
                ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
              `}
            >
              <span className="text-sm font-bold text-brand-slate-900">{item.value}</span>
              <div 
                className={`
                  w-full rounded-t-lg transition-all
                  ${isSelected ? 'bg-brand-cyan' : 'bg-brand-cyan/70 hover:bg-brand-cyan'}
                `}
                style={{ height: barHeight }}
              />
              <span className="text-xs text-brand-grey-400 truncate w-full text-center mt-1">
                {item.name.split(' ')[0]}
              </span>
              <span className="text-xs text-brand-grey-400">
                ({item.count} req{item.count !== 1 ? 's' : ''})
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Target line */}
      <div 
        className="absolute left-0 right-0 border-t-2 border-dashed border-red-500 pointer-events-none"
        style={{ bottom: (targetLine / maxValue) * chartHeight + 40 }}
      >
        <span className="absolute -top-5 right-0 text-xs text-red-500 font-medium">
          Target: {targetLine} FTEs
        </span>
      </div>
    </div>
  );
}

// Treemap Component for Customer View
function Treemap({ 
  data,
  onItemClick,
  selectedId
}: { 
  data: { id: string; name: string; value: number; count: number }[];
  onItemClick: (id: string | null) => void;
  selectedId: string | null;
}) {
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const colours = [
    'bg-brand-cyan', 'bg-brand-green', 'bg-brand-gold', 'bg-brand-orange',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];

  return (
    <div className="grid grid-cols-4 gap-2 h-48">
      {data.map((item, index) => {
        const percentage = (item.value / totalValue) * 100;
        const isSelected = selectedId === item.id;
        // Calculate grid span based on value
        const span = item.value >= 6 ? 2 : 1;
        
        return (
          <button
            key={item.id}
            onClick={() => onItemClick(isSelected ? null : item.id)}
            className={`
              ${colours[index % colours.length]} 
              rounded-lg p-3 flex flex-col justify-between text-white text-left
              transition-all
              ${isSelected ? 'ring-4 ring-brand-slate-900 ring-offset-2' : 'hover:opacity-90'}
              ${span === 2 ? 'col-span-2' : 'col-span-1'}
            `}
          >
            <span className="font-medium text-sm truncate">{item.name}</span>
            <div>
              <span className="text-2xl font-bold">{item.value}</span>
              <span className="text-sm opacity-80 ml-1">FTEs</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function RequirementsPage() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequirementStatus | 'all'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<'manager' | 'customer'>('manager');

  // Calculate FTE counts per manager for active/opportunity requirements
  const managerFTEData = mockManagers.map(manager => {
    const managerReqs = mockRequirements.filter(
      r => r.manager_id === manager.id && ['active', 'opportunity'].includes(r.status)
    );
    return {
      id: manager.id,
      name: manager.name,
      value: managerReqs.reduce((sum, r) => sum + r.fte_count, 0),
      count: managerReqs.length,
    };
  }).sort((a, b) => b.value - a.value);

  // Calculate FTE counts per customer for active/opportunity requirements
  const customerFTEData = Array.from(
    mockRequirements
      .filter(r => ['active', 'opportunity'].includes(r.status))
      .reduce((acc, r) => {
        if (!acc.has(r.customer)) {
          acc.set(r.customer, { id: r.customer, name: r.customer, value: 0, count: 0 });
        }
        const current = acc.get(r.customer)!;
        current.value += r.fte_count;
        current.count += 1;
        return acc;
      }, new Map<string, { id: string; name: string; value: number; count: number }>())
      .values()
  ).sort((a, b) => b.value - a.value);

  const totalFTE = managerFTEData.reduce((sum, m) => sum + m.value, 0);

  // Filter requirements
  const filteredRequirements = mockRequirements.filter(req => {
    const matchesSearch = !searchQuery ||
      req.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesDiscipline = !disciplineFilter || req.engineering_discipline === disciplineFilter;
    const matchesManager = !selectedManager || req.manager_id === selectedManager;
    const matchesCustomer = !selectedCustomer || req.customer === selectedCustomer;
    return matchesSearch && matchesStatus && matchesDiscipline && matchesManager && matchesCustomer;
  });

  // Status counts for pills
  const statusCounts = mockRequirements.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        {/* Dashboard Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <CardTitle>FTEs Overview</CardTitle>
              {/* Toggle buttons */}
              <div className="flex rounded-lg border border-brand-grey-200 overflow-hidden">
                <button
                  onClick={() => { setDashboardView('manager'); setSelectedCustomer(null); }}
                  className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    dashboardView === 'manager' 
                      ? 'bg-brand-cyan text-white' 
                      : 'bg-white text-brand-grey-400 hover:text-brand-slate-700'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  By Manager
                </button>
                <button
                  onClick={() => { setDashboardView('customer'); setSelectedManager(null); }}
                  className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    dashboardView === 'customer' 
                      ? 'bg-brand-cyan text-white' 
                      : 'bg-white text-brand-grey-400 hover:text-brand-slate-700'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  By Customer
                </button>
              </div>
            </div>
            <span className="text-sm text-brand-grey-400">
              Active & Opportunity only
            </span>
          </CardHeader>

          {dashboardView === 'manager' ? (
            <BarChart
              data={managerFTEData}
              targetLine={5}
              onBarClick={setSelectedManager}
              selectedId={selectedManager}
            />
          ) : (
            <Treemap
              data={customerFTEData}
              onItemClick={setSelectedCustomer}
              selectedId={selectedCustomer}
            />
          )}

          {(selectedManager || selectedCustomer) && (
            <div className="mt-4 pt-4 border-t border-brand-grey-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedManager(null); setSelectedCustomer(null); }}
              >
                Clear filter
              </Button>
            </div>
          )}
        </Card>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-brand-slate-900 text-white'
                : 'bg-white border border-brand-grey-200 text-brand-grey-400 hover:border-brand-grey-400'
            }`}
          >
            All ({mockRequirements.length})
          </button>
          {(Object.keys(statusConfig) as RequirementStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                statusFilter === status
                  ? `${statusConfig[status].bgColour} ${statusConfig[status].colour}`
                  : 'bg-white border border-brand-grey-200 text-brand-grey-400 hover:border-brand-grey-400'
              }`}
            >
              {statusConfig[status].label} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>

        {/* Search and Discipline Filter */}
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
              options={disciplineOptions}
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              placeholder="Engineering Discipline"
            />
          </div>
        </Card>

        {/* Requirements List */}
        {filteredRequirements.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No requirements found"
            description="Try adjusting your filters or create a new requirement."
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
                padding="none"
                className={`cursor-pointer overflow-hidden border-l-4 ${statusConfig[requirement.status].borderColour}`}
                onClick={() => navigate(`/requirements/${requirement.id}`)}
              >
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-brand-slate-900">
                          {requirement.customer}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[requirement.status].bgColour} ${statusConfig[requirement.status].colour}`}>
                          {statusConfig[requirement.status].label}
                        </span>
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
                        {requirement.day_rate_min && requirement.day_rate_max && (
                          <span>
                            £{requirement.day_rate_min} - £{requirement.day_rate_max}/day
                          </span>
                        )}
                        {requirement.clearance_required !== 'none' && (
                          <Badge variant="orange" size="sm">
                            {clearanceLabels[requirement.clearance_required]}
                          </Badge>
                        )}
                        <Badge variant="grey" size="sm">
                          {disciplineLabels[requirement.engineering_discipline]}
                        </Badge>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {requirement.skills.slice(0, 5).map(skill => (
                          <Badge key={skill} variant="cyan" size="sm">
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
                          {formatDate(requirement.created_at)}
                        </div>
                        <div className="text-right">
                          {['active', 'opportunity'].includes(requirement.status) && (
                            <span className="text-brand-orange font-medium">
                              {getDaysOpen(requirement.created_at)}d open
                            </span>
                          )}
                        </div>
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
