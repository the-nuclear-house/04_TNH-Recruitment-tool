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
  X,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  Badge, 
  Avatar, 
  Select, 
  EmptyState,
  Modal,
  Button,
  Textarea,
  StarRating,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToast } from '@/lib/stores/ui-store';
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
  const toast = useToast();
  
  const [interviews, setInterviews] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  
  // Complete interview modal
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleOpenInterview = (interview: any) => {
    setSelectedInterview(interview);
    setFeedbackForm({
      outcome: interview.outcome || '',
      communication_score: interview.communication_score?.toString() || '',
      professionalism_score: interview.professionalism_score?.toString() || '',
      enthusiasm_score: interview.enthusiasm_score?.toString() || '',
      cultural_fit_score: interview.cultural_fit_score?.toString() || '',
      technical_depth_score: interview.technical_depth_score?.toString() || '',
      problem_solving_score: interview.problem_solving_score?.toString() || '',
      general_comments: interview.general_comments || '',
      recommendation: interview.recommendation || '',
    });
    setIsModalOpen(true);
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
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Error', 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show interviews where the current user is the interviewer
  const myInterviews = interviews.filter(i => i.interviewer_id === user?.id);

  const filteredInterviews = myInterviews.filter(interview => {
    const matchesStage = !stageFilter || interview.stage === stageFilter;
    const matchesOutcome = !outcomeFilter || interview.outcome === outcomeFilter;
    return matchesStage && matchesOutcome;
  });

  const pendingCount = myInterviews.filter(i => i.outcome === 'pending').length;
  const completedCount = myInterviews.filter(i => i.outcome === 'pass' || i.outcome === 'fail').length;

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

  const selectedCandidate = selectedInterview ? candidates[selectedInterview.candidate_id] : null;
  const selectedStageConfig = selectedInterview ? stageConfig[selectedInterview.stage as InterviewStage] : null;

  return (
    <div className="min-h-screen">
      <Header
        title="My Interviews"
        subtitle="Your scheduled interviews"
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
                <p className="text-2xl font-bold text-brand-slate-900">{myInterviews.length}</p>
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
            title="No interviews assigned to you"
            description={myInterviews.length === 0 
              ? "You don't have any interviews assigned yet. Interviews will appear here when you're selected as an interviewer." 
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
              const isMyInterview = interview.interviewer_id === user?.id;
              const canComplete = interview.outcome === 'pending';
              
              return (
                <Card
                  key={interview.id}
                  hover
                  className={`cursor-pointer ${interview.outcome === 'pending' && isToday(interview.scheduled_at) ? 'border-l-4 border-l-amber-500' : ''} ${isMyInterview ? 'ring-2 ring-brand-cyan/30' : ''}`}
                  onClick={() => handleOpenInterview(interview)}
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
                          {isMyInterview && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-cyan/10 text-brand-cyan">
                              Your Interview
                            </span>
                          )}
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

      {/* Complete Interview Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedStageConfig ? `${selectedStageConfig.label} Interview` : 'Interview'}
        description={selectedCandidate ? `${selectedCandidate.first_name} ${selectedCandidate.last_name}` : ''}
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
              <StarRating
                label="Communication"
                value={parseInt(feedbackForm.communication_score) || 0}
                onChange={(v) => setFeedbackForm(prev => ({ ...prev, communication_score: v.toString() }))}
              />
              <StarRating
                label="Professionalism"
                value={parseInt(feedbackForm.professionalism_score) || 0}
                onChange={(v) => setFeedbackForm(prev => ({ ...prev, professionalism_score: v.toString() }))}
              />
              <StarRating
                label="Enthusiasm"
                value={parseInt(feedbackForm.enthusiasm_score) || 0}
                onChange={(v) => setFeedbackForm(prev => ({ ...prev, enthusiasm_score: v.toString() }))}
              />
              <StarRating
                label="Cultural Fit"
                value={parseInt(feedbackForm.cultural_fit_score) || 0}
                onChange={(v) => setFeedbackForm(prev => ({ ...prev, cultural_fit_score: v.toString() }))}
              />
            </div>
          </div>

          {/* Technical Scores (for technical/director interviews) */}
          {selectedInterview?.stage !== 'phone_qualification' && (
            <div>
              <h4 className="text-sm font-medium text-brand-slate-700 mb-3">Technical Skills</h4>
              <div className="grid grid-cols-2 gap-4">
                <StarRating
                  label="Technical Depth"
                  value={parseInt(feedbackForm.technical_depth_score) || 0}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, technical_depth_score: v.toString() }))}
                />
                <StarRating
                  label="Problem Solving"
                  value={parseInt(feedbackForm.problem_solving_score) || 0}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, problem_solving_score: v.toString() }))}
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
          <div className="flex justify-between items-center pt-4 border-t border-brand-grey-200">
            <Button
              variant="ghost"
              onClick={() => selectedCandidate && navigate(`/candidates/${selectedCandidate.id}`)}
            >
              View Candidate Profile
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
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
        </div>
      </Modal>
    </div>
  );
}
