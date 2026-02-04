import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea, SearchableSelect } from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  projectsService,
  requirementsService,
  companiesService,
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
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState(false);

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

  // Fresh company data (to ensure financial_scoring is up to date)
  const [freshCompany, setFreshCompany] = useState<DbCompany | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true); // Start as true to prevent flash of warning
  const [hasLoadedCompany, setHasLoadedCompany] = useState(false); // Track if we've completed initial load

  // Load users and fresh company data for dropdowns
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingCompany(true);
        setHasLoadedCompany(false);
        const usersData = await usersService.getAll();
        setUsers(usersData);
        
        // Load fresh company data to get latest financial_scoring
        // Use company.id if available, otherwise try requirement.company_id
        const companyId = company?.id || requirement?.company_id;
        console.log('Loading company with ID:', companyId);
        
        if (companyId) {
          const companyData = await companiesService.getById(companyId);
          console.log('Fetched company data:', companyData);
          console.log('Financial scoring value:', companyData?.financial_scoring);
          console.log('Parent company ID:', companyData?.parent_company_id);
          console.log('Parent company data (from join):', companyData?.parent_company);
          console.log('Parent financial scoring:', companyData?.parent_company?.financial_scoring);
          
          if (companyData) {
            setFreshCompany(companyData);
          }
        } else {
          console.log('No company ID found');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingCompany(false);
        setHasLoadedCompany(true);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, company?.id, requirement?.company_id]);

  // Use fresh company data if available, otherwise fall back to prop
  const actualCompany = freshCompany || company;
  
  // For financial scoring, use parent company's score if this is a subsidiary
  // Financial scoring is only set on parent companies, not subsidiaries
  // The parent_company is already included in the getById response
  const parentCompany = actualCompany?.parent_company || null;
  const companyForFinancialCheck = parentCompany || actualCompany;
  
  // Check if financial scoring is missing (null, undefined, or empty string)
  // Only check AFTER we've loaded the fresh company data to avoid false positives
  const hasFinancialScoringColumn = companyForFinancialCheck && 'financial_scoring' in companyForFinancialCheck;
  const missingFinancialScoring = hasLoadedCompany && hasFinancialScoringColumn && 
    (!companyForFinancialCheck?.financial_scoring || companyForFinancialCheck.financial_scoring.trim() === '');

  // Pre-fill form when requirement data is available
  useEffect(() => {
    if (isOpen && requirement) {
      const projectName = `${actualCompany?.name || requirement.customer || 'Project'} - ${requirement.title || 'Untitled'}`;
      setFormData(prev => ({
        ...prev,
        name: projectName,
        type: requirement.project_type || 'T&M',
        description: requirement.description || '',
        account_manager_id: requirement.manager_id || user?.id || '',
        technical_director_id: requirement.technical_director_id || '',
      }));
    }
  }, [isOpen, requirement, actualCompany, user?.id]);

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
      setFreshCompany(null);
      setHasLoadedCompany(false);
      setIsLoadingCompany(true); // Reset to true so warning doesn't flash on next open
      setValidationErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const errors: Record<string, boolean> = {};
    
    if (!formData.name.trim()) errors.name = true;
    if (!formData.start_date) errors.start_date = true;
    if (!formData.technical_director_id) errors.technical_director_id = true;
    if (!contact?.id) errors.contact = true;
    if (missingFinancialScoring) errors.financial_scoring = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setValidationErrors({});
    setIsLoading(true);
    try {
      const project = await projectsService.create({
        name: formData.name,
        description: formData.description || undefined,
        customer_contact_id: contact!.id,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        account_manager_id: formData.account_manager_id || undefined,
        technical_director_id: formData.technical_director_id || undefined,
        won_bid_requirement_id: requirement?.id,
        notes: formData.notes || undefined,
        created_by: user?.id,
      });

      // Update the requirement with the new project_id
      if (requirement?.id) {
        await requirementsService.update(requirement.id, {
          project_id: project.id,
        });
      }

      // Auto-activate company if it's a prospect (first project)
      if (actualCompany && actualCompany.status === 'prospect') {
        await companiesService.update(actualCompany.id, { status: 'active' });
      }

      toast.success('Project Created', `Project "${formData.name}" has been created. Now create a mission.`);
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

  // Technical Director options (mandatory)
  const technicalDirectorOptions = [
    { value: '', label: 'Select Technical Director...' },
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
      <div className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
        {/* Financial Scoring Warning */}
        {missingFinancialScoring && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${validationErrors.financial_scoring ? 'bg-red-50 border-2 border-red-500' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${validationErrors.financial_scoring ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className={`font-medium ${validationErrors.financial_scoring ? 'text-red-800' : 'text-amber-800'}`}>Financial Scoring Required</p>
              <p className={`text-sm mt-1 ${validationErrors.financial_scoring ? 'text-red-700' : 'text-amber-700'}`}>
                {parentCompany ? (
                  <>You need to add a financial scoring to the parent company ({parentCompany.name}) before creating a project for {actualCompany?.name}. Please go to the parent company profile and add a financial scoring first.</>
                ) : (
                  <>You need to add a financial scoring to {actualCompany?.name || 'this customer'} before creating a project. Please go to the customer profile and add a financial scoring first.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Read-only info from requirement */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
          <div>
            <p className="text-xs text-brand-grey-400 mb-1">Customer</p>
            <p className="text-sm font-medium text-brand-slate-900">{actualCompany?.name || requirement?.customer || 'N/A'}</p>
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
          onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); setValidationErrors(prev => ({ ...prev, name: false })); }}
          placeholder="e.g., Rolls Royce - SMR Safety Analysis"
          error={validationErrors.name ? 'Project name is required' : undefined}
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
            onChange={(e) => { setFormData(prev => ({ ...prev, start_date: e.target.value })); setValidationErrors(prev => ({ ...prev, start_date: false })); }}
            error={validationErrors.start_date ? 'Start date is required' : undefined}
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
            label="Technical Director *"
            options={technicalDirectorOptions}
            value={formData.technical_director_id}
            onChange={(e) => { setFormData(prev => ({ ...prev, technical_director_id: e.target.value })); setValidationErrors(prev => ({ ...prev, technical_director_id: false })); }}
            error={validationErrors.technical_director_id ? 'Technical Director is required' : undefined}
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
