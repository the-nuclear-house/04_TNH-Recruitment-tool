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
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToast } from '@/lib/stores/ui-store';
import { 
  customerMeetingsService,
  customerAssessmentsService, 
  contactsService,
  candidatesService,
  companiesService,
  requirementsService,
  applicationsService,
  type DbCustomerMeeting,
  type DbCustomerAssessment,
  type DbContact,
  type DbCandidate,
  type DbCompany,
  type DbRequirement,
} from '@/lib/services';

type MeetingType = 'client_meeting' | 'candidate_assessment';

const outcomeConfig = {
  pending: { label: 'Pending', colour: 'orange', icon: Clock },
  go: { label: 'GO', colour: 'green', icon: CheckCircle },
  nogo: { label: 'NO GO', colour: 'red', icon: XCircle },
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
  
  // Data
  const [customerMeetings, setCustomerMeetings] = useState<DbCustomerMeeting[]>([]);
  const [assessments, setAssessments] = useState<DbCustomerAssessment[]>([]);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [candidates, setCandidates] = useState<DbCandidate[]>([]);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<'all' | 'client' | 'assessment'>('all');
  
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
    notes: '',
  });
  
  // Assessment form - robust flow: Company -> Requirement -> Candidate
  const [assessmentForm, setAssessmentForm] = useState({
    company_id: '',
    requirement_id: '',
    application_id: '', // The application links candidate to requirement
    subject: '',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
  });
  const [companyRequirements, setCompanyRequirements] = useState<DbRequirement[]>([]);
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
      const [meetings, assmnts, conts, cands, comps] = await Promise.all([
        customerMeetingsService.getAll(),
        customerAssessmentsService.getAll(),
        contactsService.getAll(),
        candidatesService.getAll(),
        companiesService.getAll(),
      ]);
      setCustomerMeetings(meetings);
      setAssessments(assmnts);
      setContacts(conts);
      setCandidates(cands);
      setCompanies(comps);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle company selection for assessment - load requirements for that company
  const handleCompanySelectForAssessment = async (companyId: string) => {
    setAssessmentForm(prev => ({ ...prev, company_id: companyId, requirement_id: '', application_id: '' }));
    setCompanyRequirements([]);
    setRequirementCandidates([]);
    
    if (companyId) {
      try {
        const allRequirements = await requirementsService.getAll();
        const companyReqs = allRequirements.filter(r => r.company_id === companyId);
        setCompanyRequirements(companyReqs);
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
          notes: meetingForm.notes || undefined,
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
      if (!assessmentForm.company_id) {
        toast.error('Validation Error', 'Please select a customer');
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
      notes: '',
    });
    setAssessmentForm({
      company_id: '',
      requirement_id: '',
      application_id: '',
      subject: '',
      scheduled_date: '',
      scheduled_time: '',
      location: '',
      notes: '',
    });
    setCompanyRequirements([]);
    setRequirementCandidates([]);
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

  const companyOptions = companies.map(c => ({
    value: c.id,
    label: c.name,
    sublabel: c.industry || undefined,
  }));

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
                const MeetingIcon = meetingTypeIcons[meeting.meeting_type] || Phone;
                
                return (
                  <Card key={`meeting-${meeting.id}`} className="hover:shadow-md transition-shadow border-l-4 border-l-brand-cyan">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-brand-cyan/10 rounded-lg">
                        <MeetingIcon className="h-5 w-5 text-brand-cyan" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-brand-slate-900">{meeting.subject}</h3>
                          <Badge variant="cyan">Client Meeting</Badge>
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
                        </div>
                        {meeting.notes && (
                          <p className="text-sm text-brand-grey-500 mt-2">{meeting.notes}</p>
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
                  <Card key={`assessment-${meeting.id}`} className="hover:shadow-md transition-shadow border-l-4 border-l-brand-orange">
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
                label="Notes"
                value={meetingForm.notes}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={2}
              />
            </>
          ) : (
            <>
              {/* Step 1: Select Customer (Company) */}
              <SearchableSelect
                label="Customer (Company) *"
                placeholder="Type to search companies..."
                options={companyOptions}
                value={assessmentForm.company_id}
                onChange={(val) => handleCompanySelectForAssessment(val)}
              />
              
              {/* Step 2: Select Requirement (only shown after company selected) */}
              {assessmentForm.company_id && (
                companyRequirements.length > 0 ? (
                  <Select
                    label="Requirement *"
                    options={[
                      { value: '', label: 'Select Requirement' },
                      ...companyRequirements.map(r => ({
                        value: r.id,
                        label: `${r.location || 'No location'} - ${r.fte_count || 1} FTE${r.status ? ` (${r.status})` : ''}`
                      }))
                    ]}
                    value={assessmentForm.requirement_id}
                    onChange={(e) => handleRequirementSelectForAssessment(e.target.value)}
                  />
                ) : (
                  <div className="p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-lg">
                    <p className="text-sm text-brand-orange">
                      No requirements found for this customer. Create a requirement first.
                    </p>
                  </div>
                )
              )}

              {/* Step 3: Select Candidate (only shown after requirement selected) */}
              {assessmentForm.requirement_id && (
                requirementCandidates.length > 0 ? (
                  <SearchableSelect
                    label="Candidate *"
                    placeholder="Type to search candidates..."
                    options={requirementCandidates.map(rc => ({
                      value: rc.id,
                      label: `${rc.candidate?.first_name} ${rc.candidate?.last_name}`,
                      sublabel: rc.candidate?.email || undefined
                    }))}
                    value={assessmentForm.application_id}
                    onChange={(val) => setAssessmentForm(prev => ({ ...prev, application_id: val }))}
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
    </div>
  );
}
