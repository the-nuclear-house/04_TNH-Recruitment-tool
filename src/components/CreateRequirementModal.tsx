import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import {
  Modal,
  Button,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  Badge,
  Avatar,
} from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  requirementsService,
  projectsService,
  usersService,
  companiesService,
  contactsService,
  type DbCompany,
  type DbContact,
  type DbUser,
  type DbProject,
} from '@/lib/services';

interface CreateRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-populated context (when creating from CustomersPage)
  company?: DbCompany;
  contact?: DbContact;
  // Pre-populated project (when creating from MissionsPage project)
  project?: DbProject;
  // All contacts (for RequirementsPage where we select from all)
  allContacts?: DbContact[];
  allCompanies?: DbCompany[];
}

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

const statusOptions = [
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'active', label: 'Active' },
];

export function CreateRequirementModal({
  isOpen,
  onClose,
  onSuccess,
  company: propCompany,
  contact: propContact,
  project: propProject,
  allContacts: propAllContacts,
  allCompanies: propAllCompanies,
}: CreateRequirementModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();

  // When project is provided, we lock everything
  const isProjectLocked = !!propProject;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [allContacts, setAllContacts] = useState<DbContact[]>([]);
  const [allCompanies, setAllCompanies] = useState<DbCompany[]>([]);
  const [contactProjects, setContactProjects] = useState<DbProject[]>([]);
  
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

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
    technical_director_id: '',
    project_type: 'T&M' as 'T&M' | 'Fixed_Price',
    project_id: '',
  });

  // Load users and contacts if not provided
  useEffect(() => {
    const loadData = async () => {
      try {
        const usersData = await usersService.getAll();
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }

      // If contacts not provided, load them
      if (!propAllContacts) {
        try {
          const contactsData = await contactsService.getAll();
          setAllContacts(contactsData);
        } catch (error) {
          console.error('Error loading contacts:', error);
        }
      }

      // If companies not provided, load them
      if (!propAllCompanies) {
        try {
          const companiesData = await companiesService.getAll();
          setAllCompanies(companiesData);
        } catch (error) {
          console.error('Error loading companies:', error);
        }
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, propAllContacts, propAllCompanies]);

  // Use provided data or loaded data
  const contacts = propAllContacts || allContacts;
  const companies = propAllCompanies || allCompanies;

  // Set default manager to current user
  useEffect(() => {
    if (user?.id && !formData.manager_id) {
      setFormData(prev => ({ ...prev, manager_id: user.id }));
    }
  }, [user?.id]);

  // If project is provided, set everything from it
  useEffect(() => {
    if (propProject && isOpen) {
      const projectContact = propProject.customer_contact;
      const projectCompany = projectContact?.company;
      setFormData(prev => ({
        ...prev,
        contact_id: projectContact?.id || '',
        location: projectCompany?.city || prev.location,
        project_type: propProject.type as 'T&M' | 'Fixed_Price',
        project_id: propProject.id,
      }));
    }
  }, [propProject, isOpen]);

  // If contact is provided (but not project), set it and load location
  useEffect(() => {
    if (propContact && !propProject && isOpen) {
      setFormData(prev => ({
        ...prev,
        contact_id: propContact.id,
        location: propCompany?.city || prev.location,
      }));
      // Load projects for this contact
      loadContactProjects(propContact.id);
    }
  }, [propContact, propCompany, propProject, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        contact_id: propContact?.id || propProject?.customer_contact?.id || '',
        location: propCompany?.city || propProject?.customer_contact?.company?.city || '',
        max_day_rate: '',
        description: '',
        status: 'active',
        clearance_required: 'none',
        engineering_discipline: 'software',
        manager_id: user?.id || '',
        technical_director_id: '',
        project_type: propProject?.type as 'T&M' | 'Fixed_Price' || 'T&M',
        project_id: propProject?.id || '',
      });
      setSkills([]);
      setSkillInput('');
      setContactProjects([]);
    }
  }, [isOpen, propContact, propCompany, propProject, user?.id]);

  const loadContactProjects = async (contactId: string) => {
    try {
      const projects = await projectsService.getActiveByContact(contactId);
      setContactProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
      setContactProjects([]);
    }
  };

  const handleContactSelect = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    const company = contact?.company || companies.find(c => c.id === contact?.company_id);
    setFormData(prev => ({
      ...prev,
      contact_id: contactId,
      location: company?.city || prev.location,
      project_id: '', // Reset project when contact changes
    }));

    if (contactId) {
      await loadContactProjects(contactId);
    } else {
      setContactProjects([]);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const parts = skillInput.split(',').map(s => s.trim()).filter(s => s);
      const newSkills = parts.filter(s => !skills.includes(s));
      if (newSkills.length > 0) {
        setSkills([...skills, ...newSkills]);
      }
      setSkillInput('');
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Validation Error', 'Please enter a title for the requirement');
      return;
    }
    if (!formData.contact_id) {
      toast.error('Validation Error', 'Please select a contact');
      return;
    }

    const selectedContact = contacts.find(c => c.id === formData.contact_id);
    const selectedCompany = propCompany || selectedContact?.company || companies.find(c => c.id === selectedContact?.company_id);

    // Determine if this is a bid (Fixed Price with no existing project)
    const isBid = formData.project_type === 'Fixed_Price' && !formData.project_id;

    // Validate Technical Director for bids
    if (isBid && !formData.technical_director_id) {
      toast.error('Validation Error', 'Technical Director is required for Fixed Price bids');
      return;
    }

    // Get business director (manager's reports_to)
    const manager = users.find(u => u.id === formData.manager_id);
    const businessDirectorId = manager?.reports_to || undefined;

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
        status: isBid ? 'opportunity' : formData.status,
        clearance_required: formData.clearance_required,
        engineering_discipline: formData.engineering_discipline,
        manager_id: formData.manager_id || undefined,
        technical_director_id: formData.technical_director_id || undefined,
        business_director_id: businessDirectorId,
        skills: skills.length > 0 ? skills : undefined,
        created_by: user?.id,
        // Project workflow fields
        project_type: formData.project_type,
        project_id: formData.project_id || undefined,
        is_bid: isBid,
        bid_status: isBid ? 'qualifying' : undefined,
      });

      const message = isBid
        ? `Bid "${formData.title}" has been created and is in qualifying stage`
        : `"${formData.title}" has been created`;
      toast.success(isBid ? 'Bid Created' : 'Requirement Created', message);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast.error('Error', 'Failed to create requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format contacts for searchable select
  const contactSearchOptions = contacts.map(c => {
    const companyName = c.company?.name || companies.find(co => co.id === c.company_id)?.name || '';
    return {
      value: c.id,
      label: `${c.first_name} ${c.last_name}`,
      sublabel: `${c.role ? c.role + ' - ' : ''}${companyName}`,
    };
  });

  // Format manager options
  const managerOptions = [
    // Current user first as "Myself"
    ...(user ? [{ value: user.id, label: `${user.full_name || user.email} (Myself)` }] : []),
    // Other managers/recruiters
    ...users
      .filter(u => u.roles?.some((r: string) => ['recruiter', 'recruiter_manager', 'business_manager', 'business_director', 'admin', 'superadmin'].includes(r)))
      .filter(u => u.id !== user?.id)
      .map(u => ({ value: u.id, label: u.full_name })),
  ];

  // Technical Director options (users with technical_director role)
  const technicalDirectorOptions = [
    { value: '', label: 'Select Technical Director...' },
    ...users
      .filter(u => u.roles?.some((r: string) => ['technical_director', 'admin', 'superadmin'].includes(r)))
      .map(u => ({ value: u.id, label: u.full_name })),
  ];

  // Determine if this is a bid (for form display)
  const isBid = formData.project_type === 'Fixed_Price' && !formData.project_id;

  // Determine selected company for display
  const selectedContact = contacts.find(c => c.id === formData.contact_id);
  const displayCompany = propCompany || propProject?.customer_contact?.company || selectedContact?.company || companies.find(c => c.id === selectedContact?.company_id);
  const displayContact = propContact || propProject?.customer_contact;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isProjectLocked ? "New Requirement for Project" : "New Requirement"}
      description={isProjectLocked
        ? `Create a staffing requirement for project "${propProject?.name}"`
        : propContact
          ? `Create a new requirement for ${propContact.first_name} ${propContact.last_name}`
          : propCompany
            ? `Create a new requirement for ${propCompany.name}`
            : 'Create a new customer requirement'}
      size="xl"
    >
      <div className="space-y-4">
        {/* Project info banner when creating from project */}
        {isProjectLocked && propProject && (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Project:</span>
              <span className="text-slate-900">{propProject.name}</span>
              <Badge variant="grey">{propProject.type === 'T&M' ? 'Time & Materials' : 'Fixed Price'}</Badge>
            </div>
            {displayCompany && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className="font-medium text-slate-700">Customer:</span>
                <span className="text-slate-900">{displayCompany.name}</span>
              </div>
            )}
            {displayContact && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className="font-medium text-slate-700">Contact:</span>
                <span className="text-slate-900">
                  {displayContact.first_name} {displayContact.last_name}
                  {displayContact.role && <span className="text-slate-500 ml-1">({displayContact.role})</span>}
                </span>
              </div>
            )}
          </div>
        )}

        <Input
          label="Title *"
          value={formData.title}
          onChange={(e) => handleFormChange('title', e.target.value)}
          placeholder="e.g., Senior Java Developer, DevOps Engineer"
        />

        {/* Company and Contact selection - hidden when project is locked */}
        {!isProjectLocked && (
          <div className="grid grid-cols-2 gap-4">
            {/* Company display - show if we have a locked company or selected contact */}
            {(propCompany || displayCompany) && (
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                  Company
                </label>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-brand-grey-200 bg-brand-grey-50">
                  {displayCompany?.logo_url ? (
                    <img src={displayCompany.logo_url} alt="" className="w-6 h-6 rounded object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-brand-grey-400" />
                  )}
                  <span className="font-medium text-brand-slate-900">{displayCompany?.name}</span>
                </div>
              </div>
            )}

            {/* Contact - locked or selectable */}
            {propContact ? (
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                  Contact
                </label>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-brand-grey-200 bg-brand-grey-50">
                  <Avatar name={`${propContact.first_name} ${propContact.last_name}`} size="sm" />
                  <div>
                    <span className="font-medium text-brand-slate-900">
                      {propContact.first_name} {propContact.last_name}
                    </span>
                    {propContact.role && (
                      <span className="text-sm text-brand-grey-500 ml-2">{propContact.role}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <SearchableSelect
              label="Contact *"
              placeholder="Type to search contacts..."
              options={contactSearchOptions}
              value={formData.contact_id}
              onChange={(val) => handleContactSelect(val)}
            />
          )}

          {/* Location - in same row if no company shown */}
          {!propCompany && !displayCompany && (
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => handleFormChange('location', e.target.value)}
              placeholder="e.g., London, Remote"
            />
          )}
        </div>
        )}

        {/* Location if company is shown (and not project locked) */}
        {!isProjectLocked && (propCompany || displayCompany) && (
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => handleFormChange('location', e.target.value)}
            placeholder="e.g., London, Remote"
          />
        )}

        {/* Location when project is locked */}
        {isProjectLocked && (
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => handleFormChange('location', e.target.value)}
            placeholder="e.g., London, Remote"
          />
        )}

        {/* Project Type and Existing Project Selection - hidden when project is locked */}
        {!isProjectLocked && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Project Type *"
              options={[
                { value: 'T&M', label: 'Time & Materials' },
                { value: 'Fixed_Price', label: 'Fixed Price / Work Package' },
              ]}
              value={formData.project_type}
              onChange={(e) => {
                handleFormChange('project_type', e.target.value);
                // Clear project selection if type changes and current project doesn't match
                const currentProject = contactProjects.find(p => p.id === formData.project_id);
                if (currentProject && currentProject.type !== e.target.value) {
                  handleFormChange('project_id', '');
                }
              }}
            />
            <Select
              label="Existing Project"
              options={[
                { value: '', label: 'New Project (will be created on win)' },
                ...contactProjects
                  .filter(p => p.type === formData.project_type)
                  .map(p => ({
                    value: p.id,
                    label: p.name,
                  })),
              ]}
              value={formData.project_id}
              onChange={(e) => handleFormChange('project_id', e.target.value)}
              disabled={!formData.contact_id}
            />
          </div>
        )}

        {/* Info banner based on selection - only when not project locked */}
        {!isProjectLocked && formData.project_type === 'Fixed_Price' && !formData.project_id && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Bid Process:</strong> This will create a bid that goes through qualifying → proposal → submitted stages.
            If won, a project will be created and you can then add staffing requirements.
          </div>
        )}
        {!isProjectLocked && formData.project_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Staffing Requirement:</strong> This requirement will be added to the existing project.
            On win, a mission will be created within that project.
          </div>
        )}
        {isProjectLocked && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Staffing Requirement:</strong> This requirement will be added to the project "{propProject?.name}".
            On win, a mission will be created within this project.
          </div>
        )}

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
            disabled={!isProjectLocked && formData.project_type === 'Fixed_Price' && !formData.project_id}
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
          <Select
            label="Assigned Manager"
            options={managerOptions}
            value={formData.manager_id}
            onChange={(e) => handleFormChange('manager_id', e.target.value)}
          />
        </div>

        {/* Technical Director (mandatory for bids) */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={isBid ? "Technical Director *" : "Technical Director"}
            options={technicalDirectorOptions}
            value={formData.technical_director_id}
            onChange={(e) => handleFormChange('technical_director_id', e.target.value)}
            error={isBid && !formData.technical_director_id ? 'Required for Fixed Price bids' : undefined}
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-brand-slate-700 mb-1">
            Required Skills
          </label>
          <Input
            placeholder="Type skill, use comma to separate, Enter to add..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
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
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmit} isLoading={isSubmitting}>
            Create Requirement
          </Button>
        </div>
      </div>
    </Modal>
  );
}
