import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Shield,
  PoundSterling,
  Linkedin,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Plus,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { candidatesService, interviewsService, usersService } from '@/lib/services';

type InterviewStage = 'phone_qualification' | 'technical_interview' | 'director_interview';

const stageConfig: Record<InterviewStage, { 
  label: string; 
  icon: typeof Phone;
  colour: string;
  bgColour: string;
}> = {
  phone_qualification: { 
    label: 'Phone Qualification', 
    icon: Phone, 
    colour: 'text-blue-700',
    bgColour: 'bg-blue-100',
  },
  technical_interview: { 
    label: 'Technical Interview', 
    icon: Briefcase, 
    colour: 'text-purple-700',
    bgColour: 'bg-purple-100',
  },
  director_interview: { 
    label: 'Director Interview', 
    icon: User, 
    colour: 'text-amber-700',
    bgColour: 'bg-amber-100',
  },
};

const statusLabels: Record<string, string> = {
  new: 'New',
  screening: 'Screening',
  phone_qualification: 'Phone Qualification',
  technical_interview: 'Technical Interview',
  director_interview: 'Director Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  on_hold: 'On Hold',
};

const clearanceLabels: Record<string, string> = {
  none: 'None',
  bpss: 'BPSS',
  ctc: 'CTC',
  sc: 'SC',
  esc: 'eSC',
  dv: 'DV',
  edv: 'eDV',
};

const scoreOptions = [
  { value: '', label: 'Select score' },
  { value: '1', label: '1 - Poor' },
  { value: '2', label: '2 - Below Average' },
  { value: '3', label: '3 - Average' },
  { value: '4', label: '4 - Good' },
  { value: '5', label: '5 - Excellent' },
];

export function CandidateProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuthStore();
  
  const [candidate, setCandidate] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  
  // Schedule interview modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<InterviewStage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    interviewer_id: '',
    scheduled_date: '',
    scheduled_time: '',
  });
  
  // Complete interview modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    outcome: '',
    communication_score: '',
    professionalism_score: '',
    enthusiasm_score: '',
    cultural_fit_score: '',
    technical_depth_score: '',
    problem_solving_score: '',
    general_comments: '',
    recommendation: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [candidateData, interviewsData, usersData] = await Promise.all([
        candidatesService.getById(id!),
        interviewsService.getByCandidate(id!),
        usersService.getAll(),
      ]);
      
      setCandidate(candidateData);
      setInterviews(interviewsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading candidate:', error);
      toast.error('Error', 'Failed to load candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const getInterviewByStage = (stage: InterviewStage) => {
    return interviews.find(i => i.stage === stage);
  };

  const handleScheduleInterview = (stage: InterviewStage) => {
    setSelectedStage(stage);
    setScheduleForm({
      interviewer_id: '',
      scheduled_date: '',
      scheduled_time: '',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSubmitSchedule = async () => {
    if (!scheduleForm.interviewer_id || !scheduleForm.scheduled_date || !scheduleForm.scheduled_time) {
      toast.error('Validation Error', 'Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const scheduledAt = `${scheduleForm.scheduled_date}T${scheduleForm.scheduled_time}:00`;
      
      await interviewsService.create({
        candidate_id: id!,
        stage: selectedStage!,
        interviewer_id: scheduleForm.interviewer_id,
        scheduled_at: scheduledAt,
      });
      
      toast.success('Interview Scheduled', `${stageConfig[selectedStage!].label} has been scheduled`);
      setIsScheduleModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast.error('Error', 'Failed to schedule interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCompleteModal = (interview: any) => {
    setSelectedInterview(interview);
    setFeedbackForm({
      outcome: interview.outcome === 'pending' ? '' : interview.outcome || '',
      communication_score: interview.communication_score?.toString() || '',
      professionalism_score: interview.professionalism_score?.toString() || '',
      enthusiasm_score: interview.enthusiasm_score?.toString() || '',
      cultural_fit_score: interview.cultural_fit_score?.toString() || '',
      technical_depth_score: interview.technical_depth_score?.toString() || '',
      problem_solving_score: interview.problem_solving_score?.toString() || '',
      general_comments: interview.general_comments || '',
      recommendation: interview.recommendation || '',
    });
    setIsCompleteModalOpen(true);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.outcome) {
      toast.error('Validation Error', 'Please select an outcome (Pass/Fail)');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await interviewsService.update(selectedInterview.id, {
        outcome: feedbackForm.outcome,
        completed_at: new Date().toISOString(),
        communication_score: feedbackForm.communication_score ? parseInt(feedbackForm.communication_score) : undefined,
        professionalism_score: feedbackForm.professionalism_score ? parseInt(feedbackForm.professionalism_score) : undefined,
        enthusiasm_score: feedbackForm.enthusiasm_score ? parseInt(feedbackForm.enthusiasm_score) : undefined,
        cultural_fit_score: feedbackForm.cultural_fit_score ? parseInt(feedbackForm.cultural_fit_score) : undefined,
        technical_depth_score: feedbackForm.technical_depth_score ? parseInt(feedbackForm.technical_depth_score) : undefined,
        problem_solving_score: feedbackForm.problem_solving_score ? parseInt(feedbackForm.problem_solving_score) : undefined,
        general_comments: feedbackForm.general_comments || undefined,
        recommendation: feedbackForm.recommendation || undefined,
      });
      
      toast.success('Interview Updated', 'Feedback has been saved');
      setIsCompleteModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Error', 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const interviewerOptions = [
    { value: '', label: 'Select Interviewer' },
    ...users.map(u => ({ value: u.id, label: `${u.full_name} (${u.role})` })),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Loading..." />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading candidate...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen">
        <Header title="Candidate Not Found" />
        <div className="p-6">
          <EmptyState
            title="Candidate not found"
            description="The candidate you're looking for doesn't exist."
            action={{
              label: 'Back to Candidates',
              onClick: () => navigate('/candidates'),
            }}
          />
        </div>
      </div>
    );
  }

  const allStages: InterviewStage[] = ['phone_qualification', 'technical_interview', 'director_interview'];

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Header
        title="Candidate Profile"
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/candidates')}
          >
            Back
          </Button>
        }
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-start gap-4">
              <Avatar
                name={`${candidate.first_name} ${candidate.last_name}`}
                size="xl"
              />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-brand-slate-900">
                    {candidate.first_name} {candidate.last_name}
                  </h1>
                  <Badge variant="cyan">
                    {statusLabels[candidate.status] || candidate.status}
                  </Badge>
                </div>
                <p className="text-brand-grey-400">{candidate.email}</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 md:border-l md:border-brand-grey-200 md:pl-6">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-brand-grey-400" />
                <a href={`mailto:${candidate.email}`} className="text-brand-cyan hover:underline">
                  {candidate.email}
                </a>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-brand-grey-400" />
                  <span className="text-brand-slate-700">{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-brand-grey-400" />
                  <span className="text-brand-slate-700">{candidate.location}</span>
                </div>
              )}
              {candidate.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin className="h-4 w-4 text-brand-grey-400" />
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="mt-6 pt-6 border-t border-brand-grey-200">
              <h3 className="text-sm font-medium text-brand-slate-700 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill: string) => (
                  <Badge key={skill} variant="cyan">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Previous Companies */}
          {candidate.previous_companies && candidate.previous_companies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-brand-slate-700 mb-3">Previous Companies</h3>
              <div className="flex flex-wrap gap-2">
                {candidate.previous_companies.map((company: string) => (
                  <Badge key={company} variant="grey">
                    <Building2 className="h-3 w-3 mr-1" />
                    {company}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Interview Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interview Pipeline</CardTitle>
              </CardHeader>
              
              <div className="space-y-4">
                {allStages.map((stage, index) => {
                  const interview = getInterviewByStage(stage);
                  const StageIcon = stageConfig[stage].icon;
                  const isCompleted = interview?.outcome === 'pass' || interview?.outcome === 'fail';
                  const isPending = interview?.outcome === 'pending';
                  const isNotStarted = !interview;
                  
                  const previousStage = index > 0 ? allStages[index - 1] : null;
                  const previousInterview = previousStage ? getInterviewByStage(previousStage) : null;
                  const canSchedule = isNotStarted && (index === 0 || previousInterview?.outcome === 'pass');
                  
                  const interviewer = interview ? users.find(u => u.id === interview.interviewer_id) : null;
                  const isMyInterview = interview?.interviewer_id === user?.id;
                  const canComplete = isPending && isMyInterview;
                  const isExpanded = expandedInterview === interview?.id;
                  
                  return (
                    <div
                      key={stage}
                      className={`
                        rounded-lg border-2 transition-all
                        ${isCompleted ? 'border-green-200 bg-green-50/50' : 
                          isPending ? 'border-amber-200 bg-amber-50/50' :
                          canSchedule ? 'border-brand-grey-200 bg-white' :
                          'border-brand-grey-100 bg-brand-grey-50 opacity-50'}
                        ${canComplete ? 'cursor-pointer hover:border-amber-300' : ''}
                      `}
                      onClick={() => canComplete && handleOpenCompleteModal(interview)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center
                              ${isCompleted ? 'bg-green-100 text-green-700' :
                                isPending ? 'bg-amber-100 text-amber-700' :
                                isNotStarted && canSchedule ? `${stageConfig[stage].bgColour} ${stageConfig[stage].colour}` :
                                'bg-brand-grey-100 text-brand-grey-400'}
                            `}>
                              <StageIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className={`font-semibold ${isNotStarted && !canSchedule ? 'text-brand-grey-400' : 'text-brand-slate-900'}`}>
                                {stageConfig[stage].label}
                              </h3>
                              {interview && (
                                <div className="flex items-center gap-3 text-sm text-brand-grey-400 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(interview.scheduled_at || '')}
                                  </span>
                                  {interviewer && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3.5 w-3.5" />
                                      {interviewer.full_name}
                                      {isMyInterview && <span className="text-brand-cyan">(You)</span>}
                                    </span>
                                  )}
                                </div>
                              )}
                              {isNotStarted && !canSchedule && (
                                <p className="text-sm text-brand-grey-400">Complete previous stage first</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {interview?.outcome === 'pass' && (
                              <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                                <CheckCircle className="h-4 w-4" />
                                Pass
                              </span>
                            )}
                            {interview?.outcome === 'fail' && (
                              <span className="flex items-center gap-1 text-sm font-medium text-red-700">
                                <XCircle className="h-4 w-4" />
                                Fail
                              </span>
                            )}
                            {isPending && (
                              <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                                <Clock className="h-4 w-4" />
                                {canComplete ? 'Click to Complete' : 'Pending'}
                              </span>
                            )}
                            {isNotStarted && canSchedule && (
                              <Button
                                variant="success"
                                size="sm"
                                leftIcon={<Plus className="h-4 w-4" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScheduleInterview(stage);
                                }}
                              >
                                Schedule
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Completed interview details */}
                        {isCompleted && interview && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedInterview(isExpanded ? null : interview.id);
                              }}
                              className="flex items-center gap-1 text-sm text-brand-cyan hover:text-cyan-700"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {isExpanded ? 'Hide Details' : 'View Details'}
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-3 space-y-3">
                                {/* Scores */}
                                <div className="flex flex-wrap gap-4">
                                  {interview.communication_score && (
                                    <div className="text-sm">
                                      <span className="text-brand-grey-400">Communication:</span>{' '}
                                      <span className="font-medium">{interview.communication_score}/5</span>
                                    </div>
                                  )}
                                  {interview.professionalism_score && (
                                    <div className="text-sm">
                                      <span className="text-brand-grey-400">Professionalism:</span>{' '}
                                      <span className="font-medium">{interview.professionalism_score}/5</span>
                                    </div>
                                  )}
                                  {interview.technical_depth_score && (
                                    <div className="text-sm">
                                      <span className="text-brand-grey-400">Technical:</span>{' '}
                                      <span className="font-medium">{interview.technical_depth_score}/5</span>
                                    </div>
                                  )}
                                </div>
                                {interview.general_comments && (
                                  <div>
                                    <p className="text-sm text-brand-grey-400">Comments:</p>
                                    <p className="text-sm text-brand-slate-700">{interview.general_comments}</p>
                                  </div>
                                )}
                                {interview.recommendation && (
                                  <div>
                                    <p className="text-sm text-brand-grey-400">Recommendation:</p>
                                    <p className="text-sm text-brand-slate-700">{interview.recommendation}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Summary */}
            {candidate.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <p className="text-brand-slate-600 leading-relaxed">
                  {candidate.summary}
                </p>
              </Card>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {candidate.years_experience && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Experience</p>
                      <p className="text-sm text-brand-slate-700">{candidate.years_experience} years</p>
                    </div>
                  </div>
                )}
                
                {candidate.security_vetting && candidate.security_vetting !== 'none' && (
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Security Clearance</p>
                      <p className="text-sm text-brand-slate-700">
                        {clearanceLabels[candidate.security_vetting] || candidate.security_vetting.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}
                
                {candidate.minimum_salary_expected && (
                  <div className="flex items-center gap-3">
                    <PoundSterling className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Minimum Salary Expected</p>
                      <p className="text-sm text-brand-slate-700">£{candidate.minimum_salary_expected.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meta</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Added</span>
                  <span className="text-brand-slate-700">{formatDate(candidate.created_at)}</span>
                </div>
                {candidate.source && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Source</span>
                    <span className="text-brand-slate-700">{candidate.source}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Schedule ${selectedStage ? stageConfig[selectedStage].label : ''}`}
        description={`Schedule an interview for ${candidate.first_name} ${candidate.last_name}`}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Interviewer *"
            options={interviewerOptions}
            value={scheduleForm.interviewer_id}
            onChange={(e) => setScheduleForm(prev => ({ ...prev, interviewer_id: e.target.value }))}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={scheduleForm.scheduled_date}
              onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
            />
            <Input
              label="Time *"
              type="time"
              value={scheduleForm.scheduled_time}
              onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleSubmitSchedule} isLoading={isSubmitting}>
              Schedule Interview
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Interview Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title={selectedInterview ? stageConfig[selectedInterview.stage as InterviewStage]?.label : 'Complete Interview'}
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">
              Outcome *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFeedbackForm(prev => ({ ...prev, outcome: 'pass' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  feedbackForm.outcome === 'pass' 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-brand-grey-200 hover:border-green-300'
                }`}
              >
                <CheckCircle className="h-5 w-5" />
                Pass
              </button>
              <button
                type="button"
                onClick={() => setFeedbackForm(prev => ({ ...prev, outcome: 'fail' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  feedbackForm.outcome === 'fail' 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-brand-grey-200 hover:border-red-300'
                }`}
              >
                <XCircle className="h-5 w-5" />
                Fail
              </button>
            </div>
          </div>

          {/* Soft Skills Scores */}
          <div>
            <h4 className="text-sm font-medium text-brand-slate-700 mb-3">Soft Skills</h4>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Communication"
                options={scoreOptions}
                value={feedbackForm.communication_score}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, communication_score: e.target.value }))}
              />
              <Select
                label="Professionalism"
                options={scoreOptions}
                value={feedbackForm.professionalism_score}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, professionalism_score: e.target.value }))}
              />
              <Select
                label="Enthusiasm"
                options={scoreOptions}
                value={feedbackForm.enthusiasm_score}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, enthusiasm_score: e.target.value }))}
              />
              <Select
                label="Cultural Fit"
                options={scoreOptions}
                value={feedbackForm.cultural_fit_score}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, cultural_fit_score: e.target.value }))}
              />
            </div>
          </div>

          {/* Technical Scores */}
          {selectedInterview?.stage !== 'phone_qualification' && (
            <div>
              <h4 className="text-sm font-medium text-brand-slate-700 mb-3">Technical Skills</h4>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Technical Depth"
                  options={scoreOptions}
                  value={feedbackForm.technical_depth_score}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, technical_depth_score: e.target.value }))}
                />
                <Select
                  label="Problem Solving"
                  options={scoreOptions}
                  value={feedbackForm.problem_solving_score}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, problem_solving_score: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Comments */}
          <Textarea
            label="General Comments"
            value={feedbackForm.general_comments}
            onChange={(e) => setFeedbackForm(prev => ({ ...prev, general_comments: e.target.value }))}
            placeholder="Notes from the interview..."
            rows={3}
          />

          <Textarea
            label="Recommendation"
            value={feedbackForm.recommendation}
            onChange={(e) => setFeedbackForm(prev => ({ ...prev, recommendation: e.target.value }))}
            placeholder="Your recommendation for next steps..."
            rows={2}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="success" 
              onClick={handleSubmitFeedback} 
              isLoading={isSubmitting}
            >
              Save Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
