import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, CheckCircle, XCircle, FileText, Award, Clock, Save, Upload, Download, Users, Shield, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Input, Select, Textarea, DeleteDialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { requirementsService, companiesService, bidDocumentService, type DbRequirement } from '@/lib/services';
import { CreateProjectModal } from '@/components/CreateProjectModal';

const MEDDPICC_CRITERIA = [
  { key: 'metrics', label: 'Metrics', description: 'Quantifiable business goals' },
  { key: 'economic_buyer', label: 'Economic Buyer', description: 'Access to budget holder' },
  { key: 'decision_criteria', label: 'Decision Criteria', description: 'Decision factors' },
  { key: 'decision_process', label: 'Decision Process', description: 'Approval process' },
  { key: 'identify_pain', label: 'Identify Pain', description: 'Business problem' },
  { key: 'paper_process', label: 'Paper Process', description: 'Procurement process' },
  { key: 'champion', label: 'Champion', description: 'Internal advocate' },
  { key: 'competition', label: 'Competition', description: 'Competitive position' },
];

const RISK_CRITERIA = [
  { key: 'technical_complexity', label: 'Technical Complexity', description: 'How technically challenging?' },
  { key: 'resource_availability', label: 'Resource Availability', description: 'Right people available?' },
  { key: 'timeline_feasibility', label: 'Timeline Feasibility', description: 'Realistic deadline?' },
  { key: 'scope_clarity', label: 'Scope Clarity', description: 'Well defined SoW?' },
  { key: 'customer_fp_experience', label: 'Customer FP Experience', description: 'Track record with customer on FP' },
];

const SCORE_OPTIONS = [
  { value: '', label: 'Not assessed' },
  { value: '1', label: '1 - Very Poor' },
  { value: '2', label: '2 - Poor' },
  { value: '3', label: '3 - Adequate' },
  { value: '4', label: '4 - Good' },
  { value: '5', label: '5 - Excellent' },
];

const RISK_SCORE_OPTIONS = [
  { value: '', label: 'Not assessed' },
  { value: '1', label: '1 - Very High Risk' },
  { value: '2', label: '2 - High Risk' },
  { value: '3', label: '3 - Medium Risk' },
  { value: '4', label: '4 - Low Risk' },
  { value: '5', label: '5 - Very Low Risk' },
];

const OUTCOME_REASONS = [
  { value: 'price', label: 'Price/Budget' },
  { value: 'capability', label: 'Capability/Experience' },
  { value: 'relationship', label: 'Existing Relationship' },
  { value: 'timing', label: 'Timing' },
  { value: 'cancelled', label: 'Project Cancelled' },
  { value: 'competitor', label: 'Competitor Won' },
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
  
  const [meddpiccScores, setMeddpiccScores] = useState<Record<string, number | null>>({});
  const [meddpiccNotes, setMeddpiccNotes] = useState<Record<string, string>>({});
  const [riskScores, setRiskScores] = useState<Record<string, number | null>>({});
  const [riskNotes, setRiskNotes] = useState<Record<string, string>>({});
  const [estimatedFte, setEstimatedFte] = useState('');
  const [estimatedRevenue, setEstimatedRevenue] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  
  const [proposalForm, setProposalForm] = useState({ due_date: '', value: '', margin_percent: '', notes: '' });
  const [offerDoc, setOfferDoc] = useState<File | null>(null);
  const [financialDoc, setFinancialDoc] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // File input refs
  const offerInputRef = useRef<HTMLInputElement>(null);
  const financialInputRef = useRef<HTMLInputElement>(null);
  
  const [outcomeForm, setOutcomeForm] = useState({ outcome: '' as string, reason: '', notes: '', lessons_learned: '' });
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  
  // Delete
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { isAdmin, isSuperAdmin } = usePermissions();
  const canDelete = isAdmin || isSuperAdmin;

  const isTD = user?.id === bid?.technical_director_id;
  const isBD = user?.id === bid?.business_director_id;
  const isApprover = isTD || isBD;
  const isManager = user?.id === bid?.manager_id;

  useEffect(() => { if (id) loadBid(); }, [id]);

  const loadBid = async () => {
    try {
      setIsLoading(true);
      const data = await requirementsService.getById(id!);
      if (!data) { toast.error('Not Found', 'Bid not found'); navigate('/bids'); return; }
      setBid(data);
      
      setMeddpiccScores({
        metrics: data.meddpicc_metrics, economic_buyer: data.meddpicc_economic_buyer,
        decision_criteria: data.meddpicc_decision_criteria, decision_process: data.meddpicc_decision_process,
        identify_pain: data.meddpicc_identify_pain, paper_process: data.meddpicc_paper_process,
        champion: data.meddpicc_champion, competition: data.meddpicc_competition,
      });
      setMeddpiccNotes(data.meddpicc_notes || {});
      setRiskScores({
        technical_complexity: data.risk_technical_complexity, resource_availability: data.risk_resource_availability,
        timeline_feasibility: data.risk_timeline_feasibility, scope_clarity: data.risk_scope_clarity,
        customer_fp_experience: data.risk_customer_fp_experience,
      });
      setRiskNotes({
        technical_complexity: data.risk_technical_complexity_notes || '',
        resource_availability: data.risk_resource_availability_notes || '',
        timeline_feasibility: data.risk_timeline_feasibility_notes || '',
        scope_clarity: data.risk_scope_clarity_notes || '',
        customer_fp_experience: data.risk_customer_fp_experience_notes || '',
      });
      setEstimatedFte(data.bid_estimated_fte?.toString() || '');
      setEstimatedRevenue(data.bid_estimated_revenue?.toString() || '');
      setProposalForm({
        due_date: data.proposal_due_date || '', value: data.proposal_value?.toString() || '',
        margin_percent: data.proposal_margin_percent?.toString() || '',
        notes: data.proposal_notes || '',
      });
      setOutcomeForm({
        outcome: data.bid_outcome || '', reason: data.bid_outcome_reason || '',
        notes: data.bid_outcome_notes || '', lessons_learned: data.bid_lessons_learned || '',
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error', 'Failed to load bid');
    } finally {
      setIsLoading(false);
    }
  };

  const meddpiccScore = useMemo(() => {
    const scores = Object.values(meddpiccScores).filter(s => s !== null) as number[];
    return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  }, [meddpiccScores]);

  const riskScore = useMemo(() => {
    const scores = Object.values(riskScores).filter(s => s !== null) as number[];
    return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  }, [riskScores]);

  const getRiskColor = (s: number | null) => s === null ? 'bg-gray-100 text-gray-600' : s >= 4 ? 'bg-green-100 text-green-700' : s >= 3 ? 'bg-amber-100 text-amber-700' : s >= 2 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
  const getRiskLabel = (s: number | null) => s === null ? 'Not Assessed' : s >= 4 ? 'Low Risk' : s >= 3 ? 'Medium Risk' : s >= 2 ? 'High Risk' : 'Very High Risk';

  const handleSaveQualifying = async () => {
    if (!bid) return;
    setIsSaving(true);
    try {
      await requirementsService.update(bid.id, {
        meddpicc_metrics: meddpiccScores.metrics || undefined, meddpicc_economic_buyer: meddpiccScores.economic_buyer || undefined,
        meddpicc_decision_criteria: meddpiccScores.decision_criteria || undefined, meddpicc_decision_process: meddpiccScores.decision_process || undefined,
        meddpicc_identify_pain: meddpiccScores.identify_pain || undefined, meddpicc_paper_process: meddpiccScores.paper_process || undefined,
        meddpicc_champion: meddpiccScores.champion || undefined, meddpicc_competition: meddpiccScores.competition || undefined,
        meddpicc_notes: meddpiccNotes,
        risk_technical_complexity: riskScores.technical_complexity || undefined, risk_resource_availability: riskScores.resource_availability || undefined,
        risk_timeline_feasibility: riskScores.timeline_feasibility || undefined, risk_scope_clarity: riskScores.scope_clarity || undefined,
        risk_customer_fp_experience: riskScores.customer_fp_experience || undefined,
        risk_technical_complexity_notes: riskNotes.technical_complexity || undefined,
        risk_resource_availability_notes: riskNotes.resource_availability || undefined,
        risk_timeline_feasibility_notes: riskNotes.timeline_feasibility || undefined,
        risk_scope_clarity_notes: riskNotes.scope_clarity || undefined,
        risk_customer_fp_experience_notes: riskNotes.customer_fp_experience || undefined,
        bid_estimated_fte: estimatedFte ? parseFloat(estimatedFte) : undefined,
        bid_estimated_revenue: estimatedRevenue ? parseFloat(estimatedRevenue) : undefined,
      });
      toast.success('Saved', 'Qualification data saved');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed to save'); }
    finally { setIsSaving(false); }
  };

  const handleSubmitForApproval = async () => {
    if (!bid || !user) return;
    
    // Validate that assessment is complete
    if (!meddpiccScore || meddpiccScore < 1) {
      toast.error('Incomplete', 'Please complete the MEDDPICC assessment');
      return;
    }
    if (!riskScore || riskScore < 1) {
      toast.error('Incomplete', 'Please complete the Risk assessment');
      return;
    }
    if (!bid.technical_director_id) {
      toast.error('Missing', 'Technical Director not assigned');
      return;
    }
    if (!bid.business_director_id) {
      toast.error('Missing', 'Business Director not assigned');
      return;
    }
    
    setIsSaving(true);
    try {
      // Save current data first
      await requirementsService.update(bid.id, {
        meddpicc_metrics: meddpiccScores.metrics || undefined, meddpicc_economic_buyer: meddpiccScores.economic_buyer || undefined,
        meddpicc_decision_criteria: meddpiccScores.decision_criteria || undefined, meddpicc_decision_process: meddpiccScores.decision_process || undefined,
        meddpicc_identify_pain: meddpiccScores.identify_pain || undefined, meddpicc_paper_process: meddpiccScores.paper_process || undefined,
        meddpicc_champion: meddpiccScores.champion || undefined, meddpicc_competition: meddpiccScores.competition || undefined,
        meddpicc_notes: meddpiccNotes,
        risk_technical_complexity: riskScores.technical_complexity || undefined, risk_resource_availability: riskScores.resource_availability || undefined,
        risk_timeline_feasibility: riskScores.timeline_feasibility || undefined, risk_scope_clarity: riskScores.scope_clarity || undefined,
        risk_customer_fp_experience: riskScores.customer_fp_experience || undefined,
        risk_technical_complexity_notes: riskNotes.technical_complexity || undefined,
        risk_resource_availability_notes: riskNotes.resource_availability || undefined,
        risk_timeline_feasibility_notes: riskNotes.timeline_feasibility || undefined,
        risk_scope_clarity_notes: riskNotes.scope_clarity || undefined,
        risk_customer_fp_experience_notes: riskNotes.customer_fp_experience || undefined,
        bid_estimated_fte: estimatedFte ? parseFloat(estimatedFte) : undefined,
        bid_estimated_revenue: estimatedRevenue ? parseFloat(estimatedRevenue) : undefined,
        gonogo_submitted_at: new Date().toISOString(),
        gonogo_submitted_by: user.id,
      });
      toast.success('Submitted', 'Bid submitted for Go/No-Go approval');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed to submit'); }
    finally { setIsSaving(false); }
  };

  const handleGoNoGoApproval = async (approved: boolean) => {
    if (!bid || !user) return;
    setIsSaving(true);
    try {
      const updates: any = {};
      if (isTD) {
        updates[approved ? 'gonogo_td_approved' : 'gonogo_td_rejected'] = true;
        updates[approved ? 'gonogo_td_approved_at' : 'gonogo_td_rejected_at'] = new Date().toISOString();
        updates.gonogo_td_notes = approvalNotes || undefined;
      }
      if (isBD) {
        updates[approved ? 'gonogo_bd_approved' : 'gonogo_bd_rejected'] = true;
        updates[approved ? 'gonogo_bd_approved_at' : 'gonogo_bd_rejected_at'] = new Date().toISOString();
        updates.gonogo_bd_notes = approvalNotes || undefined;
      }
      
      const newBid = { ...bid, ...updates };
      if (newBid.gonogo_td_rejected || newBid.gonogo_bd_rejected) {
        updates.go_nogo_decision = 'nogo'; updates.go_nogo_date = new Date().toISOString();
        updates.bid_status = 'lost'; updates.bid_outcome = 'lost'; updates.bid_outcome_reason = 'No-Go decision';
      } else if (newBid.gonogo_td_approved && newBid.gonogo_bd_approved) {
        updates.go_nogo_decision = 'go'; updates.go_nogo_date = new Date().toISOString(); updates.bid_status = 'proposal';
      }
      
      await requirementsService.update(bid.id, updates);
      toast.success(approved ? 'Go Approved' : 'No-Go', approved ? 'Moving to proposal stage' : 'Bid marked as No-Go');
      setApprovalNotes('');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed to record decision'); }
    finally { setIsSaving(false); }
  };

  const handleOfferApproval = async (approved: boolean) => {
    if (!bid || !user) return;
    setIsSaving(true);
    try {
      const updates: any = {};
      if (isTD) {
        updates[approved ? 'offer_td_approved' : 'offer_td_rejected'] = true;
        updates[approved ? 'offer_td_approved_at' : 'offer_td_rejected_at'] = new Date().toISOString();
        updates.offer_td_notes = approvalNotes || undefined;
      }
      if (isBD) {
        updates[approved ? 'offer_bd_approved' : 'offer_bd_rejected'] = true;
        updates[approved ? 'offer_bd_approved_at' : 'offer_bd_rejected_at'] = new Date().toISOString();
        updates.offer_bd_notes = approvalNotes || undefined;
      }
      
      const newBid = { ...bid, ...updates };
      if (newBid.offer_td_approved && newBid.offer_bd_approved) {
        updates.bid_status = 'submitted';
        updates.proposal_submitted_date = new Date().toISOString().split('T')[0];
      }
      
      await requirementsService.update(bid.id, updates);
      toast.success(approved ? 'Offer Approved' : 'Offer Rejected', approved ? 'Proposal approved' : 'Please revise');
      setApprovalNotes('');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleSubmitForOfferReview = async () => {
    if (!bid || !user) return;
    
    // Validate
    if (!proposalForm.value) {
      toast.error('Incomplete', 'Please enter the proposal value');
      return;
    }
    if (!bid.proposal_offer_document_url) {
      toast.error('Missing', 'Please upload the offer document');
      return;
    }
    
    setIsSaving(true);
    try {
      // Save proposal data and mark as submitted
      await requirementsService.update(bid.id, {
        proposal_due_date: proposalForm.due_date || undefined,
        proposal_value: proposalForm.value ? parseFloat(proposalForm.value) : undefined,
        proposal_margin_percent: proposalForm.margin_percent ? parseFloat(proposalForm.margin_percent) : undefined,
        proposal_notes: proposalForm.notes || undefined,
        offer_submitted_at: new Date().toISOString(),
        offer_submitted_by: user.id,
      });
      toast.success('Submitted', 'Offer submitted for review');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed to submit'); }
    finally { setIsSaving(false); }
  };

  const handleSaveProposal = async () => {
    if (!bid) return;
    setIsSaving(true);
    try {
      await requirementsService.update(bid.id, {
        proposal_due_date: proposalForm.due_date || undefined,
        proposal_value: proposalForm.value ? parseFloat(proposalForm.value) : undefined,
        proposal_margin_percent: proposalForm.margin_percent ? parseFloat(proposalForm.margin_percent) : undefined,
        proposal_notes: proposalForm.notes || undefined,
      });
      toast.success('Saved', 'Proposal saved');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleUploadDocs = async () => {
    if (!bid || (!offerDoc && !financialDoc)) return;
    setIsUploading(true);
    try {
      const updates: any = {};
      if (offerDoc) {
        const result = await bidDocumentService.uploadDocument(offerDoc, bid.id, 'offer');
        updates.proposal_offer_document_url = result.path;
        updates.proposal_offer_document_name = result.name;
      }
      if (financialDoc) {
        const result = await bidDocumentService.uploadDocument(financialDoc, bid.id, 'financial');
        updates.proposal_financial_calc_url = result.path;
        updates.proposal_financial_calc_name = result.name;
      }
      await requirementsService.update(bid.id, updates);
      toast.success('Uploaded', 'Documents uploaded');
      setOfferDoc(null); setFinancialDoc(null);
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Upload failed'); }
    finally { setIsUploading(false); }
  };

  const handleDownloadDoc = async (type: 'offer' | 'financial') => {
    if (!bid) return;
    try {
      const path = type === 'offer' ? bid.proposal_offer_document_url : bid.proposal_financial_calc_url;
      if (!path) return;
      const url = await bidDocumentService.getSignedUrl(path);
      window.open(url, '_blank');
    } catch (error) {
      console.error(error);
      toast.error('Error', 'Failed to download document');
    }
  };

  const handleRecordOutcome = async () => {
    if (!bid || !outcomeForm.outcome) return;
    setIsSaving(true);
    try {
      await requirementsService.update(bid.id, {
        bid_status: outcomeForm.outcome === 'won' ? 'won' : 'lost',
        bid_outcome: outcomeForm.outcome as any,
        bid_outcome_date: new Date().toISOString().split('T')[0],
        bid_outcome_reason: outcomeForm.reason || undefined,
        bid_outcome_notes: outcomeForm.notes || undefined,
        bid_lessons_learned: outcomeForm.lessons_learned || undefined,
      });
      toast.success('Recorded', 'Outcome saved');
      await loadBid();
    } catch (error) { console.error(error); toast.error('Error', 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleProjectCreated = async (projectId: string) => {
    if (!bid) return;
    try {
      await requirementsService.update(bid.id, { project_id: projectId, status: 'won' });
      if (bid.company?.status === 'prospect') await companiesService.update(bid.company.id, { status: 'active' });
      toast.success('Project Created', 'Work Package created');
      setIsCreateProjectModalOpen(false);
      navigate('/missions');
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (hardDelete: boolean) => {
    if (!bid) return;
    setIsDeleting(true);
    try {
      if (hardDelete) {
        await requirementsService.hardDelete(bid.id);
        toast.success('Deleted', 'Bid permanently deleted');
      } else {
        await requirementsService.delete(bid.id);
        toast.success('Archived', 'Bid archived');
      }
      navigate('/bids');
    } catch (error) {
      console.error(error);
      toast.error('Error', 'Failed to delete bid');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) return <div className="min-h-screen"><Header title="Bid Details" /><div className="p-6"><Card><div className="text-center py-8 text-brand-grey-400">Loading...</div></Card></div></div>;
  if (!bid) return null;

  const stage = bid.bid_status || 'qualifying';
  const stages = ['qualifying', 'proposal', 'submitted', 'outcome'];
  const stageIdx = stages.indexOf(stage === 'won' || stage === 'lost' ? 'outcome' : stage);
  
  const goNogoPendingTD = !bid.gonogo_td_approved && !bid.gonogo_td_rejected;
  const goNogoPendingBD = !bid.gonogo_bd_approved && !bid.gonogo_bd_rejected;
  const offerPendingTD = !bid.offer_td_approved && !bid.offer_td_rejected;
  const offerPendingBD = !bid.offer_bd_approved && !bid.offer_bd_rejected;

  return (
    <div className="min-h-screen">
      <Header title={bid.title || 'Untitled Bid'} subtitle={`${bid.reference_id} • ${bid.company?.name}`} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/bids')}>Back</Button>
            {canDelete && (
              <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setIsDeleteDialogOpen(true)}>Delete</Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bid.bid_status === 'won' && <Badge variant="green" className="text-base px-3 py-1"><CheckCircle className="h-4 w-4 mr-1" />Won</Badge>}
            {bid.bid_status === 'lost' && <Badge variant="red" className="text-base px-3 py-1"><XCircle className="h-4 w-4 mr-1" />Lost</Badge>}
          </div>
        </div>

        {/* Progress */}
        <Card><div className="p-4 flex items-center justify-between">
          {stages.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${i < stageIdx || bid.bid_status === 'won' ? 'bg-green-500 text-white' : i === stageIdx ? 'bg-brand-cyan text-white' : 'bg-brand-grey-200 text-brand-grey-500'}`}>
                  {i < stageIdx || bid.bid_status === 'won' ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`mt-2 text-sm font-medium ${i === stageIdx ? 'text-brand-cyan' : 'text-brand-grey-500'}`}>
                  {s === 'qualifying' ? 'Go/No-Go' : s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              </div>
              {i < stages.length - 1 && <div className={`flex-1 h-1 mx-4 rounded ${i < stageIdx ? 'bg-green-500' : 'bg-brand-grey-200'}`} />}
            </div>
          ))}
        </div></Card>

        {/* Info */}
        <Card><CardHeader><CardTitle>Bid Information</CardTitle></CardHeader>
          <div className="p-4 pt-0 grid grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-brand-grey-400 mb-1">Customer</p><p className="font-medium">{bid.company?.name}</p></div>
            <div><p className="text-xs text-brand-grey-400 mb-1">Contact</p><p className="font-medium">{bid.contact ? `${bid.contact.first_name} ${bid.contact.last_name}` : 'N/A'}</p></div>
            <div><p className="text-xs text-brand-grey-400 mb-1">Technical Director</p><p className="font-medium">{bid.technical_director?.full_name || 'Not assigned'}</p></div>
            <div><p className="text-xs text-brand-grey-400 mb-1">Business Director</p><p className="font-medium">{bid.business_director?.full_name || 'Not assigned'}</p></div>
          </div>
        </Card>

        {/* QUALIFYING */}
        {stage === 'qualifying' && (<>
          <Card><CardHeader><CardTitle>Estimates</CardTitle></CardHeader>
            <div className="p-4 pt-0 grid grid-cols-2 gap-4">
              <Input label="Estimated FTE" type="number" step="0.5" value={estimatedFte} onChange={(e) => setEstimatedFte(e.target.value)} disabled={!isManager} />
              <Input label="Estimated Revenue (£)" type="number" value={estimatedRevenue} onChange={(e) => setEstimatedRevenue(e.target.value)} disabled={!isManager} />
            </div>
          </Card>

          <Card><CardHeader><div className="flex items-center justify-between w-full"><CardTitle>MEDDPICC</CardTitle>
            {meddpiccScore !== null && <div className={`px-3 py-1 rounded font-bold ${meddpiccScore >= 4 ? 'bg-green-100 text-green-700' : meddpiccScore >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{meddpiccScore}/5</div>}
          </div></CardHeader>
            <div className="p-4 pt-0 space-y-2">
              {MEDDPICC_CRITERIA.map(c => (
                <div key={c.key} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3"><p className="font-medium text-sm">{c.label}</p><p className="text-xs text-brand-grey-400">{c.description}</p></div>
                  <div className="col-span-2"><Select options={SCORE_OPTIONS} value={meddpiccScores[c.key]?.toString() || ''} onChange={(e) => setMeddpiccScores(p => ({ ...p, [c.key]: e.target.value ? parseInt(e.target.value) : null }))} disabled={!isManager} /></div>
                  <div className="col-span-7"><Input placeholder="Notes..." value={meddpiccNotes[c.key] || ''} onChange={(e) => setMeddpiccNotes(p => ({ ...p, [c.key]: e.target.value }))} disabled={!isManager} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card><CardHeader><div className="flex items-center justify-between w-full"><CardTitle>Risk Assessment</CardTitle>
            {riskScore !== null && <div className={`px-3 py-1 rounded font-bold ${getRiskColor(riskScore)}`}>{getRiskLabel(riskScore)} ({riskScore}/5)</div>}
          </div></CardHeader>
            <div className="p-4 pt-0 space-y-2">
              {RISK_CRITERIA.map(c => (
                <div key={c.key} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3"><p className="font-medium text-sm">{c.label}</p><p className="text-xs text-brand-grey-400">{c.description}</p></div>
                  <div className="col-span-2"><Select options={RISK_SCORE_OPTIONS} value={riskScores[c.key]?.toString() || ''} onChange={(e) => setRiskScores(p => ({ ...p, [c.key]: e.target.value ? parseInt(e.target.value) : null }))} disabled={!isManager} /></div>
                  <div className="col-span-7"><Input placeholder="Notes..." value={riskNotes[c.key] || ''} onChange={(e) => setRiskNotes(p => ({ ...p, [c.key]: e.target.value }))} disabled={!isManager} /></div>
                </div>
              ))}
            </div>
          </Card>

          {isManager && (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleSaveQualifying} isLoading={isSaving}><Save className="h-4 w-4 mr-2" />Save Draft</Button>
              {!bid.gonogo_submitted_at && (
                <Button onClick={handleSubmitForApproval} isLoading={isSaving} disabled={!meddpiccScore || !riskScore}>
                  <CheckCircle className="h-4 w-4 mr-2" />Submit for Approval
                </Button>
              )}
            </div>
          )}

          {/* Go/No-Go Approval - ONLY shows after submission */}
          {bid.gonogo_submitted_at && (
            <Card><CardHeader><CardTitle>Go/No-Go Approval</CardTitle></CardHeader>
              <div className="p-4 pt-0 space-y-4">
                <p className="text-sm text-brand-grey-500">Submitted for approval on {formatDate(bid.gonogo_submitted_at)}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${bid.gonogo_td_approved ? 'bg-green-50' : bid.gonogo_td_rejected ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <p className="text-sm font-medium">Technical Director</p>
                    <p className="text-xs text-brand-grey-500">{bid.technical_director?.full_name || 'Not assigned'}</p>
                    {bid.gonogo_td_approved && <p className="text-green-700 font-medium mt-2"><CheckCircle className="h-4 w-4 inline mr-1" />Approved</p>}
                    {bid.gonogo_td_rejected && <p className="text-red-700 font-medium mt-2"><XCircle className="h-4 w-4 inline mr-1" />Rejected</p>}
                    {goNogoPendingTD && <p className="text-amber-700 font-medium mt-2"><Clock className="h-4 w-4 inline mr-1" />Pending</p>}
                  </div>
                  <div className={`p-4 rounded-lg ${bid.gonogo_bd_approved ? 'bg-green-50' : bid.gonogo_bd_rejected ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <p className="text-sm font-medium">Business Director</p>
                    <p className="text-xs text-brand-grey-500">{bid.business_director?.full_name || 'Not assigned'}</p>
                    {bid.gonogo_bd_approved && <p className="text-green-700 font-medium mt-2"><CheckCircle className="h-4 w-4 inline mr-1" />Approved</p>}
                    {bid.gonogo_bd_rejected && <p className="text-red-700 font-medium mt-2"><XCircle className="h-4 w-4 inline mr-1" />Rejected</p>}
                    {goNogoPendingBD && <p className="text-amber-700 font-medium mt-2"><Clock className="h-4 w-4 inline mr-1" />Pending</p>}
                  </div>
                </div>
                {isApprover && bid.go_nogo_decision === null && ((isTD && goNogoPendingTD) || (isBD && goNogoPendingBD)) && (
                  <div className="border-t pt-4 space-y-3">
                    <Textarea label="Notes (optional)" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={2} />
                    <div className="flex justify-end gap-3">
                      <Button variant="danger" onClick={() => handleGoNoGoApproval(false)} isLoading={isSaving}><XCircle className="h-4 w-4 mr-2" />No-Go</Button>
                      <Button variant="success" onClick={() => handleGoNoGoApproval(true)} isLoading={isSaving}><CheckCircle className="h-4 w-4 mr-2" />Go</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>)}

        {/* PROPOSAL */}
        {stage === 'proposal' && (<>
          <Card><CardHeader><CardTitle>Proposal Details</CardTitle></CardHeader>
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Due Date" type="date" value={proposalForm.due_date} onChange={(e) => setProposalForm(p => ({ ...p, due_date: e.target.value }))} />
                <Input label="Value (£)" type="number" value={proposalForm.value} onChange={(e) => setProposalForm(p => ({ ...p, value: e.target.value }))} />
                <Input label="Margin %" type="number" value={proposalForm.margin_percent} onChange={(e) => setProposalForm(p => ({ ...p, margin_percent: e.target.value }))} />
              </div>
              <Textarea label="Notes" value={proposalForm.notes} onChange={(e) => setProposalForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              <div className="flex justify-end"><Button variant="secondary" onClick={handleSaveProposal} isLoading={isSaving}><Save className="h-4 w-4 mr-2" />Save</Button></div>
            </div>
          </Card>

          <Card><CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Offer Document */}
                <div>
                  <label className="block text-sm font-medium mb-2">Offer Document (PDF/Word)</label>
                  {bid.proposal_offer_document_url ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">{bid.proposal_offer_document_name}</p>
                        <p className="text-xs text-green-600">Uploaded</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadDoc('offer')}><Download className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => offerInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-brand-cyan', 'bg-brand-cyan/5'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-brand-cyan', 'bg-brand-cyan/5'); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        e.currentTarget.classList.remove('border-brand-cyan', 'bg-brand-cyan/5');
                        const file = e.dataTransfer.files?.[0];
                        if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx'))) {
                          setOfferDoc(file);
                        } else {
                          toast.error('Invalid File', 'Please upload a PDF, DOC, or DOCX file');
                        }
                      }}
                      className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-brand-grey-200 hover:border-brand-cyan hover:bg-brand-cyan/5 transition-colors cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-brand-grey-400" />
                      <div className="flex-1">
                        {offerDoc ? (
                          <p className="text-sm font-medium text-brand-cyan">{offerDoc.name}</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-brand-slate-700">Upload Offer Document</p>
                            <p className="text-xs text-brand-grey-400">Drag & drop or click to browse</p>
                          </>
                        )}
                        <p className="text-xs text-brand-grey-300">PDF, DOC, or DOCX</p>
                      </div>
                    </div>
                  )}
                  <input ref={offerInputRef} type="file" accept=".pdf,.doc,.docx" onChange={(e) => setOfferDoc(e.target.files?.[0] || null)} className="hidden" />
                </div>

                {/* Financial Calculation */}
                <div>
                  <label className="block text-sm font-medium mb-2">Financial Calculation (Excel)</label>
                  {bid.proposal_financial_calc_url ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">{bid.proposal_financial_calc_name}</p>
                        <p className="text-xs text-green-600">Uploaded</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadDoc('financial')}><Download className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => financialInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-brand-cyan', 'bg-brand-cyan/5'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-brand-cyan', 'bg-brand-cyan/5'); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        e.currentTarget.classList.remove('border-brand-cyan', 'bg-brand-cyan/5');
                        const file = e.dataTransfer.files?.[0];
                        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                          setFinancialDoc(file);
                        } else {
                          toast.error('Invalid File', 'Please upload an Excel file');
                        }
                      }}
                      className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-brand-grey-200 hover:border-brand-cyan hover:bg-brand-cyan/5 transition-colors cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-brand-grey-400" />
                      <div className="flex-1">
                        {financialDoc ? (
                          <p className="text-sm font-medium text-brand-cyan">{financialDoc.name}</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-brand-slate-700">Upload Financial Calc</p>
                            <p className="text-xs text-brand-grey-400">Drag & drop or click to browse</p>
                          </>
                        )}
                        <p className="text-xs text-brand-grey-300">XLSX or XLS</p>
                      </div>
                    </div>
                  )}
                  <input ref={financialInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => setFinancialDoc(e.target.files?.[0] || null)} className="hidden" />
                </div>
              </div>
              {(offerDoc || financialDoc) && (
                <div className="flex justify-end">
                  <Button onClick={handleUploadDocs} isLoading={isUploading}><Upload className="h-4 w-4 mr-2" />Upload Documents</Button>
                </div>
              )}
            </div>
          </Card>

          {/* Submit for Offer Review button */}
          {isManager && !bid.offer_submitted_at && (
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitForOfferReview} 
                isLoading={isSaving} 
                disabled={!proposalForm.value || !bid.proposal_offer_document_url}
              >
                <CheckCircle className="h-4 w-4 mr-2" />Submit for Offer Review
              </Button>
            </div>
          )}

          {/* Offer Approval Section - ONLY shows after submission */}
          {bid.offer_submitted_at && (
            <Card><CardHeader><CardTitle>Offer Approval</CardTitle></CardHeader>
              <div className="p-4 pt-0 space-y-4">
                <p className="text-sm text-brand-grey-500">Submitted for offer review on {formatDate(bid.offer_submitted_at)}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${bid.offer_td_approved ? 'bg-green-50' : bid.offer_td_rejected ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <p className="text-sm font-medium">Technical Director</p>
                    <p className="text-xs text-brand-grey-500">{bid.technical_director?.full_name || 'Not assigned'}</p>
                    {bid.offer_td_approved && <p className="text-green-700 font-medium mt-1"><CheckCircle className="h-4 w-4 inline mr-1" />Approved</p>}
                    {bid.offer_td_rejected && <p className="text-red-700 font-medium mt-1"><XCircle className="h-4 w-4 inline mr-1" />Rejected</p>}
                    {offerPendingTD && <p className="text-amber-700 font-medium mt-1"><Clock className="h-4 w-4 inline mr-1" />Pending</p>}
                  </div>
                  <div className={`p-4 rounded-lg ${bid.offer_bd_approved ? 'bg-green-50' : bid.offer_bd_rejected ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <p className="text-sm font-medium">Business Director</p>
                    <p className="text-xs text-brand-grey-500">{bid.business_director?.full_name || 'Not assigned'}</p>
                    {bid.offer_bd_approved && <p className="text-green-700 font-medium mt-1"><CheckCircle className="h-4 w-4 inline mr-1" />Approved</p>}
                    {bid.offer_bd_rejected && <p className="text-red-700 font-medium mt-1"><XCircle className="h-4 w-4 inline mr-1" />Rejected</p>}
                    {offerPendingBD && <p className="text-amber-700 font-medium mt-1"><Clock className="h-4 w-4 inline mr-1" />Pending</p>}
                  </div>
                </div>
                {isApprover && ((isTD && offerPendingTD) || (isBD && offerPendingBD)) && (
                  <div className="border-t pt-4 space-y-3">
                    <Textarea label="Notes (optional)" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={2} />
                    <div className="flex justify-end gap-3">
                      <Button variant="danger" onClick={() => handleOfferApproval(false)} isLoading={isSaving}><XCircle className="h-4 w-4 mr-2" />Reject</Button>
                      <Button variant="success" onClick={() => handleOfferApproval(true)} isLoading={isSaving}><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>)}

        {/* SUBMITTED / OUTCOME */}
        {(stage === 'submitted' || stage === 'won' || stage === 'lost') && (
          <Card><CardHeader><CardTitle>Outcome</CardTitle></CardHeader>
            <div className="p-4 pt-0 space-y-4">
              {!bid.bid_outcome && stage === 'submitted' ? (<>
                <Select label="Outcome" options={[{ value: '', label: 'Select...' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }, { value: 'no_decision', label: 'No Decision' }, { value: 'withdrawn', label: 'Withdrawn' }]} value={outcomeForm.outcome} onChange={(e) => setOutcomeForm(p => ({ ...p, outcome: e.target.value }))} />
                {outcomeForm.outcome && (<>
                  <Select label="Reason" options={[{ value: '', label: 'Select...' }, ...OUTCOME_REASONS]} value={outcomeForm.reason} onChange={(e) => setOutcomeForm(p => ({ ...p, reason: e.target.value }))} />
                  <Textarea label="Lessons Learned" value={outcomeForm.lessons_learned} onChange={(e) => setOutcomeForm(p => ({ ...p, lessons_learned: e.target.value }))} rows={3} />
                  <div className="flex justify-end"><Button onClick={handleRecordOutcome} isLoading={isSaving}>Record Outcome</Button></div>
                </>)}
              </>) : (
                <div className={`p-4 rounded-lg ${bid.bid_outcome === 'won' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-lg font-semibold ${bid.bid_outcome === 'won' ? 'text-green-700' : 'text-red-700'}`}>
                    {bid.bid_outcome === 'won' ? <><Award className="h-5 w-5 inline mr-2" />Bid Won!</> : <><XCircle className="h-5 w-5 inline mr-2" />Bid {bid.bid_outcome}</>}
                  </p>
                  {bid.bid_outcome_reason && <p className="text-sm mt-2">Reason: {bid.bid_outcome_reason}</p>}
                  {bid.bid_lessons_learned && <p className="text-sm mt-2">Lessons: {bid.bid_lessons_learned}</p>}
                </div>
              )}
              {bid.bid_outcome === 'won' && !bid.project_id && (
                <div className="flex justify-center pt-4">
                  <Button variant="success" size="lg" onClick={() => setIsCreateProjectModalOpen(true)}><Award className="h-5 w-5 mr-2" />Create Work Package Project</Button>
                </div>
              )}
              {bid.project_id && <div className="p-4 bg-green-50 rounded-lg text-center"><CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" /><p className="font-medium text-green-700">Project Created</p><Button variant="secondary" className="mt-2" onClick={() => navigate('/missions')}>View in Missions</Button></div>}
            </div>
          </Card>
        )}
      </div>
      <CreateProjectModal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} onSuccess={handleProjectCreated} requirement={bid} company={bid.company} contact={bid.contact} />
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={bid.title || 'Untitled Bid'}
        itemType="Bid"
        canHardDelete={isSuperAdmin}
        isLoading={isDeleting}
      />
    </div>
  );
}
