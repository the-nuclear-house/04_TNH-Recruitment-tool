import { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  Button,
} from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  projectsService,
  usersService,
  type DbUser,
  type DbContact,
  type DbRequirement,
} from '@/lib/services';

const projectTypeOptions = [
  { value: 'T&M', label: 'Time & Materials (T&M)' },
  { value: 'Fixed_Price', label: 'Fixed Price' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
];

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string, projectName: string) => void;
  // Pre-fill from requirement
  requirement?: DbRequirement;
  contact?: DbContact;
  customerName?: string;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  requirement,
  contact,
  customerName,
}: CreateProjectModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();

  const [managers, setManagers] = useState<DbUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'T&M' as 'T&M' | 'Fixed_Price',
    account_manager_id: '',
    technical_director_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  // Load managers on open
  useEffect(() => {
    if (isOpen) {
      loadManagers();
      // Pre-fill from requirement
      if (requirement) {
        setForm(prev => ({
          ...prev,
          name: `${customerName || 'Project'} - ${requirement.title}`,
          type: requirement.project_type || 'T&M',
          description: requirement.description || '',
        }));
      }
    }
  }, [isOpen, requirement, customerName]);

  const loadManagers = async () => {
    setIsLoading(true);
    try {
      const usersData = await usersService.getAll();
      setManagers(usersData.filter(u => 
        u.roles?.some((r: string) => ['business_manager', 'business_director', 'admin', 'superadmin'].includes(r))
      ));
    } catch (error) {
      console.error('Error loading managers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error('Validation Error', 'Project name is required');
      return;
    }
    if (!form.start_date) {
      toast.error('Validation Error', 'Start date is required');
      return;
    }
    if (!form.end_date) {
      toast.error('Validation Error', 'End date is required');
      return;
    }
    if (!contact?.id) {
      toast.error('Validation Error', 'Contact is required');
      return;
    }

    // Validate dates
    const startDate = new Date(form.start_date);
    const endDate = new Date(form.end_date);
    if (endDate < startDate) {
      toast.error('Validation Error', 'End date cannot be before start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const project = await projectsService.create({
        name: form.name,
        description: form.description || undefined,
        customer_contact_id: contact.id,
        account_manager_id: form.account_manager_id || user?.id,
        technical_director_id: form.technical_director_id || undefined,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes || undefined,
        created_by: user?.id,
        won_bid_requirement_id: requirement?.is_bid ? requirement.id : undefined,
      });

      toast.success('Project Created', `Project ${project.reference_id} has been created`);
      onSuccess(project.id, project.name);
      handleClose();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Error', error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: '',
      description: '',
      type: 'T&M',
      account_manager_id: '',
      technical_director_id: '',
      start_date: '',
      end_date: '',
      notes: '',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Project"
      description="Create a new project for the won requirement"
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Context Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
          <div>
            <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Customer</p>
            <p className="font-medium text-brand-slate-900">{customerName || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Contact</p>
            <p className="font-medium text-brand-slate-900">
              {contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown'}
            </p>
          </div>
          {requirement && (
            <>
              <div>
                <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Requirement</p>
                <p className="font-medium text-brand-slate-900">{requirement.title}</p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Type</p>
                <p className="font-medium text-brand-slate-900">
                  {requirement.project_type === 'Fixed_Price' ? 'Fixed Price' : 'Time & Materials'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Project Name */}
        <Input
          label="Project Name *"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Framatome - Digital Twin Platform"
        />

        {/* Project Type */}
        <Select
          label="Project Type *"
          options={projectTypeOptions}
          value={form.type}
          onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'T&M' | 'Fixed_Price' }))}
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
          />
          <Input
            label="End Date *"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>

        {/* Managers */}
        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect
            label="Account Manager"
            options={[
              { value: '', label: 'Assign to me' },
              ...managers.map(m => ({ value: m.id, label: m.full_name }))
            ]}
            value={form.account_manager_id}
            onChange={(value) => setForm(prev => ({ ...prev, account_manager_id: value }))}
            placeholder="Assign to me"
          />
          <SearchableSelect
            label="Technical Director"
            options={[
              { value: '', label: 'None' },
              ...managers.map(m => ({ value: m.id, label: m.full_name }))
            ]}
            value={form.technical_director_id}
            onChange={(value) => setForm(prev => ({ ...prev, technical_director_id: value }))}
            placeholder="Select..."
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Project scope, objectives..."
          rows={3}
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Internal notes..."
          rows={2}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button 
            variant="success" 
            onClick={handleSubmit} 
            isLoading={isSubmitting}
            disabled={!form.name || !form.start_date || !form.end_date}
          >
            Create Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
