import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Textarea } from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  missionsService, 
  consultantsService,
  requirementsService,
  customersService,
  type DbRequirement, 
  type DbCustomer, 
  type DbContact,
  type DbConsultant,
  type DbCandidate,
} from '@/lib/services';

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-populated data from requirement
  requirement?: DbRequirement;
  customer?: DbCustomer;
  contact?: DbContact;
  candidate?: DbCandidate;
  winningCandidateId?: string;
}

export function CreateMissionModal({
  isOpen,
  onClose,
  onSuccess,
  requirement: propRequirement,
  customer: propCustomer,
  contact,
  candidate,
  winningCandidateId,
}: CreateMissionModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingConsultant, setIsCheckingConsultant] = useState(false);
  const [consultant, setConsultant] = useState<DbConsultant | null>(null);
  const [consultantError, setConsultantError] = useState<string | null>(null);
  
  // Resolved data (fetched if needed)
  const [requirement, setRequirement] = useState<DbRequirement | undefined>(propRequirement);
  const [customer, setCustomer] = useState<DbCustomer | undefined>(propCustomer);
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    sold_daily_rate: '',
    location: '',
    work_mode: 'hybrid' as 'full_onsite' | 'hybrid' | 'remote',
    notes: '',
  });

  // Fetch full requirement and customer data if only IDs provided
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      let resolvedRequirement = propRequirement;
      
      // Fetch full requirement if we only have an ID
      if (propRequirement?.id && !propRequirement.title) {
        try {
          const fullReq = await requirementsService.getById(propRequirement.id);
          if (fullReq) {
            resolvedRequirement = fullReq;
            setRequirement(fullReq);
          }
        } catch (error) {
          console.error('Error fetching requirement:', error);
        }
      } else {
        setRequirement(propRequirement);
      }
      
      // Find customer from customers table (not companies table)
      // The customer name on the requirement should match a customer in the customers table
      if (!propCustomer?.id || !propCustomer?.name) {
        try {
          const allCustomers = await customersService.getAll();
          // Match by name from requirement
          const customerName = resolvedRequirement?.customer || resolvedRequirement?.company?.name;
          if (customerName) {
            const matchingCustomer = allCustomers.find(c => 
              c.name.toLowerCase() === customerName.toLowerCase()
            );
            if (matchingCustomer) {
              setCustomer(matchingCustomer);
            }
          }
        } catch (error) {
          console.error('Error fetching customers:', error);
        }
      } else {
        setCustomer(propCustomer);
      }
    };
    
    fetchData();
  }, [isOpen, propRequirement, propCustomer]);

  // Check if candidate has been converted to consultant
  useEffect(() => {
    const checkConsultant = async () => {
      if (!isOpen) return;
      
      // Determine which candidate ID to use
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
          // Generate mission name
          const skillsPart = requirement?.skills?.slice(0, 3).join(', ') || requirement?.title || 'Mission';
          const missionName = `${customer?.name || 'Customer'} - ${skillsPart} - ${foundConsultant.first_name} ${foundConsultant.last_name}`;
          setFormData(prev => ({
            ...prev,
            name: missionName,
            location: customer?.city || customer?.address || '',
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
  }, [isOpen, winningCandidateId, candidate?.id, requirement, customer]);

  const handleSubmit = async () => {
    if (!consultant) {
      toast.error('Error', 'No consultant found. Transform the candidate to a consultant first.');
      return;
    }
    
    if (!customer?.id) {
      toast.error('Error', 'No customer associated with this requirement. Please ensure a customer exists in the Customers page with the same name.');
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
    
    // Debug: log what we're sending
    console.log('Creating mission with:', {
      customer_id: customer.id,
      customer_name: customer.name,
      consultant_id: consultant.id,
      requirement_id: requirement?.id,
    });
    
    setIsLoading(true);
    try {
      await missionsService.create({
        name: formData.name,
        requirement_id: requirement?.id,
        consultant_id: consultant.id,
        customer_id: customer.id,
        contact_id: contact?.id,
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
                <p className="text-sm font-medium text-brand-slate-900">{customer?.name || 'N/A'}</p>
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
                <p className="text-xs text-brand-grey-400 mb-1">Requirement</p>
                <p className="text-sm font-medium text-brand-slate-900">{requirement?.title || requirement?.reference_id || 'N/A'}</p>
              </div>
            </div>

            {/* Mission Name */}
            <Input
              label="Mission Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Customer - Skills - Consultant Name"
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
                label="End Date *"
                type="date"
                value={formData.end_date}
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
