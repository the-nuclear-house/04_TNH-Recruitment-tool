import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Building2, Calendar, X, UserCheck, UserX, Trophy, TrendingUp, Rocket } from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  EmptyState,
  Select,
  SearchableSelect,
  Modal,
  Textarea,
  Avatar,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { CreateMissionModal } from '@/components/CreateMissionModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { CreateRequirementModal } from '@/components/CreateRequirementModal';
import { 
  requirementsService, 
  usersService, 
  companiesService, 
  contactsService, 
  applicationsService,
  customerAssessmentsService,
  missionsService,
  projectsService,
  type DbRequirement, 
  type DbUser, 
  type DbCompany, 
  type DbContact,
  type DbApplication,
  type DbCustomerAssessment,
  type DbProject,
} from '@/lib/services';

type RequirementStatus = 'active' | 'opportunity' | 'cancelled' | 'lost' | 'won';

const statusConfig: Record<RequirementStatus, { label: string; colour: string; bgColour: string; borderColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100', borderColour: 'border-l-green-500' },
  opportunity: { label: 'Opportunity', colour: 'text-amber-700', bgColour: 'bg-amber-100', borderColour: 'border-l-amber-500' },
  won: { label: 'Won', colour: 'text-green-600', bgColour: 'bg-green-50', borderColour: 'border-l-green-300' },
  lost: { label: 'Lost', colour: 'text-red-700', bgColour: 'bg-red-100', borderColour: 'border-l-red-500' },
  cancelled: { label: 'Cancelled', colour: 'text-slate-500', bgColour: 'bg-slate-100', borderColour: 'border-l-slate-400' },
};

const clearanceLabels: Record<string, string> = {
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

const disciplineLabels: Record<string, string> = {
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

export function RequirementsPage() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const toast = useToast();
  const { user } = useAuthStore();
  
  const [requirements, setRequirements] = useState<DbRequirement[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [allContacts, setAllContacts] = useState<DbContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Requirement stats: applications and assessments per requirement
  const [requirementStats, setRequirementStats] = useState<Record<string, {
    applications: DbApplication[];
    assessments: DbCustomerAssessment[];
    allocated: number;
    presented: number;
    nogo: number;
    go: number;
  }>>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create Mission modal
  const [isCreateMissionModalOpen, setIsCreateMissionModalOpen] = useState(false);
  const [missionRequirement, setMissionRequirement] = useState<DbRequirement | null>(null);
  
  // Create Project modal (shown before CreateMissionModal when requirement has no project)
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectRequirement, setProjectRequirement] = useState<DbRequirement | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reqs, usrs, comps, conts, allAssessments] = await Promise.all([
        requirementsService.getAll(),
        usersService.getAll(),
        companiesService.getAll(),
        contactsService.getAll(),
        customerAssessmentsService.getAll(),
      ]);
      setRequirements(reqs);
      setUsers(usrs);
      setCompanies(comps);
      setAllContacts(conts);
      
      // Load applications for each requirement and compute stats
      const stats: Record<string, any> = {};
      
      for (const req of reqs) {
        try {
          const apps = await applicationsService.getByRequirement(req.id);
          // Filter assessments for this requirement
          const reqAssessments = allAssessments.filter(a => 
            a.requirement_id === req.id || 
            (a.application?.requirement?.id === req.id)
          );
          
          const presented = reqAssessments.length;
          const nogo = reqAssessments.filter(a => a.outcome === 'nogo').length;
          const go = reqAssessments.filter(a => a.outcome === 'go').length;
          
          stats[req.id] = {
            applications: apps,
            assessments: reqAssessments,
            allocated: apps.length,
            presented,
            nogo,
            go,
          };
        } catch (e) {
          stats[req.id] = {
            applications: [],
            assessments: [],
            allocated: 0,
            presented: 0,
            nogo: 0,
            go: 0,
          };
        }
      }
      
      setRequirementStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      req.title?.toLowerCase().includes(query) ||
      req.customer?.toLowerCase().includes(query) ||
      req.location?.toLowerCase().includes(query) ||
      req.description?.toLowerCase().includes(query) ||
      req.reference_id?.toLowerCase().includes(query) ||
      req.skills?.some(skill => skill.toLowerCase().includes(query)) ||
      req.engineering_discipline?.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeRequirements = requirements.filter(r => r.status === 'active' || r.status === 'opportunity').length;

  return (
    <div className="min-h-screen">
      <Header
        title="Requirements"
        subtitle={`${requirements.length} requirements · ${activeRequirements} active`}
        actions={
          permissions.canCreateRequirements ? (
            <Button
              variant="success"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              New Requirement
            </Button>
          ) : null
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(['all', 'active', 'opportunity', 'won', 'lost'] as const).map(status => {
            const count = status === 'all' 
              ? requirements.length 
              : requirements.filter(r => r.status === status).length;
            const isSelected = statusFilter === status;
            
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`p-4 rounded-xl text-left transition-all ${
                  isSelected 
                    ? 'bg-brand-slate-900 text-white' 
                    : 'bg-white border border-brand-grey-200 hover:border-brand-grey-400'
                }`}
              >
                <p className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-brand-slate-900'}`}>
                  {count}
                </p>
                <p className={`text-sm ${isSelected ? 'text-white/70' : 'text-brand-grey-400'}`}>
                  {status === 'all' ? 'All' : statusConfig[status]?.label || status}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <Card>
          <Input
            isSearch
            placeholder="Search by customer or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Card>

        {/* Requirements List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading requirements...</div>
          </Card>
        ) : filteredRequirements.length === 0 ? (
          <EmptyState
            title="No requirements found"
            description={
              requirements.length === 0 
                ? (permissions.canCreateRequirements 
                    ? "Create your first requirement to get started." 
                    : "No requirements have been created yet.")
                : "Try adjusting your filters."
            }
            action={permissions.canCreateRequirements ? {
              label: 'New Requirement',
              onClick: () => setIsModalOpen(true),
            } : undefined}
          />
        ) : (
          <div className="grid gap-4">
            {filteredRequirements.map(requirement => {
              const status = requirement.status as RequirementStatus;
              const config = statusConfig[status] || statusConfig.opportunity;
              const stats = requirementStats[requirement.id] || { applications: [], assessments: [], allocated: 0, presented: 0, nogo: 0, go: 0 };
              
              // Calculate conversion rate: if requirement is won, rate = 100/presented, otherwise show progress
              const conversionRate = status === 'won' && stats.presented > 0 
                ? Math.round(100 / stats.presented) 
                : null;
              
              return (
                <Card
                  key={requirement.id}
                  hover
                  padding="none"
                  className={`cursor-pointer overflow-hidden border-l-4 ${config.borderColour} ${status === 'active' ? 'bg-green-50/50' : status === 'won' ? 'bg-green-50' : ''}`}
                  onClick={() => navigate(`/requirements/${requirement.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          {requirement.reference_id && (
                            <span className="text-xs font-mono text-brand-grey-400 bg-brand-grey-100 px-1.5 py-0.5 rounded">
                              {requirement.reference_id}
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-brand-slate-900 truncate">
                            {requirement.title || requirement.customer}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColour} ${config.colour} flex-shrink-0`}>
                            {config.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-brand-grey-500">
                            {requirement.customer}
                          </span>
                          {requirement.contact && (
                            <span className="text-sm text-brand-cyan">
                              → {requirement.contact.first_name} {requirement.contact.last_name}
                            </span>
                          )}
                          {/* Project Type Badge */}
                          {requirement.project_type && (
                            <Badge variant={requirement.project_type === 'Fixed_Price' ? 'purple' : 'cyan'}>
                              {requirement.project_type === 'Fixed_Price' ? 'Fixed Price' : 'T&M'}
                            </Badge>
                          )}
                          {/* Bid Status Badge */}
                          {requirement.is_bid && requirement.bid_status && (
                            <Badge variant="amber">
                              Bid: {requirement.bid_status.charAt(0).toUpperCase() + requirement.bid_status.slice(1)}
                            </Badge>
                          )}
                          {requirement.clearance_required && requirement.clearance_required !== 'none' && (
                            <Badge variant="orange">
                              {clearanceLabels[requirement.clearance_required] || requirement.clearance_required}
                            </Badge>
                          )}
                          <Badge variant="grey">
                            {disciplineLabels[requirement.engineering_discipline] || requirement.engineering_discipline}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                          {requirement.location && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {requirement.location}
                            </span>
                          )}
                          {requirement.max_day_rate && (
                            <span>£{requirement.max_day_rate}/day max</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(requirement.created_at)}
                          </span>
                        </div>

                        {requirement.skills && requirement.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {requirement.skills.slice(0, 5).map(skill => (
                              <Badge key={skill} variant="cyan" className="text-xs">{skill}</Badge>
                            ))}
                            {requirement.skills.length > 5 && (
                              <span className="text-xs text-brand-grey-400">+{requirement.skills.length - 5}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Allocated Candidates */}
                        {stats.allocated > 0 && (
                          <div className="mt-3 pt-3 border-t border-brand-grey-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-brand-grey-500 font-medium">Candidates:</span>
                              {stats.applications.slice(0, 4).map((app) => {
                                const assessment = stats.assessments.find(a => 
                                  a.candidate_id === app.candidate_id || 
                                  a.application?.candidate?.id === app.candidate_id
                                );
                                const isNogo = assessment?.outcome === 'nogo';
                                const isGo = assessment?.outcome === 'go';
                                const isWinner = requirement.winning_candidate_id === app.candidate_id;
                                
                                return (
                                  <div 
                                    key={app.id}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                                      isWinner 
                                        ? 'bg-green-100 text-green-700 border border-green-300' 
                                        : isNogo 
                                          ? 'bg-red-50 text-red-600 line-through' 
                                          : isGo
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-brand-grey-100 text-brand-grey-600'
                                    }`}
                                  >
                                    {isWinner && <Trophy className="h-3 w-3" />}
                                    {isNogo && <UserX className="h-3 w-3" />}
                                    {isGo && !isWinner && <UserCheck className="h-3 w-3" />}
                                    {app.candidate?.first_name} {app.candidate?.last_name?.charAt(0)}.
                                  </div>
                                );
                              })}
                              {stats.allocated > 4 && (
                                <span className="text-xs text-brand-grey-400">+{stats.allocated - 4} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right side: Stats */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {/* Days open for active/opportunity */}
                        {['active', 'opportunity'].includes(status) && (
                          <div className="text-right">
                            <span className="text-lg font-bold text-amber-600">
                              {getDaysOpen(requirement.created_at)}
                            </span>
                            <span className="text-xs text-brand-grey-400 ml-1">days</span>
                          </div>
                        )}
                        
                        {/* Conversion rate for won */}
                        {status === 'won' && conversionRate !== null && (
                          <div className="text-right px-3 py-2 bg-green-100 rounded-lg">
                            <div className="flex items-center gap-1 text-green-700">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-lg font-bold">{conversionRate}%</span>
                            </div>
                            <span className="text-xs text-green-600">
                              1/{stats.presented} presented
                            </span>
                          </div>
                        )}
                        
                        {/* Create Mission button for won requirements */}
                        {(status === 'won' || requirement.status === 'filled') && requirement.winning_candidate_id && (
                          <Button
                            variant="success"
                            size="sm"
                            leftIcon={<Rocket className="h-4 w-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              // If requirement has no project, create project first
                              if (!requirement.project_id) {
                                setProjectRequirement(requirement);
                                setIsCreateProjectModalOpen(true);
                              } else {
                                // Has project, go straight to mission
                                setMissionRequirement(requirement);
                                setIsCreateMissionModalOpen(true);
                              }
                            }}
                          >
                            Create Mission
                          </Button>
                        )}
                        
                        {/* Candidate stats */}
                        {stats.allocated > 0 && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1 text-brand-grey-500" title="Allocated">
                              <Users className="h-3.5 w-3.5" />
                              <span>{stats.allocated}</span>
                            </div>
                            {stats.presented > 0 && (
                              <div className="flex items-center gap-1 text-blue-600" title="Presented">
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>{stats.presented}</span>
                              </div>
                            )}
                            {stats.nogo > 0 && (
                              <div className="flex items-center gap-1 text-red-500" title="NOGO">
                                <UserX className="h-3.5 w-3.5" />
                                <span>{stats.nogo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Requirement Modal - using shared component */}
      <CreateRequirementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        allContacts={allContacts}
        allCompanies={companies}
      />

      {/* Create Project Modal - shown when requirement has no project */}
      {projectRequirement && (
        <CreateProjectModal
          isOpen={isCreateProjectModalOpen}
          onClose={() => {
            setIsCreateProjectModalOpen(false);
            setProjectRequirement(null);
            setCreatedProjectId(null);
          }}
          onSuccess={(projectId) => {
            // Project created, now open the mission modal
            setCreatedProjectId(projectId);
            setIsCreateProjectModalOpen(false);
            
            // Link the project to the requirement
            requirementsService.update(projectRequirement.id, { project_id: projectId });
            
            // Open mission modal with the new project
            setMissionRequirement({
              ...projectRequirement,
              project_id: projectId,
            });
            setIsCreateMissionModalOpen(true);
            loadData();
          }}
          requirement={projectRequirement}
          company={projectRequirement.company as any}
          contact={projectRequirement.contact}
        />
      )}

      {/* Create Mission Modal */}
      {missionRequirement && (
        <CreateMissionModal
          isOpen={isCreateMissionModalOpen}
          onClose={() => {
            setIsCreateMissionModalOpen(false);
            setMissionRequirement(null);
            setCreatedProjectId(null);
          }}
          onSuccess={() => {
            loadData();
            navigate('/missions');
          }}
          requirement={missionRequirement}
          company={missionRequirement.company as any}
          contact={missionRequirement.contact}
          winningCandidateId={missionRequirement.winning_candidate_id || undefined}
          projectId={missionRequirement.project_id || createdProjectId || undefined}
        />
      )}
    </div>
  );
}
