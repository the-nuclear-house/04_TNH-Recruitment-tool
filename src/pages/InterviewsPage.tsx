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
  Trash2,
  Star,
  MapPin,
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
  StarRatingDisplay,
  ConfirmDialog,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToast } from '@/lib/stores/ui-store';
import { usePermissions } from '@/hooks/usePermissions';
import { interviewsService, candidatesService, usersService } from '@/lib/services';

type InterviewStage = 'phone_qualification' | 'technical_interview' | 'director_interview';

const stageConfig: Record<InterviewStage, { label: string; fullLabel: string; icon: typeof Phone; colour: string }> = {
  phone_qualification: { label: 'Phone', fullLabel: 'Phone Interview', icon: Phone, colour: 'bg-blue-100 text-blue-700' },
  technical_interview: { label: 'Technical', fullLabel: 'Technical Interview', icon: Settings, colour: 'bg-purple-100 text-purple-700' },
  director_interview: { label: 'Director', fullLabel: 'Director Interview', icon: User, colour: 'bg-amber-100 text-amber-700' },
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
  const permissions = usePermissions();
  
  const [interviews, setInterviews] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [stageFilter, setStageFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [showMyCandidatesOnly, setShowMyCandidatesOnly] = useState(false);
  
  // Detail modal
  const [viewingInterview, setViewingInterview] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<any>(null);
  
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

  const handleViewInterview = (interview: any) => {
    setViewingInterview(interview);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (interview: any) => {
    setInterviewToDelete(interview);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;
    
    setIsSubmitting(true);
    try {
      await interviewsService.delete(interviewToDelete.id);
      toast.success('Interview Deleted', 'The interview has been removed');
      setIsDeleteDialogOpen(false);
      setIsDetailModalOpen(false);
      setInterviewToDelete(null);
      setViewingInterview(null);
      loadData();
    } catch (error) {
      console.error('Error deleting interview:', error);
      toast.error('Error', 'Failed to delete interview');
    } finally {
      setIsSubmitting(false);
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
      if (user.roles?.some(r => ['recruiter'].includes(r)) && !user.roles?.some(r => ['recruiter_manager', 'business_manager', 'business_director', 'admin', 'superadmin'].includes(r))) {
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
                  onClick={() => handleViewInterview(interview)}
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
                            {interviewer?.full_name || 'Unassigned'}
                          </p>
                          <p className="text-xs text-brand-grey-400 flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" />
                            {interview.scheduled_at 
                              ? `${formatDate(interview.scheduled_at)} ${formatTime(interview.scheduled_at)}`
                              : 'Not scheduled'
                            }
                          </p>
                        </div>
                        <Avatar name={interviewer?.full_name || 'U'} size="sm" />
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

      {/* Interview Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setViewingInterview(null); }}
        title=""
        size="lg"
      >
        {viewingInterview && (() => {
          const candidate = candidates[viewingInterview.candidate_id];
          const interviewer = users[viewingInterview.interviewer_id];
          const stage = viewingInterview.stage as InterviewStage;
          const stageInfo = stageConfig[stage] || stageConfig.phone_qualification;
          const outcomeInfo = outcomeConfig[viewingInterview.outcome] || outcomeConfig.pending;
          const StageIcon = stageInfo.icon;
          
          return (
            <div className="space-y-6">
              {/* Custom Header with Stage Icon and Title */}
              <div className="flex items-center gap-3 pb-4 border-b border-brand-grey-200">
                <div className={`p-2 rounded-lg ${stageInfo.colour}`}>
                  <StageIcon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-brand-slate-900">
                  {stageInfo.fullLabel} Details
                </h2>
              </div>

              {/* Candidate Info + Outcome Badge */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={`${candidate?.first_name} ${candidate?.last_name}`} size="lg" />
                  <div>
                    <h3 className="text-lg font-semibold text-brand-slate-900">
                      {candidate?.first_name} {candidate?.last_name}
                    </h3>
                    <p className="text-sm text-brand-grey-500">{candidate?.email}</p>
                    {candidate?.reference_id && (
                      <span className="text-xs font-mono text-brand-grey-400">{candidate.reference_id}</span>
                    )}
                  </div>
                </div>
                {/* Prominent Outcome Badge */}
                <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  viewingInterview.outcome === 'pass' 
                    ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                    : viewingInterview.outcome === 'fail'
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                }`}>
                  {outcomeInfo.label}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
                <div>
                  <p className="text-xs text-brand-grey-400">Interviewer</p>
                  <p className="font-medium text-brand-slate-900">{interviewer?.full_name || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-grey-400">Scheduled</p>
                  <p className="font-medium text-brand-slate-900">
                    {viewingInterview.scheduled_at 
                      ? `${formatDate(viewingInterview.scheduled_at)} ${formatTime(viewingInterview.scheduled_at)}`
                      : 'Not scheduled'
                    }
                  </p>
                </div>
                {viewingInterview.location && (
                  <div className="col-span-2">
                    <p className="text-xs text-brand-grey-400">Location</p>
                    <p className="font-medium text-brand-slate-900">{viewingInterview.location}</p>
                  </div>
                )}
              </div>

              {/* Scores (if completed) - Visual Star Display */}
              {viewingInterview.outcome !== 'pending' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-brand-slate-900">Scores</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingInterview.communication_score && (
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-sm text-brand-grey-600">Communication</span>
                        <StarRatingDisplay rating={viewingInterview.communication_score} size="sm" />
                      </div>
                    )}
                    {viewingInterview.professionalism_score && (
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-sm text-brand-grey-600">Professionalism</span>
                        <StarRatingDisplay rating={viewingInterview.professionalism_score} size="sm" />
                      </div>
                    )}
                    {viewingInterview.enthusiasm_score && (
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-sm text-brand-grey-600">Enthusiasm</span>
                        <StarRatingDisplay rating={viewingInterview.enthusiasm_score} size="sm" />
                      </div>
                    )}
                    {viewingInterview.cultural_fit_score && (
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-sm text-brand-grey-600">Cultural Fit</span>
                        <StarRatingDisplay rating={viewingInterview.cultural_fit_score} size="sm" />
                      </div>
                    )}
                    {viewingInterview.technical_depth_score && (
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-sm text-brand-grey-600">Technical Depth</span>
                        <StarRatingDisplay rating={viewingInterview.technical_depth_score} size="sm" />
                      </div>
                    )}
                    {viewingInterview.problem_solving_score && (
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-sm text-brand-grey-600">Problem Solving</span>
                        <StarRatingDisplay rating={viewingInterview.problem_solving_score} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments */}
              {viewingInterview.general_comments && (
                <div>
                  <h4 className="font-medium text-brand-slate-900 mb-2">Comments</h4>
                  <p className="text-sm text-brand-grey-600 whitespace-pre-wrap">{viewingInterview.general_comments}</p>
                </div>
              )}

              {/* Recommendation */}
              {viewingInterview.recommendation && (
                <div>
                  <h4 className="font-medium text-brand-slate-900 mb-2">Recommendation</h4>
                  <p className="text-sm text-brand-grey-600 whitespace-pre-wrap">{viewingInterview.recommendation}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-brand-grey-200">
                <div>
                  {permissions.isAdmin && (
                    <Button 
                      variant="danger" 
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDeleteClick(viewingInterview)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={() => candidate && navigate(`/candidates/${candidate.id}`)}>
                    View Candidate
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setInterviewToDelete(null); }}
        onConfirm={handleDeleteInterview}
        title="Delete Interview"
        message="Are you sure you want to delete this interview? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
