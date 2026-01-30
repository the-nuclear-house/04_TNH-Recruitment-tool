import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Building2, 
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Plus,
  Phone,
  Video,
  Mail,
  Users,
  Trash2,
  FileText,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  Badge, 
  Avatar, 
  EmptyState,
  Modal,
  Button,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  ConfirmDialog,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToast } from '@/lib/stores/ui-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  customerMeetingsService,
  customerAssessmentsService, 
  contactsService,
  candidatesService,
  companiesService,
  requirementsService,
  applicationsService,
  usersService,
  type DbCustomerMeeting,
  type DbCustomerAssessment,
  type DbContact,
  type DbCandidate,
  type DbCompany,
  type DbRequirement,
  type DbUser,
} from '@/lib/services';

type MeetingType = 'client_meeting' | 'candidate_assessment';

const outcomeConfig = {
  pending: { label: 'Pending', colour: 'orange', icon: Clock },
  go: { label: 'GO', colour: 'green', icon: CheckCircle },
  nogo: { label: 'NO GO', colour: 'red', icon: XCircle },
};

const meetingStatusConfig = {
  planned: { label: 'Planned', colour: 'blue', icon: Clock },
  completed: { label: 'Completed', colour: 'green', icon: CheckCircle },
  cancelled: { label: 'Cancelled', colour: 'red', icon: XCircle },
};

const meetingTypeIcons: Record<string, any> = {
  call: Phone,
  video: Video,
  in_person: Users,
  email: Mail,
};

export function ClientMeetingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const permissions = usePermissions();
  
  // Data
  const [customerMeetings, setCustomerMeetings] = useState<DbCustomerMeeting[]>([]);
  const [assessments, setAssessments] = useState<DbCustomerAssessment[]>([]);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [candidates, setCandidates] = useState<DbCandidate[]>([]);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<'all' | 'client' | 'assessment'>('all');
  
  // Detail modal
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [viewingItemType, setViewingItemType] = useState<'meeting' | 'assessment' | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Meeting status update modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusToSet, setStatusToSet] = useState<'completed' | 'cancelled' | null>(null);
  const [meetingOutcomeNotes, setMeetingOutcomeNotes] = useState('');
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ item: any; type: 'meeting' | 'assessment' } | null>(null);
  
  // Create modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<MeetingType>('client_meeting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Client meeting form
  const [meetingForm, setMeetingForm] = useState({
    contact_id: '',
    meeting_type: 'call',
    subject: '',
    scheduled_at: '',
    scheduled_time: '',
    duration_minutes: '30',
    location: '',
    preparation_notes: '',
  });
  
  // Assessment form - robust flow: Contact -> Requirement -> Candidate
  const [assessmentForm, setAssessmentForm] = useState({
    contact_id: '',
    requirement_id: '',
    application_id: '', // The application links candidate to requirement
    subject: '',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
  });
  const [contactRequirements, setContactRequirements] = useState<DbRequirement[]>([]);
  const [requirementCandidates, setRequirementCandidates] = useState<Array<{ id: string; candidate: any }>>([]);
  
  // Outcome modal (for assessments)
  const [selectedAssessment, setSelectedAssessment] = useState<DbCustomerAssessment | null>(null);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [meetings, assmnts, conts, cands, comps, usrs] = await Promise.all([
        customerMeetingsService.getAll(),
        customerAssessmentsService.getAll(),
        contactsService.getAll(),
        candidatesService.getAll(),
        companiesService.getAll(),
        usersService.getAll(),
      ]);
      setCustomerMeetings(meetings);
      setAssessments(assmnts);
      setContacts(conts);
      setCandidates(cands);
      setCompanies(comps);
      setUsers(usrs);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMeeting = (meeting: DbCustomerMeeting) => {
    setViewingItem(meeting);
    setViewingItemType('meeting');
    setIsDetailModalOpen(true);
  };

  const handleViewAssessment = (assessment: DbCustomerAssessment) => {
    setViewingItem(assessment);
    setViewingItemType('assessment');
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (item: any, type: 'meeting' | 'assessment') => {
    setItemToDelete({ item, type });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setIsSubmitting(true);
    try {
      if (itemToDelete.type === 'meeting') {
        await customerMeetingsService.delete(itemToDelete.item.id);
        toast.success('Meeting Deleted', 'The meeting has been removed');
      } else {
        await customerAssessmentsService.delete(itemToDelete.item.id);
        toast.success('Assessment Deleted', 'The assessment has been removed');
      }
      setIsDeleteDialogOpen(false);
      setIsDetailModalOpen(false);
      setItemToDelete(null);
      setViewingItem(null);
      setViewingItemType(null);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error', 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle contact selection for assessment - load requirements for that contact
  const handleContactSelectForAssessment = async (contactId: string) => {
    setAssessmentForm(prev => ({ ...prev, contact_id: contactId, requirement_id: '', application_id: '' }));
    setContactRequirements([]);
    setRequirementCandidates([]);
    
    if (contactId) {
      try {
        const allRequirements = await requirementsService.getAll();
        // Requirements are linked to contacts
        const contactReqs = allRequirements.filter(r => r.contact_id === contactId);
        setContactRequirements(contactReqs);
      } catch (error) {
        console.error('Error loading requirements:', error);
      }
    }
  };

  // Handle requirement selection - load candidates for that requirement
  const handleRequirementSelectForAssessment = async (requirementId: string) => {
    setAssessmentForm(prev => ({ ...prev, requirement_id: requirementId, application_id: '' }));
    setRequirementCandidates([]);
    
    if (requirementId) {
      try {
        const applications = await applicationsService.getByRequirement(requirementId);
        // Only show candidates that have progressed (not rejected)
        const validApplications = applications.filter(app => 
          app.status !== 'rejected' && app.candidate
        );
        setRequirementCandidates(validApplications.map(app => ({
          id: app.id,
          candidate: app.candidate,
        })));
      } catch (error) {
        console.error('Error loading candidates:', error);
      }
    }
  };

  const handleCreateMeeting = async () => {
    if (createType === 'client_meeting') {
      if (!meetingForm.contact_id || !meetingForm.subject) {
        toast.error('Validation Error', 'Contact and subject are required');
        return;
      }
      
      const contact = contacts.find(c => c.id === meetingForm.contact_id);
      if (!contact) return;
      
      setIsSubmitting(true);
      try {
        const scheduledAt = meetingForm.scheduled_at && meetingForm.scheduled_time
          ? `${meetingForm.scheduled_at}T${meetingForm.scheduled_time}:00`
          : undefined;
          
        await customerMeetingsService.create({
          company_id: contact.company_id,
          contact_id: meetingForm.contact_id,
          meeting_type: meetingForm.meeting_type,
          subject: meetingForm.subject,
          scheduled_at: scheduledAt,
          duration_minutes: parseInt(meetingForm.duration_minutes) || undefined,
          location: meetingForm.location || undefined,
          preparation_notes: meetingForm.preparation_notes || undefined,
        });
        
        toast.success('Meeting Created', 'Client meeting has been scheduled');
        setIsCreateModalOpen(false);
        resetForms();
        loadData();
      } catch (error: any) {
        console.error('Error creating meeting:', error);
        toast.error('Error', error.message || 'Failed to create meeting');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Candidate assessment - robust flow
      if (!assessmentForm.contact_id) {
        toast.error('Validation Error', 'Please select a contact');
        return;
      }
      if (!assessmentForm.requirement_id) {
        toast.error('Validation Error', 'Please select a requirement');
        return;
      }
      if (!assessmentForm.application_id) {
        toast.error('Validation Error', 'Please select a candidate');
        return;
      }
      if (!assessmentForm.subject) {
        toast.error('Validation Error', 'Please enter a title for the assessment');
        return;
      }
      if (!assessmentForm.scheduled_date) {
        toast.error('Validation Error', 'Please select a date');
        return;
      }
      
      setIsSubmitting(true);
      try {
        await customerAssessmentsService.create({
          application_id: assessmentForm.application_id,
          contact_id: assessmentForm.contact_id,
          scheduled_date: assessmentForm.scheduled_date,
          scheduled_time: assessmentForm.scheduled_time || undefined,
          location: assessmentForm.location || undefined,
          notes: assessmentForm.subject + (assessmentForm.notes ? '\n\n' + assessmentForm.notes : ''),
        });
        
        toast.success('Assessment Scheduled', 'Candidate assessment has been scheduled');
        setIsCreateModalOpen(false);
        resetForms();
        loadData();
      } catch (error: any) {
        console.error('Error creating assessment:', error);
        toast.error('Error', error.message || 'Failed to schedule assessment');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSetOutcome = async (outcome: 'go' | 'nogo') => {
    if (!selectedAssessment) return;
    
    setIsSubmitting(true);
    try {
      await customerAssessmentsService.updateOutcome(
        selectedAssessment.id, 
        outcome, 
        outcomeNotes || undefined
      );
      
      toast.success(
        outcome === 'go' ? 'Marked as GO!' : 'Marked as NO GO',
        'Assessment outcome has been recorded'
      );
      
      setIsOutcomeModalOpen(false);
      setSelectedAssessment(null);
      setOutcomeNotes('');
      loadData();
    } catch (error) {
      console.error('Error updating outcome:', error);
      toast.error('Error', 'Failed to update outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setMeetingForm({
      contact_id: '',
      meeting_type: 'call',
      subject: '',
      scheduled_at: '',
      scheduled_time: '',
      duration_minutes: '30',
      location: '',
      preparation_notes: '',
    });
    setAssessmentForm({
      contact_id: '',
      requirement_id: '',
      application_id: '',
      subject: '',
      scheduled_date: '',
      scheduled_time: '',
      location: '',
      notes: '',
    });
    setContactRequirements([]);
    setRequirementCandidates([]);
  };

  // Handle meeting status update
  const handleOpenStatusModal = (status: 'completed' | 'cancelled') => {
    setStatusToSet(status);
    setMeetingOutcomeNotes('');
    setIsStatusModalOpen(true);
  };

  const handleUpdateMeetingStatus = async () => {
    if (!viewingItem || !statusToSet) return;
    
    setIsSubmitting(true);
    try {
      await customerMeetingsService.updateStatus(
        viewingItem.id,
        statusToSet,
        meetingOutcomeNotes || undefined
      );
      
      toast.success(
        statusToSet === 'completed' ? 'Meeting Completed' : 'Meeting Cancelled',
        statusToSet === 'completed' 
          ? 'Meeting has been marked as completed' 
          : 'Meeting has been cancelled'
      );
      
      setIsStatusModalOpen(false);
      setIsDetailModalOpen(false);
      setViewingItem(null);
      setViewingItemType(null);
      setStatusToSet(null);
      setMeetingOutcomeNotes('');
      loadData();
    } catch (error) {
      console.error('Error updating meeting status:', error);
      toast.error('Error', 'Failed to update meeting status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build searchable options
  const contactOptions = contacts.map(c => {
    const company = c.company || companies.find(co => co.id === c.company_id);
    return {
      value: c.id,
      label: `${c.first_name} ${c.last_name}`,
      sublabel: `${c.role ? c.role + ' - ' : ''}${company?.name || ''}`,
    };
  });

  // Combine and sort all meetings
  const allMeetings = [
    ...customerMeetings.map(m => ({ ...m, type: 'client' as const })),
    ...assessments.map(a => ({ ...a, type: 'assessment' as const })),
  ].sort((a, b) => {
    const dateA = a.type === 'client' ? a.scheduled_at : a.scheduled_date;
    const dateB = b.type === 'client' ? b.scheduled_at : b.scheduled_date;
    return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
  });

  const filteredMeetings = meetingTypeFilter === 'all' 
    ? allMeetings
    : allMeetings.filter(m => m.type === (meetingTypeFilter === 'client' ? 'client' : 'assessment'));

  const stats = {
    total: allMeetings.length,
    clientMeetings: customerMeetings.length,
    assessments: assessments.length,
    pendingAssessments: assessments.filter(a => !a.outcome || a.outcome === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Header
        title="Client Meetings"
        subtitle={`${stats.total} meetings · ${stats.pendingAssessments} assessments pending`}
        actions={
          <Button
            variant="success"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Meeting
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${meetingTypeFilter === 'all' ? 'ring-2 ring-brand-cyan' : ''}`}
            onClick={() => setMeetingTypeFilter('all')}
          >
            <div className="text-2xl font-bold text-brand-slate-900">{stats.total}</div>
            <div className="text-sm text-brand-grey-400">All Meetings</div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${meetingTypeFilter === 'client' ? 'ring-2 ring-brand-cyan' : ''}`}
            onClick={() => setMeetingTypeFilter('client')}
          >
            <div className="text-2xl font-bold text-brand-cyan">{stats.clientMeetings}</div>
            <div className="text-sm text-brand-grey-400">Client Meetings</div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${meetingTypeFilter === 'assessment' ? 'ring-2 ring-brand-orange' : ''}`}
            onClick={() => setMeetingTypeFilter('assessment')}
          >
            <div className="text-2xl font-bold text-brand-orange">{stats.assessments}</div>
            <div className="text-sm text-brand-grey-400">Candidate Assessments</div>
          </Card>
        </div>

        {/* Meetings List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading meetings...</div>
          </Card>
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No meetings"
            description="Schedule a client meeting or candidate assessment"
            action={{
              label: 'New Meeting',
              onClick: () => setIsCreateModalOpen(true),
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => {
              if (meeting.type === 'client') {
                // Client meeting card
                const contact = contacts.find(c => c.id === meeting.contact_id);
                const company = contact?.company || companies.find(co => co.id === contact?.company_id);
                const creator = meeting.creator || users.find(u => u.id === meeting.created_by);
                const MeetingIcon = meetingTypeIcons[meeting.meeting_type] || Phone;
                const status = meeting.status || 'planned';
                const statusConfig = meetingStatusConfig[status as keyof typeof meetingStatusConfig] || meetingStatusConfig.planned;
                
                return (
                  <Card 
                    key={`meeting-${meeting.id}`} 
                    className={`hover:shadow-md transition-shadow border-l-4 cursor-pointer ${
                      status === 'completed' ? 'border-l-green-500' :
                      status === 'cancelled' ? 'border-l-red-400 opacity-75' :
                      'border-l-brand-cyan'
                    }`}
                    onClick={() => handleViewMeeting(meeting)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        status === 'completed' ? 'bg-green-100' :
                        status === 'cancelled' ? 'bg-red-100' :
                        'bg-brand-cyan/10'
                      }`}>
                        <MeetingIcon className={`h-5 w-5 ${
                          status === 'completed' ? 'text-green-600' :
                          status === 'cancelled' ? 'text-red-500' :
                          'text-brand-cyan'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${status === 'cancelled' ? 'text-brand-grey-500 line-through' : 'text-brand-slate-900'}`}>
                            {meeting.subject}
                          </h3>
                          <Badge variant={statusConfig.colour as any}>{statusConfig.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                          {contact && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {contact.first_name} {contact.last_name}
                            </span>
                          )}
                          {company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {company.name}
                            </span>
                          )}
                          {meeting.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(meeting.scheduled_at)}
                            </span>
                          )}
                          {meeting.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {meeting.location}
                            </span>
                          )}
                          {creator && (
                            <span className="flex items-center gap-1 text-brand-grey-500">
                              <Users className="h-4 w-4" />
                              {creator.full_name}
                            </span>
                          )}
                        </div>
                        {meeting.preparation_notes && status === 'planned' && (
                          <p className="text-sm text-brand-grey-500 mt-2 line-clamp-2">{meeting.preparation_notes}</p>
                        )}
                        {meeting.outcome_notes && status !== 'planned' && (
                          <p className={`text-sm mt-2 line-clamp-2 ${
                            status === 'completed' ? 'text-green-700' : 'text-red-600'
                          }`}>{meeting.outcome_notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              } else {
                // Assessment card
                const outcome = meeting.outcome || 'pending';
                const config = outcomeConfig[outcome as keyof typeof outcomeConfig];
                const Icon = config.icon;
                const candidate = meeting.application?.candidate || candidates.find(c => c.id === meeting.candidate_id);
                const contact = contacts.find(c => c.id === meeting.contact_id);
                const company = contact?.company || companies.find(co => co.id === contact?.company_id);
                
                return (
                  <Card 
                    key={`assessment-${meeting.id}`} 
                    className="hover:shadow-md transition-shadow border-l-4 border-l-brand-orange cursor-pointer"
                    onClick={() => handleViewAssessment(meeting)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar 
                          name={candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown'}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 
                              className="font-semibold text-brand-slate-900 cursor-pointer hover:text-brand-cyan"
                              onClick={() => candidate && navigate(`/candidates/${candidate.id}`)}
                            >
                              {candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown Candidate'}
                            </h3>
                            <Badge variant="orange">Assessment</Badge>
                            <div className="flex items-center gap-1">
                              <Icon className="h-3.5 w-3.5" style={{ color: config.colour === 'green' ? '#22c55e' : config.colour === 'red' ? '#ef4444' : '#f97316' }} />
                              <Badge variant={config.colour as any}>
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                            {contact && (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {contact.first_name} {contact.last_name}
                              </span>
                            )}
                            {company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {company.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(meeting.scheduled_date)}
                              {meeting.scheduled_time && ` at ${meeting.scheduled_time}`}
                            </span>
                            {meeting.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {meeting.location}
                              </span>
                            )}
                          </div>
                          
                          {meeting.notes && (
                            <p className="text-sm text-brand-grey-500 mt-2">{meeting.notes}</p>
                          )}
                          
                          {meeting.outcome_notes && (
                            <p className="text-sm text-brand-slate-700 mt-2 p-2 bg-brand-grey-50 rounded">
                              <strong>Outcome:</strong> {meeting.outcome_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions for pending assessments */}
                      {(!meeting.outcome || meeting.outcome === 'pending') && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedAssessment(meeting as DbCustomerAssessment);
                            setIsOutcomeModalOpen(true);
                          }}
                        >
                          Record Outcome
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Create Meeting Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForms(); }}
        title="New Meeting"
        description="Schedule a client meeting or candidate assessment"
        size="lg"
      >
        <div className="space-y-4">
          {/* Meeting Type Toggle */}
          <div className="flex gap-2 p-1 bg-brand-grey-100 rounded-lg">
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                createType === 'client_meeting' 
                  ? 'bg-white text-brand-slate-900 shadow-sm' 
                  : 'text-brand-grey-500 hover:text-brand-slate-700'
              }`}
              onClick={() => setCreateType('client_meeting')}
            >
              Client Meeting
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                createType === 'candidate_assessment' 
                  ? 'bg-white text-brand-slate-900 shadow-sm' 
                  : 'text-brand-grey-500 hover:text-brand-slate-700'
              }`}
              onClick={() => setCreateType('candidate_assessment')}
            >
              Candidate Assessment
            </button>
          </div>

          {createType === 'client_meeting' ? (
            <>
              <SearchableSelect
                label="Contact *"
                placeholder="Type to search contacts..."
                options={contactOptions}
                value={meetingForm.contact_id}
                onChange={(val) => setMeetingForm(prev => ({ ...prev, contact_id: val }))}
              />
              
              <Input
                label="Subject *"
                value={meetingForm.subject}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Introduction call, Requirements discussion"
              />

              <Select
                label="Meeting Type"
                options={[
                  { value: 'call', label: 'Phone Call' },
                  { value: 'video', label: 'Video Call' },
                  { value: 'in_person', label: 'In Person' },
                  { value: 'email', label: 'Email' },
                ]}
                value={meetingForm.meeting_type}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, meeting_type: e.target.value }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={meetingForm.scheduled_at}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                />
                <Input
                  label="Time"
                  type="time"
                  value={meetingForm.scheduled_time}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>

              <Select
                label="Duration"
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '45', label: '45 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '90', label: '1.5 hours' },
                  { value: '120', label: '2 hours' },
                ]}
                value={meetingForm.duration_minutes}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
              />

              {meetingForm.meeting_type === 'in_person' && (
                <Input
                  label="Location"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Address or meeting room"
                />
              )}

              <Textarea
                label="Preparation Notes"
                value={meetingForm.preparation_notes}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, preparation_notes: e.target.value }))}
                placeholder="What to prepare for this meeting, topics to discuss, background info..."
                rows={3}
              />
            </>
          ) : (
            <>
              {/* Step 1: Select Contact */}
              <SearchableSelect
                label="Contact *"
                placeholder="Type to search contacts..."
                options={contactOptions}
                value={assessmentForm.contact_id}
                onChange={(val) => handleContactSelectForAssessment(val)}
              />
              
              {/* Step 2: Select Requirement (dropdown - only shown after contact selected) */}
              {assessmentForm.contact_id && (
                contactRequirements.length > 0 ? (
                  <Select
                    label="Requirement *"
                    options={[
                      { value: '', label: 'Select Requirement' },
                      ...contactRequirements.map(r => ({
                        value: r.id,
                        label: `${r.title || r.customer}${r.location ? ' - ' + r.location : ''}${r.reference_id ? ` [${r.reference_id}]` : ''}`
                      }))
                    ]}
                    value={assessmentForm.requirement_id}
                    onChange={(e) => handleRequirementSelectForAssessment(e.target.value)}
                  />
                ) : (
                  <div className="p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-lg">
                    <p className="text-sm text-brand-orange">
                      No requirements found for this contact. Create a requirement first.
                    </p>
                  </div>
                )
              )}

              {/* Step 3: Select Candidate (dropdown - only shown after requirement selected) */}
              {assessmentForm.requirement_id && (
                requirementCandidates.length > 0 ? (
                  <Select
                    label="Candidate *"
                    options={[
                      { value: '', label: 'Select Candidate' },
                      ...requirementCandidates.map(rc => ({
                        value: rc.id,
                        label: `${rc.candidate?.first_name} ${rc.candidate?.last_name}${rc.candidate?.reference_id ? ` [${rc.candidate.reference_id}]` : ''}`
                      }))
                    ]}
                    value={assessmentForm.application_id}
                    onChange={(e) => setAssessmentForm(prev => ({ ...prev, application_id: e.target.value }))}
                  />
                ) : (
                  <div className="p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-lg">
                    <p className="text-sm text-brand-orange">
                      No candidates linked to this requirement yet. Link candidates to the requirement first.
                    </p>
                  </div>
                )
              )}

              <Input
                label="Title / Subject *"
                value={assessmentForm.subject}
                onChange={(e) => setAssessmentForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Technical assessment, Final interview"
              />

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
                value={assessmentForm.location}
                onChange={(e) => setAssessmentForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Customer office address"
              />

              <Textarea
                label="Notes"
                value={assessmentForm.notes}
                onChange={(e) => setAssessmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Assessment details, what to prepare..."
                rows={2}
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForms(); }}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleCreateMeeting} isLoading={isSubmitting}>
              {createType === 'client_meeting' ? 'Schedule Meeting' : 'Schedule Assessment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Outcome Modal */}
      <Modal
        isOpen={isOutcomeModalOpen}
        onClose={() => {
          setIsOutcomeModalOpen(false);
          setSelectedAssessment(null);
          setOutcomeNotes('');
        }}
        title="Record Assessment Outcome"
        description="How did the candidate assessment go?"
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Outcome Notes (optional)"
            placeholder="Any feedback from the customer..."
            value={outcomeNotes}
            onChange={(e) => setOutcomeNotes(e.target.value)}
            rows={3}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="danger"
              className="flex-1"
              leftIcon={<XCircle className="h-5 w-5" />}
              onClick={() => handleSetOutcome('nogo')}
              isLoading={isSubmitting}
            >
              NO GO
            </Button>
            <Button
              variant="success"
              className="flex-1"
              leftIcon={<CheckCircle className="h-5 w-5" />}
              onClick={() => handleSetOutcome('go')}
              isLoading={isSubmitting}
            >
              GO
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setViewingItem(null); setViewingItemType(null); }}
        title={viewingItemType === 'meeting' ? 'Meeting Details' : 'Assessment Details'}
        size="lg"
      >
        {viewingItem && viewingItemType === 'meeting' && (() => {
          const contact = contacts.find(c => c.id === viewingItem.contact_id);
          const company = contact?.company || companies.find(co => co.id === contact?.company_id);
          const creator = viewingItem.creator || users.find(u => u.id === viewingItem.created_by);
          const MeetingIcon = meetingTypeIcons[viewingItem.meeting_type] || Phone;
          const meetingTypeLabels: Record<string, string> = {
            call: 'Phone Call',
            video: 'Video Call',
            in_person: 'In Person',
            email: 'Email',
          };
          const status = viewingItem.status || 'planned';
          const statusConfig = meetingStatusConfig[status as keyof typeof meetingStatusConfig] || meetingStatusConfig.planned;
          const StatusIcon = statusConfig.icon;
          
          return (
            <div className="space-y-6">
              {/* Header with status */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-cyan/10 rounded-lg">
                    <MeetingIcon className="h-6 w-6 text-brand-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-brand-slate-900">{viewingItem.subject}</h3>
                    <p className="text-sm text-brand-grey-500">{meetingTypeLabels[viewingItem.meeting_type] || viewingItem.meeting_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${
                    status === 'completed' ? 'text-green-500' : 
                    status === 'cancelled' ? 'text-red-500' : 
                    'text-blue-500'
                  }`} />
                  <Badge variant={statusConfig.colour as any}>{statusConfig.label}</Badge>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
                {contact && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Contact</p>
                    <p className="font-medium text-brand-slate-900">{contact.first_name} {contact.last_name}</p>
                    {contact.role && <p className="text-sm text-brand-grey-500">{contact.role}</p>}
                  </div>
                )}
                {company && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Company</p>
                    <p className="font-medium text-brand-slate-900">{company.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-brand-grey-400">Date & Time</p>
                  <p className="font-medium text-brand-slate-900">
                    {viewingItem.scheduled_at ? formatDate(viewingItem.scheduled_at) : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-grey-400">Duration</p>
                  <p className="font-medium text-brand-slate-900">
                    {viewingItem.duration_minutes ? `${viewingItem.duration_minutes} minutes` : 'Not specified'}
                  </p>
                </div>
                {viewingItem.location && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Location</p>
                    <p className="font-medium text-brand-slate-900">{viewingItem.location}</p>
                  </div>
                )}
                {creator && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Organised by</p>
                    <p className="font-medium text-brand-slate-900">{creator.full_name}</p>
                  </div>
                )}
              </div>

              {/* Preparation Notes */}
              {viewingItem.preparation_notes && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Preparation Notes
                  </h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{viewingItem.preparation_notes}</p>
                </div>
              )}

              {/* Outcome Notes (shown after meeting is completed or cancelled) */}
              {viewingItem.outcome_notes && (
                <div className={`p-4 rounded-lg border ${
                  status === 'completed' 
                    ? 'bg-green-50 border-green-100' 
                    : 'bg-red-50 border-red-100'
                }`}>
                  <h4 className={`font-medium mb-2 flex items-center gap-2 ${
                    status === 'completed' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {status === 'completed' ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Meeting Outcome
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Cancellation Reason
                      </>
                    )}
                  </h4>
                  <p className={`text-sm whitespace-pre-wrap ${
                    status === 'completed' ? 'text-green-800' : 'text-red-800'
                  }`}>{viewingItem.outcome_notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-between pt-4 border-t border-brand-grey-200">
                <div className="flex gap-2">
                  {permissions.isAdmin && (
                    <Button 
                      variant="danger" 
                      size="sm"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDeleteClick(viewingItem, 'meeting')}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Status change buttons - only show for planned meetings */}
                  {status === 'planned' && (
                    <>
                      <Button 
                        variant="danger" 
                        size="sm"
                        leftIcon={<XCircle className="h-4 w-4" />}
                        onClick={() => handleOpenStatusModal('cancelled')}
                      >
                        Cancel Meeting
                      </Button>
                      <Button 
                        variant="success" 
                        size="sm"
                        leftIcon={<CheckCircle className="h-4 w-4" />}
                        onClick={() => handleOpenStatusModal('completed')}
                      >
                        Mark Complete
                      </Button>
                    </>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {viewingItem && viewingItemType === 'assessment' && (() => {
          const candidate = viewingItem.application?.candidate || candidates.find(c => c.id === viewingItem.candidate_id);
          const contact = contacts.find(c => c.id === viewingItem.contact_id);
          const company = contact?.company || companies.find(co => co.id === contact?.company_id);
          const outcome = viewingItem.outcome || 'pending';
          const config = outcomeConfig[outcome as keyof typeof outcomeConfig];
          
          return (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown'} size="lg" />
                  <div>
                    <h3 className="text-lg font-semibold text-brand-slate-900">
                      {candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown Candidate'}
                    </h3>
                    {candidate?.email && <p className="text-sm text-brand-grey-500">{candidate.email}</p>}
                    {candidate?.reference_id && (
                      <span className="text-xs font-mono text-brand-grey-400">{candidate.reference_id}</span>
                    )}
                  </div>
                </div>
                <Badge variant={config.colour as any}>{config.label}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
                {contact && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Customer Contact</p>
                    <p className="font-medium text-brand-slate-900">{contact.first_name} {contact.last_name}</p>
                    {contact.role && <p className="text-sm text-brand-grey-500">{contact.role}</p>}
                  </div>
                )}
                {company && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Company</p>
                    <p className="font-medium text-brand-slate-900">{company.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-brand-grey-400">Scheduled Date</p>
                  <p className="font-medium text-brand-slate-900">
                    {viewingItem.scheduled_date ? formatDate(viewingItem.scheduled_date) : 'Not scheduled'}
                    {viewingItem.scheduled_time && ` at ${viewingItem.scheduled_time}`}
                  </p>
                </div>
                {viewingItem.location && (
                  <div>
                    <p className="text-xs text-brand-grey-400">Location</p>
                    <p className="font-medium text-brand-slate-900">{viewingItem.location}</p>
                  </div>
                )}
              </div>

              {viewingItem.notes && (
                <div>
                  <h4 className="font-medium text-brand-slate-900 mb-2">Notes</h4>
                  <p className="text-sm text-brand-grey-600 whitespace-pre-wrap">{viewingItem.notes}</p>
                </div>
              )}

              {viewingItem.outcome_notes && (
                <div>
                  <h4 className="font-medium text-brand-slate-900 mb-2">Outcome Notes</h4>
                  <p className="text-sm text-brand-grey-600 whitespace-pre-wrap">{viewingItem.outcome_notes}</p>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-brand-grey-200">
                <div>
                  {permissions.isAdmin && (
                    <Button 
                      variant="danger" 
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDeleteClick(viewingItem, 'assessment')}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                    Close
                  </Button>
                  {candidate && (
                    <Button variant="primary" onClick={() => navigate(`/candidates/${candidate.id}`)}>
                      View Candidate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Meeting Status Update Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => { setIsStatusModalOpen(false); setStatusToSet(null); setMeetingOutcomeNotes(''); }}
        title={statusToSet === 'completed' ? 'Complete Meeting' : 'Cancel Meeting'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-brand-grey-600">
            {statusToSet === 'completed' 
              ? 'Add notes about the meeting outcome and key takeaways.'
              : 'Please provide a reason for cancelling this meeting.'}
          </p>
          
          <Textarea
            label={statusToSet === 'completed' ? 'Meeting Outcome / Takeaways' : 'Cancellation Reason'}
            value={meetingOutcomeNotes}
            onChange={(e) => setMeetingOutcomeNotes(e.target.value)}
            placeholder={statusToSet === 'completed' 
              ? 'What was discussed? What are the next steps?'
              : 'Why is this meeting being cancelled?'}
            rows={4}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button 
              variant="secondary" 
              onClick={() => { setIsStatusModalOpen(false); setStatusToSet(null); setMeetingOutcomeNotes(''); }}
            >
              Cancel
            </Button>
            <Button
              variant={statusToSet === 'completed' ? 'success' : 'danger'}
              leftIcon={statusToSet === 'completed' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              onClick={handleUpdateMeetingStatus}
              isLoading={isSubmitting}
            >
              {statusToSet === 'completed' ? 'Mark as Complete' : 'Cancel Meeting'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteItem}
        title={itemToDelete?.type === 'meeting' ? 'Delete Meeting' : 'Delete Assessment'}
        message="Are you sure you want to delete this? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
