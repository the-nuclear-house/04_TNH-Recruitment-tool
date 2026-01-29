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
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
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
  getStatusVariant,
  Avatar,
} from '@/components/ui';
import { formatDate, formatCurrency, statusLabels } from '@/lib/utils';
import type { Candidate, Interview } from '@/types';

// Mock candidate data
const mockCandidate: Candidate & { interviews: (Interview & { interviewer_name: string })[] } = {
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
  summary: 'Full-stack developer with 8 years of experience specialising in cloud architecture and microservices. Strong background in Python and JavaScript ecosystems. Led multiple teams delivering enterprise-scale applications for financial services clients.',
  skills: ['Python', 'AWS', 'Kubernetes', 'React', 'TypeScript', 'PostgreSQL', 'Docker', 'Terraform', 'Node.js', 'GraphQL'],
  right_to_work: 'british_citizen',
  security_vetting: 'sc',
  open_to_relocate: true,
  relocation_preferences: 'Manchester, Edinburgh, Remote',
  current_salary: 85000,
  salary_expectation_min: 95000,
  salary_expectation_max: 110000,
  salary_currency: 'GBP',
  sector_flexibility: 'Defence, Finance, Healthcare',
  scope_flexibility: 'Backend, Full-stack, Architecture',
  status: 'director_interview',
  source: 'LinkedIn',
  created_by: 'user-1',
  created_at: '2025-01-10T09:00:00Z',
  updated_at: '2025-01-22T14:30:00Z',
  interviews: [
    {
      id: 'int-1',
      application_id: 'app-1',
      stage: 'phone_qualification',
      interviewer_id: 'user-recruiter-001',
      interviewer_name: 'Emma Clarke',
      scheduled_at: '2025-01-12T10:00:00Z',
      completed_at: '2025-01-12T10:30:00Z',
      duration_minutes: 30,
      outcome: 'pass',
      general_comments: 'Excellent communication skills. Very clear about career goals and expectations. Enthusiastic about the opportunity.',
      years_experience_confirmed: 8,
      degree_confirmed: 'MSc Computer Science',
      right_to_work_confirmed: 'british_citizen',
      security_vetting_confirmed: 'sc',
      current_salary_confirmed: 85000,
      salary_expectation_confirmed: '£95k-£110k',
      salary_proposed: '£100k base + benefits',
      open_to_relocate_confirmed: true,
      relocation_notes: 'Prefers London but open to Manchester',
      communication_score: 5,
      communication_notes: 'Articulate and confident',
      professionalism_score: 5,
      professionalism_notes: 'Very professional throughout',
      enthusiasm_score: 4,
      enthusiasm_notes: 'Genuinely interested in the role',
      cultural_fit_score: 4,
      cultural_fit_notes: 'Would fit well with team culture',
      technical_depth_score: null,
      technical_depth_notes: null,
      problem_solving_score: null,
      problem_solving_notes: null,
      technical_background: null,
      skills_summary: null,
      sector_flexibility_notes: 'Open to defence and finance',
      scope_flexibility_notes: 'Prefers backend but can do full-stack',
      recommendation: 'Strongly recommend progressing to technical interview',
      created_at: '2025-01-12T10:30:00Z',
      updated_at: '2025-01-12T10:30:00Z',
    },
    {
      id: 'int-2',
      application_id: 'app-1',
      stage: 'technical_interview',
      interviewer_id: 'user-interviewer-001',
      interviewer_name: 'Michael Chen',
      scheduled_at: '2025-01-15T14:00:00Z',
      completed_at: '2025-01-15T15:00:00Z',
      duration_minutes: 60,
      outcome: 'pass',
      general_comments: 'Strong technical candidate with deep knowledge of cloud architecture. Solved the coding challenge efficiently and explained thought process clearly.',
      years_experience_confirmed: null,
      degree_confirmed: null,
      right_to_work_confirmed: null,
      security_vetting_confirmed: null,
      current_salary_confirmed: null,
      salary_expectation_confirmed: null,
      salary_proposed: null,
      open_to_relocate_confirmed: null,
      relocation_notes: null,
      communication_score: 4,
      communication_notes: 'Explains technical concepts well',
      professionalism_score: 5,
      professionalism_notes: 'Well prepared for the interview',
      enthusiasm_score: 4,
      enthusiasm_notes: 'Asked good questions about the tech stack',
      cultural_fit_score: 4,
      cultural_fit_notes: 'Collaborative approach to problem solving',
      technical_depth_score: 5,
      technical_depth_notes: 'Excellent understanding of distributed systems',
      problem_solving_score: 4,
      problem_solving_notes: 'Methodical approach, considered edge cases',
      technical_background: 'Strong in Python, AWS, Kubernetes. Has led architecture decisions on previous projects.',
      skills_summary: 'Cloud architecture, microservices, API design, database optimisation',
      sector_flexibility_notes: null,
      scope_flexibility_notes: null,
      recommendation: 'Recommend for director interview. Strong technical fit.',
      created_at: '2025-01-15T15:00:00Z',
      updated_at: '2025-01-15T15:00:00Z',
    },
    {
      id: 'int-3',
      application_id: 'app-1',
      stage: 'director_interview',
      interviewer_id: 'user-director-001',
      interviewer_name: 'Sarah Thompson',
      scheduled_at: '2025-01-22T11:00:00Z',
      completed_at: null,
      duration_minutes: 30,
      outcome: 'pending',
      general_comments: null,
      years_experience_confirmed: null,
      degree_confirmed: null,
      right_to_work_confirmed: null,
      security_vetting_confirmed: null,
      current_salary_confirmed: null,
      salary_expectation_confirmed: null,
      salary_proposed: null,
      open_to_relocate_confirmed: null,
      relocation_notes: null,
      communication_score: null,
      communication_notes: null,
      professionalism_score: null,
      professionalism_notes: null,
      enthusiasm_score: null,
      enthusiasm_notes: null,
      cultural_fit_score: null,
      cultural_fit_notes: null,
      technical_depth_score: null,
      technical_depth_notes: null,
      problem_solving_score: null,
      problem_solving_notes: null,
      technical_background: null,
      skills_summary: null,
      sector_flexibility_notes: null,
      scope_flexibility_notes: null,
      recommendation: null,
      created_at: '2025-01-20T09:00:00Z',
      updated_at: '2025-01-20T09:00:00Z',
    },
  ],
};

// Helper function to calculate average soft skills score
function calculateSoftSkillsAverage(interview: Interview): number | null {
  const scores = [
    interview.communication_score,
    interview.professionalism_score,
    interview.enthusiasm_score,
    interview.cultural_fit_score,
  ].filter((s): s is number => s !== null);
  
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

// Helper function to calculate average technical score
function calculateTechnicalAverage(interview: Interview): number | null {
  const scores = [
    interview.technical_depth_score,
    interview.problem_solving_score,
  ].filter((s): s is number => s !== null);
  
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

const stageIcons = {
  phone_qualification: Phone,
  technical_interview: Briefcase,
  director_interview: User,
};

const stageLabels = {
  phone_qualification: 'Phone Qualification',
  technical_interview: 'Technical Interview',
  director_interview: 'Director Interview',
};

export function CandidateProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);
  
  // In real app, fetch candidate by id
  const candidate = mockCandidate;

  const toggleInterview = (interviewId: string) => {
    setExpandedInterview(expandedInterview === interviewId ? null : interviewId);
  };

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

          {/* Skills Tags */}
          <div className="mt-6 pt-6 border-t border-brand-grey-200">
            <h3 className="text-sm font-medium text-brand-slate-700 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <Badge key={skill} variant="cyan">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interview Timeline - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-brand-slate-900">Interview Timeline</h2>
            
            <div className="space-y-4">
              {candidate.interviews.map((interview, index) => {
                const StageIcon = stageIcons[interview.stage];
                const softSkillsAvg = calculateSoftSkillsAverage(interview);
                const technicalAvg = calculateTechnicalAverage(interview);
                const isExpanded = expandedInterview === interview.id;
                const isCompleted = interview.completed_at !== null;
                const isPending = interview.outcome === 'pending';
                
                return (
                  <Card key={interview.id} padding="none" className="overflow-hidden">
                    {/* Timeline connector */}
                    <div className="flex">
                      {/* Left side - Icon and line */}
                      <div className="flex flex-col items-center px-4 py-4">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${interview.outcome === 'pass' ? 'bg-brand-green/15 text-green-700' :
                            interview.outcome === 'fail' ? 'bg-red-100 text-red-700' :
                            'bg-brand-gold/15 text-amber-700'}
                        `}>
                          <StageIcon className="h-5 w-5" />
                        </div>
                        {index < candidate.interviews.length - 1 && (
                          <div className="w-0.5 flex-1 bg-brand-grey-200 mt-2" />
                        )}
                      </div>

                      {/* Right side - Content */}
                      <div className="flex-1 py-4 pr-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-brand-slate-900">
                              {stageLabels[interview.stage]}
                            </h3>
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
                          </div>
                          
                          {/* Outcome badge */}
                          <div className="flex items-center gap-2">
                            {interview.outcome === 'pass' && (
                              <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                                <CheckCircle className="h-4 w-4" />
                                Pass
                              </span>
                            )}
                            {interview.outcome === 'fail' && (
                              <span className="flex items-center gap-1 text-sm font-medium text-red-700">
                                <XCircle className="h-4 w-4" />
                                Fail
                              </span>
                            )}
                            {interview.outcome === 'pending' && (
                              <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                                <Clock className="h-4 w-4" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Scores row */}
                        {isCompleted && (
                          <div className="flex items-center gap-6 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-brand-grey-400">Soft Skills:</span>
                              {softSkillsAvg !== null ? (
                                <span className={`text-sm font-semibold ${
                                  softSkillsAvg >= 4 ? 'text-green-700' :
                                  softSkillsAvg >= 3 ? 'text-amber-700' : 'text-red-700'
                                }`}>
                                  {softSkillsAvg}/5
                                </span>
                              ) : (
                                <span className="text-sm text-brand-grey-400">N/A</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-brand-grey-400">Technical:</span>
                              {technicalAvg !== null ? (
                                <span className={`text-sm font-semibold ${
                                  technicalAvg >= 4 ? 'text-green-700' :
                                  technicalAvg >= 3 ? 'text-amber-700' : 'text-red-700'
                                }`}>
                                  {technicalAvg}/5
                                </span>
                              ) : (
                                <span className="text-sm text-brand-grey-400">N/A</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Expand button */}
                        {isCompleted && (
                          <button
                            onClick={() => toggleInterview(interview.id)}
                            className="flex items-center gap-1 text-sm text-brand-cyan hover:text-cyan-700 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                View details
                              </>
                            )}
                          </button>
                        )}

                        {/* Expanded details */}
                        {isExpanded && isCompleted && (
                          <div className="mt-4 pt-4 border-t border-brand-grey-200 space-y-4">
                            {/* General comments */}
                            {interview.general_comments && (
                              <div>
                                <h4 className="text-sm font-medium text-brand-slate-700 mb-1">General Comments</h4>
                                <p className="text-sm text-brand-slate-600">{interview.general_comments}</p>
                              </div>
                            )}

                            {/* Soft Skills breakdown */}
                            <div>
                              <h4 className="text-sm font-medium text-brand-slate-700 mb-2">Soft Skills Breakdown</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {interview.communication_score && (
                                  <ScoreItem label="Communication" score={interview.communication_score} note={interview.communication_notes} />
                                )}
                                {interview.professionalism_score && (
                                  <ScoreItem label="Professionalism" score={interview.professionalism_score} note={interview.professionalism_notes} />
                                )}
                                {interview.enthusiasm_score && (
                                  <ScoreItem label="Enthusiasm" score={interview.enthusiasm_score} note={interview.enthusiasm_notes} />
                                )}
                                {interview.cultural_fit_score && (
                                  <ScoreItem label="Cultural Fit" score={interview.cultural_fit_score} note={interview.cultural_fit_notes} />
                                )}
                              </div>
                            </div>

                            {/* Technical breakdown */}
                            {(interview.technical_depth_score || interview.problem_solving_score) && (
                              <div>
                                <h4 className="text-sm font-medium text-brand-slate-700 mb-2">Technical Skills Breakdown</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {interview.technical_depth_score && (
                                    <ScoreItem label="Technical Depth" score={interview.technical_depth_score} note={interview.technical_depth_notes} />
                                  )}
                                  {interview.problem_solving_score && (
                                    <ScoreItem label="Problem Solving" score={interview.problem_solving_score} note={interview.problem_solving_notes} />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Recommendation */}
                            {interview.recommendation && (
                              <div className="p-3 bg-brand-grey-100 rounded-lg">
                                <h4 className="text-sm font-medium text-brand-slate-700 mb-1">Recommendation</h4>
                                <p className="text-sm text-brand-slate-600">{interview.recommendation}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pending state */}
                        {isPending && !isCompleted && (
                          <p className="text-sm text-brand-grey-400 italic">
                            Interview scheduled - awaiting feedback
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Key Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <DetailRow
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Experience"
                  value={`${candidate.years_experience} years`}
                />
                <DetailRow
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Education"
                  value={candidate.degree}
                />
                <DetailRow
                  icon={<Shield className="h-4 w-4" />}
                  label="Security Clearance"
                  value={statusLabels[candidate.security_vetting]}
                />
                <DetailRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Right to Work"
                  value={statusLabels[candidate.right_to_work]}
                />
                <DetailRow
                  icon={<PoundSterling className="h-4 w-4" />}
                  label="Salary Expectation"
                  value={`${formatCurrency(candidate.salary_expectation_min || 0)} - ${formatCurrency(candidate.salary_expectation_max || 0)}`}
                />
                <DetailRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Open to Relocate"
                  value={candidate.open_to_relocate ? `Yes - ${candidate.relocation_preferences}` : 'No'}
                />
              </div>
            </Card>

            {/* Summary */}
            {candidate.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <p className="text-sm text-brand-slate-600 leading-relaxed">
                  {candidate.summary}
                </p>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-brand-grey-200 hover:bg-brand-grey-100 transition-colors text-left">
                  <FileText className="h-5 w-5 text-brand-grey-400" />
                  <div>
                    <p className="text-sm font-medium text-brand-slate-900">CV_Sarah_Chen.pdf</p>
                    <p className="text-xs text-brand-grey-400">Uploaded 10 Jan 2025</p>
                  </div>
                </button>
              </div>
            </Card>

            {/* Meta info */}
            <Card>
              <div className="text-sm text-brand-grey-400 space-y-1">
                <p>Added: {formatDate(candidate.created_at)}</p>
                <p>Last updated: {formatDate(candidate.updated_at)}</p>
                <p>Source: {candidate.source}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-brand-grey-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-brand-grey-400">{label}</p>
        <p className="text-sm text-brand-slate-700">{value}</p>
      </div>
    </div>
  );
}

function ScoreItem({ label, score, note }: { label: string; score: number; note?: string | null }) {
  const getScoreColour = (s: number) => {
    if (s >= 4) return 'bg-brand-green text-green-800';
    if (s >= 3) return 'bg-brand-gold text-amber-800';
    return 'bg-red-200 text-red-800';
  };

  return (
    <div className="p-2 bg-brand-grey-100/50 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-brand-grey-400">{label}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreColour(score)}`}>
          {score}/5
        </span>
      </div>
      {note && <p className="text-xs text-brand-slate-600">{note}</p>}
    </div>
  );
}
