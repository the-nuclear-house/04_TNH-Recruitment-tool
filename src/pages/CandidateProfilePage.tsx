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
  Minus,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  FileText,
  Send,
  Edit,
  Download,
  Settings,
  Flag,
  Gift,
  Upload,
  ArrowRight,
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
import { candidatesService, interviewsService, usersService, commentsService, applicationsService, offersService, type DbComment, type DbApplication, type DbOffer } from '@/lib/services';

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
    icon: Settings, 
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

// Format notice period value for display
const formatNoticePeriod = (value: string | null | undefined): string => {
  if (!value) return '';
  const option = noticePeriodOptions.find(o => o.value === value);
  return option?.label || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Countries list for nationality
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba',
  'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany',
  'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
  'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Mauritania', 'Mauritius', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vatican City', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
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
  
  // Validation errors and shake animation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  
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
    location: '',
    minimum_salary_expected: '',
    expected_day_rate: '',
    right_to_work: '',
    right_to_work_other: '',
    security_vetting: '',
    notice_period: '',
    open_to_relocate: '',
    contract_preference: '', // contractor, permanent, open_to_both
    communication_score: '',
    professionalism_score: '',
    enthusiasm_score: '',
    cultural_fit_score: '',
    warnings: '',
    general_comments: '',
  });
  const [phoneNationalities, setPhoneNationalities] = useState<string[]>(['']);
  const [phoneSkills, setPhoneSkills] = useState<string[]>([]);
  const [phoneSkillInput, setPhoneSkillInput] = useState('');
  
  // Technical interview form
  const [techForm, setTechForm] = useState({
    outcome: '',
    salary_proposed: '',
    communication_score: '',
    professionalism_score: '',
    enthusiasm_score: '',
    cultural_fit_score: '',
    technical_depth_score: '',
    problem_solving_score: '',
    warnings: '',
    general_comments: '',
  });
  const [techSkills, setTechSkills] = useState<string[]>([]);
  const [techSkillInput, setTechSkillInput] = useState('');
  
  // Director interview form
  const [directorForm, setDirectorForm] = useState({
    outcome: '',
    salary_proposed: '',
    communication_score: '',
    professionalism_score: '',
    enthusiasm_score: '',
    cultural_fit_score: '',
    warnings: '',
    general_comments: '',
  });

  // Offers
  const [offers, setOffers] = useState<DbOffer[]>([]);
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    job_title: '',
    salary_amount: '',
    contract_type: 'permanent',
    day_rate: '',
    start_date: '',
    end_date: '',
    work_location: '',
    candidate_full_name: '',
    candidate_address: '',
    notes: '',
  });
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [rtwDocumentFile, setRtwDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
      loadComments();
      loadOffers();
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

  const loadOffers = async () => {
    try {
      const data = await offersService.getByCandidate(id!);
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
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
        location: candidate?.location || '',
        minimum_salary_expected: candidate?.minimum_salary_expected?.toString() || '',
        expected_day_rate: candidate?.expected_day_rate?.toString() || '',
        right_to_work: candidate?.right_to_work || '',
        right_to_work_other: '',
        security_vetting: candidate?.security_vetting || '',
        notice_period: candidate?.notice_period || '',
        open_to_relocate: candidate?.open_to_relocate || '',
        contract_preference: candidate?.contract_preference || '',
        communication_score: interview.communication_score?.toString() || '',
        professionalism_score: interview.professionalism_score?.toString() || '',
        enthusiasm_score: interview.enthusiasm_score?.toString() || '',
        cultural_fit_score: interview.cultural_fit_score?.toString() || '',
        warnings: interview.warnings || '',
        general_comments: interview.general_comments || '',
      });
      // Initialize nationalities - at least one empty field if none exist
      const existingNationalities = candidate?.nationalities || [];
      setPhoneNationalities(existingNationalities.length > 0 ? existingNationalities : ['']);
      setPhoneSkills(candidate?.skills || []);
    } else if (interview.stage === 'technical_interview') {
      setTechForm({
        outcome: interview.outcome === 'pending' ? '' : interview.outcome || '',
        salary_proposed: interview.salary_proposed?.toString() || '',
        communication_score: interview.communication_score?.toString() || '',
        professionalism_score: interview.professionalism_score?.toString() || '',
        enthusiasm_score: interview.enthusiasm_score?.toString() || '',
        cultural_fit_score: interview.cultural_fit_score?.toString() || '',
        technical_depth_score: interview.technical_depth_score?.toString() || '',
        problem_solving_score: interview.problem_solving_score?.toString() || '',
        warnings: interview.warnings || '',
        general_comments: interview.general_comments || '',
      });
      setTechSkills(candidate?.skills || []);
    } else {
      setDirectorForm({
        outcome: interview.outcome === 'pending' ? '' : interview.outcome || '',
        salary_proposed: interview.salary_proposed?.toString() || '',
        communication_score: interview.communication_score?.toString() || '',
        professionalism_score: interview.professionalism_score?.toString() || '',
        enthusiasm_score: interview.enthusiasm_score?.toString() || '',
        cultural_fit_score: interview.cultural_fit_score?.toString() || '',
        warnings: interview.warnings || '',
        general_comments: interview.general_comments || '',
      });
    }
    
    setIsCompleteModalOpen(true);
  };

  const handleSubmitPhoneFeedback = async () => {
    const errors: string[] = [];
    
    if (!phoneForm.outcome) errors.push('outcome');
    if (!phoneForm.communication_score) errors.push('communication_score');
    if (!phoneForm.professionalism_score) errors.push('professionalism_score');
    if (!phoneForm.enthusiasm_score) errors.push('enthusiasm_score');
    if (!phoneForm.cultural_fit_score) errors.push('cultural_fit_score');
    if (!phoneForm.general_comments) errors.push('general_comments');
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }
    
    setValidationErrors([]);
    setIsSubmitting(true);
    try {
      // Filter out empty nationalities
      const validNationalities = phoneNationalities.filter(n => n.trim() !== '');
      
      // Update candidate with admin info from phone call
      await candidatesService.update(id!, {
        years_experience: phoneForm.years_experience ? parseInt(phoneForm.years_experience) : undefined,
        location: phoneForm.location || undefined,
        minimum_salary_expected: phoneForm.minimum_salary_expected ? parseInt(phoneForm.minimum_salary_expected) : undefined,
        expected_day_rate: phoneForm.expected_day_rate ? parseFloat(phoneForm.expected_day_rate) : undefined,
        right_to_work: phoneForm.right_to_work || undefined,
        security_vetting: phoneForm.security_vetting || undefined,
        notice_period: phoneForm.notice_period || undefined,
        contract_preference: phoneForm.contract_preference || undefined,
        open_to_relocate: phoneForm.open_to_relocate || undefined,
        nationalities: validNationalities.length > 0 ? validNationalities : undefined,
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
        contract_preference: phoneForm.contract_preference || undefined,
        salary_proposed: phoneForm.expected_day_rate ? parseFloat(phoneForm.expected_day_rate) : undefined,
        warnings: phoneForm.warnings || undefined,
        general_comments: phoneForm.general_comments,
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
    const errors: string[] = [];
    
    if (!techForm.outcome) errors.push('tech_outcome');
    if (!techForm.technical_depth_score) errors.push('technical_depth_score');
    if (!techForm.problem_solving_score) errors.push('problem_solving_score');
    if (!techForm.communication_score) errors.push('tech_communication_score');
    if (!techForm.professionalism_score) errors.push('tech_professionalism_score');
    if (!techForm.enthusiasm_score) errors.push('tech_enthusiasm_score');
    if (!techForm.cultural_fit_score) errors.push('tech_cultural_fit_score');
    if (!techForm.general_comments) errors.push('tech_general_comments');
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }
    
    setValidationErrors([]);
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
        salary_proposed: techForm.salary_proposed ? parseFloat(techForm.salary_proposed) : undefined,
        warnings: techForm.warnings || undefined,
        general_comments: techForm.general_comments,
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
    const errors: string[] = [];
    
    if (!directorForm.outcome) errors.push('director_outcome');
    if (!directorForm.communication_score) errors.push('director_communication_score');
    if (!directorForm.professionalism_score) errors.push('director_professionalism_score');
    if (!directorForm.enthusiasm_score) errors.push('director_enthusiasm_score');
    if (!directorForm.cultural_fit_score) errors.push('director_cultural_fit_score');
    if (!directorForm.general_comments) errors.push('director_general_comments');
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }
    
    setValidationErrors([]);
    setIsSubmitting(true);
    try {
      await interviewsService.update(selectedInterview.id, {
        outcome: directorForm.outcome,
        completed_at: new Date().toISOString(),
        communication_score: parseInt(directorForm.communication_score),
        professionalism_score: parseInt(directorForm.professionalism_score),
        enthusiasm_score: parseInt(directorForm.enthusiasm_score),
        cultural_fit_score: parseInt(directorForm.cultural_fit_score),
        salary_proposed: directorForm.salary_proposed ? parseFloat(directorForm.salary_proposed) : undefined,
        warnings: directorForm.warnings || undefined,
        general_comments: directorForm.general_comments,
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

  // Filter interviewers based on interview stage
  const getInterviewerOptions = () => {
    let eligibleUsers = users;
    
    if (selectedStage === 'phone_qualification') {
      // Phone: Managers and Recruiters (and Admin)
      eligibleUsers = users.filter(u => u.roles?.some((r: string) => ['manager', 'recruiter', 'admin'].includes(r)));
    } else if (selectedStage === 'technical_interview') {
      // Technical: Only managers and admins
      eligibleUsers = users.filter(u => u.roles?.some((r: string) => ['manager', 'admin'].includes(r)));
    } else if (selectedStage === 'director_interview') {
      // Director: Only Directors (and Admin)
      eligibleUsers = users.filter(u => u.roles?.some((r: string) => ['director', 'admin'].includes(r)));
    }
    
    return [
      { value: '', label: 'Select Interviewer' },
      ...eligibleUsers.map(u => ({ value: u.id, label: `${u.full_name} (${u.roles?.join(', ')})` })),
    ];
  };
  
  const interviewerOptions = getInterviewerOptions();

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
                {candidate.reference_id && (
                  <p className="text-xs text-brand-grey-400 mt-1">ID: {candidate.reference_id}</p>
                )}
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

            {/* Offer & Contract Section */}
            {(() => {
              // Check if all 3 interviews passed
              const phonePass = interviews.some(i => i.stage === 'phone_qualification' && i.outcome === 'pass');
              const techPass = interviews.some(i => i.stage === 'technical_interview' && i.outcome === 'pass');
              const directorPass = interviews.some(i => i.stage === 'director_interview' && i.outcome === 'pass');
              const allInterviewsPassed = phonePass && techPass && directorPass;
              
              // Get salary from director interview
              const directorInterview = interviews.find(i => i.stage === 'director_interview');
              const proposedSalary = directorInterview?.salary_proposed;
              
              // Get active offer if any
              const activeOffer = offers.find(o => !['rejected', 'withdrawn'].includes(o.status));
              
              if (!allInterviewsPassed && offers.length === 0) return null;
              
              return (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Offer & Contract</CardTitle>
                    {allInterviewsPassed && !activeOffer && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Gift className="h-4 w-4" />}
                        onClick={() => {
                          // Pre-fill the form
                          setOfferForm({
                            job_title: linkedRequirements[0]?.requirement?.title || '',
                            salary_amount: proposedSalary || '',
                            contract_type: candidate?.contract_preference === 'contractor' ? 'contract' : 'permanent',
                            day_rate: candidate?.expected_day_rate || '',
                            start_date: '',
                            end_date: '',
                            work_location: linkedRequirements[0]?.requirement?.location || candidate?.location || '',
                            candidate_full_name: `${candidate?.first_name} ${candidate?.last_name}`,
                            candidate_address: '',
                            notes: '',
                          });
                          setIdDocumentFile(null);
                          setRtwDocumentFile(null);
                          setIsCreateOfferModalOpen(true);
                        }}
                      >
                        Create Offer
                      </Button>
                    )}
                  </CardHeader>
                  
                  {activeOffer ? (
                    <div className="space-y-4">
                      {/* Visual Pipeline */}
                      <div className="flex items-center justify-between p-4 bg-brand-grey-50 rounded-lg">
                        {['pending_approval', 'approved', 'contract_sent', 'contract_signed'].map((status, idx) => {
                          const statusLabels: Record<string, string> = {
                            pending_approval: 'Pending Approval',
                            approved: 'Approved',
                            contract_sent: 'Contract Sent',
                            contract_signed: 'Contract Signed',
                          };
                          const statusOrder = ['pending_approval', 'approved', 'contract_sent', 'contract_signed'];
                          const currentIdx = statusOrder.indexOf(activeOffer.status);
                          const isComplete = idx < currentIdx || activeOffer.status === status;
                          const isCurrent = activeOffer.status === status;
                          
                          return (
                            <div key={status} className="flex items-center">
                              <div className={`flex flex-col items-center ${idx > 0 ? 'ml-2' : ''}`}>
                                <div className={`
                                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                                  ${isComplete ? 'bg-green-100 text-green-700' : 
                                    isCurrent ? 'bg-amber-100 text-amber-700' : 
                                    'bg-brand-grey-200 text-brand-grey-400'}
                                `}>
                                  {isComplete && idx < currentIdx ? (
                                    <CheckCircle className="h-5 w-5" />
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                                <span className={`text-xs mt-1 text-center max-w-[80px] ${
                                  isComplete || isCurrent ? 'text-brand-slate-700 font-medium' : 'text-brand-grey-400'
                                }`}>
                                  {statusLabels[status]}
                                </span>
                              </div>
                              {idx < 3 && (
                                <ArrowRight className={`h-4 w-4 mx-2 ${
                                  idx < currentIdx ? 'text-green-500' : 'text-brand-grey-300'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Offer Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-brand-grey-400">Job Title:</span>
                          <p className="font-medium text-brand-slate-900">{activeOffer.job_title}</p>
                        </div>
                        <div>
                          <span className="text-brand-grey-400">Salary:</span>
                          <p className="font-medium text-brand-slate-900">
                            £{activeOffer.salary_amount?.toLocaleString()}
                            {activeOffer.contract_type === 'contract' && activeOffer.day_rate && (
                              <span className="text-brand-grey-400"> (£{activeOffer.day_rate}/day)</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-brand-grey-400">Start Date:</span>
                          <p className="font-medium text-brand-slate-900">{formatDate(activeOffer.start_date)}</p>
                        </div>
                        <div>
                          <span className="text-brand-grey-400">Contract Type:</span>
                          <p className="font-medium text-brand-slate-900 capitalize">{activeOffer.contract_type}</p>
                        </div>
                      </div>
                      
                      {/* Approval info */}
                      {activeOffer.status === 'pending_approval' && (
                        <div 
                          className="p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                          onClick={() => navigate('/contracts')}
                        >
                          <p className="text-sm text-amber-700">
                            Awaiting approval from {activeOffer.approver?.full_name || 'Director'}.{' '}
                            <span className="underline font-medium">View in Contracts →</span>
                          </p>
                        </div>
                      )}
                      
                      {activeOffer.status === 'approved' && (
                        <div 
                          className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                          onClick={() => navigate('/contracts')}
                        >
                          <p className="text-sm text-green-700">
                            Approved on {formatDate(activeOffer.approved_at || '')}. HR to send contract.{' '}
                            <span className="underline font-medium">View in Contracts →</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : allInterviewsPassed ? (
                    <div className="text-center py-6 text-brand-grey-400">
                      <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>All interviews passed! Ready to create an offer.</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-brand-grey-400">
                      <p>Complete all interviews to create an offer.</p>
                    </div>
                  )}
                </Card>
              );
            })()}

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

                {candidate.expected_day_rate && (
                  <div className="flex items-center gap-3">
                    <PoundSterling className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Expected Day Rate</p>
                      <p className="text-sm text-brand-slate-700">£{candidate.expected_day_rate}/day</p>
                    </div>
                  </div>
                )}

                {candidate.contract_preference && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Contract Preference</p>
                      <p className="text-sm text-brand-slate-700">
                        {candidate.contract_preference === 'contractor' ? 'Contractor' :
                         candidate.contract_preference === 'permanent' ? 'Permanent' :
                         candidate.contract_preference === 'open_to_both' ? 'Open to Both' :
                         candidate.contract_preference}
                      </p>
                    </div>
                  </div>
                )}

                {candidate.notice_period && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Notice Period</p>
                      <p className="text-sm text-brand-slate-700">{formatNoticePeriod(candidate.notice_period)}</p>
                    </div>
                  </div>
                )}

                {candidate.open_to_relocate && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Open to Relocate</p>
                      <p className="text-sm text-brand-slate-700">
                        {candidate.open_to_relocate === 'yes' ? 'Yes' :
                         candidate.open_to_relocate === 'no' ? 'No' :
                         candidate.open_to_relocate === 'maybe' ? 'Maybe / Depends' :
                         candidate.open_to_relocate}
                      </p>
                    </div>
                  </div>
                )}

                {candidate.nationalities && candidate.nationalities.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Flag className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Nationality</p>
                      <p className="text-sm text-brand-slate-700">
                        {candidate.nationalities.join(', ')}
                      </p>
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

            {/* Assigned Recruiter */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned Recruiter</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {candidate.assigned_recruiter_id ? (
                  <div className="flex items-center gap-3">
                    <Avatar 
                      name={users.find(u => u.id === candidate.assigned_recruiter_id)?.name || 'Unknown'} 
                      size="sm" 
                    />
                    <div>
                      <p className="font-medium text-brand-slate-900">
                        {users.find(u => u.id === candidate.assigned_recruiter_id)?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-brand-grey-400">
                        {users.find(u => u.id === candidate.assigned_recruiter_id)?.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-brand-grey-400 text-sm">No recruiter assigned</p>
                )}
                
                {/* Change recruiter - only assigned recruiter or admin can change */}
                {(permissions.isAdmin || candidate.assigned_recruiter_id === user?.id) && (
                  <div className="pt-3 border-t border-brand-grey-100">
                    <label className="block text-xs text-brand-grey-400 mb-1">
                      {candidate.assigned_recruiter_id ? 'Reassign to' : 'Assign to'}
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-brand-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      value={candidate.assigned_recruiter_id || ''}
                      onChange={async (e) => {
                        try {
                          await candidatesService.update(candidate.id, {
                            assigned_recruiter_id: e.target.value || undefined,
                          });
                          loadData();
                          toast.success('Recruiter Updated', 'Candidate assignment has been updated');
                        } catch (error) {
                          toast.error('Error', 'Failed to update recruiter');
                        }
                      }}
                    >
                      <option value="">-- Select Recruiter --</option>
                      {users
                        .filter(u => u.roles?.some((r: string) => ['recruiter', 'admin'].includes(r)))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>
            </Card>

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
                          {comment.user?.roles && comment.user.roles.length > 0 && `(${comment.user.roles.join(', ')})`}
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
        onClose={() => { setIsCompleteModalOpen(false); setValidationErrors([]); }}
        title="Phone Qualification"
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="xl"
        shake={isShaking}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Admin Questions Section */}
          <div>
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-4">Candidate Information</h4>
            
            <Input
              label="Years of Experience"
              type="number"
              value={phoneForm.years_experience}
              onChange={(e) => setPhoneForm(prev => ({ ...prev, years_experience: e.target.value }))}
              placeholder="e.g., 5"
            />

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

            <div className="grid grid-cols-3 gap-4 mt-4">
              <Input
                label="Location"
                value={phoneForm.location}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., London"
              />
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

            {/* Contract Preference with dynamic salary/rate */}
            <div className="mt-4">
              <Select
                label="Contract Preference"
                options={[
                  { value: '', label: 'Select' },
                  { value: 'contractor', label: 'Contractor' },
                  { value: 'permanent', label: 'Permanent' },
                  { value: 'open_to_both', label: 'Open to Both' },
                ]}
                value={phoneForm.contract_preference}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, contract_preference: e.target.value }))}
              />
              
              {/* Show salary/rate fields inline when open_to_both */}
              {phoneForm.contract_preference === 'open_to_both' && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Input
                    label="Min Salary (£)"
                    type="number"
                    value={phoneForm.minimum_salary_expected}
                    onChange={(e) => setPhoneForm(prev => ({ ...prev, minimum_salary_expected: e.target.value }))}
                    placeholder="e.g., 75000"
                  />
                  <Input
                    label="Day Rate (£)"
                    type="number"
                    value={phoneForm.expected_day_rate}
                    onChange={(e) => setPhoneForm(prev => ({ ...prev, expected_day_rate: e.target.value }))}
                    placeholder="e.g., 550"
                  />
                </div>
              )}
              
              {phoneForm.contract_preference === 'permanent' && (
                <Input
                  label="Minimum Salary Expected (£)"
                  type="number"
                  value={phoneForm.minimum_salary_expected}
                  onChange={(e) => setPhoneForm(prev => ({ ...prev, minimum_salary_expected: e.target.value }))}
                  placeholder="e.g., 75000"
                  className="mt-3"
                />
              )}
              
              {phoneForm.contract_preference === 'contractor' && (
                <Input
                  label="Expected Day Rate (£)"
                  type="number"
                  value={phoneForm.expected_day_rate}
                  onChange={(e) => setPhoneForm(prev => ({ ...prev, expected_day_rate: e.target.value }))}
                  placeholder="e.g., 550"
                  className="mt-3"
                />
              )}
            </div>

            {/* Nationality */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">Nationality</label>
              {phoneNationalities.map((nationality, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      list={`countries-list-${index}`}
                      value={nationality}
                      onChange={(e) => {
                        const updated = [...phoneNationalities];
                        updated[index] = e.target.value;
                        setPhoneNationalities(updated);
                      }}
                      placeholder="Type to search country..."
                      className="w-full px-3 py-2 border border-brand-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                    <datalist id={`countries-list-${index}`}>
                      {countries.map(country => (
                        <option key={country} value={country} />
                      ))}
                    </datalist>
                  </div>
                  {index === phoneNationalities.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setPhoneNationalities([...phoneNationalities, ''])}
                      className="p-2 text-brand-cyan hover:bg-brand-cyan/10 rounded-lg transition-colors"
                      title="Add another nationality"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  ) : null}
                  {phoneNationalities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = phoneNationalities.filter((_, i) => i !== index);
                        setPhoneNationalities(updated);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove this nationality"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment *</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={validationErrors.includes('communication_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Communication" value={parseInt(phoneForm.communication_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, communication_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('professionalism_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Professionalism" value={parseInt(phoneForm.professionalism_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, professionalism_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('enthusiasm_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Enthusiasm" value={parseInt(phoneForm.enthusiasm_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('cultural_fit_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Cultural Fit" value={parseInt(phoneForm.cultural_fit_score) || 0} onChange={(v) => setPhoneForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))} />
              </div>
            </div>
          </div>

          {/* Comments */}
          <Textarea
            label="Warnings"
            value={phoneForm.warnings}
            onChange={(e) => setPhoneForm(prev => ({ ...prev, warnings: e.target.value }))}
            placeholder="Any red flags or things to be careful about..."
            rows={2}
          />
          <div className={validationErrors.includes('general_comments') ? 'validation-error-text rounded-lg' : ''}>
            <Textarea
              label="General Comments *"
              value={phoneForm.general_comments}
              onChange={(e) => setPhoneForm(prev => ({ ...prev, general_comments: e.target.value }))}
              placeholder="Notes from the call..."
              rows={3}
            />
          </div>

          {/* Outcome - at bottom */}
          <div className={`border-t border-brand-grey-200 pt-4 ${validationErrors.includes('outcome') ? 'validation-error rounded-lg p-1' : ''}`}>
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

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => { setIsCompleteModalOpen(false); setValidationErrors([]); }}>Cancel</Button>
            <Button variant="success" onClick={handleSubmitPhoneFeedback} isLoading={isSubmitting}>Save Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Technical Interview Modal */}
      <Modal
        isOpen={isCompleteModalOpen && selectedInterview?.stage === 'technical_interview'}
        onClose={() => { setIsCompleteModalOpen(false); setValidationErrors([]); }}
        title="Technical Interview"
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="xl"
        shake={isShaking}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Skills Section */}
          <div>
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
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment *</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={validationErrors.includes('tech_communication_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Communication" value={parseInt(techForm.communication_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, communication_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('tech_professionalism_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Professionalism" value={parseInt(techForm.professionalism_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, professionalism_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('tech_enthusiasm_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Enthusiasm" value={parseInt(techForm.enthusiasm_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('tech_cultural_fit_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Cultural Fit" value={parseInt(techForm.cultural_fit_score) || 0} onChange={(v) => setTechForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))} />
              </div>
            </div>
          </div>

          <Textarea
            label="Warnings"
            value={techForm.warnings}
            onChange={(e) => setTechForm(prev => ({ ...prev, warnings: e.target.value }))}
            placeholder="Any red flags or things to be careful about..."
            rows={2}
          />
          <div className={validationErrors.includes('tech_general_comments') ? 'validation-error-text rounded-lg' : ''}>
            <Textarea
              label="General Comments *"
              value={techForm.general_comments}
              onChange={(e) => setTechForm(prev => ({ ...prev, general_comments: e.target.value }))}
              placeholder="Technical notes from the interview..."
              rows={3}
            />
          </div>

          {/* Outcome - at bottom */}
          <div className={`border-t border-brand-grey-200 pt-4 ${validationErrors.includes('tech_outcome') ? 'validation-error rounded-lg p-1' : ''}`}>
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

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => { setIsCompleteModalOpen(false); setValidationErrors([]); }}>Cancel</Button>
            <Button variant="success" onClick={handleSubmitTechFeedback} isLoading={isSubmitting}>Save Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Director Interview Modal */}
      <Modal
        isOpen={isCompleteModalOpen && selectedInterview?.stage === 'director_interview'}
        onClose={() => { setIsCompleteModalOpen(false); setValidationErrors([]); }}
        title="Director Interview"
        description={`${candidate.first_name} ${candidate.last_name}`}
        size="lg"
        shake={isShaking}
      >
        <div className="space-y-6">
          {/* Scores */}
          <div>
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment *</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={validationErrors.includes('director_communication_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Communication" value={parseInt(directorForm.communication_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, communication_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('director_professionalism_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Professionalism" value={parseInt(directorForm.professionalism_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, professionalism_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('director_enthusiasm_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Enthusiasm" value={parseInt(directorForm.enthusiasm_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))} />
              </div>
              <div className={validationErrors.includes('director_cultural_fit_score') ? 'validation-error rounded-lg p-2' : ''}>
                <StarRating label="Cultural Fit" value={parseInt(directorForm.cultural_fit_score) || 0} onChange={(v) => setDirectorForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))} />
              </div>
            </div>
          </div>

          <Input
            label="Salary Proposed (£)"
            type="number"
            value={directorForm.salary_proposed}
            onChange={(e) => setDirectorForm(prev => ({ ...prev, salary_proposed: e.target.value }))}
            placeholder="e.g., 65000"
          />

          <Textarea
            label="Warnings"
            value={directorForm.warnings}
            onChange={(e) => setDirectorForm(prev => ({ ...prev, warnings: e.target.value }))}
            placeholder="Any red flags or things to be careful about..."
            rows={2}
          />
          <div className={validationErrors.includes('director_general_comments') ? 'validation-error-text rounded-lg' : ''}>
            <Textarea
              label="General Comments *"
              value={directorForm.general_comments}
              onChange={(e) => setDirectorForm(prev => ({ ...prev, general_comments: e.target.value }))}
              placeholder="Notes from the interview..."
              rows={3}
            />
          </div>

          {/* Outcome - at bottom */}
          <div className={`border-t border-brand-grey-200 pt-4 ${validationErrors.includes('director_outcome') ? 'validation-error rounded-lg p-1' : ''}`}>
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

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => { setIsCompleteModalOpen(false); setValidationErrors([]); }}>Cancel</Button>
            <Button variant="success" onClick={handleSubmitDirectorFeedback} isLoading={isSubmitting}>Save Feedback</Button>
          </div>
        </div>
      </Modal>

      {/* Create Offer Modal */}
      <Modal
        isOpen={isCreateOfferModalOpen}
        onClose={() => setIsCreateOfferModalOpen(false)}
        title="Create Offer"
        description={`Create an offer for ${candidate?.first_name} ${candidate?.last_name}`}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Job Title *"
              value={offerForm.job_title}
              onChange={(e) => setOfferForm(prev => ({ ...prev, job_title: e.target.value }))}
              placeholder="e.g., Senior Software Engineer"
            />
            <Select
              label="Contract Type *"
              options={[
                { value: 'permanent', label: 'Permanent' },
                { value: 'contract', label: 'Contract' },
                { value: 'fixed_term', label: 'Fixed Term' },
              ]}
              value={offerForm.contract_type}
              onChange={(e) => setOfferForm(prev => ({ ...prev, contract_type: e.target.value }))}
            />
          </div>

          {/* Salary/Rate based on contract type */}
          {offerForm.contract_type === 'contract' ? (
            <Input
              label="Day Rate (£) *"
              type="number"
              value={offerForm.day_rate}
              onChange={(e) => setOfferForm(prev => ({ ...prev, day_rate: e.target.value }))}
              placeholder="e.g., 500"
            />
          ) : (
            <Input
              label="Annual Salary (£) *"
              type="number"
              value={offerForm.salary_amount}
              onChange={(e) => setOfferForm(prev => ({ ...prev, salary_amount: e.target.value }))}
              placeholder="e.g., 70000"
            />
          )}

          {/* Start Date, End Date (for fixed term), & Location */}
          <div className={`grid gap-4 ${offerForm.contract_type === 'fixed_term' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Input
              label="Start Date *"
              type="date"
              value={offerForm.start_date}
              onChange={(e) => setOfferForm(prev => ({ ...prev, start_date: e.target.value }))}
            />
            {offerForm.contract_type === 'fixed_term' && (
              <Input
                label="End Date *"
                type="date"
                value={offerForm.end_date}
                onChange={(e) => setOfferForm(prev => ({ ...prev, end_date: e.target.value }))}
              />
            )}
            <Input
              label="Work Location"
              value={offerForm.work_location}
              onChange={(e) => setOfferForm(prev => ({ ...prev, work_location: e.target.value }))}
              placeholder="e.g., London, Remote, Hybrid"
            />
          </div>

          <hr className="border-brand-grey-200" />

          {/* Candidate Document Details */}
          <h3 className="font-medium text-brand-slate-900">Candidate Details (for contract)</h3>
          
          <Input
            label="Full Legal Name *"
            value={offerForm.candidate_full_name}
            onChange={(e) => setOfferForm(prev => ({ ...prev, candidate_full_name: e.target.value }))}
            placeholder="Full name as it should appear on the contract"
          />
          
          <Textarea
            label="Address"
            value={offerForm.candidate_address}
            onChange={(e) => setOfferForm(prev => ({ ...prev, candidate_address: e.target.value }))}
            placeholder="Full address for the contract"
            rows={2}
          />

          {/* Nationality Info */}
          <div className="p-4 bg-brand-grey-50 rounded-lg">
            <p className="text-sm text-brand-grey-500 mb-2">
              <strong>Nationality:</strong> {candidate?.nationalities?.join(', ') || 'Not specified'}
            </p>
            <p className="text-sm text-brand-grey-500">
              <strong>Right to Work:</strong> {candidate?.right_to_work?.replace(/_/g, ' ') || 'Not specified'}
            </p>
          </div>

          {/* Document Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 border-2 border-dashed rounded-lg text-center ${idDocumentFile ? 'border-green-300 bg-green-50' : 'border-brand-grey-300'}`}>
              <Upload className={`h-8 w-8 mx-auto mb-2 ${idDocumentFile ? 'text-green-500' : 'text-brand-grey-400'}`} />
              <p className="text-sm text-brand-grey-500">ID Document</p>
              <p className="text-xs text-brand-grey-400 mb-2">Passport or British ID</p>
              {idDocumentFile ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-green-600 truncate max-w-[120px]">{idDocumentFile.name}</span>
                  <button 
                    onClick={() => setIdDocumentFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && setIdDocumentFile(e.target.files[0])}
                  />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-grey-100 hover:bg-brand-grey-200 rounded text-sm text-brand-slate-700 transition-colors">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </span>
                </label>
              )}
            </div>
            <div className={`p-4 border-2 border-dashed rounded-lg text-center ${rtwDocumentFile ? 'border-green-300 bg-green-50' : 'border-brand-grey-300'}`}>
              <Upload className={`h-8 w-8 mx-auto mb-2 ${rtwDocumentFile ? 'text-green-500' : 'text-brand-grey-400'}`} />
              <p className="text-sm text-brand-grey-500">Right to Work</p>
              <p className="text-xs text-brand-grey-400 mb-2">If non-British nationality</p>
              {rtwDocumentFile ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-green-600 truncate max-w-[120px]">{rtwDocumentFile.name}</span>
                  <button 
                    onClick={() => setRtwDocumentFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && setRtwDocumentFile(e.target.files[0])}
                  />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-grey-100 hover:bg-brand-grey-200 rounded text-sm text-brand-slate-700 transition-colors">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </span>
                </label>
              )}
            </div>
          </div>

          <Textarea
            label="Notes"
            value={offerForm.notes}
            onChange={(e) => setOfferForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes about this offer..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsCreateOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Gift className="h-4 w-4" />}
              onClick={async () => {
                // Validate based on contract type
                const isContract = offerForm.contract_type === 'contract';
                const isFixedTerm = offerForm.contract_type === 'fixed_term';
                
                if (!offerForm.job_title || !offerForm.start_date || !offerForm.candidate_full_name) {
                  toast.error('Validation Error', 'Please fill in all required fields');
                  return;
                }
                
                if (isContract && !offerForm.day_rate) {
                  toast.error('Validation Error', 'Please enter a day rate');
                  return;
                }
                
                if (!isContract && !offerForm.salary_amount) {
                  toast.error('Validation Error', 'Please enter a salary');
                  return;
                }
                
                if (isFixedTerm && !offerForm.end_date) {
                  toast.error('Validation Error', 'Please enter an end date for fixed term contract');
                  return;
                }
                
                setIsCreatingOffer(true);
                try {
                  // Find the approver (the director above the current user's manager)
                  const currentUserData = users.find(u => u.id === user?.id);
                  const managerId = currentUserData?.reports_to;
                  const manager = managerId ? users.find(u => u.id === managerId) : null;
                  const directorId = manager?.reports_to || managerId;
                  
                  // If no director found, use any user with director role
                  let approverId = directorId;
                  if (!approverId) {
                    const director = users.find(u => u.roles?.includes('director'));
                    approverId = director?.id;
                  }
                  
                  if (!approverId) {
                    toast.error('Error', 'No director found for approval. Please contact admin.');
                    return;
                  }
                  
                  await offersService.create({
                    candidate_id: id!,
                    requirement_id: linkedRequirements[0]?.requirement_id,
                    job_title: offerForm.job_title,
                    salary_amount: offerForm.salary_amount ? parseFloat(offerForm.salary_amount) : undefined,
                    contract_type: offerForm.contract_type,
                    day_rate: offerForm.day_rate ? parseFloat(offerForm.day_rate) : undefined,
                    start_date: offerForm.start_date,
                    end_date: offerForm.end_date || undefined,
                    work_location: offerForm.work_location,
                    candidate_full_name: offerForm.candidate_full_name,
                    candidate_address: offerForm.candidate_address,
                    candidate_nationality: candidate?.nationalities?.join(', '),
                    approver_id: approverId,
                    notes: offerForm.notes,
                    created_by: user?.id,
                    requested_by: user?.id,
                  });
                  
                  toast.success('Offer Created', 'The offer has been submitted for approval');
                  setIsCreateOfferModalOpen(false);
                  loadOffers();
                } catch (error: any) {
                  console.error('Error creating offer:', error);
                  toast.error('Error', error.message || 'Failed to create offer');
                } finally {
                  setIsCreatingOffer(false);
                }
              }}
              isLoading={isCreatingOffer}
            >
              Submit for Approval
            </Button>
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
