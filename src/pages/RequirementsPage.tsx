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
import { 
  requirementsService, 
  usersService, 
  companiesService, 
  contactsService, 
  applicationsService,
  customerAssessmentsService,
  missionsService,
  type DbRequirement, 
  type DbUser, 
  type DbCompany, 
  type DbContact,
  type DbApplication,
  type DbCustomerAssessment,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  // Create Mission modal
  const [isCreateMissionModalOpen, setIsCreateMissionModalOpen] = useState(false);
  const [missionRequirement, setMissionRequirement] = useState<DbRequirement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    contact_id: '',
    location: '',
    max_day_rate: '',
    description: '',
    status: 'active',
    clearance_required: 'none',
    engineering_discipline: 'software',
    manager_id: '',
  });

  // Set default manager to current user
  useEffect(() => {
    if (user?.id && !formData.manager_id) {
      setFormData(prev => ({ ...prev, manager_id: user.id }));
    }
  }, [user?.id]);

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

  // When contact is selected, auto-fill location from their company
  const handleContactSelect = (contactId: string) => {
    const contact = allContacts.find(c => c.id === contactId);
    const company = contact?.company || companies.find(c => c.id === contact?.company_id);
    setFormData(prev => ({
      ...prev,
      contact_id: contactId,
      location: company?.city || prev.location,
    }));
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillInputChange = (value: string) => {
    setSkillInput(value);
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      // Parse comma-separated values on Enter
      const parts = skillInput.split(',').map(s => s.trim()).filter(s => s);
      const newSkills = parts.filter(s => !skills.includes(s));
      if (newSkills.length > 0) {
        setSkills([...skills, ...newSkills]);
      }
      setSkillInput('');
    }
  };

  const handleSubmit = async () => {
    if (!formData.contact_id) {
      toast.error('Validation Error', 'Please select a contact');
      return;
    }
    if (!formData.title) {
      toast.error('Validation Error', 'Please enter a title for the requirement');
      return;
    }
    
    const selectedContact = allContacts.find(c => c.id === formData.contact_id);
    const selectedCompany = selectedContact?.company || companies.find(c => c.id === selectedContact?.company_id);
    
    setIsSubmitting(true);
    try {
      await requirementsService.create({
        title: formData.title,
        customer: selectedCompany?.name || '',
        company_id: selectedCompany?.id,
        contact_id: formData.contact_id,
        industry: selectedCompany?.industry || undefined,
        location: formData.location || undefined,
        max_day_rate: formData.max_day_rate ? parseInt(formData.max_day_rate) : undefined,
        description: formData.description || undefined,
        status: formData.status,
        clearance_required: formData.clearance_required,
        engineering_discipline: formData.engineering_discipline,
        manager_id: formData.manager_id || undefined,
        skills: skills.length > 0 ? skills : undefined,
        created_by: user?.id,
      });
      
      toast.success('Requirement Created', `"${formData.title}" has been created`);
      setIsModalOpen(false);
      setFormData({
        title: '',
        contact_id: '',
        location: '',
        max_day_rate: '',
        description: '',
        status: 'active',
        clearance_required: 'none',
        engineering_discipline: 'software',
        manager_id: user?.id || '',
      });
      setSkills([]);
      loadData();
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast.error('Error', 'Failed to create requirement');
    } finally {
      setIsSubmitting(false);
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

  const statusOptions = [
    { value: 'opportunity', label: 'Opportunity' },
    { value: 'active', label: 'Active' },
  ];

  const clearanceOptions = [
    { value: 'none', label: 'None Required' },
    { value: 'bpss', label: 'BPSS' },
    { value: 'ctc', label: 'CTC' },
    { value: 'sc', label: 'SC' },
    { value: 'esc', label: 'eSC' },
    { value: 'dv', label: 'DV' },
    { value: 'edv', label: 'eDV' },
    { value: 'doe_q', label: 'DOE Q (US)' },
    { value: 'doe_l', label: 'DOE L (US)' },
  ];

  const engineeringOptions = [
    { value: 'software', label: 'Software Engineering' },
    { value: 'electrical', label: 'Electrical Engineering' },
    { value: 'mechanical', label: 'Mechanical Engineering' },
    { value: 'civil', label: 'Civil Engineering' },
    { value: 'systems', label: 'Systems Engineering' },
    { value: 'nuclear', label: 'Nuclear Engineering' },
    { value: 'chemical', label: 'Chemical Engineering' },
    { value: 'structural', label: 'Structural Engineering' },
    { value: 'other', label: 'Other' },
  ];

  const managerOptions = [
    // Current user first as "Myself"
    ...(user ? [{ value: user.id, label: `${user.full_name || user.email} (Myself)` }] : []),
    // Other managers/recruiters
    ...users
      .filter(u => u.roles?.some((r: string) => ['recruiter', 'recruiter_manager', 'business_manager', 'business_director', 'admin', 'superadmin'].includes(r)))
      .filter(u => u.id !== user?.id) // Exclude current user (already shown as Myself)
      .map(u => ({ value: u.id, label: u.full_name })),
  ];

  // Format contacts for searchable select
  const contactSearchOptions = allContacts.map(c => {
    const companyName = c.company?.name || companies.find(co => co.id === c.company_id)?.name || '';
    return { 
      value: c.id, 
      label: `${c.first_name} ${c.last_name}`,
      sublabel: `${c.role ? c.role + ' - ' : ''}${companyName}`
    };
  });

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
                              setMissionRequirement(requirement);
                              setIsCreateMissionModalOpen(true);
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

      {/* New Requirement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Requirement"
        description="Create a new customer requirement"
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => handleFormChange('title', e.target.value)}
            placeholder="e.g., Senior Java Developer, DevOps Engineer"
          />

          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              label="Contact *"
              placeholder="Type to search contacts..."
              options={contactSearchOptions}
              value={formData.contact_id}
              onChange={(val) => handleContactSelect(val)}
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => handleFormChange('location', e.target.value)}
              placeholder="e.g., London, Remote"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Max Day Rate (£)"
              type="number"
              value={formData.max_day_rate}
              onChange={(e) => handleFormChange('max_day_rate', e.target.value)}
              placeholder="550"
            />
            <Select
              label="Status"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
            />
            <Select
              label="Engineering Discipline"
              options={engineeringOptions}
              value={formData.engineering_discipline}
              onChange={(e) => handleFormChange('engineering_discipline', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Clearance Required"
              options={clearanceOptions}
              value={formData.clearance_required}
              onChange={(e) => handleFormChange('clearance_required', e.target.value)}
            />
          </div>

          <Select
            label="Assigned Manager"
            options={managerOptions}
            value={formData.manager_id}
            onChange={(e) => handleFormChange('manager_id', e.target.value)}
          />

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              Required Skills
            </label>
            <Input
              placeholder="Type skill, use comma to separate, Enter to add..."
              value={skillInput}
              onChange={(e) => handleSkillInputChange(e.target.value)}
              onKeyDown={handleSkillKeyDown}
            />
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map(skill => (
                  <Badge key={skill} variant="cyan">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter(s => s !== skill))}
                      className="ml-1.5 hover:text-cyan-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Describe the requirement, project details, team structure..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleSubmit} isLoading={isSubmitting}>
              Create Requirement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Mission Modal */}
      {missionRequirement && (
        <CreateMissionModal
          isOpen={isCreateMissionModalOpen}
          onClose={() => {
            setIsCreateMissionModalOpen(false);
            setMissionRequirement(null);
          }}
          onSuccess={() => {
            loadData();
            navigate('/missions');
          }}
          requirement={missionRequirement}
          customer={missionRequirement.company as any}
          contact={missionRequirement.contact}
          winningCandidateId={missionRequirement.winning_candidate_id || undefined}
        />
      )}
    </div>
  );
}
