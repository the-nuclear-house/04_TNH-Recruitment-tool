import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Textarea } from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  missionsService, 
  consultantsService,
  projectsService,
  type DbRequirement, 
  type DbContact,
  type DbConsultant,
  type DbCandidate,
  type DbProject,
} from '@/lib/services';

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Required: project to create mission under
  projectId: string;
  projectName?: string;
  // Pre-populated data
  requirement?: DbRequirement;
  contact?: DbContact;
  candidate?: DbCandidate;
  winningCandidateId?: string;
  customerName?: string;
}

export function CreateMissionModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  projectName,
  requirement,
  contact,
  candidate,
  winningCandidateId,
  customerName,
}: CreateMissionModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingConsultant, setIsCheckingConsultant] = useState(false);
  const [consultant, setConsultant] = useState<DbConsultant | null>(null);
  const [consultantError, setConsultantError] = useState<string | null>(null);
  const [project, setProject] = useState<DbProject | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    sold_daily_rate: '',
    location: '',
    work_mode: 'hybrid' as 'full_onsite' | 'hybrid' | 'remote',
    notes: '',
  });

  // Load project details
  useEffect(() => {
    const loadProject = async () => {
      if (!isOpen || !projectId) return;
      
      try {
        const proj = await projectsService.getById(projectId);
        setProject(proj);
      } catch (error) {
        console.error('Error loading project:', error);
      }
    };
    
    loadProject();
  }, [isOpen, projectId]);

  // Check if candidate has been converted to consultant
  useEffect(() => {
    const checkConsultant = async () => {
      if (!isOpen) return;
      
      const candidateId = winningCandidateId || candidate?.id;
      
      if (!candidateId) {
        setConsultantError('No candidate associated with this requirement');
        return;
      }
      
      setIsCheckingConsultant(true);
      setConsultantError(null);
      
      try {
        const foundConsultant = await consultantsService.getByCandidateId(candidateId);
        if (foundConsultant) {
          setConsultant(foundConsultant);
          // Generate mission name: Customer - Project - Consultant
          const resolvedCustomerName = customerName || contact?.company?.name || 'Customer';
          const resolvedProjectName = projectName || project?.name || 'Project';
          const consultantName = `${foundConsultant.first_name} ${foundConsultant.last_name}`;
          const missionName = `${resolvedCustomerName} - ${resolvedProjectName} - ${consultantName}`;
          
          setFormData(prev => ({
            ...prev,
            name: missionName,
            location: requirement?.location || '',
            // Default dates from project if available
            start_date: project?.start_date || '',
            end_date: project?.end_date || '',
          }));
        } else {
          setConsultantError('You cannot create a mission with a candidate. Transform your candidate to a consultant first.');
        }
      } catch (error) {
        console.error('Error checking consultant:', error);
        setConsultantError('Failed to verify consultant status');
      } finally {
        setIsCheckingConsultant(false);
      }
    };
    
    checkConsultant();
  }, [isOpen, winningCandidateId, candidate?.id, requirement, project, projectName, customerName, contact]);

  // Validate mission dates against project boundaries
  const validateDates = (): string | null => {
    if (!formData.start_date || !formData.end_date) return null;
    if (!project?.start_date || !project?.end_date) return null;
    
    const missionStart = new Date(formData.start_date);
    const missionEnd = new Date(formData.end_date);
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.end_date);
    
    if (missionStart < projectStart) {
      return `Mission cannot start before project start date (${project.start_date})`;
    }
    if (missionEnd > projectEnd) {
      return `Mission cannot end after project end date (${project.end_date})`;
    }
    if (missionEnd < missionStart) {
      return 'End date cannot be before start date';
    }
    
    return null;
  };

  const dateError = validateDates();

  const handleSubmit = async () => {
    if (!consultant) {
      toast.error('Error', 'No consultant found. Transform the candidate to a consultant first.');
      return;
    }
    
    if (!projectId) {
      toast.error('Error', 'No project selected. Please create or select a project first.');
      return;
    }
    
    if (!formData.start_date) {
      toast.error('Error', 'Please select a start date');
      return;
    }
    
    if (!formData.end_date) {
      toast.error('Error', 'Please select an end date');
      return;
    }
    
    if (!formData.sold_daily_rate) {
      toast.error('Error', 'Please enter the sold daily rate');
      return;
    }

    // Validate dates against project
    const dateValidationError = validateDates();
    if (dateValidationError) {
      toast.error('Date Error', dateValidationError);
      return;
    }
    
    setIsLoading(true);
    try {
      await missionsService.create({
        name: formData.name,
        project_id: projectId,
        requirement_id: requirement?.id,
        consultant_id: consultant.id,
        company_id: project?.customer_contact?.company_id || contact?.company_id || '',
        contact_id: contact?.id || project?.customer_contact_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        sold_daily_rate: parseFloat(formData.sold_daily_rate),
        location: formData.location || undefined,
        work_mode: formData.work_mode,
        notes: formData.notes || undefined,
        created_by: user?.id,
      });
      
      toast.success('Mission Created', `Mission has been created successfully`);
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating mission:', error);
      toast.error('Error', error.message || 'Failed to create mission');
    } finally {
      setIsLoading(false);
    }
  };

  const workModeOptions = [
    { value: 'full_onsite', label: 'Full On-site' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'remote', label: 'Remote' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Mission"
      description="Create a new mission for the won requirement"
      size="lg"
    >
      <div className="space-y-6">
        {/* Consultant Check */}
        {isCheckingConsultant && (
          <div className="p-4 bg-brand-grey-50 rounded-lg text-center">
            <p className="text-brand-grey-500">Checking consultant status...</p>
          </div>
        )}
        
        {consultantError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{consultantError}</p>
          </div>
        )}
        
        {consultant && (
          <>
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
              <div>
                <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Consultant</p>
                <p className="font-medium text-brand-cyan">
                  {consultant.first_name} {consultant.last_name} ({consultant.reference_id})
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Requirement</p>
                <p className="font-medium text-brand-slate-900">{requirement?.title || 'N/A'}</p>
              </div>
              {project && (
                <>
                  <div className="col-span-2 border-t border-brand-grey-200 pt-3 mt-1">
                    <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Project</p>
                    <p className="font-medium text-brand-slate-900">
                      {project.reference_id} - {project.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-500 uppercase tracking-wider">Project Dates</p>
                    <p className="text-sm text-brand-grey-600">
                      {project.start_date} to {project.end_date}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Mission Name */}
            <Input
              label="Mission Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Customer - Project - Consultant"
            />

            {/* Dates with validation */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date *"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  min={project?.start_date || undefined}
                  max={project?.end_date || undefined}
                />
                <Input
                  label="End Date *"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  min={formData.start_date || project?.start_date || undefined}
                  max={project?.end_date || undefined}
                />
              </div>
              {dateError && (
                <p className="text-sm text-red-600">{dateError}</p>
              )}
              {project && (
                <p className="text-xs text-brand-grey-400">
                  Mission dates must be within project boundaries: {project.start_date} to {project.end_date}
                </p>
              )}
            </div>

            {/* Rate and Location */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Sold Daily Rate (£) *"
                type="number"
                value={formData.sold_daily_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, sold_daily_rate: e.target.value }))}
                placeholder="e.g. 650"
              />
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. London, Manchester"
              />
            </div>

            {/* Work Mode */}
            <Select
              label="Work Mode *"
              options={workModeOptions}
              value={formData.work_mode}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                work_mode: e.target.value as 'full_onsite' | 'hybrid' | 'remote' 
              }))}
            />

            {/* Notes */}
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this mission..."
              rows={3}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button 
                variant="success" 
                onClick={handleSubmit} 
                isLoading={isLoading}
                disabled={!consultant || !formData.start_date || !formData.end_date || !formData.sold_daily_rate || !!dateError}
              >
                Create Mission
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
