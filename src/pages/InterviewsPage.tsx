import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Briefcase, 
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Badge, Avatar, Select, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { interviewsService, candidatesService, usersService } from '@/lib/services';

type InterviewStage = 'phone_qualification' | 'technical_interview' | 'director_interview';

const stageConfig: Record<InterviewStage, { label: string; icon: typeof Phone; colour: string }> = {
  phone_qualification: { label: 'Phone', icon: Phone, colour: 'bg-blue-100 text-blue-700' },
  technical_interview: { label: 'Technical', icon: Briefcase, colour: 'bg-purple-100 text-purple-700' },
  director_interview: { label: 'Director', icon: User, colour: 'bg-amber-100 text-amber-700' },
};

const outcomeConfig: Record<string, { label: string; colour: string }> = {
  pending: { label: 'Pending', colour: 'bg-amber-100 text-amber-700' },
  pass: { label: 'Pass', colour: 'bg-green-100 text-green-700' },
  fail: { label: 'Fail', colour: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', colour: 'bg-slate-100 text-slate-500' },
};

export function InterviewsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [interviewsData, candidatesData, usersData] = await Promise.all([
        interviewsService.getAll(),
        candidatesService.getAll(),
        usersService.getAll(),
      ]);
      
      setInterviews(interviewsData);
      
      // Create lookup maps
      const candidateMap: Record<string, any> = {};
      candidatesData.forEach(c => { candidateMap[c.id] = c; });
      setCandidates(candidateMap);
      
      const userMap: Record<string, any> = {};
      usersData.forEach(u => { userMap[u.id] = u; });
      setUsers(userMap);
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesStage = !stageFilter || interview.stage === stageFilter;
    const matchesOutcome = !outcomeFilter || interview.outcome === outcomeFilter;
    return matchesStage && matchesOutcome;
  });

  const pendingCount = interviews.filter(i => i.outcome === 'pending').length;
  const completedCount = interviews.filter(i => i.outcome === 'pass' || i.outcome === 'fail').length;

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Interviews"
        subtitle="Manage and track all interviews"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                <p className="text-sm text-amber-600">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{completedCount}</p>
                <p className="text-sm text-green-600">Completed</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-grey-100 rounded-lg">
                <Calendar className="h-5 w-5 text-brand-slate-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{interviews.length}</p>
                <p className="text-sm text-brand-grey-400">Total</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
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
                { value: '', label: 'All Outcomes' },
                { value: 'pending', label: 'Pending' },
                { value: 'pass', label: 'Pass' },
                { value: 'fail', label: 'Fail' },
              ]}
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Interviews List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading interviews...</div>
          </Card>
        ) : filteredInterviews.length === 0 ? (
          <EmptyState
            title="No interviews found"
            description={interviews.length === 0 
              ? "Interviews will appear here when you schedule them from a candidate's profile." 
              : "Try adjusting your filters."}
          />
        ) : (
          <div className="space-y-3">
            {filteredInterviews.map(interview => {
              const candidate = candidates[interview.candidate_id];
              const interviewer = users[interview.interviewer_id];
              const stage = interview.stage as InterviewStage;
              const stageInfo = stageConfig[stage] || stageConfig.phone_qualification;
              const StageIcon = stageInfo.icon;
              const outcomeInfo = outcomeConfig[interview.outcome] || outcomeConfig.pending;
              
              return (
                <Card
                  key={interview.id}
                  hover
                  className={`cursor-pointer ${interview.outcome === 'pending' && isToday(interview.scheduled_at) ? 'border-l-4 border-l-amber-500' : ''}`}
                  onClick={() => candidate && navigate(`/candidates/${candidate.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${stageInfo.colour}`}>
                        <StageIcon className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-brand-slate-900">
                            {candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown Candidate'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${outcomeInfo.colour}`}>
                            {outcomeInfo.label}
                          </span>
                          {interview.outcome === 'pass' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {interview.outcome === 'fail' && <XCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <p className="text-sm text-brand-grey-400">
                          {stageInfo.label} Interview
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {interviewer && (
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <Avatar name={interviewer.full_name} size="sm" />
                          <span className="text-brand-slate-700">{interviewer.full_name}</span>
                        </div>
                      )}
                      {interview.scheduled_at && (
                        <div className="flex items-center gap-1 text-sm text-brand-grey-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span className={isToday(interview.scheduled_at) ? 'text-amber-600 font-medium' : ''}>
                            {formatDate(interview.scheduled_at)} {formatTime(interview.scheduled_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
