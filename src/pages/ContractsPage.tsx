import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Send, 
  PenTool,
  User,
  Building2,
  Calendar,
  PoundSterling,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  Button, 
  Avatar,
  EmptyState,
  Modal,
  Textarea,
} from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { offersService, usersService, candidatesService, consultantsService, type DbOffer } from '@/lib/services';

const statusConfig: Record<string, { label: string; colour: string; icon: typeof Clock }> = {
  pending_approval: { label: 'Pending Approval', colour: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', colour: 'bg-green-100 text-green-700', icon: ThumbsUp },
  rejected: { label: 'Rejected', colour: 'bg-red-100 text-red-700', icon: ThumbsDown },
  contract_sent: { label: 'Contract Sent', colour: 'bg-blue-100 text-blue-700', icon: Send },
  contract_signed: { label: 'Contract Signed', colour: 'bg-green-100 text-green-700', icon: PenTool },
  withdrawn: { label: 'Withdrawn', colour: 'bg-slate-100 text-slate-600', icon: AlertCircle },
};

export function ContractsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  
  const [offers, setOffers] = useState<DbOffer[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const permissions = usePermissions();
  
  // Approval modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<DbOffer | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<DbOffer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [offersData, usersData] = await Promise.all([
        offersService.getAll(),
        usersService.getAll(),
      ]);
      setOffers(offersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load contracts data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;
    setIsDeleting(true);
    try {
      await offersService.delete(offerToDelete.id, user?.id);
      toast.success('Offer Deleted', 'The offer has been deleted');
      setIsDeleteDialogOpen(false);
      setOfferToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Error', 'Failed to delete offer');
    } finally {
      setIsDeleting(false);
    }
  };

  // Check user permissions
  const isHR = user?.roles?.includes('hr') || user?.roles?.includes('admin');
  const canApprove = (offer: DbOffer) => offer.approver_id === user?.id || user?.roles?.includes('admin');

  // Filter offers
  const filteredOffers = offers.filter(offer => {
    if (filter === 'all') return true;
    if (filter === 'pending_approval') return offer.status === 'pending_approval' && canApprove(offer);
    if (filter === 'hr_action') return offer.status === 'approved' || offer.status === 'contract_sent';
    return offer.status === filter;
  });

  // Stats
  const stats = {
    pendingApproval: offers.filter(o => o.status === 'pending_approval').length,
    approved: offers.filter(o => o.status === 'approved').length,
    contractSent: offers.filter(o => o.status === 'contract_sent').length,
    contractSigned: offers.filter(o => o.status === 'contract_signed').length,
  };

  const handleApprove = async () => {
    if (!selectedOffer) return;
    setIsProcessing(true);
    try {
      await offersService.approve(selectedOffer.id, user!.id, approvalNotes);
      // Update candidate status to offer_approved
      await candidatesService.update(selectedOffer.candidate_id, { status: 'offer_approved' });
      toast.success('Offer Approved', 'The offer has been approved and sent to HR for contract processing');
      setIsApprovalModalOpen(false);
      setSelectedOffer(null);
      setApprovalNotes('');
      loadData();
    } catch (error) {
      console.error('Error approving offer:', error);
      toast.error('Error', 'Failed to approve offer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOffer) return;
    setIsProcessing(true);
    try {
      await offersService.reject(selectedOffer.id, approvalNotes);
      // Update candidate status back to director_interview (or a rejected status)
      await candidatesService.update(selectedOffer.candidate_id, { status: 'offer_rejected' });
      toast.success('Offer Rejected', 'The offer has been rejected');
      setIsApprovalModalOpen(false);
      setSelectedOffer(null);
      setApprovalNotes('');
      loadData();
    } catch (error) {
      console.error('Error rejecting offer:', error);
      toast.error('Error', 'Failed to reject offer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkContractSent = async (offer: DbOffer) => {
    try {
      await offersService.markContractSent(offer.id, user!.id);
      // Update candidate status to contract_sent
      await candidatesService.update(offer.candidate_id, { status: 'contract_sent' });
      toast.success('Contract Sent', 'Contract has been marked as sent to candidate');
      loadData();
    } catch (error) {
      console.error('Error marking contract sent:', error);
      toast.error('Error', 'Failed to update contract status');
    }
  };

  const handleMarkContractSigned = async (offer: DbOffer) => {
    try {
      await offersService.markContractSigned(offer.id, user!.id);
      // Update candidate status to contract_signed
      await candidatesService.update(offer.candidate_id, { status: 'contract_signed' });
      toast.success('Contract Signed', 'Contract has been signed. Ready to convert to consultant!');
      loadData();
    } catch (error) {
      console.error('Error marking contract signed:', error);
      toast.error('Error', 'Failed to update contract status');
    }
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Contracts"
        subtitle="Manage offers, approvals and contracts"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card 
            hover 
            className={`cursor-pointer ${filter === 'pending_approval' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setFilter(filter === 'pending_approval' ? 'all' : 'pending_approval')}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-slate-900">{stats.pendingApproval}</p>
                  <p className="text-sm text-brand-grey-500">Pending Approval</p>
                </div>
              </div>
            </div>
          </Card>
          <Card 
            hover 
            className={`cursor-pointer ${filter === 'hr_action' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setFilter(filter === 'hr_action' ? 'all' : 'hr_action')}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-slate-900">{stats.approved}</p>
                  <p className="text-sm text-brand-grey-500">Ready for HR</p>
                </div>
              </div>
            </div>
          </Card>
          <Card 
            hover 
            className={`cursor-pointer ${filter === 'contract_sent' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter(filter === 'contract_sent' ? 'all' : 'contract_sent')}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-slate-900">{stats.contractSent}</p>
                  <p className="text-sm text-brand-grey-500">Contract Sent</p>
                </div>
              </div>
            </div>
          </Card>
          <Card 
            hover 
            className={`cursor-pointer ${filter === 'contract_signed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setFilter(filter === 'contract_signed' ? 'all' : 'contract_signed')}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <PenTool className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-slate-900">{stats.contractSigned}</p>
                  <p className="text-sm text-brand-grey-500">Signed</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending_approval', 'approved', 'contract_sent', 'contract_signed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status 
                  ? 'bg-brand-slate-900 text-white' 
                  : 'bg-brand-grey-100 text-brand-grey-600 hover:bg-brand-grey-200'
              }`}
            >
              {status === 'all' ? 'All' : statusConfig[status]?.label || status}
            </button>
          ))}
        </div>

        {/* Offers List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading contracts...</div>
          </Card>
        ) : filteredOffers.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No contracts found"
              description={filter === 'all' 
                ? "No offers or contracts yet. Create offers from candidate profiles after all interviews pass."
                : `No contracts with status "${statusConfig[filter]?.label || filter}".`
              }
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map(offer => {
              const config = statusConfig[offer.status] || statusConfig.pending_approval;
              const requester = offer.requester || users.find(u => u.id === offer.requested_by);
              
              return (
                <Card key={offer.id} hover className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar 
                          name={offer.candidate_full_name || 'Candidate'} 
                          size="lg" 
                        />
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 
                              className="font-semibold text-brand-slate-900 cursor-pointer hover:text-brand-cyan"
                              onClick={() => navigate(`/candidates/${offer.candidate_id}`)}
                            >
                              {offer.candidate_full_name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.colour}`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-brand-grey-500 mb-2">{offer.job_title}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                            <span className="flex items-center gap-1">
                              <PoundSterling className="h-4 w-4" />
                              £{offer.salary_amount?.toLocaleString()}
                              {offer.contract_type === 'contract' && offer.day_rate && (
                                <span className="text-brand-grey-300">(£{offer.day_rate}/day)</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Start: {formatDate(offer.start_date)}
                            </span>
                            {offer.work_location && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {offer.work_location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Requested by {requester?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Visual Pipeline */}
                      <div className="flex items-center gap-1 ml-4">
                        {['pending_approval', 'approved', 'contract_sent', 'contract_signed'].map((status, idx) => {
                          const statusOrder = ['pending_approval', 'approved', 'contract_sent', 'contract_signed'];
                          const currentIdx = statusOrder.indexOf(offer.status);
                          const isComplete = idx <= currentIdx;
                          const isCurrent = offer.status === status;
                          
                          return (
                            <div key={status} className="flex items-center">
                              <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                                ${isComplete ? 'bg-green-100 text-green-700' : 'bg-brand-grey-100 text-brand-grey-400'}
                                ${isCurrent ? 'ring-2 ring-offset-1 ring-green-500' : ''}
                              `}>
                                {isComplete ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                              </div>
                              {idx < 3 && (
                                <div className={`w-4 h-0.5 ${idx < currentIdx ? 'bg-green-300' : 'bg-brand-grey-200'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-brand-grey-100">
                      {offer.status === 'pending_approval' && canApprove(offer) && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<ThumbsDown className="h-4 w-4" />}
                            onClick={() => {
                              setSelectedOffer(offer);
                              setApprovalAction('reject');
                              setApprovalNotes('');
                              setIsApprovalModalOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            leftIcon={<ThumbsUp className="h-4 w-4" />}
                            onClick={() => {
                              setSelectedOffer(offer);
                              setApprovalAction('approve');
                              setApprovalNotes('');
                              setIsApprovalModalOpen(true);
                            }}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                      
                      {offer.status === 'approved' && isHR && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Send className="h-4 w-4" />}
                          onClick={() => handleMarkContractSent(offer)}
                        >
                          Mark Contract Sent
                        </Button>
                      )}
                      
                      {offer.status === 'contract_sent' && isHR && (
                        <Button
                          variant="success"
                          size="sm"
                          leftIcon={<PenTool className="h-4 w-4" />}
                          onClick={() => handleMarkContractSigned(offer)}
                        >
                          Mark Contract Signed
                        </Button>
                      )}
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/candidates/${offer.candidate_id}`)}
                      >
                        View Candidate Profile
                      </Button>
                      
                      {offer.candidate?.status === 'converted_to_consultant' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            // Find the consultant by candidate_id
                            const consultant = await consultantsService.getByCandidateId(offer.candidate_id);
                            if (consultant) {
                              navigate(`/consultants/${consultant.id}`);
                            } else {
                              toast.error('Error', 'Consultant profile not found');
                            }
                          }}
                        >
                          View Consultant Profile
                        </Button>
                      )}
                      
                      {permissions.isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          onClick={() => {
                            setOfferToDelete(offer);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          Delete
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setOfferToDelete(null); }}
        onConfirm={handleDeleteOffer}
        title="Delete Offer"
        message={`Are you sure you want to delete this offer for ${offerToDelete?.candidate_full_name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Approval Modal */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => { setIsApprovalModalOpen(false); setApprovalAction(null); }}
        title={approvalAction === 'approve' ? 'Approve Offer' : 'Reject Offer'}
        size="md"
      >
        {selectedOffer && (
          <div className="space-y-4">
            <div className="p-4 bg-brand-grey-50 rounded-lg">
              <h4 className="font-medium text-brand-slate-900">{selectedOffer.candidate_full_name}</h4>
              <p className="text-sm text-brand-grey-500">{selectedOffer.job_title}</p>
              <p className="text-sm text-brand-grey-500">
                {selectedOffer.contract_type === 'contract' && selectedOffer.day_rate
                  ? `£${selectedOffer.day_rate}/day`
                  : `£${selectedOffer.salary_amount?.toLocaleString()}`
                } | Start: {formatDate(selectedOffer.start_date)}
              </p>
            </div>
            
            <Textarea
              label={approvalAction === 'reject' ? 'Reason for rejection' : 'Notes (optional)'}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder={approvalAction === 'reject' 
                ? 'Please provide a reason for rejecting this offer...' 
                : 'Add any notes about this approval...'}
              rows={3}
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
              <Button variant="secondary" onClick={() => { setIsApprovalModalOpen(false); setApprovalAction(null); }}>
                Cancel
              </Button>
              {approvalAction === 'reject' && (
                <Button
                  variant="danger"
                  leftIcon={<ThumbsDown className="h-4 w-4" />}
                  onClick={handleReject}
                  isLoading={isProcessing}
                >
                  Confirm Rejection
                </Button>
              )}
              {approvalAction === 'approve' && (
                <Button
                  variant="success"
                  leftIcon={<ThumbsUp className="h-4 w-4" />}
                  onClick={handleApprove}
                  isLoading={isProcessing}
                >
                  Confirm Approval
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
