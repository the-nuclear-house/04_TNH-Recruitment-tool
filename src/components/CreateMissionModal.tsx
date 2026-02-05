import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  missionsService, 
  consultantsService,
  requirementsService,
  companiesService,
  projectsService,
  type DbRequirement, 
  type DbCompany, 
  type DbContact,
  type DbConsultant,
  type DbCandidate,
  type DbProject,
} from '@/lib/services';

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-populated data from requirement
  requirement?: DbRequirement;
  company?: DbCompany;
  contact?: DbContact;
  candidate?: DbCandidate;
  winningCandidateId?: string;
  winningConsultantId?: string;  // Direct consultant ID (when consultant was assigned directly)
  // Project data - now required for mission creation
  project?: DbProject;
  projectId?: string;
}

export function CreateMissionModal({
  isOpen,
  onClose,
  onSuccess,
  requirement: propRequirement,
  company: propCompany,
  contact,
  candidate,
  winningCandidateId,
  winningConsultantId,
  project: propProject,
  projectId: propProjectId,
}: CreateMissionModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingConsultant, setIsCheckingConsultant] = useState(false);
  const [consultant, setConsultant] = useState<DbConsultant | null>(null);
  const [consultantError, setConsultantError] = useState<string | null>(null);
  
  // Resolved data (fetched if needed)
  const [requirement, setRequirement] = useState<DbRequirement | undefined>(propRequirement);
  const [company, setCompany] = useState<DbCompany | undefined>(propCompany);
  const [project, setProject] = useState<DbProject | undefined>(propProject);
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    sold_daily_rate: '',
    location: '',
    work_mode: 'hybrid' as 'full_onsite' | 'hybrid' | 'remote',
    notes: '',
  });

  // Fetch full requirement, company, and project data if only IDs provided
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      let resolvedRequirement = propRequirement;
      let resolvedProjectId = propProjectId;
      
      // Fetch full requirement if we only have an ID
      if (propRequirement?.id && !propRequirement.title) {
        try {
          const fullReq = await requirementsService.getById(propRequirement.id);
          if (fullReq) {
            resolvedRequirement = fullReq;
            setRequirement(fullReq);
            // If requirement has company, use it
            if (fullReq.company && !propCompany?.id) {
              setCompany(fullReq.company);
            }
            // If requirement has project_id, use it
            if (fullReq.project_id && !propProjectId) {
              resolvedProjectId = fullReq.project_id;
            }
          }
        } catch (error) {
          console.error('Error fetching requirement:', error);
        }
      } else {
        setRequirement(propRequirement);
        // Check if requirement has project_id
        if (propRequirement?.project_id && !propProjectId) {
          resolvedProjectId = propRequirement.project_id;
        }
      }
      
      // Use prop company if provided
      if (propCompany?.id) {
        setCompany(propCompany);
      } else if (resolvedRequirement?.company_id && !propCompany?.id) {
        // Fetch company if we have company_id but no company data
        try {
          const company = await companiesService.getById(resolvedRequirement.company_id);
          if (company) {
            setCompany(company);
          }
        } catch (error) {
          console.error('Error fetching company:', error);
        }
      }
      
      // Fetch project if we have a project ID
      if (propProject?.id) {
        setProject(propProject);
      } else if (resolvedProjectId) {
        try {
          const fetchedProject = await projectsService.getById(resolvedProjectId);
          if (fetchedProject) {
            setProject(fetchedProject);
          }
        } catch (error) {
          console.error('Error fetching project:', error);
        }
      }
    };
    
    fetchData();
  }, [isOpen, propRequirement, propCompany, propProject, propProjectId]);

  // Check if candidate has been converted to consultant, or use direct consultant ID
  useEffect(() => {
    const checkConsultant = async () => {
      if (!isOpen) return;
      
      setIsCheckingConsultant(true);
      setConsultantError(null);
      
      try {
        let foundConsultant: DbConsultant | null = null;
        
        // Path 1: Direct consultant ID (consultant was assigned directly to requirement)
        const directConsultantId = winningConsultantId;
        if (directConsultantId) {
          foundConsultant = await consultantsService.getById(directConsultantId);
        }
        
        // Path 2: Candidate-based lookup (candidate was converted to consultant)
        if (!foundConsultant) {
          const candidateId = winningCandidateId || candidate?.id;
          if (candidateId) {
            foundConsultant = await consultantsService.getByCandidateId(candidateId);
          }
        }
        
        if (foundConsultant) {
          setConsultant(foundConsultant);
          // Generate mission name: Customer - Project Name - Consultant
          const customerName = company?.name || requirement?.customer || 'Customer';
          const projectName = project?.name || requirement?.title || 'Project';
          const consultantName = `${foundConsultant.first_name} ${foundConsultant.last_name}`;
          const missionName = `${customerName} - ${projectName} - ${consultantName}`;
          
          // Pre-fill dates from project if available
          setFormData(prev => ({
            ...prev,
            name: missionName,
            location: company?.city || company?.address_line_1 || '',
            start_date: project?.start_date || prev.start_date,
            end_date: project?.end_date || prev.end_date,
          }));
        } else if (!winningConsultantId && !winningCandidateId && !candidate?.id) {
          setConsultantError('No candidate or consultant associated with this requirement');
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
  }, [isOpen, winningCandidateId, winningConsultantId, candidate?.id, requirement, company, project]);

  const handleSubmit = async () => {
    if (!consultant) {
      toast.error('Error', 'No consultant found. Transform the candidate to a consultant first.');
      return;
    }
    
    if (!company?.id) {
      toast.error('Error', 'No company associated with this requirement. Please ensure the company exists with the same name.');
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
    
    // Validate mission dates against project boundaries
    if (project) {
      const missionStart = new Date(formData.start_date);
      const missionEnd = new Date(formData.end_date);
      
      if (project.start_date) {
        const projectStart = new Date(project.start_date);
        if (missionStart < projectStart) {
          toast.error('Validation Error', `Mission start date cannot be before project start date (${project.start_date})`);
          return;
        }
      }
      
      if (project.end_date) {
        const projectEnd = new Date(project.end_date);
        if (missionEnd > projectEnd) {
          toast.error('Validation Error', `Mission end date cannot be after project end date (${project.end_date})`);
          return;
        }
      }
    }
    
    // Debug: log what we're sending
    console.log('Creating mission with:', {
      company_id: company?.id,
      company_name: company?.name,
      consultant_id: consultant.id,
      requirement_id: requirement?.id,
      project_id: project?.id,
    });
    
    setIsLoading(true);
    try {
      await missionsService.create({
        name: formData.name,
        requirement_id: requirement?.id,
        consultant_id: consultant.id,
        company_id: company?.id,
        contact_id: contact?.id,
        project_id: project?.id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        sold_daily_rate: parseFloat(formData.sold_daily_rate),
        location: formData.location || undefined,
        work_mode: formData.work_mode,
        notes: formData.notes || undefined,
        created_by: user?.id,
      });
      
      toast.success('Mission Created', `Mission ${formData.name} has been created`);
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
            <p className="text-sm text-red-700">{consultantError}</p>
          </div>
        )}
        
        {consultant && !consultantError && (
          <>
            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
              <div>
                <p className="text-xs text-brand-grey-400 mb-1">Customer</p>
                <p className="text-sm font-medium text-brand-slate-900">{company?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400 mb-1">Contact</p>
                <p className="text-sm font-medium text-brand-slate-900">
                  {contact ? `${contact.first_name} ${contact.last_name}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400 mb-1">Consultant</p>
                <p className="text-sm font-medium text-brand-slate-900">
                  {consultant.first_name} {consultant.last_name}
                  <span className="text-brand-grey-400 ml-1">({consultant.reference_id})</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400 mb-1">Project</p>
                <p className="text-sm font-medium text-brand-slate-900">
                  {project?.name || 'N/A'}
                  {project?.reference_id && <span className="text-brand-grey-400 ml-1">({project.reference_id})</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400 mb-1">Requirement</p>
                <p className="text-sm font-medium text-brand-slate-900">{requirement?.title || requirement?.reference_id || 'N/A'}</p>
              </div>
              {project && (project.start_date || project.end_date) && (
                <div>
                  <p className="text-xs text-brand-grey-400 mb-1">Project Dates</p>
                  <p className="text-sm font-medium text-brand-slate-900">
                    {project.start_date || '?'} to {project.end_date || '?'}
                  </p>
                </div>
              )}
            </div>

            {/* Project date warning */}
            {project && (project.start_date || project.end_date) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Mission dates must be within project boundaries: {project.start_date || 'No start'} to {project.end_date || 'No end'}</span>
              </div>
            )}

            {/* Mission Name */}
            <Input
              label="Mission Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Customer - Project - Consultant Name"
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={formData.start_date}
                min={project?.start_date || undefined}
                max={project?.end_date || undefined}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
              <Input
                label="End Date *"
                type="date"
                value={formData.end_date}
                min={project?.start_date || undefined}
                max={project?.end_date || undefined}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            {/* Commercial */}
            <Input
              label="Sold Daily Rate (£) *"
              type="number"
              value={formData.sold_daily_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, sold_daily_rate: e.target.value }))}
              placeholder="e.g. 650"
            />

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. London, Manchester"
              />
              <Select
                label="Work Mode *"
                options={workModeOptions}
                value={formData.work_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, work_mode: e.target.value as 'full_onsite' | 'hybrid' | 'remote' }))}
              />
            </div>

            {/* Notes */}
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this mission..."
              rows={2}
            />
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!!consultantError || isCheckingConsultant || !consultant}
          >
            Create Mission
          </Button>
        </div>
      </div>
    </Modal>
  );
}
