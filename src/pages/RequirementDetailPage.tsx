import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
  User,
  Building2,
  Calendar,
  MapPin,
  PoundSterling,
  Shield,
  Briefcase,
  Trash2,
  Plus,
  UserPlus,
  X,
  CalendarPlus,
  ChevronDown,
  Trophy,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  Select,
  ConfirmDialog,
  Modal,
  Avatar,
  Input,
  Textarea,
  SearchableSelect,
} from '@/components/ui';
import { formatDate, computeCandidatePipelineStatus } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { requirementsService, usersService, candidatesService, applicationsService, customerAssessmentsService, interviewsService, contactsService, companiesService, type DbApplication, type DbCandidate, type DbContact, type DbCompany } from '@/lib/services';

const statusConfig: Record<string, { label: string; colour: string; bgColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100' },
  opportunity: { label: 'Opportunity', colour: 'text-amber-700', bgColour: 'bg-amber-100' },
  won: { label: 'Won', colour: 'text-green-600', bgColour: 'bg-green-50' },
  lost: { label: 'Lost', colour: 'text-red-700', bgColour: 'bg-red-100' },
  cancelled: { label: 'Cancelled', colour: 'text-slate-500', bgColour: 'bg-slate-100' },
};

// Statuses that can be manually selected (Won is excluded - only via Customer Assessment GO)
const manualStatusOptions: Record<string, { label: string; colour: string; bgColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100' },
  opportunity: { label: 'Opportunity', colour: 'text-amber-700', bgColour: 'bg-amber-100' },
  lost: { label: 'Lost', colour: 'text-red-700', bgColour: 'bg-red-100' },
  cancelled: { label: 'Cancelled', colour: 'text-slate-500', bgColour: 'bg-slate-100' },
};

const clearanceLabels: Record<string, string> = {
  none: 'None Required',
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
  electrical: 'Electrical Engineering',
  mechanical: 'Mechanical Engineering',
  civil: 'Civil Engineering',
  software: 'Software Engineering',
  systems: 'Systems Engineering',
  nuclear: 'Nuclear Engineering',
  chemical: 'Chemical Engineering',
  structural: 'Structural Engineering',
  other: 'Other',
};

export function RequirementDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [requirement, setRequirement] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [createdBy, setCreatedBy] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  
  // Edit requirement modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    customer: '',
    industry: '',
    location: '',
    status: 'active',
    fte_count: '1',
    min_day_rate: '',
    max_day_rate: '',
    engineering_discipline: 'software',
    clearance_required: 'none',
    description: '',
    manager_id: '',
  });
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editSkillInput, setEditSkillInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // Applications (linked candidates)
  const [applications, setApplications] = useState<DbApplication[]>([]);
  
  // Track scheduled assessments per application
  const [scheduledAssessments, setScheduledAssessments] = useState<Record<string, boolean>>({});
  
  // Track assessment outcomes per candidate (for showing NOGO badge)
  const [candidateAssessmentOutcomes, setCandidateAssessmentOutcomes] = useState<Record<string, 'pending' | 'go' | 'nogo' | null>>({});
  
  // Track interviews per candidate for pipeline status
  const [candidateInterviews, setCandidateInterviews] = useState<Record<string, any[]>>({});
  
  // Contacts and companies for assessment modal
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  
  // Add candidate modal
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<DbCandidate[]>([]);
  const [applicationNotes, setApplicationNotes] = useState('');
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [searchResults, setSearchResults] = useState<DbCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Schedule customer assessment modal
  const [isScheduleAssessmentModalOpen, setIsScheduleAssessmentModalOpen] = useState(false);
  const [selectedApplicationForAssessment, setSelectedApplicationForAssessment] = useState<DbApplication | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    contact_id: '',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
  });
  const [isSchedulingAssessment, setIsSchedulingAssessment] = useState(false);
  
  // Track which candidates have passed all interviews
  const [candidateInterviewStatus, setCandidateInterviewStatus] = useState<Record<string, boolean>>({});
  
  // Check if user can schedule assessments (Manager, Director, Admin)
  const canScheduleAssessments = user?.roles?.some(r => ['admin', 'director', 'manager'].includes(r)) ?? false;

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reqData, usersData, appsData, contactsData, companiesData, allInterviews] = await Promise.all([
        requirementsService.getById(id!),
        usersService.getAll(),
        applicationsService.getByRequirement(id!),
        contactsService.getAll(),
        companiesService.getAll(),
        interviewsService.getAll(),
      ]);
      
      setRequirement(reqData);
      setApplications(appsData);
      setAllUsers(usersData);
      setContacts(contactsData);
      setCompanies(companiesData);
      
      // Group interviews by candidate for pipeline status
      const interviewsByCandidate: Record<string, any[]> = {};
      for (const interview of allInterviews) {
        const candidateId = interview.candidate_id;
        if (!interviewsByCandidate[candidateId]) {
          interviewsByCandidate[candidateId] = [];
        }
        interviewsByCandidate[candidateId].push(interview);
      }
      setCandidateInterviews(interviewsByCandidate);
      
      // Check interview status and scheduled assessments for each linked candidate
      const interviewStatus: Record<string, boolean> = {};
      const assessmentStatus: Record<string, boolean> = {};
      const assessmentOutcomes: Record<string, 'pending' | 'go' | 'nogo' | null> = {};
      
      for (const app of appsData) {
        try {
          const interviews = interviewsByCandidate[app.candidate_id] || [];
          // Check if all 3 interviews passed
          const phonePass = interviews.some(i => i.stage === 'phone_qualification' && i.outcome === 'pass');
          const techPass = interviews.some(i => i.stage === 'technical_interview' && i.outcome === 'pass');
          const directorPass = interviews.some(i => i.stage === 'director_interview' && i.outcome === 'pass');
          interviewStatus[app.candidate_id] = phonePass && techPass && directorPass;
          
          // Check if assessment is already scheduled for this application
          const assessments = await customerAssessmentsService.getByApplication(app.id);
          assessmentStatus[app.id] = assessments.length > 0;
          
          // Track assessment outcome for showing NOGO badge
          if (assessments.length > 0) {
            const latestAssessment = assessments[0]; // Already sorted by date desc
            assessmentOutcomes[app.candidate_id] = latestAssessment.outcome;
          }
        } catch (e) {
          interviewStatus[app.candidate_id] = false;
          assessmentStatus[app.id] = false;
        }
      }
      setCandidateInterviewStatus(interviewStatus);
      setScheduledAssessments(assessmentStatus);
      setCandidateAssessmentOutcomes(assessmentOutcomes);
      
      if (reqData?.manager_id) {
        const mgr = usersData.find(u => u.id === reqData.manager_id);
        setManager(mgr);
      }
      if (reqData?.created_by) {
        const creator = usersData.find(u => u.id === reqData.created_by);
        setCreatedBy(creator);
      }
    } catch (error) {
      console.error('Error loading requirement:', error);
      toast.error('Error', 'Failed to load requirement');
    } finally {
      setIsLoading(false);
    }
  };

  // Search candidates with debounce
  useEffect(() => {
    if (!candidateSearch || candidateSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const allCandidates = await candidatesService.getAll();
        const linkedCandidateIds = applications.map(a => a.candidate_id);
        const selectedIds = selectedCandidates.map(c => c.id);
        const filtered = allCandidates
          .filter(c => !linkedCandidateIds.includes(c.id))
          .filter(c => !selectedIds.includes(c.id)) // Exclude already selected
          .filter(c => 
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(candidateSearch.toLowerCase()) ||
            c.email.toLowerCase().includes(candidateSearch.toLowerCase()) ||
            c.reference_id?.toLowerCase().includes(candidateSearch.toLowerCase())
          )
          .slice(0, 10); // Limit to 10 results
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching candidates:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [candidateSearch, applications, selectedCandidates]);

  const handleOpenEditModal = () => {
    if (!requirement) return;
    
    // Populate form with current requirement data
    setEditForm({
      title: requirement.title || '',
      customer: requirement.customer || '',
      industry: requirement.industry || '',
      location: requirement.location || '',
      status: requirement.status || 'active',
      fte_count: requirement.fte_count?.toString() || '1',
      min_day_rate: requirement.min_day_rate?.toString() || '',
      max_day_rate: requirement.max_day_rate?.toString() || '',
      engineering_discipline: requirement.engineering_discipline || 'software',
      clearance_required: requirement.clearance_required || 'none',
      description: requirement.description || '',
      manager_id: requirement.manager_id || '',
    });
    setEditSkills(requirement.skills || []);
    setIsEditModalOpen(true);
  };

  const handleUpdateRequirement = async () => {
    if (!editForm.title && !editForm.customer) {
      toast.error('Validation Error', 'Title or Customer is required');
      return;
    }
    
    setIsUpdating(true);
    try {
      await requirementsService.update(id!, {
        title: editForm.title || undefined,
        customer: editForm.customer || undefined,
        industry: editForm.industry || undefined,
        location: editForm.location || undefined,
        status: editForm.status,
        fte_count: editForm.fte_count ? parseInt(editForm.fte_count) : undefined,
        min_day_rate: editForm.min_day_rate ? parseFloat(editForm.min_day_rate) : undefined,
        max_day_rate: editForm.max_day_rate ? parseFloat(editForm.max_day_rate) : undefined,
        engineering_discipline: editForm.engineering_discipline || undefined,
        clearance_required: editForm.clearance_required || undefined,
        description: editForm.description || undefined,
        skills: editSkills.length > 0 ? editSkills : undefined,
        manager_id: editForm.manager_id || undefined,
      });
      
      toast.success('Requirement Updated', 'Changes have been saved');
      setIsEditModalOpen(false);
      loadData(); // Reload to show updated data
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast.error('Error', 'Failed to update requirement');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditSkillAdd = () => {
    if (!editSkillInput.trim()) return;
    const newSkills = editSkillInput.split(',').map(s => s.trim()).filter(s => s && !editSkills.includes(s));
    setEditSkills([...editSkills, ...newSkills]);
    setEditSkillInput('');
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await requirementsService.update(id!, { status: newStatus });
      setRequirement((prev: any) => ({ ...prev, status: newStatus }));
      toast.success('Status Updated', `Requirement status changed to ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error', 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await requirementsService.delete(id!);
      toast.success('Requirement Deleted', 'The requirement has been permanently deleted');
      navigate('/requirements');
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Error', 'Failed to delete requirement');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddCandidate = async () => {
    if (selectedCandidates.length === 0 || !user) return;
    
    setIsAddingCandidate(true);
    try {
      // Add all selected candidates
      for (const candidate of selectedCandidates) {
        await applicationsService.create({
          candidate_id: candidate.id,
          requirement_id: id!,
          notes: applicationNotes || undefined,
          created_by: user.id,
        });
      }
      
      // Reload all data including interview status
      await loadData();
      
      setIsAddCandidateModalOpen(false);
      setSelectedCandidates([]);
      setApplicationNotes('');
      setCandidateSearch('');
      setSearchResults([]);
      toast.success(
        selectedCandidates.length === 1 ? 'Candidate Added' : 'Candidates Added', 
        `${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? 's have' : ' has'} been linked to this requirement`
      );
    } catch (error: any) {
      console.error('Error adding candidate:', error);
      if (error.code === '23505') {
        toast.error('Already Linked', 'One or more candidates are already linked to this requirement');
      } else {
        toast.error('Error', 'Failed to add candidates');
      }
    } finally {
      setIsAddingCandidate(false);
    }
  };

  const handleRemoveCandidate = async (applicationId: string) => {
    try {
      await applicationsService.delete(applicationId);
      setApplications(applications.filter(a => a.id !== applicationId));
      toast.success('Candidate Removed', 'Candidate has been unlinked from this requirement');
    } catch (error) {
      console.error('Error removing candidate:', error);
      toast.error('Error', 'Failed to remove candidate');
    }
  };

  const handleScheduleAssessment = async () => {
    if (!selectedApplicationForAssessment || !user || !assessmentForm.scheduled_date || !id) return;
    
    // Use requirement's contact_id if available, otherwise use form selection
    const contactId = requirement?.contact_id || assessmentForm.contact_id;
    
    if (!contactId) {
      toast.error('Validation Error', 'Please select a customer contact');
      return;
    }
    
    setIsSchedulingAssessment(true);
    try {
      // Build auto-generated title
      const candidate = selectedApplicationForAssessment.candidate;
      const contact = contacts.find(c => c.id === contactId);
      const company = contact?.company || companies.find(co => co.id === contact?.company_id);
      
      const autoTitle = [
        requirement?.reference_id || 'REQ',
        company?.name || requirement?.customer || 'Customer',
        requirement?.title || requirement?.customer || 'Requirement',
        candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Candidate'
      ].join(' - ');
      
      await customerAssessmentsService.create({
        application_id: selectedApplicationForAssessment.id,
        requirement_id: id,
        candidate_id: selectedApplicationForAssessment.candidate_id,
        contact_id: contactId,
        scheduled_date: assessmentForm.scheduled_date,
        scheduled_time: assessmentForm.scheduled_time || undefined,
        location: assessmentForm.location || undefined,
        notes: autoTitle + (assessmentForm.notes ? '\n\n' + assessmentForm.notes : ''),
        created_by: user.id,
      });
      
      toast.success('Assessment Scheduled', 'Client assessment has been scheduled');
      setIsScheduleAssessmentModalOpen(false);
      setSelectedApplicationForAssessment(null);
      setAssessmentForm({
        contact_id: '',
        scheduled_date: '',
        scheduled_time: '',
        location: '',
        notes: '',
      });
      
      // Reload to update assessment status
      loadData();
    } catch (error) {
      console.error('Error scheduling assessment:', error);
      toast.error('Error', 'Failed to schedule assessment');
    } finally {
      setIsSchedulingAssessment(false);
    }
  };

  // Check if current user can edit this requirement
  const canEditThisRequirement = 
    permissions.isAdmin || 
    requirement?.created_by === user?.id ||
    requirement?.manager_id === user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Loading..." />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading requirement...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="min-h-screen">
        <Header title="Requirement Not Found" />
        <div className="p-6">
          <EmptyState
            title="Requirement not found"
            description="The requirement you're looking for doesn't exist."
            action={{
              label: 'Back to Requirements',
              onClick: () => navigate('/requirements'),
            }}
          />
        </div>
      </div>
    );
  }

  const config = statusConfig[requirement.status] || statusConfig.opportunity;

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Header
        title="Requirement Details"
        actions={
          <div className="flex items-center gap-2">
            {canEditThisRequirement && (
              <Button
                variant="secondary"
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={handleOpenEditModal}
              >
                Edit
              </Button>
            )}
            {permissions.isAdmin && (
              <Button
                variant="danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/requirements')}
            >
              Back
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className={requirement.status === 'active' ? 'bg-green-50' : ''}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-slate-900 mb-1">
                {requirement.title || requirement.customer}
              </h1>
              {requirement.title && (
                <p className="text-brand-grey-500 mb-2">{requirement.customer}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                {requirement.contact && (
                  <span className="flex items-center gap-1 text-brand-cyan">
                    <User className="h-4 w-4" />
                    {requirement.contact.first_name} {requirement.contact.last_name}
                  </span>
                )}
                {requirement.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {requirement.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {formatDate(requirement.created_at)}
                </span>
                {requirement.reference_id && (
                  <span className="text-xs text-brand-grey-400">ID: {requirement.reference_id}</span>
                )}
              </div>
            </div>

            {/* Quick Status Change - clickable tag */}
            {permissions.canEditRequirements && requirement.status !== 'won' ? (
              <div className="relative">
                <button
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${config.bgColour} ${config.colour} hover:opacity-80 transition-opacity flex items-center gap-2`}
                >
                  {config.label}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isStatusMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-brand-grey-200 z-20 min-w-[160px] overflow-hidden">
                    {Object.entries(manualStatusOptions).map(([key, conf]) => (
                      <button
                        key={key}
                        onClick={() => {
                          handleStatusChange(key);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-brand-grey-50 flex items-center gap-2 ${
                          requirement.status === key ? 'bg-brand-grey-50' : ''
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${conf.bgColour.replace('bg-', 'bg-').replace('-100', '-500').replace('-50', '-400')}`} />
                        {conf.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColour} ${config.colour}`}>
                {config.label}
              </span>
            )}
          </div>
        </Card>

        {/* Winning Candidate Banner - shown when requirement is won */}
        {requirement.status === 'won' && requirement.winning_candidate && (
          <Card className="border-green-200 bg-green-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium">Requirement Won</p>
                <div 
                  className="flex items-center gap-3 mt-1 cursor-pointer hover:opacity-80"
                  onClick={() => navigate(`/candidates/${requirement.winning_candidate_id}`)}
                >
                  <Avatar 
                    name={`${requirement.winning_candidate.first_name} ${requirement.winning_candidate.last_name}`}
                    size="sm"
                  />
                  <div>
                    <p className="font-semibold text-brand-slate-900">
                      {requirement.winning_candidate.first_name} {requirement.winning_candidate.last_name}
                    </p>
                    <p className="text-sm text-brand-grey-500">{requirement.winning_candidate.email}</p>
                  </div>
                </div>
              </div>
              {requirement.won_at && (
                <div className="text-right">
                  <p className="text-xs text-green-600">Won on</p>
                  <p className="text-sm font-medium text-green-700">{formatDate(requirement.won_at)}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {requirement.industry && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Industry</p>
                    <p className="text-sm text-brand-slate-700 capitalize">{requirement.industry}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-brand-grey-400" />
                <div>
                  <p className="text-xs text-brand-grey-400">Engineering Discipline</p>
                  <p className="text-sm text-brand-slate-700">
                    {disciplineLabels[requirement.engineering_discipline] || requirement.engineering_discipline}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-brand-grey-400" />
                <div>
                  <p className="text-xs text-brand-grey-400">Clearance Required</p>
                  <p className="text-sm text-brand-slate-700">
                    {clearanceLabels[requirement.clearance_required] || 'None'}
                  </p>
                </div>
              </div>
              
              {requirement.max_day_rate && (
                <div className="flex items-center gap-3">
                  <PoundSterling className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Max Day Rate</p>
                    <p className="text-sm text-brand-slate-700">£{requirement.max_day_rate}/day</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Right Column */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {createdBy && (
                <div>
                  <p className="text-xs text-brand-grey-400 mb-1">Created By</p>
                  <p className="text-sm font-medium text-brand-slate-700">{createdBy.full_name}</p>
                  <p className="text-xs text-brand-grey-400">{createdBy.email}</p>
                </div>
              )}
              {manager ? (
                <div>
                  <p className="text-xs text-brand-grey-400 mb-1">Assigned Manager</p>
                  <p className="text-sm font-medium text-brand-slate-700">{manager.full_name}</p>
                  <p className="text-xs text-brand-grey-400">{manager.email}</p>
                </div>
              ) : (
                <p className="text-sm text-brand-grey-400">No manager assigned</p>
              )}
            </div>
          </Card>
        </div>

        {/* Skills */}
        {requirement.skills && requirement.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {requirement.skills.map((skill: string) => (
                <Badge key={skill} variant="cyan">{skill}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Linked Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Linked Candidates ({applications.length})</CardTitle>
            {canEditThisRequirement && requirement?.status !== 'won' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setIsAddCandidateModalOpen(true)}
              >
                Add Candidate
              </Button>
            )}
          </CardHeader>
          
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-brand-grey-300 mx-auto mb-3" />
              <p className="text-brand-grey-400">No candidates linked to this requirement yet</p>
              {canEditThisRequirement && requirement?.status !== 'won' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsAddCandidateModalOpen(true)}
                >
                  Add First Candidate
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const hasScheduledAssessment = scheduledAssessments[app.id];
                const assessmentOutcome = candidateAssessmentOutcomes[app.candidate_id];
                const isWinningCandidate = requirement.winning_candidate_id === app.candidate_id;
                
                // Compute pipeline status for this candidate
                const interviews = candidateInterviews[app.candidate_id] || [];
                const pipelineStatus = computeCandidatePipelineStatus(interviews, app.candidate?.status);
                
                return (
                <div 
                  key={app.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isWinningCandidate 
                      ? 'border-green-300 bg-green-50' 
                      : assessmentOutcome === 'nogo'
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-brand-grey-200 hover:border-brand-cyan'
                  }`}
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/candidates/${app.candidate_id}`)}
                  >
                    <Avatar 
                      name={`${app.candidate?.first_name} ${app.candidate?.last_name}`}
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-brand-slate-900">
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </p>
                        {isWinningCandidate && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <Trophy className="h-3 w-3" />
                            Winner
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-grey-400">{app.candidate?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Assessment outcome badges - takes priority */}
                    {assessmentOutcome === 'go' && !isWinningCandidate && (
                      <Badge variant="green">GO</Badge>
                    )}
                    {assessmentOutcome === 'nogo' && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        <XCircle className="h-3 w-3" />
                        NOGO
                      </span>
                    )}
                    {assessmentOutcome === 'pending' && (
                      <Badge variant="orange">Assessment Pending</Badge>
                    )}
                    
                    {/* Pipeline status - show if no assessment outcome */}
                    {!assessmentOutcome && !isWinningCandidate && (
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${pipelineStatus.colour}`}>
                        {pipelineStatus.label}
                      </span>
                    )}
                    
                    <span className="text-xs text-brand-grey-400">
                      Added {formatDate(app.created_at)}
                    </span>
                    
                    {/* Schedule Client Assessment - available for any candidate, disabled when requirement is won */}
                    {canScheduleAssessments && !hasScheduledAssessment && assessmentOutcome !== 'nogo' && !isWinningCandidate && requirement?.status !== 'won' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApplicationForAssessment(app);
                          // Pre-select contact from requirement if available
                          if (requirement?.contact_id) {
                            setAssessmentForm(prev => ({ ...prev, contact_id: requirement.contact_id }));
                          }
                          setIsScheduleAssessmentModalOpen(true);
                        }}
                      >
                        Client Assessment
                      </Button>
                    )}
                    
                    {/* Remove candidate - only if NOT presented to customer (no assessment exists) and requirement not won */}
                    {canEditThisRequirement && !isWinningCandidate && !hasScheduledAssessment && !assessmentOutcome && requirement?.status !== 'won' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCandidate(app.id);
                        }}
                        className="p-1 text-brand-grey-400 hover:text-red-500 rounded transition-colors"
                        title="Remove candidate"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Description */}
        {requirement.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <p className="text-brand-slate-600 leading-relaxed whitespace-pre-wrap">
              {requirement.description}
            </p>
          </Card>
        )}
      </div>

      {/* Add Candidate Modal */}
      <Modal
        isOpen={isAddCandidateModalOpen}
        onClose={() => {
          setIsAddCandidateModalOpen(false);
          setSelectedCandidates([]);
          setApplicationNotes('');
          setCandidateSearch('');
          setSearchResults([]);
        }}
        title="Add Candidates to Requirement"
        description={`Link candidates to ${requirement.customer}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Selected candidates display */}
          {selectedCandidates.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-slate-700">
                Selected ({selectedCandidates.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedCandidates.map(candidate => (
                  <div 
                    key={candidate.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-cyan/10 border border-brand-cyan rounded-full text-sm"
                  >
                    <span className="font-medium text-brand-slate-900">
                      {candidate.first_name} {candidate.last_name}
                    </span>
                    <button
                      onClick={() => setSelectedCandidates(prev => prev.filter(c => c.id !== candidate.id))}
                      className="text-brand-grey-400 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search input - always visible */}
          <Input
            placeholder="Type at least 2 characters to search..."
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
            isSearch
          />
          
          <div className="max-h-48 overflow-y-auto border border-brand-grey-200 rounded-lg">
            {isSearching ? (
              <p className="text-center py-4 text-brand-grey-400 text-sm">Searching...</p>
            ) : candidateSearch.length < 2 ? (
              <p className="text-center py-4 text-brand-grey-400 text-sm">
                Type to search candidates by name, email or ID
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-center py-4 text-brand-grey-400 text-sm">
                No matching candidates found
              </p>
            ) : (
              searchResults.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-brand-grey-100 last:border-b-0 hover:bg-brand-cyan/5"
                  onClick={() => {
                    setSelectedCandidates(prev => [...prev, candidate]);
                    setCandidateSearch('');
                    setSearchResults([]);
                  }}
                >
                  <Avatar name={`${candidate.first_name} ${candidate.last_name}`} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-brand-slate-900">
                      {candidate.first_name} {candidate.last_name}
                      {candidate.reference_id && (
                        <span className="text-xs text-brand-grey-400 ml-2">[{candidate.reference_id}]</span>
                      )}
                    </p>
                    <p className="text-sm text-brand-grey-400">{candidate.email}</p>
                  </div>
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex gap-1">
                      {candidate.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="cyan" className="text-xs">{skill}</Badge>
                      ))}
                      {candidate.skills.length > 2 && (
                        <Badge variant="grey" className="text-xs">+{candidate.skills.length - 2}</Badge>
                      )}
                    </div>
                  )}
                  <Plus className="h-4 w-4 text-brand-cyan" />
                </div>
              ))
            )}
          </div>

          <Input
            label="Notes (optional)"
            placeholder="Why are these candidates a good fit?"
            value={applicationNotes}
            onChange={(e) => setApplicationNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsAddCandidateModalOpen(false);
                setSelectedCandidates([]);
                setApplicationNotes('');
                setCandidateSearch('');
                setSearchResults([]);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddCandidate}
              isLoading={isAddingCandidate}
              disabled={selectedCandidates.length === 0}
            >
              Add {selectedCandidates.length > 0 ? `${selectedCandidates.length} Candidate${selectedCandidates.length > 1 ? 's' : ''}` : 'Candidates'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Customer Assessment Modal */}
      <Modal
        isOpen={isScheduleAssessmentModalOpen}
        onClose={() => {
          setIsScheduleAssessmentModalOpen(false);
          setSelectedApplicationForAssessment(null);
          setAssessmentForm({
            contact_id: '',
            scheduled_date: '',
            scheduled_time: '',
            location: '',
            notes: '',
          });
        }}
        title="Schedule Client Assessment"
        description={selectedApplicationForAssessment?.candidate 
          ? `Schedule a customer assessment for ${selectedApplicationForAssessment.candidate.first_name} ${selectedApplicationForAssessment.candidate.last_name}`
          : 'Schedule customer assessment'
        }
        size="md"
      >
        <div className="space-y-4">
          {/* Customer Contact - locked if requirement has a contact */}
          {requirement?.contact_id ? (
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Customer Contact</label>
              <div className="p-3 bg-brand-grey-50 rounded-lg border border-brand-grey-200">
                {(() => {
                  const contact = contacts.find(c => c.id === requirement.contact_id);
                  const company = contact?.company || companies.find(co => co.id === contact?.company_id);
                  return (
                    <p className="text-sm font-medium text-brand-slate-900">
                      {contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contact'}
                      {company && <span className="text-brand-grey-500 ml-2">({company.name})</span>}
                    </p>
                  );
                })()}
              </div>
            </div>
          ) : (
            <SearchableSelect
              label="Customer Contact *"
              placeholder="Search contacts..."
              options={contacts.map(c => {
                const company = c.company || companies.find(co => co.id === c.company_id);
                return {
                  value: c.id,
                  label: `${c.first_name} ${c.last_name}`,
                  sublabel: company ? `${c.role || ''} - ${company.name}`.replace(/^- /, '') : c.role || ''
                };
              })}
              value={assessmentForm.contact_id}
              onChange={(value) => setAssessmentForm(prev => ({ ...prev, contact_id: value }))}
            />
          )}
          
          {/* Auto-generated title preview */}
          {selectedApplicationForAssessment && assessmentForm.contact_id && (() => {
            const candidate = selectedApplicationForAssessment.candidate;
            const contact = contacts.find(c => c.id === assessmentForm.contact_id);
            const company = contact?.company || companies.find(co => co.id === contact?.company_id);
            
            const autoTitle = [
              requirement?.reference_id || 'REQ',
              company?.name || requirement?.customer || 'Customer',
              requirement?.title || requirement?.customer || 'Requirement',
              candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Candidate'
            ].join(' - ');
            
            return (
              <div className="p-3 bg-brand-grey-50 rounded-lg border border-brand-grey-200">
                <p className="text-xs text-brand-grey-500 mb-1">Meeting Title (auto-generated)</p>
                <p className="text-sm font-medium text-brand-slate-900">{autoTitle}</p>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={assessmentForm.scheduled_date}
              onChange={(e) => setAssessmentForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
            />
            <Input
              label="Time"
              type="time"
              value={assessmentForm.scheduled_time}
              onChange={(e) => setAssessmentForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
            />
          </div>
          
          <Input
            label="Location"
            placeholder="Customer office or video call link..."
            value={assessmentForm.location}
            onChange={(e) => setAssessmentForm(prev => ({ ...prev, location: e.target.value }))}
          />
          
          <Textarea
            label="Notes"
            placeholder="Any preparation notes or context..."
            value={assessmentForm.notes}
            onChange={(e) => setAssessmentForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsScheduleAssessmentModalOpen(false);
                setSelectedApplicationForAssessment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleScheduleAssessment}
              isLoading={isSchedulingAssessment}
              disabled={!assessmentForm.scheduled_date || !assessmentForm.contact_id}
            >
              Schedule Assessment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Requirement Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Requirement"
        description="Update requirement details"
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Title *"
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Senior Java Engineer"
            />
            <Input
              label="Customer"
              value={editForm.customer}
              onChange={(e) => setEditForm(prev => ({ ...prev, customer: e.target.value }))}
              placeholder="e.g., Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., London, Remote"
            />
            <Select
              label="Status"
              options={[
                { value: 'opportunity', label: 'Opportunity' },
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'filled', label: 'Filled' },
                { value: 'lost', label: 'Lost' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={editForm.status}
              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
            />
          </div>

          {/* Rates */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Day Rate (£)"
              type="number"
              value={editForm.min_day_rate}
              onChange={(e) => setEditForm(prev => ({ ...prev, min_day_rate: e.target.value }))}
              placeholder="e.g., 450"
            />
            <Input
              label="Max Day Rate (£)"
              type="number"
              value={editForm.max_day_rate}
              onChange={(e) => setEditForm(prev => ({ ...prev, max_day_rate: e.target.value }))}
              placeholder="e.g., 550"
            />
          </div>

          {/* Discipline & Clearance */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Engineering Discipline"
              options={[
                { value: 'software', label: 'Software Engineering' },
                { value: 'systems', label: 'Systems Engineering' },
                { value: 'mechanical', label: 'Mechanical Engineering' },
                { value: 'electrical', label: 'Electrical Engineering' },
                { value: 'civil', label: 'Civil Engineering' },
                { value: 'aerospace', label: 'Aerospace Engineering' },
                { value: 'data', label: 'Data Engineering' },
                { value: 'devops', label: 'DevOps / Platform' },
                { value: 'security', label: 'Security Engineering' },
                { value: 'other', label: 'Other' },
              ]}
              value={editForm.engineering_discipline}
              onChange={(e) => setEditForm(prev => ({ ...prev, engineering_discipline: e.target.value }))}
            />
            <Select
              label="Clearance Required"
              options={[
                { value: 'none', label: 'None Required' },
                { value: 'bpss', label: 'BPSS' },
                { value: 'ctc', label: 'CTC' },
                { value: 'sc', label: 'SC' },
                { value: 'esc', label: 'eSC' },
                { value: 'dv', label: 'DV' },
                { value: 'edv', label: 'eDV' },
              ]}
              value={editForm.clearance_required}
              onChange={(e) => setEditForm(prev => ({ ...prev, clearance_required: e.target.value }))}
            />
          </div>

          {/* Description */}
          <Textarea
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the requirement, project details, team structure..."
            rows={4}
          />

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">Required Skills</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add skills (comma-separated)..."
                value={editSkillInput}
                onChange={(e) => setEditSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEditSkillAdd();
                  }
                }}
              />
              <Button variant="secondary" onClick={handleEditSkillAdd}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editSkills.map(skill => (
                <Badge key={skill} variant="cyan">
                  {skill}
                  <button
                    onClick={() => setEditSkills(editSkills.filter(s => s !== skill))}
                    className="ml-1.5 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Manager */}
          <Select
            label="Assigned Manager"
            options={[
              { value: '', label: 'Select manager' },
              ...allUsers
                .filter(u => u.role === 'manager' || u.role === 'director' || u.role === 'admin')
                .map(u => ({ value: u.id, label: u.full_name || u.email }))
            ]}
            value={editForm.manager_id}
            onChange={(e) => setEditForm(prev => ({ ...prev, manager_id: e.target.value }))}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleUpdateRequirement} isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Requirement"
        message={`Are you sure you want to delete "${requirement.customer}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
