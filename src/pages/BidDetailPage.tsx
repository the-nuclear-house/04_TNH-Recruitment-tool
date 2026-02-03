import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Building2,
  User,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Award,
  Clock,
  ChevronRight,
  Save,
  PoundSterling,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Input, Select, Textarea, Modal } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  requirementsService, 
  projectsService,
  companiesService,
  type DbRequirement,
} from '@/lib/services';
import { CreateProjectModal } from '@/components/CreateProjectModal';

const MEDDPICC_CRITERIA = [
  { key: 'metrics', label: 'Metrics', description: 'What are the quantifiable business goals and KPIs?' },
  { key: 'economic_buyer', label: 'Economic Buyer', description: 'Do we have access to the person who controls the budget?' },
  { key: 'decision_criteria', label: 'Decision Criteria', description: 'What factors will drive the decision?' },
  { key: 'decision_process', label: 'Decision Process', description: 'What is the approval and selection process?' },
  { key: 'identify_pain', label: 'Identify Pain', description: 'What business problem are we solving?' },
  { key: 'paper_process', label: 'Paper Process', description: 'What is the procurement and contract process?' },
  { key: 'champion', label: 'Champion', description: 'Do we have a strong internal advocate?' },
  { key: 'competition', label: 'Competition', description: 'Who else is bidding and what is our position?' },
];

const SCORE_OPTIONS = [
  { value: '', label: 'Not assessed' },
  { value: '1', label: '1 - Very Poor' },
  { value: '2', label: '2 - Poor' },
  { value: '3', label: '3 - Adequate' },
  { value: '4', label: '4 - Good' },
  { value: '5', label: '5 - Excellent' },
];

const OUTCOME_REASONS = [
  { value: 'price', label: 'Price/Budget' },
  { value: 'capability', label: 'Capability/Experience' },
  { value: 'relationship', label: 'Existing Relationship' },
  { value: 'timing', label: 'Timing' },
  { value: 'scope_change', label: 'Scope Change' },
  { value: 'cancelled', label: 'Project Cancelled' },
  { value: 'competitor', label: 'Competitor Won' },
  { value: 'internal', label: 'Internal Solution' },
  { value: 'other', label: 'Other' },
];

export function BidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();

  const [bid, setBid] = useState<DbRequirement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // MEDDPICC scores
  const [meddpiccScores, setMeddpiccScores] = useState<Record<string, number | null>>({});
  const [meddpiccNotes, setMeddpiccNotes] = useState<Record<string, string>>({});
  
  // Go/No-Go
  const [goNoGoDecision, setGoNoGoDecision] = useState<'go' | 'nogo' | ''>('');
  
  // Proposal
  const [proposalForm, setProposalForm] = useState({
    due_date: '',
    submitted_date: '',
    value: '',
    cost: '',
    margin_percent: '',
    notes: '',
  });
  
  // Outcome
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: '' as 'won' | 'lost' | 'no_decision' | 'withdrawn' | '',
    reason: '',
    notes: '',
    lessons_learned: '',
  });

  // Create Project Modal
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadBid();
    }
  }, [id]);

  const loadBid = async () => {
    try {
      setIsLoading(true);
      const data = await requirementsService.getById(id!);
      if (!data) {
        toast.error('Not Found', 'Bid not found');
        navigate('/bids');
        return;
      }
      setBid(data);
      
      // Initialize MEDDPICC scores
      setMeddpiccScores({
        metrics: data.meddpicc_metrics,
        economic_buyer: data.meddpicc_economic_buyer,
        decision_criteria: data.meddpicc_decision_criteria,
        decision_process: data.meddpicc_decision_process,
        identify_pain: data.meddpicc_identify_pain,
        paper_process: data.meddpicc_paper_process,
        champion: data.meddpicc_champion,
        competition: data.meddpicc_competition,
      });
      setMeddpiccNotes(data.meddpicc_notes || {});
      setGoNoGoDecision(data.go_nogo_decision || '');
      
      // Initialize proposal form
      setProposalForm({
        due_date: data.proposal_due_date || '',
        submitted_date: data.proposal_submitted_date || '',
        value: data.proposal_value?.toString() || '',
        cost: data.proposal_cost?.toString() || '',
        margin_percent: data.proposal_margin_percent?.toString() || '',
        notes: data.proposal_notes || '',
      });
      
      // Initialize outcome form
      setOutcomeForm({
        outcome: data.bid_outcome || '',
        reason: data.bid_outcome_reason || '',
        notes: data.bid_outcome_notes || '',
        lessons_learned: data.bid_lessons_learned || '',
      });
    } catch (error) {
      console.error('Error loading bid:', error);
      toast.error('Error', 'Failed to load bid');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMeddpiccScore = (): number | null => {
    const scores = Object.values(meddpiccScores).filter(s => s !== null) as number[];
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  };

  const handleSaveMeddpicc = async () => {
    if (!bid) return;
    
    setIsSaving(true);
    try {
      await requirementsService.update(bid.id, {
        meddpicc_metrics: meddpiccScores.metrics || undefined,
        meddpicc_economic_buyer: meddpiccScores.economic_buyer || undefined,
        meddpicc_decision_criteria: meddpiccScores.decision_criteria || undefined,
        meddpicc_decision_process: meddpiccScores.decision_process || undefined,
        meddpicc_identify_pain: meddpiccScores.identify_pain || undefined,
        meddpicc_paper_process: meddpiccScores.paper_process || undefined,
        meddpicc_champion: meddpiccScores.champion || undefined,
        meddpicc_competition: meddpiccScores.competition || undefined,
        meddpicc_notes: meddpiccNotes,
      });
      toast.success('Saved', 'MEDDPICC assessment saved');
      await loadBid();
    } catch (error) {
      console.error('Error saving MEDDPICC:', error);
      toast.error('Error', 'Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoNoGo = async (decision: 'go' | 'nogo') => {
    if (!bid) return;
    
    setIsSaving(true);
    try {
      const newStatus = decision === 'go' ? 'proposal' : bid.bid_status;
      await requirementsService.update(bid.id, {
        go_nogo_decision: decision,
        go_nogo_date: new Date().toISOString(),
        go_nogo_decided_by: user?.id,
        bid_status: newStatus as any,
      });
      toast.success(
        decision === 'go' ? 'Go Decision' : 'No-Go Decision',
        decision === 'go' ? 'Moving to Proposal stage' : 'Bid marked as No-Go'
      );
      await loadBid();
    } catch (error) {
      console.error('Error saving Go/No-Go:', error);
      toast.error('Error', 'Failed to save decision');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProposal = async () => {
    if (!bid) return;
    
    setIsSaving(true);
    try {
      await requirementsService.update(bid.id, {
        proposal_due_date: proposalForm.due_date || undefined,
        proposal_submitted_date: proposalForm.submitted_date || undefined,
        proposal_value: proposalForm.value ? parseFloat(proposalForm.value) : undefined,
        proposal_cost: proposalForm.cost ? parseFloat(proposalForm.cost) : undefined,
        proposal_margin_percent: proposalForm.margin_percent ? parseFloat(proposalForm.margin_percent) : undefined,
        proposal_notes: proposalForm.notes || undefined,
      });
      toast.success('Saved', 'Proposal details saved');
      await loadBid();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Error', 'Failed to save proposal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!bid) return;
    
    if (!proposalForm.value) {
      toast.error('Validation', 'Please enter the proposal value');
      return;
    }
    
    setIsSaving(true);
    try {
      await requirementsService.update(bid.id, {
        bid_status: 'submitted',
        proposal_submitted_date: new Date().toISOString().split('T')[0],
        proposal_value: parseFloat(proposalForm.value),
        proposal_cost: proposalForm.cost ? parseFloat(proposalForm.cost) : undefined,
        proposal_margin_percent: proposalForm.margin_percent ? parseFloat(proposalForm.margin_percent) : undefined,
        proposal_notes: proposalForm.notes || undefined,
      });
      toast.success('Proposal Submitted', 'Bid moved to Submitted stage');
      await loadBid();
    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast.error('Error', 'Failed to submit proposal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordOutcome = async () => {
    if (!bid) return;
    
    if (!outcomeForm.outcome) {
      toast.error('Validation', 'Please select an outcome');
      return;
    }
    
    if (outcomeForm.outcome === 'lost' && !outcomeForm.reason) {
      toast.error('Validation', 'Please select a reason for losing');
      return;
    }
    
    setIsSaving(true);
    try {
      if (outcomeForm.outcome === 'won') {
        await requirementsService.markBidAsWon(bid.id, outcomeForm.reason, outcomeForm.lessons_learned);
        toast.success('Bid Won!', 'Congratulations! You can now create a Work Package project.');
      } else if (outcomeForm.outcome === 'lost') {
        await requirementsService.markBidAsLost(bid.id, outcomeForm.reason, outcomeForm.lessons_learned);
        toast.info('Bid Lost', 'Outcome recorded');
      } else {
        await requirementsService.update(bid.id, {
          bid_status: outcomeForm.outcome === 'withdrawn' ? 'lost' : bid.bid_status as any,
          bid_outcome: outcomeForm.outcome,
          bid_outcome_date: new Date().toISOString().split('T')[0],
          bid_outcome_reason: outcomeForm.reason || undefined,
          bid_outcome_notes: outcomeForm.notes || undefined,
          bid_lessons_learned: outcomeForm.lessons_learned || undefined,
        });
        toast.info('Outcome Recorded', 'Bid outcome saved');
      }
      await loadBid();
    } catch (error) {
      console.error('Error recording outcome:', error);
      toast.error('Error', 'Failed to record outcome');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectCreated = async (projectId: string) => {
    if (!bid) return;
    
    // Link the bid to the new project and update status
    try {
      await requirementsService.update(bid.id, {
        project_id: projectId,
        status: 'won',
      });
      
      // Also activate the company if it's a prospect
      if (bid.company?.status === 'prospect') {
        await companiesService.update(bid.company.id, { status: 'active' });
      }
      
      toast.success('Project Created', 'Work Package project created successfully');
      setIsCreateProjectModalOpen(false);
      navigate(`/missions`);
    } catch (error) {
      console.error('Error linking project:', error);
    }
  };

  const currentStage = bid?.bid_status || 'qualifying';
  const stages = ['qualifying', 'proposal', 'submitted', 'outcome'];
  const stageIndex = stages.indexOf(currentStage === 'won' || currentStage === 'lost' ? 'outcome' : currentStage);
  const meddpiccScore = calculateMeddpiccScore();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Bid Details" />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading bid...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!bid) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header 
        title={bid.title || 'Untitled Bid'}
        subtitle={`${bid.reference_id} • ${bid.company?.name || bid.customer}`}
      />

      <div className="p-6 space-y-6">
        {/* Back button and status */}
        <div className="flex items-center justify-between">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/bids')}>
            Back to Bids
          </Button>
          
          <div className="flex items-center gap-4">
            {bid.bid_status === 'won' && (
              <Badge variant="green" className="text-base px-3 py-1">
                <CheckCircle className="h-4 w-4 mr-1" />
                Won
              </Badge>
            )}
            {bid.bid_status === 'lost' && (
              <Badge variant="red" className="text-base px-3 py-1">
                <XCircle className="h-4 w-4 mr-1" />
                Lost
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Stepper */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              {stages.map((stage, idx) => {
                const isActive = idx === stageIndex;
                const isCompleted = idx < stageIndex || bid.bid_status === 'won' || bid.bid_status === 'lost';
                const isOutcome = stage === 'outcome';
                
                return (
                  <div key={stage} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isActive ? 'bg-brand-cyan text-white' :
                        'bg-brand-grey-200 text-brand-grey-500'
                      }`}>
                        {isCompleted ? <CheckCircle className="h-5 w-5" /> : idx + 1}
                      </div>
                      <span className={`mt-2 text-sm font-medium ${isActive ? 'text-brand-cyan' : 'text-brand-grey-500'}`}>
                        {stage === 'qualifying' ? 'Go/No-Go' :
                         stage === 'proposal' ? 'Proposal' :
                         stage === 'submitted' ? 'Submitted' : 'Outcome'}
                      </span>
                    </div>
                    {idx < stages.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded ${isCompleted ? 'bg-green-500' : 'bg-brand-grey-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Bid Info */}
        <Card>
          <CardHeader>
            <CardTitle>Bid Information</CardTitle>
          </CardHeader>
          <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-brand-grey-400 mb-1">Customer</p>
              <p className="font-medium text-brand-slate-900 flex items-center gap-1">
                <Building2 className="h-4 w-4 text-brand-grey-400" />
                {bid.company?.name || bid.customer}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-grey-400 mb-1">Contact</p>
              <p className="font-medium text-brand-slate-900 flex items-center gap-1">
                <User className="h-4 w-4 text-brand-grey-400" />
                {bid.contact ? `${bid.contact.first_name} ${bid.contact.last_name}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-grey-400 mb-1">Location</p>
              <p className="font-medium text-brand-slate-900 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-brand-grey-400" />
                {bid.location || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-grey-400 mb-1">Created</p>
              <p className="font-medium text-brand-slate-900 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-brand-grey-400" />
                {formatDate(bid.created_at)}
              </p>
            </div>
          </div>
        </Card>

        {/* Stage 1: MEDDPICC Assessment */}
        {(currentStage === 'qualifying' || bid.go_nogo_decision) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>MEDDPICC Assessment</CardTitle>
                {meddpiccScore !== null && (
                  <div className={`text-lg font-bold px-3 py-1 rounded ${
                    meddpiccScore >= 4 ? 'bg-green-100 text-green-700' :
                    meddpiccScore >= 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Score: {meddpiccScore}/5
                  </div>
                )}
              </div>
            </CardHeader>
            <div className="p-4 pt-0 space-y-4">
              {MEDDPICC_CRITERIA.map(criteria => (
                <div key={criteria.key} className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-3">
                    <p className="font-medium text-brand-slate-900">{criteria.label}</p>
                    <p className="text-xs text-brand-grey-400">{criteria.description}</p>
                  </div>
                  <div className="col-span-2">
                    <Select
                      options={SCORE_OPTIONS}
                      value={meddpiccScores[criteria.key]?.toString() || ''}
                      onChange={(e) => setMeddpiccScores(prev => ({
                        ...prev,
                        [criteria.key]: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      disabled={bid.go_nogo_decision !== null}
                    />
                  </div>
                  <div className="col-span-7">
                    <Input
                      placeholder="Notes..."
                      value={meddpiccNotes[criteria.key] || ''}
                      onChange={(e) => setMeddpiccNotes(prev => ({
                        ...prev,
                        [criteria.key]: e.target.value
                      }))}
                      disabled={bid.go_nogo_decision !== null}
                    />
                  </div>
                </div>
              ))}
              
              {/* Go/No-Go Decision */}
              {!bid.go_nogo_decision && currentStage === 'qualifying' && (
                <div className="flex items-center justify-between pt-4 border-t border-brand-grey-200">
                  <Button variant="secondary" onClick={handleSaveMeddpicc} isLoading={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Assessment
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      variant="danger" 
                      onClick={() => handleGoNoGo('nogo')}
                      isLoading={isSaving}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      No-Go
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => handleGoNoGo('go')}
                      isLoading={isSaving}
                      disabled={meddpiccScore === null || meddpiccScore < 2.5}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Go
                    </Button>
                  </div>
                </div>
              )}
              
              {bid.go_nogo_decision && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  bid.go_nogo_decision === 'go' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {bid.go_nogo_decision === 'go' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    Decision: {bid.go_nogo_decision.toUpperCase()}
                  </span>
                  {bid.go_nogo_date && (
                    <span className="text-sm ml-2">on {formatDate(bid.go_nogo_date)}</span>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Stage 2: Proposal */}
        {bid.go_nogo_decision === 'go' && ['proposal', 'submitted', 'won', 'lost'].includes(currentStage) && (
          <Card>
            <CardHeader>
              <CardTitle>Proposal</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Due Date"
                  type="date"
                  value={proposalForm.due_date}
                  onChange={(e) => setProposalForm(prev => ({ ...prev, due_date: e.target.value }))}
                  disabled={currentStage !== 'proposal'}
                />
                <Input
                  label="Proposal Value (£)"
                  type="number"
                  value={proposalForm.value}
                  onChange={(e) => setProposalForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="100000"
                  disabled={currentStage !== 'proposal'}
                />
                <Input
                  label="Cost (£)"
                  type="number"
                  value={proposalForm.cost}
                  onChange={(e) => setProposalForm(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="80000"
                  disabled={currentStage !== 'proposal'}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Margin %"
                  type="number"
                  value={proposalForm.margin_percent}
                  onChange={(e) => setProposalForm(prev => ({ ...prev, margin_percent: e.target.value }))}
                  placeholder="20"
                  disabled={currentStage !== 'proposal'}
                />
                {currentStage !== 'proposal' && proposalForm.submitted_date && (
                  <div>
                    <p className="text-xs text-brand-grey-400 mb-1">Submitted Date</p>
                    <p className="font-medium text-brand-slate-900">{formatDate(proposalForm.submitted_date)}</p>
                  </div>
                )}
              </div>
              
              <Textarea
                label="Proposal Notes"
                value={proposalForm.notes}
                onChange={(e) => setProposalForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                disabled={currentStage !== 'proposal'}
              />
              
              {currentStage === 'proposal' && (
                <div className="flex justify-between pt-4 border-t border-brand-grey-200">
                  <Button variant="secondary" onClick={handleSaveProposal} isLoading={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button variant="success" onClick={handleSubmitProposal} isLoading={isSaving}>
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Proposal
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Stage 3: Outcome */}
        {['submitted', 'won', 'lost'].includes(currentStage) && (
          <Card>
            <CardHeader>
              <CardTitle>Outcome</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-4">
              {!bid.bid_outcome && currentStage === 'submitted' ? (
                <>
                  <Select
                    label="Outcome"
                    options={[
                      { value: '', label: 'Select outcome...' },
                      { value: 'won', label: 'Won' },
                      { value: 'lost', label: 'Lost' },
                      { value: 'no_decision', label: 'No Decision' },
                      { value: 'withdrawn', label: 'Withdrawn' },
                    ]}
                    value={outcomeForm.outcome}
                    onChange={(e) => setOutcomeForm(prev => ({ ...prev, outcome: e.target.value as any }))}
                  />
                  
                  {outcomeForm.outcome && (
                    <>
                      <Select
                        label={outcomeForm.outcome === 'won' ? 'Success Factor' : 'Reason'}
                        options={[
                          { value: '', label: 'Select reason...' },
                          ...OUTCOME_REASONS,
                        ]}
                        value={outcomeForm.reason}
                        onChange={(e) => setOutcomeForm(prev => ({ ...prev, reason: e.target.value }))}
                      />
                      
                      <Textarea
                        label="Notes"
                        value={outcomeForm.notes}
                        onChange={(e) => setOutcomeForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                      
                      <Textarea
                        label="Lessons Learned"
                        value={outcomeForm.lessons_learned}
                        onChange={(e) => setOutcomeForm(prev => ({ ...prev, lessons_learned: e.target.value }))}
                        rows={3}
                        placeholder="What can we learn from this bid for future opportunities?"
                      />
                      
                      <div className="flex justify-end pt-4 border-t border-brand-grey-200">
                        <Button variant="primary" onClick={handleRecordOutcome} isLoading={isSaving}>
                          Record Outcome
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    bid.bid_outcome === 'won' ? 'bg-green-50' :
                    bid.bid_outcome === 'lost' ? 'bg-red-50' :
                    'bg-brand-grey-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {bid.bid_outcome === 'won' ? (
                        <Award className="h-6 w-6 text-green-600" />
                      ) : bid.bid_outcome === 'lost' ? (
                        <XCircle className="h-6 w-6 text-red-600" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-brand-grey-500" />
                      )}
                      <span className={`text-lg font-semibold ${
                        bid.bid_outcome === 'won' ? 'text-green-700' :
                        bid.bid_outcome === 'lost' ? 'text-red-700' :
                        'text-brand-grey-700'
                      }`}>
                        {bid.bid_outcome === 'won' ? 'Bid Won!' :
                         bid.bid_outcome === 'lost' ? 'Bid Lost' :
                         bid.bid_outcome === 'no_decision' ? 'No Decision' :
                         'Withdrawn'}
                      </span>
                    </div>
                    
                    {bid.bid_outcome_date && (
                      <p className="text-sm text-brand-grey-500">Date: {formatDate(bid.bid_outcome_date)}</p>
                    )}
                    {bid.bid_outcome_reason && (
                      <p className="text-sm text-brand-grey-500">
                        Reason: {OUTCOME_REASONS.find(r => r.value === bid.bid_outcome_reason)?.label || bid.bid_outcome_reason}
                      </p>
                    )}
                    {bid.bid_lessons_learned && (
                      <div className="mt-3 pt-3 border-t border-brand-grey-200">
                        <p className="text-xs text-brand-grey-400 mb-1">Lessons Learned</p>
                        <p className="text-sm text-brand-slate-700">{bid.bid_lessons_learned}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Create Project button for won bids */}
                  {bid.bid_outcome === 'won' && !bid.project_id && (
                    <div className="flex justify-center pt-4">
                      <Button 
                        variant="success" 
                        size="lg"
                        onClick={() => setIsCreateProjectModalOpen(true)}
                      >
                        <Award className="h-5 w-5 mr-2" />
                        Create Work Package Project
                      </Button>
                    </div>
                  )}
                  
                  {bid.project_id && (
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-green-700">Project Created</p>
                      <Button 
                        variant="secondary" 
                        className="mt-2"
                        onClick={() => navigate('/missions')}
                      >
                        View in Missions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onSuccess={handleProjectCreated}
        requirement={bid}
        company={bid.company}
        contact={bid.contact}
      />
    </div>
  );
}
