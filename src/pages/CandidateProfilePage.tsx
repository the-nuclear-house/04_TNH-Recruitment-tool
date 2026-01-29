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
  X,
  Trash2,
  FileText,
  Send,
  Edit,
  Download,
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
  StarRating,
  StarRatingDisplay,
  ConfirmDialog,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { candidatesService, interviewsService, usersService, commentsService, applicationsService, type DbComment, type DbApplication } from '@/lib/services';

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

const rightToWorkLabels: Record<string, string> = {
  british_citizen: 'British Citizen',
  settled_status: 'Settled Status',
  pre_settled_status: 'Pre-Settled Status',
  skilled_worker_visa: 'Skilled Worker Visa',
  graduate_visa: 'Graduate Visa',
  requires_sponsorship: 'Requires Sponsorship',
  other: 'Other',
  unknown: 'Unknown',
};

const rightToWorkOptions = [
  { value: '', label: 'Select status' },
  { value: 'british_citizen', label: 'British Citizen' },
  { value: 'settled_status', label: 'Settled Status' },
  { value: 'pre_settled_status', label: 'Pre-Settled Status' },
  { value: 'skilled_worker_visa', label: 'Skilled Worker Visa' },
  { value: 'graduate_visa', label: 'Graduate Visa' },
  { value: 'requires_sponsorship', label: 'Requires Sponsorship' },
  { value: 'other', label: 'Other (specify below)' },
];

const securityClearanceOptions = [
  { value: '', label: 'Select clearance' },
  { value: 'none', label: 'None' },
  { value: 'bpss', label: 'BPSS' },
  { value: 'ctc', label: 'CTC' },
  { value: 'sc', label: 'SC' },
  { value: 'esc', label: 'eSC' },
  { value: 'dv', label: 'DV' },
  { value: 'edv', label: 'eDV' },
];

const noticePeriodOptions = [
  { value: '', label: 'Select notice period' },
  { value: 'immediate', label: 'Immediate' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
];

export function CandidateProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [candidate, setCandidate] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  
  // Linked requirements
  const [linkedRequirements, setLinkedRequirements] = useState<DbApplication[]>([]);
  
  // Comments
  const [comments, setComments] = useState<DbComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // Phone qualification form (includes admin questions)
  const [phoneForm, setPhoneForm] = useState({
    outcome: '',
    years_experience: '',
    minimum_salary_expected: '',
    right_to_work: '',
    right_to_work_other: '',
    security_vetting: '',
    notice_period: '',
    open_to_relocate: '',
    relocation_preferences: '',
    communication_score: '',
    professionalism_score: '',
    enthusiasm_score: '',
    cultural_fit_score: '',
    general_comments: '',
    recommendation: '',
  });
  const [phoneSkills, setPhoneSkills] = useState<string[]>([]);
  const [phoneSkillInput, setPhoneSkillInput] = useState('');
  
  // Technical interview form
  const [techForm, setTechForm] = useState({
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
  const [techSkills, setTechSkills] = useState<string[]>([]);
  const [techSkillInput, setTechSkillInput] = useState('');
  
  // Director interview form
  const [directorForm, setDirectorForm] = useState({
    outcome: '',
    communication_score: '',
    professionalism_score: '',
    enthusiasm_score: '',
    cultural_fit_score: '',
    general_comments: '',
    recommendation: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
      loadComments();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [candidateData, interviewsData, usersData, applicationsData] = await Promise.all([
        candidatesService.getById(id!),
        interviewsService.getByCandidate(id!),
        usersService.getAll(),
        applicationsService.getByCandidate(id!),
      ]);
      
      setCandidate(candidateData);
      setInterviews(interviewsData);
      setUsers(usersData);
      setLinkedRequirements(applicationsData);
    } catch (error) {
      console.error('Error loading candidate:', error);
      toast.error('Error', 'Failed to load candidate');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await commentsService.getByCandidate(id!);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    
    setIsPostingComment(true);
    try {
      await commentsService.create({
        candidate_id: id!,
        user_id: user.id,
        content: newComment.trim(),
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Error', 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    
    try {
      await commentsService.update(commentId, editingCommentText.trim());
      setEditingCommentId(null);
      setEditingCommentText('');
      loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Error', 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsService.delete(commentId);
      loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error', 'Failed to delete comment');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await candidatesService.delete(id!);
      toast.success('Candidate Deleted', 'The candidate has been permanently deleted');
      navigate('/candidates');
    } catch (error) {
      console.error('Error deleting candidate:', error);
      toast.error('Error', 'Failed to delete candidate');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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
    
    // Initialize form based on interview stage
    if (interview.stage === 'phone_qualification') {
      setPhoneForm({
        outcome: interview.outcome === 'pending' ? '' : interview.outcome || '',
        years_experience: candidate?.years_experience?.toString() || '',
        minimum_salary_expected: candidate?.minimum_salary_expected?.toString() || '',
        right_to_work: candidate?.right_to_work || '',
        right_to_work_other: '',
        security_vetting: candidate?.security_vetting || '',
        notice_period: '',
        open_to_relocate: '',
        relocation_preferences: '',
        communication_score: interview.communication_score?.toString() || '',
        professionalism_score: interview.professionalism_score?.toString() || '',
        enthusiasm_score: interview.enthusiasm_score?.toString() || '',
        cultural_fit_score: interview.cultural_fit_score?.toString() || '',
        general_comments: interview.general_comments || '',
        recommendation: interview.recommendation || '',
      });
      setPhoneSkills(candidate?.skills || []);
    } else if (interview.stage === 'technical_interview') {
      setTechForm({
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
      setTechSkills(candidate?.skills || []);
    } else {
      setDirectorForm({
        outcome: interview.outcome === 'pending' ? '' : interview.outcome || '',
        communication_score: interview.communication_score?.toString() || '',
        professionalism_score: interview.professionalism_score?.toString() || '',
        enthusiasm_score: interview.enthusiasm_score?.toString() || '',
        cultural_fit_score: interview.cultural_fit_score?.toString() || '',
        general_comments: interview.general_comments || '',
        recommendation: interview.recommendation || '',
      });
    }
    
    setIsCompleteModalOpen(true);
  };

  const handleSubmitPhoneFeedback = async () => {
    if (!phoneForm.outcome) {
      toast.error('Validation Error', 'Please select an outcome (Pass/Fail)');
      return;
    }
    
    // Validate all soft skills scores are filled
    if (!phoneForm.communication_score || !phoneForm.professionalism_score || 
        !phoneForm.enthusiasm_score || !phoneForm.cultural_fit_score) {
      toast.error('Validation Error', 'Please rate all soft skills (Communication, Professionalism, Enthusiasm, Cultural Fit)');
      return;
    }
    
    if (!phoneForm.general_comments) {
      toast.error('Validation Error', 'Please add general comments');
      return;
    }
    
    if (!phoneForm.recommendation) {
      toast.error('Validation Error', 'Please add a recommendation');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Update candidate with admin info from phone call
      await candidatesService.update(id!, {
        years_experience: phoneForm.years_experience ? parseInt(phoneForm.years_experience) : undefined,
        minimum_salary_expected: phoneForm.minimum_salary_expected ? parseInt(phoneForm.minimum_salary_expected) : undefined,
        right_to_work: phoneForm.right_to_work || undefined,
        security_vetting: phoneForm.security_vetting || undefined,
        skills: phoneSkills.length > 0 ? phoneSkills : undefined,
      });
      
      // Update interview
      await interviewsService.update(selectedInterview.id, {
        outcome: phoneForm.outcome,
        completed_at: new Date().toISOString(),
        communication_score: parseInt(phoneForm.communication_score),
        professionalism_score: parseInt(phoneForm.professionalism_score),
        enthusiasm_score: parseInt(phoneForm.enthusiasm_score),
        cultural_fit_score: parseInt(phoneForm.cultural_fit_score),
        general_comments: phoneForm.general_comments,
        recommendation: phoneForm.recommendation,
      });
      
      toast.success('Phone Interview Completed', 'Feedback and candidate info have been saved');
      setIsCompleteModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Error', 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTechFeedback = async () => {
    if (!techForm.outcome) {
      toast.error('Validation Error', 'Please select an outcome (Pass/Fail)');
      return;
    }
    
    // Validate technical scores
    if (!techForm.technical_depth_score || !techForm.problem_solving_score) {
      toast.error('Validation Error', 'Please rate Technical Depth and Problem Solving');
      return;
    }
    
    // Validate all soft skills scores
    if (!techForm.communication_score || !techForm.professionalism_score || 
        !techForm.enthusiasm_score || !techForm.cultural_fit_score) {
      toast.error('Validation Error', 'Please rate all soft skills (Communication, Professionalism, Enthusiasm, Cultural Fit)');
      return;
    }
    
    if (!techForm.general_comments) {
      toast.error('Validation Error', 'Please add general comments');
      return;
    }
    
    if (!techForm.recommendation) {
      toast.error('Validation Error', 'Please add a recommendation');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Update candidate skills
      await candidatesService.update(id!, {
        skills: techSkills.length > 0 ? techSkills : undefined,
      });
      
      // Update interview
      await interviewsService.update(selectedInterview.id, {
        outcome: techForm.outcome,
        completed_at: new Date().toISOString(),
        communication_score: parseInt(techForm.communication_score),
        professionalism_score: parseInt(techForm.professionalism_score),
        enthusiasm_score: parseInt(techForm.enthusiasm_score),
        cultural_fit_score: parseInt(techForm.cultural_fit_score),
        technical_depth_score: parseInt(techForm.technical_depth_score),
        problem_solving_score: parseInt(techForm.problem_solving_score),
        general_comments: techForm.general_comments,
        recommendation: techForm.recommendation,
      });
      
      toast.success('Technical Interview Completed', 'Feedback has been saved');
      setIsCompleteModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Error', 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDirectorFeedback = async () => {
    if (!directorForm.outcome) {
      toast.error('Validation Error', 'Please select an outcome (Pass/Fail)');
      return;
    }
    
    // Validate all soft skills scores
    if (!directorForm.communication_score || !directorForm.professionalism_score || 
        !directorForm.enthusiasm_score || !directorForm.cultural_fit_score) {
      toast.error('Validation Error', 'Please rate all soft skills (Communication, Professionalism, Enthusiasm, Cultural Fit)');
      return;
    }
    
    if (!directorForm.general_comments) {
      toast.error('Validation Error', 'Please add general comments');
      return;
    }
    
    if (!directorForm.recommendation) {
      toast.error('Validation Error', 'Please add a recommendation');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await interviewsService.update(selectedInterview.id, {
        outcome: directorForm.outcome,
        completed_at: new Date().toISOString(),
        communication_score: parseInt(directorForm.communication_score),
        professionalism_score: parseInt(directorForm.professionalism_score),
        enthusiasm_score: parseInt(directorForm.enthusiasm_score),
        cultural_fit_score: parseInt(directorForm.cultural_fit_score),
        general_comments: directorForm.general_comments,
        recommendation: directorForm.recommendation,
      });
      
      toast.success('Director Interview Completed', 'Feedback has been saved');
      setIsCompleteModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Error', 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillAdd = (skillList: string[], setSkillList: (s: string[]) => void, input: string, setInput: (s: string) => void) => {
    if (input.trim()) {
      // Parse comma-separated values
      const parts = input.split(',').map(s => s.trim()).filter(s => s);
      const newSkills = parts.filter(s => !skillList.includes(s));
      if (newSkills.length > 0) {
        setSkillList([...skillList, ...newSkills]);
      }
    }
    setInput('');
  };

  const handleSkillRemove = (skillList: string[], setSkillList: (s: string[]) => void, skill: string) => {
    setSkillList(skillList.filter(s => s !== skill));
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
          <div className="flex items-center gap-2">
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
              onClick={() => navigate('/candidates')}
            >
              Back
            </Button>
          </div>
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
                                {/* All soft skills scores */}
                                <div className="grid grid-cols-2 gap-3">
                                  {interview.communication_score && (
                                    <StarRatingDisplay rating={interview.communication_score} label="Communication" />
                                  )}
                                  {interview.professionalism_score && (
                                    <StarRatingDisplay rating={interview.professionalism_score} label="Professionalism" />
                                  )}
                                  {interview.enthusiasm_score && (
                                    <StarRatingDisplay rating={interview.enthusiasm_score} label="Enthusiasm" />
                                  )}
                                  {interview.cultural_fit_score && (
                                    <StarRatingDisplay rating={interview.cultural_fit_score} label="Cultural Fit" />
                                  )}
                                </div>
                                {/* Technical scores if present */}
                                {(interview.technical_depth_score || interview.problem_solving_score) && (
                                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-brand-grey-100">
                                    {interview.technical_depth_score && (
                                      <StarRatingDisplay rating={interview.technical_depth_score} label="Technical Depth" />
                                    )}
                                    {interview.problem_solving_score && (
                                      <StarRatingDisplay rating={interview.problem_solving_score} label="Problem Solving" />
                                    )}
                                  </div>
                                )}
                                {interview.general_comments && (
                                  <div className="pt-2">
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

            {/* Linked Requirements */}
            {linkedRequirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Linked Requirements ({linkedRequirements.length})</CardTitle>
                </CardHeader>
                <div className="space-y-3">
                  {linkedRequirements.map((app) => (
                    <div 
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-brand-grey-200 hover:border-brand-cyan cursor-pointer transition-colors"
                      onClick={() => navigate(`/requirements/${app.requirement_id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-brand-cyan" />
                        <div>
                          <p className="font-medium text-brand-slate-900">
                            {app.requirement?.customer || 'Unknown Requirement'}
                          </p>
                          <p className="text-sm text-brand-grey-400">
                            {app.requirement?.location && `${app.requirement.location} · `}
                            Added {formatDate(app.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={app.status === 'applied' ? 'grey' : 'green'}>
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
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
                
                {candidate.right_to_work && candidate.right_to_work !== 'unknown' && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Right to Work</p>
                      <p className="text-sm text-brand-slate-700">
                        {rightToWorkLabels[candidate.right_to_work] || candidate.right_to_work}
                      </p>
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

            {/* CV Download */}
            {candidate.cv_url && (
              <Card>
                <CardHeader>
                  <CardTitle>CV / Resume</CardTitle>
                </CardHeader>
                <a
                  href={candidate.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-brand-grey-200 hover:border-brand-cyan hover:bg-brand-cyan/5 transition-colors"
                >
                  <FileText className="h-8 w-8 text-brand-cyan" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-slate-900">Download CV</p>
                    <p className="text-xs text-brand-grey-400">Click to view or download</p>
                  </div>
                  <Download className="h-4 w-4 text-brand-grey-400" />
                </a>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Record Info</CardTitle>
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

        {/* Comments Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Activity & Comments</CardTitle>
          </CardHeader>
          
          {/* New Comment Input */}
          <div className="flex gap-3 mb-6">
            <Avatar name={user?.full_name || 'User'} size="sm" />
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment about this candidate..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={handlePostComment}
                  isLoading={isPostingComment}
                  disabled={!newComment.trim()}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-brand-grey-400 text-center py-4">
                No comments yet. Be the first to add one!
              </p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-brand-grey-50">
                  <Avatar name={comment.user?.full_name || 'User'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-brand-slate-900">
                          {comment.user?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-brand-grey-400">
                          {comment.user?.role && `(${comment.user.role})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brand-grey-400">
                          {new Date(comment.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {(comment.user_id === user?.id || permissions.isAdmin) && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.content);
                              }}
                              className="p-1 text-brand-grey-400 hover:text-brand-cyan rounded"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-brand-grey-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {editingCommentId === comment.id ? (
                      <div className="mt-2">
                        <Textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateComment(comment.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-brand-slate-700 mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    )}
                    
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-brand-grey-300 mt-1 inline-block">
                        (edited)
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
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

      {/* Phone Qualification Modal */}
      <Modal
        isOpen={isCompleteModalOpen && selectedInterview?.stage === 'phone_qualification'}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Phone Qualification"
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">Outcome *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPhoneForm(prev => ({ ...prev, outcome: 'pass' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  phoneForm.outcome === 'pass' ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-grey-200 hover:border-green-300'
                }`}
              >
                <CheckCircle className="h-5 w-5" /> Pass
              </button>
              <button
                type="button"
                onClick={() => setPhoneForm(prev => ({ ...prev, outcome: 'fail' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  phoneForm.outcome === 'fail' ? 'border-red-500 bg-red-50 text-red-700' : 'border-brand-grey-200 hover:border-red-300'
                }`}
              >
                <XCircle className="h-5 w-5" /> Fail
              </button>
            </div>
          </div>

          {/* Admin Questions Section */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-4">Candidate Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Years of Experience"
                type="number"
                value={phoneForm.years_experience}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, years_experience: e.target.value }))}
                placeholder="e.g., 5"
              />
              <Input
                label="Minimum Salary Expected (£)"
                type="number"
                value={phoneForm.minimum_salary_expected}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, minimum_salary_expected: e.target.value }))}
                placeholder="e.g., 75000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Select
                label="Right to Work in UK"
                options={rightToWorkOptions}
                value={phoneForm.right_to_work}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, right_to_work: e.target.value }))}
              />
              <Select
                label="Security Clearance"
                options={securityClearanceOptions}
                value={phoneForm.security_vetting}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, security_vetting: e.target.value }))}
              />
            </div>

            {phoneForm.right_to_work === 'other' && (
              <Input
                label="Please specify Right to Work status"
                value={phoneForm.right_to_work_other}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, right_to_work_other: e.target.value }))}
                placeholder="Specify visa type or status"
                className="mt-4"
              />
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Select
                label="Notice Period"
                options={noticePeriodOptions}
                value={phoneForm.notice_period}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, notice_period: e.target.value }))}
              />
              <Select
                label="Open to Relocate?"
                options={[
                  { value: '', label: 'Select' },
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'maybe', label: 'Maybe / Depends' },
                ]}
                value={phoneForm.open_to_relocate}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, open_to_relocate: e.target.value }))}
              />
            </div>

            {phoneForm.open_to_relocate === 'yes' && (
              <Input
                label="Relocation Preferences"
                value={phoneForm.relocation_preferences}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, relocation_preferences: e.target.value }))}
                placeholder="e.g., London, Manchester, Remote only"
                className="mt-4"
              />
            )}
          </div>

          {/* Skills Section */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Skills (add or remove)</h4>
            <div className="mb-2">
              <Input
                placeholder="Type skills, use comma to separate, Enter to add..."
                value={phoneSkillInput}
                onChange={(e) => setPhoneSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSkillAdd(phoneSkills, setPhoneSkills, phoneSkillInput, setPhoneSkillInput);
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {phoneSkills.map(skill => (
                <Badge key={skill} variant="cyan">
                  {skill}
                  <button
                    onClick={() => handleSkillRemove(phoneSkills, setPhoneSkills, skill)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment</h4>
            <div className="grid grid-cols-2 gap-4">
              <StarRating label="Communication" value={parseInt(phoneForm.communication_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, communication_score: v.toString() }))} />
              <StarRating label="Professionalism" value={parseInt(phoneForm.professionalism_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, professionalism_score: v.toString() }))} />
              <StarRating label="Enthusiasm" value={parseInt(phoneForm.enthusiasm_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))} />
              <StarRating label="Cultural Fit" value={parseInt(phoneForm.cultural_fit_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))} />
            </div>
          </div>

          {/* Comments */}
          <Textarea
            label="General Comments"
            value={phoneForm.general_comments}
            onChange={(e) => setPhoneForm(prev => ({ ...prev, general_comments: e.target.value }))}
            placeholder="Notes from the call..."
            rows={3}
          />
          <Textarea
            label="Recommendation"
            value={phoneForm.recommendation}
            onChange={(e) => setPhoneForm(prev => ({ ...prev, recommendation: e.target.value }))}
            placeholder="Your recommendation..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSubmitPhoneFeedback} isLoading={isSubmitting}>Save Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Technical Interview Modal */}
      <Modal
        isOpen={isCompleteModalOpen && selectedInterview?.stage === 'technical_interview'}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Technical Interview"
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">Outcome *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTechForm(prev => ({ ...prev, outcome: 'pass' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  techForm.outcome === 'pass' ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-grey-200 hover:border-green-300'
                }`}
              >
                <CheckCircle className="h-5 w-5" /> Pass
              </button>
              <button
                type="button"
                onClick={() => setTechForm(prev => ({ ...prev, outcome: 'fail' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  techForm.outcome === 'fail' ? 'border-red-500 bg-red-50 text-red-700' : 'border-brand-grey-200 hover:border-red-300'
                }`}
              >
                <XCircle className="h-5 w-5" /> Fail
              </button>
            </div>
          </div>

          {/* Skills Section */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Technical Skills (add or remove based on interview)</h4>
            <div className="mb-2">
              <Input
                placeholder="Type skills, use comma to separate, Enter to add..."
                value={techSkillInput}
                onChange={(e) => setTechSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSkillAdd(techSkills, setTechSkills, techSkillInput, setTechSkillInput);
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {techSkills.map(skill => (
                <Badge key={skill} variant="cyan">
                  {skill}
                  <button
                    onClick={() => handleSkillRemove(techSkills, setTechSkills, skill)}
                    className="ml-1.5 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Technical Assessment</h4>
            <div className="grid grid-cols-2 gap-4">
              <StarRating label="Technical Depth" value={parseInt(techForm.technical_depth_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, technical_depth_score: v.toString() }))} />
              <StarRating label="Problem Solving" value={parseInt(techForm.problem_solving_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, problem_solving_score: v.toString() }))} />
            </div>
          </div>

          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment</h4>
            <div className="grid grid-cols-2 gap-4">
              <StarRating label="Communication" value={parseInt(techForm.communication_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, communication_score: v.toString() }))} />
              <StarRating label="Professionalism" value={parseInt(techForm.professionalism_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, professionalism_score: v.toString() }))} />
              <StarRating label="Enthusiasm" value={parseInt(techForm.enthusiasm_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))} />
              <StarRating label="Cultural Fit" value={parseInt(techForm.cultural_fit_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))} />
            </div>
          </div>

          <Textarea
            label="General Comments"
            value={techForm.general_comments}
            onChange={(e) => setTechForm(prev => ({ ...prev, general_comments: e.target.value }))}
            placeholder="Technical notes from the interview..."
            rows={3}
          />
          <Textarea
            label="Recommendation"
            value={techForm.recommendation}
            onChange={(e) => setTechForm(prev => ({ ...prev, recommendation: e.target.value }))}
            placeholder="Your recommendation..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSubmitTechFeedback} isLoading={isSubmitting}>Save Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Director Interview Modal */}
      <Modal
        isOpen={isCompleteModalOpen && selectedInterview?.stage === 'director_interview'}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Director Interview"
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">Outcome *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDirectorForm(prev => ({ ...prev, outcome: 'pass' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  directorForm.outcome === 'pass' ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-grey-200 hover:border-green-300'
                }`}
              >
                <CheckCircle className="h-5 w-5" /> Pass
              </button>
              <button
                type="button"
                onClick={() => setDirectorForm(prev => ({ ...prev, outcome: 'fail' }))}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  directorForm.outcome === 'fail' ? 'border-red-500 bg-red-50 text-red-700' : 'border-brand-grey-200 hover:border-red-300'
                }`}
              >
                <XCircle className="h-5 w-5" /> Fail
              </button>
            </div>
          </div>

          {/* Scores */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment</h4>
            <div className="grid grid-cols-2 gap-4">
              <StarRating label="Communication" value={parseInt(directorForm.communication_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, communication_score: v.toString() }))} />
              <StarRating label="Professionalism" value={parseInt(directorForm.professionalism_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, professionalism_score: v.toString() }))} />
              <StarRating label="Enthusiasm" value={parseInt(directorForm.enthusiasm_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))} />
              <StarRating label="Cultural Fit" value={parseInt(directorForm.cultural_fit_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))} />
            </div>
          </div>

          <Textarea
            label="General Comments"
            value={directorForm.general_comments}
            onChange={(e) => setDirectorForm(prev => ({ ...prev, general_comments: e.target.value }))}
            placeholder="Notes from the interview..."
            rows={3}
          />
          <Textarea
            label="Recommendation"
            value={directorForm.recommendation}
            onChange={(e) => setDirectorForm(prev => ({ ...prev, recommendation: e.target.value }))}
            placeholder="Final recommendation..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSubmitDirectorFeedback} isLoading={isSubmitting}>Save Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Candidate"
        message={`Are you sure you want to delete ${candidate?.first_name} ${candidate?.last_name}? This will also delete all their interview records. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
