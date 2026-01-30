import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Building2, Calendar, X } from 'lucide-react';
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
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { requirementsService, usersService, companiesService, contactsService, type DbRequirement, type DbUser, type DbCompany, type DbContact } from '@/lib/services';

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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const [formData, setFormData] = useState({
    contact_id: '',
    industry: '',
    location: '',
    fte_count: '1',
    max_day_rate: '',
    description: '',
    status: 'opportunity',
    clearance_required: 'none',
    engineering_discipline: 'software',
    manager_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reqs, usrs, comps, conts] = await Promise.all([
        requirementsService.getAll(),
        usersService.getAll(),
        companiesService.getAll(),
        contactsService.getAll(),
      ]);
      setRequirements(reqs);
      setUsers(usrs);
      setCompanies(comps);
      setAllContacts(conts);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  // When contact is selected, auto-fill industry and location from their company
  const handleContactSelect = (contactId: string) => {
    const contact = allContacts.find(c => c.id === contactId);
    const company = contact?.company || companies.find(c => c.id === contact?.company_id);
    setFormData(prev => ({
      ...prev,
      contact_id: contactId,
      industry: company?.industry || prev.industry,
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
    
    const selectedContact = allContacts.find(c => c.id === formData.contact_id);
    const selectedCompany = selectedContact?.company || companies.find(c => c.id === selectedContact?.company_id);
    
    setIsSubmitting(true);
    try {
      await requirementsService.create({
        customer: selectedCompany?.name || '',
        company_id: selectedCompany?.id,
        contact_id: formData.contact_id,
        industry: formData.industry || undefined,
        location: formData.location || undefined,
        fte_count: parseInt(formData.fte_count) || 1,
        max_day_rate: formData.max_day_rate ? parseInt(formData.max_day_rate) : undefined,
        description: formData.description || undefined,
        status: formData.status,
        clearance_required: formData.clearance_required,
        engineering_discipline: formData.engineering_discipline,
        manager_id: formData.manager_id || undefined,
        skills: skills.length > 0 ? skills : undefined,
        created_by: user?.id,
      });
      
      toast.success('Requirement Created', `Requirement for ${selectedContact?.first_name} ${selectedContact?.last_name} has been created`);
      setIsModalOpen(false);
      setFormData({
        contact_id: '',
        industry: '',
        location: '',
        fte_count: '1',
        max_day_rate: '',
        description: '',
        status: 'opportunity',
        clearance_required: 'none',
        engineering_discipline: 'software',
        manager_id: '',
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
    const matchesSearch = !searchQuery ||
      req.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalFTE = requirements
    .filter(r => r.status === 'active' || r.status === 'opportunity')
    .reduce((sum, r) => sum + r.fte_count, 0);

  const industryOptions = [
    { value: '', label: 'Select Industry' },
    { value: 'defence', label: 'Defence' },
    { value: 'finance', label: 'Finance' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'government', label: 'Government' },
    { value: 'aerospace', label: 'Aerospace' },
    { value: 'nuclear', label: 'Nuclear' },
    { value: 'telecoms', label: 'Telecoms' },
    { value: 'energy', label: 'Energy' },
    { value: 'transport', label: 'Transport' },
    { value: 'technology', label: 'Technology' },
  ];

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
    { value: '', label: 'Select Manager (Optional)' },
    ...users.map(u => ({ value: u.id, label: u.full_name })),
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
        subtitle={`${requirements.length} requirements · ${totalFTE} FTEs across active opportunities`}
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
              
              return (
                <Card
                  key={requirement.id}
                  hover
                  padding="none"
                  className={`cursor-pointer overflow-hidden border-l-4 ${config.borderColour} ${status === 'active' ? 'bg-green-50' : ''}`}
                  onClick={() => navigate(`/requirements/${requirement.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-brand-slate-900">
                            {requirement.customer}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColour} ${config.colour}`}>
                            {config.label}
                          </span>
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
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {requirement.fte_count} FTE{requirement.fte_count !== 1 ? 's' : ''}
                          </span>
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
                      </div>

                      {['active', 'opportunity'].includes(status) && (
                        <div className="text-right">
                          <span className="text-lg font-bold text-amber-600">
                            {getDaysOpen(requirement.created_at)}
                          </span>
                          <span className="text-sm text-brand-grey-400 ml-1">days</span>
                        </div>
                      )}
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
              label="FTE Count *"
              type="number"
              min="1"
              value={formData.fte_count}
              onChange={(e) => handleFormChange('fte_count', e.target.value)}
            />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Engineering Discipline"
              options={engineeringOptions}
              value={formData.engineering_discipline}
              onChange={(e) => handleFormChange('engineering_discipline', e.target.value)}
            />
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
    </div>
  );
}
