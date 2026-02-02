import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Textarea, SearchableSelect } from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  projectsService,
  usersService,
  type DbRequirement,
  type DbCompany,
  type DbContact,
  type DbUser,
} from '@/lib/services';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
  // Pre-populated data from requirement
  requirement?: DbRequirement;
  company?: DbCompany;
  contact?: DbContact;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  requirement,
  company,
  contact,
}: CreateProjectModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<DbUser[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'T&M' as 'T&M' | 'Fixed_Price',
    start_date: '',
    end_date: '',
    account_manager_id: '',
    technical_director_id: '',
    notes: '',
  });

  // Load users for dropdowns
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await usersService.getAll();
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Pre-fill form when requirement data is available
  useEffect(() => {
    if (isOpen && requirement) {
      const projectName = `${company?.name || requirement.customer || 'Project'} - ${requirement.title || 'Untitled'}`;
      setFormData(prev => ({
        ...prev,
        name: projectName,
        type: requirement.project_type || 'T&M',
        description: requirement.description || '',
        account_manager_id: requirement.manager_id || user?.id || '',
      }));
    }
  }, [isOpen, requirement, company, user?.id]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        type: 'T&M',
        start_date: '',
        end_date: '',
        account_manager_id: '',
        technical_director_id: '',
        notes: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Please enter a project name');
      return;
    }

    if (!contact?.id) {
      toast.error('Validation Error', 'No contact associated with this requirement');
      return;
    }

    if (!formData.start_date) {
      toast.error('Validation Error', 'Please select a start date');
      return;
    }

    setIsLoading(true);
    try {
      const project = await projectsService.create({
        name: formData.name,
        description: formData.description || undefined,
        customer_contact_id: contact.id,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        account_manager_id: formData.account_manager_id || undefined,
        technical_director_id: formData.technical_director_id || undefined,
        won_bid_requirement_id: requirement?.id,
        notes: formData.notes || undefined,
        created_by: user?.id,
      });

      toast.success('Project Created', `Project "${formData.name}" has been created`);
      onClose();
      onSuccess?.(project.id);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Error', error.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  // Manager options - business directors and managers
  const accountManagerOptions = [
    { value: '', label: 'Select Account Manager' },
    ...users
      .filter(u => u.roles?.some((r: string) => ['business_director', 'business_manager', 'admin', 'superadmin'].includes(r)))
      .map(u => ({ value: u.id, label: u.full_name })),
  ];

  // Technical Director options
  const technicalDirectorOptions = [
    { value: '', label: 'Select Technical Director (optional)' },
    ...users
      .filter(u => u.roles?.some((r: string) => ['technical_director', 'admin', 'superadmin'].includes(r)))
      .map(u => ({ value: u.id, label: u.full_name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Project"
      description="Create a new project for this won requirement"
      size="lg"
    >
      <div className="space-y-6">
        {/* Read-only info from requirement */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
          <div>
            <p className="text-xs text-brand-grey-400 mb-1">Customer</p>
            <p className="text-sm font-medium text-brand-slate-900">{company?.name || requirement?.customer || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-brand-grey-400 mb-1">Contact</p>
            <p className="text-sm font-medium text-brand-slate-900">
              {contact ? `${contact.first_name} ${contact.last_name}` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-grey-400 mb-1">Requirement</p>
            <p className="text-sm font-medium text-brand-slate-900">
              {requirement?.title || requirement?.reference_id || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-grey-400 mb-1">Project Type</p>
            <p className="text-sm font-medium text-brand-slate-900">
              {formData.type === 'T&M' ? 'Time & Materials' : 'Fixed Price'}
            </p>
          </div>
        </div>

        {/* Project Name */}
        <Input
          label="Project Name *"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Rolls Royce - SMR Safety Analysis"
        />

        {/* Project Type - pre-filled but editable */}
        <Select
          label="Project Type *"
          options={[
            { value: 'T&M', label: 'Time & Materials' },
            { value: 'Fixed_Price', label: 'Fixed Price / Work Package' },
          ]}
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'T&M' | 'Fixed_Price' }))}
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>

        {/* Ownership */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Account Manager"
            options={accountManagerOptions}
            value={formData.account_manager_id}
            onChange={(e) => setFormData(prev => ({ ...prev, account_manager_id: e.target.value }))}
          />
          <Select
            label="Technical Director"
            options={technicalDirectorOptions}
            value={formData.technical_director_id}
            onChange={(e) => setFormData(prev => ({ ...prev, technical_director_id: e.target.value }))}
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Project scope, deliverables, key milestones..."
          rows={3}
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional notes..."
          rows={2}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Create Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
