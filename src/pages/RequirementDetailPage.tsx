import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
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
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { requirementsService, usersService, candidatesService, applicationsService, customerAssessmentsService, interviewsService, type DbApplication, type DbCandidate } from '@/lib/services';

const statusConfig: Record<string, { label: string; colour: string; bgColour: string }> = {
  active: { label: 'Active', colour: 'text-green-700', bgColour: 'bg-green-100' },
  opportunity: { label: 'Opportunity', colour: 'text-amber-700', bgColour: 'bg-amber-100' },
  won: { label: 'Won', colour: 'text-green-600', bgColour: 'bg-green-50' },
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
  
  // Applications (linked candidates)
  const [applications, setApplications] = useState<DbApplication[]>([]);
  const [allCandidates, setAllCandidates] = useState<DbCandidate[]>([]);
  
  // Track scheduled assessments per application
  const [scheduledAssessments, setScheduledAssessments] = useState<Record<string, boolean>>({});
  
  // Add candidate modal
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  
  // Schedule customer assessment modal
  const [isScheduleAssessmentModalOpen, setIsScheduleAssessmentModalOpen] = useState(false);
  const [selectedApplicationForAssessment, setSelectedApplicationForAssessment] = useState<DbApplication | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    customer_contact: '',
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
      const [reqData, usersData, appsData, candidatesData] = await Promise.all([
        requirementsService.getById(id!),
        usersService.getAll(),
        applicationsService.getByRequirement(id!),
        candidatesService.getAll(),
      ]);
      
      setRequirement(reqData);
      setApplications(appsData);
      setAllCandidates(candidatesData);
      
      // Check interview status and scheduled assessments for each linked candidate
      const interviewStatus: Record<string, boolean> = {};
      const assessmentStatus: Record<string, boolean> = {};
      
      for (const app of appsData) {
        try {
          const interviews = await interviewsService.getByCandidate(app.candidate_id);
          // Check if all 3 interviews passed
          const phonePass = interviews.some(i => i.stage === 'phone_qualification' && i.outcome === 'pass');
          const techPass = interviews.some(i => i.stage === 'technical_interview' && i.outcome === 'pass');
          const directorPass = interviews.some(i => i.stage === 'director_interview' && i.outcome === 'pass');
          interviewStatus[app.candidate_id] = phonePass && techPass && directorPass;
          
          // Check if assessment is already scheduled for this application
          const assessments = await customerAssessmentsService.getByApplication(app.id);
          assessmentStatus[app.id] = assessments.length > 0;
        } catch (e) {
          interviewStatus[app.candidate_id] = false;
          assessmentStatus[app.id] = false;
        }
      }
      setCandidateInterviewStatus(interviewStatus);
      setScheduledAssessments(assessmentStatus);
      
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
    if (!selectedCandidateId || !user) return;
    
    setIsAddingCandidate(true);
    try {
      await applicationsService.create({
        candidate_id: selectedCandidateId,
        requirement_id: id!,
        notes: applicationNotes || undefined,
        created_by: user.id,
      });
      
      // Reload all data including interview status
      await loadData();
      
      setIsAddCandidateModalOpen(false);
      setSelectedCandidateId('');
      setApplicationNotes('');
      setCandidateSearch('');
      toast.success('Candidate Added', 'Candidate has been linked to this requirement');
    } catch (error: any) {
      console.error('Error adding candidate:', error);
      if (error.code === '23505') {
        toast.error('Already Linked', 'This candidate is already linked to this requirement');
      } else {
        toast.error('Error', 'Failed to add candidate');
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
    if (!selectedApplicationForAssessment || !user || !assessmentForm.scheduled_date) return;
    
    setIsSchedulingAssessment(true);
    try {
      await customerAssessmentsService.create({
        application_id: selectedApplicationForAssessment.id,
        scheduled_date: assessmentForm.scheduled_date,
        scheduled_time: assessmentForm.scheduled_time || undefined,
        customer_contact: assessmentForm.customer_contact || undefined,
        location: assessmentForm.location || undefined,
        notes: assessmentForm.notes || undefined,
        created_by: user.id,
      });
      
      toast.success('Assessment Scheduled', 'Client assessment has been scheduled');
      setIsScheduleAssessmentModalOpen(false);
      setSelectedApplicationForAssessment(null);
      setAssessmentForm({
        scheduled_date: '',
        scheduled_time: '',
        customer_contact: '',
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

  // Filter candidates not already linked
  const linkedCandidateIds = applications.map(a => a.candidate_id);
  const availableCandidates = allCandidates.filter(c => !linkedCandidateIds.includes(c.id));
  
  // Filter by search
  const filteredAvailableCandidates = candidateSearch
    ? availableCandidates.filter(c => 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(candidateSearch.toLowerCase())
      )
    : availableCandidates;

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
                onClick={() => navigate(`/requirements/${id}/edit`)}
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
              <h1 className="text-2xl font-bold text-brand-slate-900 mb-2">
                {requirement.customer}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {requirement.fte_count} FTE{requirement.fte_count !== 1 ? 's' : ''}
                </span>
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
              </div>
            </div>

            {/* Quick Status Change - clickable tag */}
            {permissions.canEditRequirements ? (
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
                    {Object.entries(statusConfig).map(([key, conf]) => (
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
            {canEditThisRequirement && (
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
              {canEditThisRequirement && (
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
                const hasPassedAllInterviews = candidateInterviewStatus[app.candidate_id];
                const hasScheduledAssessment = scheduledAssessments[app.id];
                
                return (
                <div 
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-brand-grey-200 hover:border-brand-cyan transition-colors"
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
                      <p className="font-medium text-brand-slate-900">
                        {app.candidate?.first_name} {app.candidate?.last_name}
                      </p>
                      <p className="text-sm text-brand-grey-400">{app.candidate?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {hasPassedAllInterviews && (
                      <Badge variant="green">Interviews Complete</Badge>
                    )}
                    {hasScheduledAssessment && (
                      <Badge variant="cyan">Assessment Planned</Badge>
                    )}
                    <span className="text-xs text-brand-grey-400">
                      Added {formatDate(app.created_at)}
                    </span>
                    
                    {/* Schedule Client Assessment - only for Manager/Director/Admin and if interviews passed and no assessment yet */}
                    {canScheduleAssessments && hasPassedAllInterviews && !hasScheduledAssessment && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApplicationForAssessment(app);
                          setIsScheduleAssessmentModalOpen(true);
                        }}
                      >
                        Client Assessment
                      </Button>
                    )}
                    
                    {canEditThisRequirement && (
                      <button
                        onClick={() => handleRemoveCandidate(app.id)}
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
          setSelectedCandidateId('');
          setApplicationNotes('');
          setCandidateSearch('');
        }}
        title="Add Candidate to Requirement"
        description={`Link a candidate to ${requirement.customer}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search candidates by name or email..."
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
            isSearch
          />
          
          <div className="max-h-64 overflow-y-auto border border-brand-grey-200 rounded-lg">
            {filteredAvailableCandidates.length === 0 ? (
              <p className="text-center py-4 text-brand-grey-400 text-sm">
                {candidateSearch ? 'No matching candidates found' : 'No available candidates'}
              </p>
            ) : (
              filteredAvailableCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-brand-grey-100 last:border-b-0 ${
                    selectedCandidateId === candidate.id 
                      ? 'bg-brand-cyan/10 border-l-2 border-l-brand-cyan' 
                      : 'hover:bg-brand-grey-50'
                  }`}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                >
                  <Avatar name={`${candidate.first_name} ${candidate.last_name}`} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-brand-slate-900">
                      {candidate.first_name} {candidate.last_name}
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
                </div>
              ))
            )}
          </div>

          <Input
            label="Notes (optional)"
            placeholder="Why is this candidate a good fit?"
            value={applicationNotes}
            onChange={(e) => setApplicationNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsAddCandidateModalOpen(false);
                setSelectedCandidateId('');
                setApplicationNotes('');
                setCandidateSearch('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddCandidate}
              isLoading={isAddingCandidate}
              disabled={!selectedCandidateId}
            >
              Add Candidate
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
            scheduled_date: '',
            scheduled_time: '',
            customer_contact: '',
            location: '',
            notes: '',
          });
        }}
        title="Schedule Client Meeting"
        description={selectedApplicationForAssessment?.candidate 
          ? `Schedule a customer meeting for ${selectedApplicationForAssessment.candidate.first_name} ${selectedApplicationForAssessment.candidate.last_name}`
          : 'Schedule customer assessment'
        }
        size="md"
      >
        <div className="space-y-4">
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
            label="Customer Contact"
            placeholder="Name of customer contact..."
            value={assessmentForm.customer_contact}
            onChange={(e) => setAssessmentForm(prev => ({ ...prev, customer_contact: e.target.value }))}
          />
          
          <Input
            label="Location"
            placeholder="Meeting location or video call link..."
            value={assessmentForm.location}
            onChange={(e) => setAssessmentForm(prev => ({ ...prev, location: e.target.value }))}
          />
          
          <Textarea
            label="Notes"
            placeholder="Any preparation notes or context..."
            value={assessmentForm.notes}
            onChange={(e) => setAssessmentForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
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
              disabled={!assessmentForm.scheduled_date}
            >
              Schedule Meeting
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
