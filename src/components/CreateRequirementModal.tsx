import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import {
  Modal,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  Button,
  Badge,
  Avatar,
} from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  requirementsService,
  companiesService,
  contactsService,
  projectsService,
  usersService,
  type DbCompany,
  type DbContact,
  type DbProject,
  type DbUser,
} from '@/lib/services';

const clearanceOptions = [
  { value: 'none', label: 'None Required' },
  { value: 'bpss', label: 'BPSS' },
  { value: 'ctc', label: 'CTC' },
  { value: 'sc', label: 'SC' },
  { value: 'esc', label: 'eSC' },
  { value: 'dv', label: 'DV' },
  { value: 'edv', label: 'eDV' },
];

const disciplineOptions = [
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

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'opportunity', label: 'Opportunity' },
];

const projectTypeOptions = [
  { value: 'T&M', label: 'Time & Materials (T&M)' },
  { value: 'Fixed_Price', label: 'Fixed Price' },
];

interface CreateRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-fill options
  preselectedCompanyId?: string;
  preselectedContactId?: string;
  preselectedCompanyName?: string;
  preselectedContactName?: string;
  preselectedContactRole?: string;
}

export function CreateRequirementModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedCompanyId,
  preselectedContactId,
  preselectedCompanyName,
  preselectedContactName,
  preselectedContactRole,
}: CreateRequirementModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();

  // Data
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [managers, setManagers] = useState<DbUser[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: '',
    company_id: '',
    contact_id: '',
    location: '',
    max_day_rate: '',
    description: '',
    status: 'active',
    clearance_required: 'none',
    engineering_discipline: 'software',
    project_type: 'T&M',
    project_id: '',
    manager_id: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Pre-fill when preselected values change
  useEffect(() => {
    if (preselectedCompanyId) {
      setForm(prev => ({ ...prev, company_id: preselectedCompanyId }));
      loadContactsForCompany(preselectedCompanyId);
    }
    if (preselectedContactId) {
      setForm(prev => ({ ...prev, contact_id: preselectedContactId }));
    }
  }, [preselectedCompanyId, preselectedContactId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [companiesData, managersData] = await Promise.all([
        companiesService.getAll(),
        usersService.getAll(),
      ]);
      // Only non-parent companies (subsidiaries) can have requirements
      setCompanies(companiesData.filter(c => c.parent_company_id));
      setManagers(managersData.filter(u => 
        u.roles?.some((r: string) => ['business_manager', 'business_director', 'admin', 'superadmin'].includes(r))
      ));

      // If preselected company, load its contacts
      if (preselectedCompanyId) {
        await loadContactsForCompany(preselectedCompanyId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContactsForCompany = async (companyId: string) => {
    try {
      const contactsData = await contactsService.getByCompany(companyId);
      setContacts(contactsData);
      
      // Load active projects for this company's contacts
      if (form.contact_id) {
        await loadProjectsForContact(form.contact_id);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadProjectsForContact = async (contactId: string) => {
    try {
      const projectsData = await projectsService.getActiveByContact(contactId);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  const handleCompanyChange = async (companyId: string) => {
    setForm(prev => ({ ...prev, company_id: companyId, contact_id: '', project_id: '' }));
    setContacts([]);
    setProjects([]);
    
    if (companyId) {
      await loadContactsForCompany(companyId);
    }
  };

  const handleContactChange = async (contactId: string) => {
    setForm(prev => ({ ...prev, contact_id: contactId, project_id: '' }));
    setProjects([]);
    
    if (contactId) {
      await loadProjectsForContact(contactId);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim().replace(/,+$/, '');
      if (newSkill && !skills.includes(newSkill)) {
        setSkills([...skills, newSkill]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Validation Error', 'Title is required');
      return;
    }
    if (!form.contact_id) {
      toast.error('Validation Error', 'Contact is required');
      return;
    }

    const selectedContact = contacts.find(c => c.id === form.contact_id);
    const selectedCompany = companies.find(c => c.id === form.company_id);

    setIsSubmitting(true);
    try {
      // Determine if this is a bid (Fixed Price + no existing project)
      const isBid = form.project_type === 'Fixed_Price' && !form.project_id;

      await requirementsService.create({
        title: form.title,
        customer: selectedCompany?.name || '',
        industry: selectedCompany?.industry || '',
        contact_id: form.contact_id,
        manager_id: form.manager_id || user?.id,
        location: form.location || undefined,
        max_day_rate: form.max_day_rate ? parseInt(form.max_day_rate) : undefined,
        description: form.description || undefined,
        status: isBid ? 'opportunity' : form.status,
        clearance_required: form.clearance_required,
        engineering_discipline: form.engineering_discipline,
        skills: skills.length > 0 ? skills : undefined,
        created_by: user?.id,
        project_type: form.project_type as 'T&M' | 'Fixed_Price',
        project_id: form.project_id || undefined,
        is_bid: isBid,
        bid_status: isBid ? 'qualifying' : undefined,
      });

      toast.success('Requirement Created', `"${form.title}" has been created`);
      
      // Reset form
      setForm({
        title: '',
        company_id: preselectedCompanyId || '',
        contact_id: preselectedContactId || '',
        location: '',
        max_day_rate: '',
        description: '',
        status: 'active',
        clearance_required: 'none',
        engineering_discipline: 'software',
        project_type: 'T&M',
        project_id: '',
        manager_id: '',
      });
      setSkills([]);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating requirement:', error);
      toast.error('Error', error.message || 'Failed to create requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      title: '',
      company_id: '',
      contact_id: '',
      location: '',
      max_day_rate: '',
      description: '',
      status: 'active',
      clearance_required: 'none',
      engineering_discipline: 'software',
      project_type: 'T&M',
      project_id: '',
      manager_id: '',
    });
    setSkills([]);
    setSkillInput('');
    onClose();
  };

  // Show info based on project type selection
  const getProjectTypeInfo = () => {
    if (form.project_type === 'Fixed_Price' && !form.project_id) {
      return (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
          This will create a <strong>Bid</strong>. The requirement will enter the bid pipeline for qualification, proposal, and submission stages.
        </div>
      );
    }
    if (form.project_type === 'T&M' && !form.project_id) {
      return (
        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-sm text-cyan-700">
          This is a <strong>T&M staffing requirement</strong>. When won, a new project will be created automatically.
        </div>
      );
    }
    if (form.project_id) {
      return (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Adding to an <strong>existing project</strong>. This requirement will be linked to the selected project.
        </div>
      );
    }
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Requirement"
      description={preselectedContactName ? `Create a new requirement for ${preselectedContactName}` : 'Create a new staffing requirement'}
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Title */}
        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g. Senior Java Engineer"
        />

        {/* Company & Contact */}
        <div className="grid grid-cols-2 gap-4">
          {preselectedCompanyId && preselectedCompanyName ? (
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Company</label>
              <div className="flex items-center gap-2 p-3 bg-brand-grey-50 rounded-lg border border-brand-grey-200">
                <Building2 className="h-4 w-4 text-brand-grey-400" />
                <span className="text-brand-slate-900">{preselectedCompanyName}</span>
              </div>
            </div>
          ) : (
            <SearchableSelect
              label="Company *"
              options={companies.map(c => ({ value: c.id, label: c.name }))}
              value={form.company_id}
              onChange={handleCompanyChange}
              placeholder="Select company..."
            />
          )}

          {preselectedContactId && preselectedContactName ? (
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Contact</label>
              <div className="flex items-center gap-2 p-3 bg-brand-grey-50 rounded-lg border border-brand-grey-200">
                <Avatar name={preselectedContactName} size="sm" />
                <span className="text-brand-slate-900">{preselectedContactName}</span>
                {preselectedContactRole && (
                  <span className="text-brand-grey-400 text-sm">{preselectedContactRole}</span>
                )}
              </div>
            </div>
          ) : (
            <SearchableSelect
              label="Contact *"
              options={contacts.map(c => ({ 
                value: c.id, 
                label: `${c.first_name} ${c.last_name}${c.role ? ` (${c.role})` : ''}` 
              }))}
              value={form.contact_id}
              onChange={handleContactChange}
              placeholder={form.company_id ? "Select contact..." : "Select company first..."}
              disabled={!form.company_id}
            />
          )}
        </div>

        {/* Project Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Project Type *"
            options={projectTypeOptions}
            value={form.project_type}
            onChange={(e) => setForm(prev => ({ ...prev, project_type: e.target.value, project_id: '' }))}
          />

          {projects.length > 0 && (
            <Select
              label="Existing Project"
              options={[
                { value: '', label: 'New Project' },
                ...projects.map(p => ({ value: p.id, label: `${p.reference_id} - ${p.name}` }))
              ]}
              value={form.project_id}
              onChange={(e) => setForm(prev => ({ ...prev, project_id: e.target.value }))}
            />
          )}
        </div>

        {/* Project Type Info */}
        {getProjectTypeInfo()}

        {/* Location, Day Rate, Status */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder="e.g. Remote, London"
          />
          <Input
            label="Max Day Rate (£)"
            type="number"
            value={form.max_day_rate}
            onChange={(e) => setForm(prev => ({ ...prev, max_day_rate: e.target.value }))}
            placeholder="550"
          />
          <Select
            label="Status"
            options={statusOptions}
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
          />
        </div>

        {/* Engineering Discipline & Clearance */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Engineering Discipline"
            options={disciplineOptions}
            value={form.engineering_discipline}
            onChange={(e) => setForm(prev => ({ ...prev, engineering_discipline: e.target.value }))}
          />
          <Select
            label="Clearance Required"
            options={clearanceOptions}
            value={form.clearance_required}
            onChange={(e) => setForm(prev => ({ ...prev, clearance_required: e.target.value }))}
          />
        </div>

        {/* Manager */}
        <SearchableSelect
          label="Requirement Manager"
          options={[
            { value: '', label: 'Assign to me' },
            ...managers.map(m => ({ value: m.id, label: m.full_name }))
          ]}
          value={form.manager_id}
          onChange={(value) => setForm(prev => ({ ...prev, manager_id: value }))}
          placeholder="Assign to me"
        />

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-brand-slate-700 mb-1">Required Skills</label>
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleAddSkill}
            placeholder="Type skill, use comma to separate, Enter to add..."
          />
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map(skill => (
                <Badge key={skill} variant="cyan" className="flex items-center gap-1">
                  {skill}
                  <button onClick={() => handleRemoveSkill(skill)} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the requirement, project details, team structure..."
          rows={3}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button 
            variant="success" 
            onClick={handleSubmit} 
            isLoading={isSubmitting}
            disabled={!form.title || !form.contact_id}
          >
            Create Requirement
          </Button>
        </div>
      </div>
    </Modal>
  );
}
