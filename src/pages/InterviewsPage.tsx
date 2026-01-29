import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Settings, 
  CheckCircle,
  XCircle,
  AlertCircle,
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
  technical_interview: { label: 'Technical', icon: Settings, colour: 'bg-purple-100 text-purple-700' },
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
  
  // Filters
  const [stageFilter, setStageFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [showMyCandidatesOnly, setShowMyCandidatesOnly] = useState(false);
  
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
      
      // Create lookup maps
      const candidateMap: Record<string, any> = {};
      candidatesData.forEach(c => { candidateMap[c.id] = c; });
      setCandidates(candidateMap);
      
      const userMap: Record<string, any> = {};
      usersData.forEach(u => { userMap[u.id] = u; });
      setUsers(userMap);
    } catch (error) {
      console.error('Error loading interviews:', error);
      toast.error('Error', 'Failed to load interviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteInterview = (interview: any) => {
    setSelectedInterview(interview);
    setFeedbackForm({
      outcome: interview.outcome === 'pending' ? '' : interview.outcome,
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
      toast.error('Validation Error', 'Please select an outcome');
      return;
    }

    // Validate all scores
    if (!feedbackForm.communication_score || !feedbackForm.professionalism_score || 
        !feedbackForm.enthusiasm_score || !feedbackForm.cultural_fit_score) {
      toast.error('Validation Error', 'Please rate all soft skills');
      return;
    }

    if (!feedbackForm.general_comments) {
      toast.error('Validation Error', 'Please add general comments');
      return;
    }

    if (!feedbackForm.recommendation) {
      toast.error('Validation Error', 'Please add a recommendation');
      return;
    }

    setIsSubmitting(true);
    try {
      await interviewsService.update(selectedInterview.id, {
        outcome: feedbackForm.outcome,
        completed_at: new Date().toISOString(),
        communication_score: parseInt(feedbackForm.communication_score),
        professionalism_score: parseInt(feedbackForm.professionalism_score),
        enthusiasm_score: parseInt(feedbackForm.enthusiasm_score),
        cultural_fit_score: parseInt(feedbackForm.cultural_fit_score),
        technical_depth_score: feedbackForm.technical_depth_score ? parseInt(feedbackForm.technical_depth_score) : undefined,
        problem_solving_score: feedbackForm.problem_solving_score ? parseInt(feedbackForm.problem_solving_score) : undefined,
        general_comments: feedbackForm.general_comments,
        recommendation: feedbackForm.recommendation,
      });

      toast.success('Interview Completed', 'Feedback has been saved');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Error', 'Failed to save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter interviews based on user role and "My Candidates" toggle
  const getRelevantInterviews = () => {
    let filtered = interviews;
    
    // Apply "My Candidates" filter
    if (showMyCandidatesOnly && user) {
      if (user.roles?.includes('recruiter') && !user.roles?.some(r => ['manager', 'director', 'admin'].includes(r))) {
        // Pure recruiters see interviews for candidates they're assigned to
        filtered = filtered.filter(i => {
          const candidate = candidates[i.candidate_id];
          return candidate?.assigned_recruiter_id === user.id;
        });
      } else {
        // Managers/Directors/Admin - show interviews where they are the interviewer
        filtered = filtered.filter(i => i.interviewer_id === user.id);
      }
    }
    
    // Apply stage filter
    if (stageFilter) {
      filtered = filtered.filter(i => i.stage === stageFilter);
    }
    
    // Apply outcome filter
    if (outcomeFilter) {
      filtered = filtered.filter(i => i.outcome === outcomeFilter);
    }
    
    return filtered;
  };

  const filteredInterviews = getRelevantInterviews();
  
  // Stats based on all interviews (before "My Candidates" filter)
  const allInterviews = interviews;
  const pendingCount = allInterviews.filter(i => i.outcome === 'pending').length;
  const completedCount = allInterviews.filter(i => i.outcome === 'pass' || i.outcome === 'fail').length;

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
        title="Interviews"
        subtitle="All scheduled interviews"
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
                <p className="text-2xl font-bold text-brand-slate-900">{allInterviews.length}</p>
                <p className="text-sm text-brand-grey-400">Total</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters - Tag Style */}
        <Card>
          <div className="space-y-4">
            {/* My Candidates Toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant={showMyCandidatesOnly ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={<Users className="h-4 w-4" />}
                onClick={() => setShowMyCandidatesOnly(!showMyCandidatesOnly)}
              >
                My Candidates Only
              </Button>
              {showMyCandidatesOnly && (
                <span className="text-sm text-brand-grey-400">
                  Showing interviews for candidates you're responsible for
                </span>
              )}
            </div>
            
            {/* Stage Filter Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-brand-grey-400 mr-2">Stage:</span>
              <button
                onClick={() => setStageFilter('')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  stageFilter === '' 
                    ? 'bg-brand-cyan text-white' 
                    : 'bg-brand-grey-100 text-brand-grey-500 hover:bg-brand-grey-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStageFilter('phone_qualification')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  stageFilter === 'phone_qualification' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Phone
              </button>
              <button
                onClick={() => setStageFilter('technical_interview')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  stageFilter === 'technical_interview' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                }`}
              >
                Technical
              </button>
              <button
                onClick={() => setStageFilter('director_interview')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  stageFilter === 'director_interview' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
              >
                Director
              </button>
            </div>

            {/* Outcome Filter Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-brand-grey-400 mr-2">Outcome:</span>
              <button
                onClick={() => setOutcomeFilter('')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  outcomeFilter === '' 
                    ? 'bg-brand-cyan text-white' 
                    : 'bg-brand-grey-100 text-brand-grey-500 hover:bg-brand-grey-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setOutcomeFilter('pending')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  outcomeFilter === 'pending' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setOutcomeFilter('pass')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  outcomeFilter === 'pass' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                Pass
              </button>
              <button
                onClick={() => setOutcomeFilter('fail')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  outcomeFilter === 'fail' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                Fail
              </button>
            </div>
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
            description={showMyCandidatesOnly 
              ? "No interviews for your candidates. Try turning off 'My Candidates Only' filter." 
              : "No interviews match your filters."}
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
              const canComplete = interview.outcome === 'pending' && isMyInterview;
              
              return (
                <Card
                  key={interview.id}
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    isToday(interview.scheduled_at) ? 'border-l-4 border-l-brand-cyan' : ''
                  }`}
                  onClick={() => candidate && navigate(`/candidates/${candidate.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Stage Icon */}
                      <div className={`p-3 rounded-xl ${stageInfo.colour}`}>
                        <StageIcon className="h-5 w-5" />
                      </div>

                      {/* Candidate Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-brand-slate-900">
                            {candidate?.first_name} {candidate?.last_name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeInfo.colour}`}>
                            {outcomeInfo.label}
                          </span>
                          {isMyInterview && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Your Interview
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-brand-grey-400">
                          {stageInfo.label} Interview
                        </p>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-6">
                      {/* Interviewer */}
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <p className="text-sm font-medium text-brand-slate-700">
                            {interviewer?.name || 'Unassigned'}
                          </p>
                          <p className="text-xs text-brand-grey-400 flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" />
                            {interview.scheduled_at 
                              ? `${formatDate(interview.scheduled_at)} ${formatTime(interview.scheduled_at)}`
                              : 'Not scheduled'
                            }
                          </p>
                        </div>
                        <Avatar name={interviewer?.name || 'U'} size="sm" />
                      </div>

                      {/* Complete Button */}
                      {canComplete && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteInterview(interview);
                          }}
                        >
                          Complete
                        </Button>
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
        title={`Complete ${selectedStageConfig?.label || ''} Interview`}
        description={selectedCandidate ? `${selectedCandidate.first_name} ${selectedCandidate.last_name}` : ''}
        size="lg"
      >
        <div className="space-y-6">
          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">
              Outcome *
            </label>
            <div className="flex gap-3">
              <Button
                variant={feedbackForm.outcome === 'pass' ? 'success' : 'secondary'}
                onClick={() => setFeedbackForm(prev => ({ ...prev, outcome: 'pass' }))}
                leftIcon={<CheckCircle className="h-4 w-4" />}
              >
                Pass
              </Button>
              <Button
                variant={feedbackForm.outcome === 'fail' ? 'danger' : 'secondary'}
                onClick={() => setFeedbackForm(prev => ({ ...prev, outcome: 'fail' }))}
                leftIcon={<XCircle className="h-4 w-4" />}
              >
                Fail
              </Button>
            </div>
          </div>

          {/* Soft Skills */}
          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Soft Skills Assessment *</h4>
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

          {/* Technical Skills (for technical interviews) */}
          {selectedInterview?.stage === 'technical_interview' && (
            <div className="border-t border-brand-grey-200 pt-4">
              <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Technical Assessment *</h4>
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
            label="General Comments *"
            placeholder="Your observations about the candidate..."
            value={feedbackForm.general_comments}
            onChange={(e) => setFeedbackForm(prev => ({ ...prev, general_comments: e.target.value }))}
            rows={3}
          />

          <Textarea
            label="Recommendation *"
            placeholder="Your recommendation for next steps..."
            value={feedbackForm.recommendation}
            onChange={(e) => setFeedbackForm(prev => ({ ...prev, recommendation: e.target.value }))}
            rows={2}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitFeedback} isLoading={isSubmitting}>
              Save Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
