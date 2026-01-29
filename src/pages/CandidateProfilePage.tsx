import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Shield,
  PoundSterling,
  Linkedin,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Building2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  getStatusVariant,
  Avatar,
  Modal,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { formatDate, formatCurrency, statusLabels } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/lib/stores/ui-store';
import type { Candidate, Interview } from '@/types';

type InterviewStage = 'phone_qualification' | 'technical_interview' | 'director_interview';

interface InterviewWithDetails extends Interview {
  interviewer_name: string;
}

// Mock candidate data
const mockCandidate: Candidate & { 
  interviews: InterviewWithDetails[];
  previous_companies: string[];
  cv_url: string | null;
} = {
  id: '1',
  first_name: 'Sarah',
  last_name: 'Chen',
  email: 'sarah.chen@email.com',
  phone: '+44 7700 900123',
  location: 'London',
  linkedin_url: 'https://linkedin.com/in/sarahchen',
  current_role: 'Senior Software Engineer',
  current_company: 'TechCorp Ltd',
  years_experience: 8,
  degree: 'MSc Computer Science, Imperial College London',
  summary: 'Full-stack developer with 8 years of experience specialising in cloud architecture and microservices. Strong background in Python and JavaScript ecosystems.',
  skills: ['Python', 'TypeScript', 'React', 'AWS', 'Kubernetes', 'PostgreSQL', 'Node.js'],
  previous_companies: ['Google', 'Deloitte', 'Accenture'],
  salary_expectation_min: 95000,
  salary_expectation_max: 110000,
  right_to_work: 'british_citizen',
  security_vetting: 'sc',
  status: 'director_interview',
  source: 'LinkedIn',
  created_at: '2025-01-10T09:00:00Z',
  updated_at: '2025-01-20T14:30:00Z',
  cv_url: '/uploads/sarah-chen-cv.pdf',
  interviews: [
    {
      id: 'int-1',
      application_id: 'app-1',
      stage: 'phone_qualification',
      scheduled_at: '2025-01-12T10:00:00Z',
      completed_at: '2025-01-12T10:30:00Z',
      interviewer_id: 'user-recruiter-001',
      interviewer_name: 'Emma Clarke',
      duration_minutes: 30,
      outcome: 'pass',
      communication_score: 5,
      professionalism_score: 4,
      enthusiasm_score: 5,
      cultural_fit_score: 4,
      technical_depth_score: null,
      problem_solving_score: null,
      general_comments: 'Excellent communication skills. Very articulate and professional. Clearly passionate about technology.',
      recommendation: 'Strong candidate, recommend for technical interview.',
      years_experience_confirmed: null,
      degree_confirmed: null,
      right_to_work_confirmed: null,
      security_vetting_confirmed: null,
      current_salary_confirmed: null,
      salary_expectation_confirmed: null,
      salary_proposed: null,
      open_to_relocate_confirmed: null,
      relocation_notes: null,
      communication_notes: null,
      professionalism_notes: null,
      enthusiasm_notes: null,
      cultural_fit_notes: null,
      technical_depth_notes: null,
      problem_solving_notes: null,
      technical_background: null,
      skills_summary: null,
      sector_flexibility_notes: null,
      scope_flexibility_notes: null,
      created_at: '2025-01-11T09:00:00Z',
      updated_at: '2025-01-12T11:00:00Z',
    },
    {
      id: 'int-2',
      application_id: 'app-1',
      stage: 'technical_interview',
      scheduled_at: '2025-01-18T14:00:00Z',
      completed_at: '2025-01-18T15:30:00Z',
      interviewer_id: 'user-interviewer-001',
      interviewer_name: 'Michael Chen',
      duration_minutes: 90,
      outcome: 'pass',
      communication_score: 4,
      professionalism_score: 5,
      enthusiasm_score: 4,
      cultural_fit_score: 5,
      technical_depth_score: 5,
      problem_solving_score: 4,
      general_comments: 'Strong technical skills. Solved the coding challenge efficiently. Good system design knowledge.',
      recommendation: 'Recommend for director interview. Would be a great fit for the BAE Systems project.',
      years_experience_confirmed: null,
      degree_confirmed: null,
      right_to_work_confirmed: null,
      security_vetting_confirmed: null,
      current_salary_confirmed: null,
      salary_expectation_confirmed: null,
      salary_proposed: null,
      open_to_relocate_confirmed: null,
      relocation_notes: null,
      communication_notes: null,
      professionalism_notes: null,
      enthusiasm_notes: null,
      cultural_fit_notes: null,
      technical_depth_notes: null,
      problem_solving_notes: null,
      technical_background: null,
      skills_summary: null,
      sector_flexibility_notes: null,
      scope_flexibility_notes: null,
      created_at: '2025-01-15T09:00:00Z',
      updated_at: '2025-01-18T16:00:00Z',
    },
  ],
};

const stageConfig: Record<InterviewStage, { 
  label: string; 
  icon: typeof Phone;
  colour: string;
  bgColour: string;
  order: number;
}> = {
  phone_qualification: { 
    label: 'Phone Qualification', 
    icon: Phone, 
    colour: 'text-blue-700',
    bgColour: 'bg-blue-100',
    order: 1,
  },
  technical_interview: { 
    label: 'Technical Interview', 
    icon: Briefcase, 
    colour: 'text-purple-700',
    bgColour: 'bg-purple-100',
    order: 2,
  },
  director_interview: { 
    label: 'Director Interview', 
    icon: User, 
    colour: 'text-amber-700',
    bgColour: 'bg-amber-100',
    order: 3,
  },
};

const interviewerOptions = [
  { value: '', label: 'Select Interviewer' },
  { value: 'user-recruiter-001', label: 'Emma Clarke (Recruiter)' },
  { value: 'user-interviewer-001', label: 'Michael Chen (Technical)' },
  { value: 'user-manager-001', label: 'James Wilson (Manager)' },
  { value: 'user-director-001', label: 'Sarah Thompson (Director)' },
];

function calculateSoftSkillsAverage(interview: InterviewWithDetails): number | null {
  const scores = [
    interview.communication_score,
    interview.professionalism_score,
    interview.enthusiasm_score,
    interview.cultural_fit_score,
  ].filter((s): s is number => s !== null);
  
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function calculateTechnicalAverage(interview: InterviewWithDetails): number | null {
  const scores = [
    interview.technical_depth_score,
    interview.problem_solving_score,
  ].filter((s): s is number => s !== null);
  
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export function CandidateProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const permissions = usePermissions();
  const toast = useToast();
  
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<InterviewStage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [scheduleForm, setScheduleForm] = useState({
    interviewer_id: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
  });

  // In real app, fetch candidate by id
  const candidate = mockCandidate;

  // Get interview by stage
  const getInterviewByStage = (stage: InterviewStage) => {
    return candidate.interviews.find(i => i.stage === stage);
  };

  const handleScheduleInterview = (stage: InterviewStage) => {
    setSelectedStage(stage);
    setScheduleForm({
      interviewer_id: '',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSubmitSchedule = async () => {
    if (!scheduleForm.interviewer_id || !scheduleForm.scheduled_date || !scheduleForm.scheduled_time) {
      toast.error('Validation Error', 'Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Interview Scheduled', `${stageConfig[selectedStage!].label} has been scheduled`);
    setIsScheduleModalOpen(false);
    setIsSubmitting(false);
  };

  const toggleInterview = (interviewId: string) => {
    setExpandedInterview(expandedInterview === interviewId ? null : interviewId);
  };

  const allStages: InterviewStage[] = ['phone_qualification', 'technical_interview', 'director_interview'];

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Header
        title="Candidate Profile"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/candidates')}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Edit className="h-4 w-4" />}
              onClick={() => navigate(`/candidates/${id}/edit`)}
            >
              Edit Profile
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and basic info */}
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
                  <Badge variant={getStatusVariant(candidate.status)}>
                    {statusLabels[candidate.status]}
                  </Badge>
                </div>
                <p className="text-lg text-brand-slate-700">
                  {candidate.current_role}
                </p>
                <p className="text-brand-grey-400">
                  {candidate.current_company}
                </p>
              </div>
            </div>

            {/* Contact info */}
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
                {candidate.skills.map(skill => (
                  <Badge key={skill} variant="cyan">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Previous Companies */}
          {candidate.previous_companies && candidate.previous_companies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-brand-slate-700 mb-3">Previous Companies</h3>
              <div className="flex flex-wrap gap-2">
                {candidate.previous_companies.map(company => (
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
                  const isExpanded = expandedInterview === interview?.id;
                  
                  // Determine if this stage can be scheduled
                  const previousStage = index > 0 ? allStages[index - 1] : null;
                  const previousInterview = previousStage ? getInterviewByStage(previousStage) : null;
                  const canSchedule = isNotStarted && (index === 0 || previousInterview?.outcome === 'pass');
                  
                  return (
                    <div
                      key={stage}
                      className={`
                        rounded-lg border-2 transition-all
                        ${isCompleted ? 'border-green-200 bg-green-50/50' : 
                          isPending ? 'border-amber-200 bg-amber-50/50' :
                          canSchedule ? 'border-brand-grey-200 bg-white' :
                          'border-brand-grey-100 bg-brand-grey-50 opacity-50'}
                      `}
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
                                  <span className="flex items-center gap-1">
                                    <User className="h-3.5 w-3.5" />
                                    {interview.interviewer_name}
                                  </span>
                                </div>
                              )}
                              {isNotStarted && !canSchedule && (
                                <p className="text-sm text-brand-grey-400">Complete previous stage first</p>
                              )}
                            </div>
                          </div>

                          {/* Status / Action */}
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
                            {interview?.outcome === 'pending' && (
                              <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                                <Clock className="h-4 w-4" />
                                Pending Feedback
                              </span>
                            )}
                            {isNotStarted && canSchedule && (
                              <Button
                                variant="success"
                                size="sm"
                                leftIcon={<Plus className="h-4 w-4" />}
                                onClick={() => handleScheduleInterview(stage)}
                              >
                                Schedule
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Scores for completed interviews */}
                        {isCompleted && interview && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-brand-grey-400">Soft Skills:</span>
                                {calculateSoftSkillsAverage(interview) !== null ? (
                                  <span className={`text-sm font-semibold ${
                                    calculateSoftSkillsAverage(interview)! >= 4 ? 'text-green-700' :
                                    calculateSoftSkillsAverage(interview)! >= 3 ? 'text-amber-700' : 'text-red-700'
                                  }`}>
                                    {calculateSoftSkillsAverage(interview)}/5
                                  </span>
                                ) : (
                                  <span className="text-sm text-brand-grey-400">N/A</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-brand-grey-400">Technical:</span>
                                {calculateTechnicalAverage(interview) !== null ? (
                                  <span className={`text-sm font-semibold ${
                                    calculateTechnicalAverage(interview)! >= 4 ? 'text-green-700' :
                                    calculateTechnicalAverage(interview)! >= 3 ? 'text-amber-700' : 'text-red-700'
                                  }`}>
                                    {calculateTechnicalAverage(interview)}/5
                                  </span>
                                ) : (
                                  <span className="text-sm text-brand-grey-400">N/A</span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleInterview(interview.id)}
                                className="ml-auto flex items-center gap-1 text-sm text-brand-cyan hover:text-cyan-700"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4" />
                                    Hide Details
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4" />
                                    View Details
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && interview && (
                          <div className="mt-4 pt-4 border-t border-brand-grey-200 space-y-4">
                            {interview.general_comments && (
                              <div>
                                <h4 className="text-sm font-medium text-brand-slate-700 mb-1">Comments</h4>
                                <p className="text-sm text-brand-slate-600">{interview.general_comments}</p>
                              </div>
                            )}
                            {interview.recommendation && (
                              <div>
                                <h4 className="text-sm font-medium text-brand-slate-700 mb-1">Recommendation</h4>
                                <p className="text-sm text-brand-slate-600">{interview.recommendation}</p>
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
            {/* Key Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-brand-grey-400" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Experience</p>
                    <p className="text-sm text-brand-slate-700">{candidate.years_experience} years</p>
                  </div>
                </div>
                
                {candidate.degree && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Education</p>
                      <p className="text-sm text-brand-slate-700">{candidate.degree}</p>
                    </div>
                  </div>
                )}
                
                {candidate.security_vetting && (
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Security Clearance</p>
                      <p className="text-sm text-brand-slate-700">{candidate.security_vetting.toUpperCase()}</p>
                    </div>
                  </div>
                )}
                
                {candidate.salary_expectation_min && (
                  <div className="flex items-center gap-3">
                    <PoundSterling className="h-4 w-4 text-brand-grey-400" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Minimum Salary Expected</p>
                      <p className="text-sm text-brand-slate-700">{formatCurrency(candidate.salary_expectation_min)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              {candidate.cv_url ? (
                <a
                  href={candidate.cv_url}
                  className="flex items-center gap-3 p-3 rounded-lg bg-brand-grey-100/50 hover:bg-brand-grey-100 transition-colors"
                >
                  <FileText className="h-5 w-5 text-brand-cyan" />
                  <div>
                    <p className="text-sm font-medium text-brand-slate-700">CV / Resume</p>
                    <p className="text-xs text-brand-grey-400">Click to view</p>
                  </div>
                </a>
              ) : (
                <p className="text-sm text-brand-grey-400">No documents uploaded</p>
              )}
            </Card>

            {/* Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Meta</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Added</span>
                  <span className="text-brand-slate-700">{formatDate(candidate.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Source</span>
                  <span className="text-brand-slate-700">{candidate.source || 'Direct'}</span>
                </div>
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

          <Textarea
            label="Notes for Interviewer"
            value={scheduleForm.notes}
            onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any context or focus areas for this interview..."
            rows={3}
          />

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
    </div>
  );
}
