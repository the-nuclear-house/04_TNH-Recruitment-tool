import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Briefcase, 
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  Badge, 
  Avatar, 
  Select,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

type InterviewStage = 'phone_qualification' | 'technical_interview' | 'director_interview';
type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending_feedback';

interface Interview {
  id: string;
  candidate_id: string;
  candidate_name: string;
  stage: InterviewStage;
  status: InterviewStatus;
  interviewer_id: string;
  interviewer_name: string;
  scheduled_at: string;
  completed_at: string | null;
  outcome: 'pass' | 'fail' | 'pending' | null;
  requirement_customer: string | null;
}

// Mock data
const mockInterviews: Interview[] = [
  {
    id: 'int-1',
    candidate_id: '1',
    candidate_name: 'Sarah Chen',
    stage: 'director_interview',
    status: 'scheduled',
    interviewer_id: 'user-director-001',
    interviewer_name: 'Sarah Thompson',
    scheduled_at: '2025-01-30T10:00:00Z',
    completed_at: null,
    outcome: 'pending',
    requirement_customer: 'BAE Systems',
  },
  {
    id: 'int-2',
    candidate_id: '2',
    candidate_name: 'James Wilson',
    stage: 'technical_interview',
    status: 'pending_feedback',
    interviewer_id: 'user-interviewer-001',
    interviewer_name: 'Michael Chen',
    scheduled_at: '2025-01-28T14:00:00Z',
    completed_at: '2025-01-28T15:00:00Z',
    outcome: 'pending',
    requirement_customer: 'Barclays',
  },
  {
    id: 'int-3',
    candidate_id: '3',
    candidate_name: 'Priya Patel',
    stage: 'phone_qualification',
    status: 'scheduled',
    interviewer_id: 'user-recruiter-001',
    interviewer_name: 'Emma Clarke',
    scheduled_at: '2025-01-29T11:00:00Z',
    completed_at: null,
    outcome: null,
    requirement_customer: 'NHS Digital',
  },
  {
    id: 'int-4',
    candidate_id: '4',
    candidate_name: 'David Kumar',
    stage: 'phone_qualification',
    status: 'completed',
    interviewer_id: 'user-recruiter-001',
    interviewer_name: 'Emma Clarke',
    scheduled_at: '2025-01-25T09:00:00Z',
    completed_at: '2025-01-25T09:30:00Z',
    outcome: 'pass',
    requirement_customer: 'EDF Energy',
  },
  {
    id: 'int-5',
    candidate_id: '5',
    candidate_name: 'Lisa Park',
    stage: 'technical_interview',
    status: 'completed',
    interviewer_id: 'user-interviewer-001',
    interviewer_name: 'Michael Chen',
    scheduled_at: '2025-01-26T15:00:00Z',
    completed_at: '2025-01-26T16:00:00Z',
    outcome: 'pass',
    requirement_customer: 'Rolls Royce',
  },
  {
    id: 'int-6',
    candidate_id: '6',
    candidate_name: 'Tom Brown',
    stage: 'director_interview',
    status: 'completed',
    interviewer_id: 'user-director-001',
    interviewer_name: 'Sarah Thompson',
    scheduled_at: '2025-01-24T11:00:00Z',
    completed_at: '2025-01-24T11:30:00Z',
    outcome: 'fail',
    requirement_customer: 'GCHQ',
  },
  {
    id: 'int-7',
    candidate_id: '7',
    candidate_name: 'Anna Smith',
    stage: 'phone_qualification',
    status: 'scheduled',
    interviewer_id: 'user-manager-001',
    interviewer_name: 'James Wilson',
    scheduled_at: '2025-01-31T10:00:00Z',
    completed_at: null,
    outcome: null,
    requirement_customer: 'Network Rail',
  },
];

const stageConfig: Record<InterviewStage, { label: string; icon: typeof Phone; colour: string }> = {
  phone_qualification: { label: 'Phone', icon: Phone, colour: 'bg-blue-100 text-blue-700' },
  technical_interview: { label: 'Technical', icon: Briefcase, colour: 'bg-purple-100 text-purple-700' },
  director_interview: { label: 'Director', icon: User, colour: 'bg-amber-100 text-amber-700' },
};

const statusConfig: Record<InterviewStatus, { label: string; colour: string }> = {
  scheduled: { label: 'Scheduled', colour: 'bg-cyan-100 text-cyan-700' },
  pending_feedback: { label: 'Pending Feedback', colour: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', colour: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', colour: 'bg-slate-100 text-slate-500' },
};

const interviewerStats = [
  { id: 'user-director-001', name: 'Sarah Thompson', total: 12, thisWeek: 2 },
  { id: 'user-interviewer-001', name: 'Michael Chen', total: 28, thisWeek: 4 },
  { id: 'user-recruiter-001', name: 'Emma Clarke', total: 45, thisWeek: 6 },
  { id: 'user-manager-001', name: 'James Wilson', total: 8, thisWeek: 1 },
];

export function InterviewsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stageFilter, setStageFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  // Filter interviews
  const filteredInterviews = mockInterviews.filter(interview => {
    const matchesStage = !stageFilter || interview.stage === stageFilter;
    const matchesStatus = !statusFilter || interview.status === statusFilter;
    const matchesMine = viewMode === 'all' || interview.interviewer_id === user?.id;
    return matchesStage && matchesStatus && matchesMine;
  });

  // Stats calculations
  const totalScheduled = mockInterviews.filter(i => i.status === 'scheduled').length;
  const pendingFeedback = mockInterviews.filter(i => i.status === 'pending_feedback').length;
  const completedThisWeek = mockInterviews.filter(i => i.status === 'completed').length;

  // Stage breakdown
  const stageBreakdown = {
    phone_qualification: mockInterviews.filter(i => i.stage === 'phone_qualification' && ['scheduled', 'pending_feedback'].includes(i.status)).length,
    technical_interview: mockInterviews.filter(i => i.stage === 'technical_interview' && ['scheduled', 'pending_feedback'].includes(i.status)).length,
    director_interview: mockInterviews.filter(i => i.stage === 'director_interview' && ['scheduled', 'pending_feedback'].includes(i.status)).length,
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateStr: string) => {
    const date = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const formatInterviewDate = (dateStr: string) => {
    if (isToday(dateStr)) return 'Today';
    if (isTomorrow(dateStr)) return 'Tomorrow';
    return formatDate(dateStr);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Interviews"
        subtitle="Manage and track all interviews across the organisation"
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-cyan-50 border-cyan-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Calendar className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-700">{totalScheduled}</p>
                <p className="text-sm text-cyan-600">Scheduled</p>
              </div>
            </div>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{pendingFeedback}</p>
                <p className="text-sm text-amber-600">Pending Feedback</p>
              </div>
            </div>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{completedThisWeek}</p>
                <p className="text-sm text-green-600">Completed This Week</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-grey-100 rounded-lg">
                <Users className="h-5 w-5 text-brand-slate-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{mockInterviews.length}</p>
                <p className="text-sm text-brand-grey-400">Total This Month</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Active by Stage</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {(Object.keys(stageConfig) as InterviewStage[]).map(stage => {
                const count = stageBreakdown[stage];
                const maxCount = Math.max(...Object.values(stageBreakdown), 1);
                const StageIcon = stageConfig[stage].icon;
                
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stageConfig[stage].colour}`}>
                      <StageIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-brand-slate-700">
                          {stageConfig[stage].label}
                        </span>
                        <span className="text-sm font-bold text-brand-slate-900">{count}</span>
                      </div>
                      <div className="h-2 bg-brand-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-cyan rounded-full transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* By Interviewer */}
          <Card>
            <CardHeader>
              <CardTitle>Interviews by Team Member</CardTitle>
              <span className="text-sm text-brand-grey-400">This week</span>
            </CardHeader>
            <div className="space-y-3">
              {interviewerStats.sort((a, b) => b.thisWeek - a.thisWeek).map(interviewer => {
                const maxCount = Math.max(...interviewerStats.map(i => i.thisWeek), 1);
                
                return (
                  <div key={interviewer.id} className="flex items-center gap-3">
                    <Avatar name={interviewer.name} size="sm" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-brand-slate-700">
                          {interviewer.name}
                        </span>
                        <span className="text-sm text-brand-grey-400">
                          <span className="font-bold text-brand-slate-900">{interviewer.thisWeek}</span> this week
                        </span>
                      </div>
                      <div className="h-2 bg-brand-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-green rounded-full transition-all"
                          style={{ width: `${(interviewer.thisWeek / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            {/* View toggle */}
            <div className="flex rounded-lg border border-brand-grey-200 overflow-hidden">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-brand-slate-900 text-white'
                    : 'bg-white text-brand-grey-400 hover:text-brand-slate-700'
                }`}
              >
                All Interviews
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'mine'
                    ? 'bg-brand-slate-900 text-white'
                    : 'bg-white text-brand-grey-400 hover:text-brand-slate-700'
                }`}
              >
                My Interviews
              </button>
            </div>

            <Select
              options={[
                { value: '', label: 'All Stages' },
                { value: 'phone_qualification', label: 'Phone' },
                { value: 'technical_interview', label: 'Technical' },
                { value: 'director_interview', label: 'Director' },
              ]}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            />

            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'pending_feedback', label: 'Pending Feedback' },
                { value: 'completed', label: 'Completed' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Interviews List */}
        <div className="space-y-3">
          {filteredInterviews.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-brand-grey-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No interviews found matching your filters</p>
              </div>
            </Card>
          ) : (
            filteredInterviews.map(interview => {
              const StageIcon = stageConfig[interview.stage].icon;
              const isUrgent = interview.status === 'pending_feedback' || isToday(interview.scheduled_at);
              
              return (
                <Card
                  key={interview.id}
                  hover
                  className={`cursor-pointer ${isUrgent ? 'border-l-4 border-l-amber-500' : ''}`}
                  onClick={() => navigate(`/candidates/${interview.candidate_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Stage icon */}
                      <div className={`p-3 rounded-lg ${stageConfig[interview.stage].colour}`}>
                        <StageIcon className="h-5 w-5" />
                      </div>

                      {/* Main info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-brand-slate-900">
                            {interview.candidate_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[interview.status].colour}`}>
                            {statusConfig[interview.status].label}
                          </span>
                          {interview.outcome === 'pass' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {interview.outcome === 'fail' && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-brand-grey-400">
                          <span>{stageConfig[interview.stage].label} Interview</span>
                          {interview.requirement_customer && (
                            <>
                              <span>•</span>
                              <span>{interview.requirement_customer}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <Avatar name={interview.interviewer_name} size="sm" />
                          <span className="text-brand-slate-700">{interview.interviewer_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-brand-grey-400 mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span className={isToday(interview.scheduled_at) ? 'text-amber-600 font-medium' : ''}>
                            {formatInterviewDate(interview.scheduled_at)} at {formatTime(interview.scheduled_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-brand-grey-400" />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
