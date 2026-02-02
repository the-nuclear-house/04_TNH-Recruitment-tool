import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Send,
  FileText,
  UserPlus,
  PoundSterling,
  Gift,
  XCircle,
  ArrowRight,
  Calendar,
  Briefcase,
  Download,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Modal,
  EmptyState,
  Textarea,
  ConfirmDialog,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToast } from '@/lib/stores/ui-store';
import {
  hrTicketsService,
  approvalRequestsService,
  documentUploadService,
  type DbHrTicket,
  type HrTicketType,
  type DbApprovalRequest,
} from '@/lib/services';

const ticketTypeConfig: Record<HrTicketType | 'general', { icon: any; colour: string; label: string }> = {
  contract_send: { icon: Send, colour: 'cyan', label: 'Contract Process' },
  contract_signed: { icon: FileText, colour: 'blue', label: 'Contract Signed' },
  salary_increase: { icon: PoundSterling, colour: 'green', label: 'Salary Increase' },
  bonus_payment: { icon: Gift, colour: 'purple', label: 'Bonus Payment' },
  employee_exit: { icon: XCircle, colour: 'red', label: 'Employee Exit' },
  general: { icon: Ticket, colour: 'grey', label: 'General' },
};

const statusConfig: Record<string, { label: string; colour: string }> = {
  pending: { label: 'Open', colour: 'cyan' },
  in_progress: { label: 'Open', colour: 'cyan' },
  contract_sent: { label: 'Open', colour: 'cyan' },
  contract_signed: { label: 'Open', colour: 'cyan' },
  completed: { label: 'Closed', colour: 'green' },
  cancelled: { label: 'Cancelled', colour: 'grey' },
  approved: { label: 'Closed', colour: 'green' },
};

const priorityConfig: Record<string, { label: string; colour: string }> = {
  low: { label: 'Low', colour: 'grey' },
  normal: { label: 'Normal', colour: 'blue' },
  high: { label: 'High', colour: 'amber' },
  urgent: { label: 'Urgent', colour: 'red' },
};

// Combined ticket type for UI
interface UITicket {
  id: string;
  source: 'hr_ticket' | 'approval_request';
  ticket_type: HrTicketType | 'general';
  status: string;
  priority: string;
  title: string;
  description: string;
  consultant_id?: string | null;
  candidate_id?: string | null;
  offer_id?: string | null;
  consultant_name?: string;
  candidate_name?: string;
  created_at: string;
  due_date?: string | null;
  reference_id?: string | null;
  ticket_data?: Record<string, any>;
  id_document_url?: string | null;
  right_to_work_document_url?: string | null;
  original: DbHrTicket | DbApprovalRequest;
}

export function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  
  const [tickets, setTickets] = useState<UITicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<UITicket | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [completionNotes, setCompletionNotes] = useState('');
  
  // Workflow confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<'contract_sent' | 'contract_signed' | 'it_access' | 'convert' | null>(null);
  const [ticketForConfirm, setTicketForConfirm] = useState<UITicket | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      // Load HR tickets
      const hrTickets = await hrTicketsService.getAll();
      
      // Load approval requests that are pending HR
      const approvalRequests = await approvalRequestsService.getAll();
      const pendingHrApprovals = approvalRequests.filter(r => r.status === 'pending_hr');
      
      // Convert to UI tickets
      const uiTickets: UITicket[] = [];
      
      // Add HR tickets
      hrTickets.forEach(ticket => {
        const consultantName = ticket.consultant 
          ? `${ticket.consultant.first_name} ${ticket.consultant.last_name}`
          : undefined;
        const candidateName = ticket.candidate
          ? `${ticket.candidate.first_name} ${ticket.candidate.last_name}`
          : undefined;
          
        uiTickets.push({
          id: ticket.id,
          source: 'hr_ticket',
          ticket_type: ticket.ticket_type,
          status: ticket.status,
          priority: ticket.priority,
          title: `${ticketTypeConfig[ticket.ticket_type]?.label || 'Task'}: ${consultantName || candidateName || 'Unknown'}`,
          description: getHrTicketDescription(ticket),
          consultant_id: ticket.consultant_id,
          candidate_id: ticket.candidate_id,
          offer_id: ticket.offer_id,
          consultant_name: consultantName,
          candidate_name: candidateName,
          created_at: ticket.created_at,
          due_date: ticket.due_date,
          reference_id: ticket.reference_id,
          ticket_data: ticket.ticket_data || undefined,
          id_document_url: ticket.offer?.id_document_url,
          right_to_work_document_url: ticket.offer?.right_to_work_document_url,
          original: ticket,
        });
      });
      
      // Add pending HR approval requests
      pendingHrApprovals.forEach(request => {
        const consultantName = request.consultant 
          ? `${request.consultant.first_name} ${request.consultant.last_name}`
          : undefined;
        const data = request.request_data as Record<string, any>;
        
        uiTickets.push({
          id: request.id,
          source: 'approval_request',
          ticket_type: request.request_type as HrTicketType,
          status: 'pending',
          priority: request.request_type === 'employee_exit' ? 'high' : 'normal',
          title: `${ticketTypeConfig[request.request_type as HrTicketType]?.label || 'Approval'}: ${consultantName || 'Unknown'}`,
          description: getApprovalDescription(request),
          consultant_id: request.consultant_id,
          consultant_name: consultantName,
          created_at: request.created_at,
          ticket_data: data,
          original: request,
        });
      });
      
      // Sort by date
      uiTickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTickets(uiTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Error', 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getHrTicketDescription = (ticket: DbHrTicket): string => {
    const data = ticket.ticket_data || {};
    
    switch (ticket.ticket_type) {
      case 'salary_increase':
        return `Process salary change to £${data.new_salary?.toLocaleString() || 'N/A'} effective ${data.effective_date || ''}`;
      case 'bonus_payment':
        return `Process bonus payment of £${data.amount?.toLocaleString() || 'N/A'}`;
      case 'contract_send':
        return `Send contract to candidate`;
      case 'contract_signed':
        return `Process signed contract`;
      case 'employee_exit':
        return `Process exit - last day: ${data.last_working_day || 'TBD'}`;
      default:
        return ticket.notes || 'No description';
    }
  };
  
  const getApprovalDescription = (request: DbApprovalRequest): string => {
    const data = request.request_data as Record<string, any>;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const effectiveDate = request.effective_month && request.effective_year 
      ? `${monthNames[request.effective_month - 1]} ${request.effective_year}`
      : '';
    
    switch (request.request_type) {
      case 'salary_increase':
        return `Approve & process salary change to £${data.new_salary?.toLocaleString() || 'N/A'} effective ${effectiveDate}`;
      case 'bonus_payment':
        return `Approve & process bonus of £${data.amount?.toLocaleString() || 'N/A'} for ${effectiveDate}`;
      case 'employee_exit':
        return `Approve & process exit - last day: ${data.last_working_day || 'TBD'}`;
      default:
        return 'Pending HR approval';
    }
  };

  // Contract workflow handlers - these show confirmation first
  const openConfirmDialog = (action: 'contract_sent' | 'contract_signed' | 'it_access' | 'convert', ticket: UITicket) => {
    setConfirmAction(action);
    setTicketForConfirm(ticket);
  };

  const closeConfirmDialog = () => {
    setConfirmAction(null);
    setTicketForConfirm(null);
  };

  // Download document from storage
  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const signedUrl = await documentUploadService.getSignedUrl(filePath);
      // Open in new tab or trigger download
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Download Failed', 'Could not download the document');
    }
  };

  const handleConfirmedAction = async () => {
    if (!ticketForConfirm || !confirmAction) return;
    
    setIsProcessing(true);
    try {
      if (confirmAction === 'contract_sent') {
        await hrTicketsService.markContractSent(ticketForConfirm.id, user!.id);
        
        // Delete documents from storage after HR confirms contract sent
        if (ticketForConfirm.id_document_url) {
          try {
            await documentUploadService.deleteDocument(ticketForConfirm.id_document_url);
          } catch (e) {
            console.warn('Could not delete ID document:', e);
          }
        }
        if (ticketForConfirm.right_to_work_document_url) {
          try {
            await documentUploadService.deleteDocument(ticketForConfirm.right_to_work_document_url);
          } catch (e) {
            console.warn('Could not delete RTW document:', e);
          }
        }
        
        toast.success('Contract Sent', 'Ticket updated - contract has been sent to candidate');
      } else if (confirmAction === 'contract_signed') {
        await hrTicketsService.markContractSigned(ticketForConfirm.id, user!.id);
        toast.success('Contract Signed', 'Ticket updated - contract has been signed');
      } else if (confirmAction === 'it_access') {
        await hrTicketsService.markITAccessCreated(ticketForConfirm.id, user!.id);
        toast.success('IT Access Created', 'Ticket updated - IT credentials have been set up');
      } else if (confirmAction === 'convert') {
        await hrTicketsService.convertToConsultant(ticketForConfirm.id, user!.id);
        toast.success('Converted', 'Candidate has been converted to consultant. Ticket completed.');
      }
      closeConfirmDialog();
      loadTickets();
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Error', 'Failed to process action');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async (ticket: UITicket) => {
    setIsProcessing(true);
    try {
      if (ticket.source === 'hr_ticket') {
        await hrTicketsService.complete(ticket.id, user!.id, completionNotes || undefined);
        toast.success('Completed', 'Ticket has been completed');
      } else {
        // Approval request - HR approve it
        await approvalRequestsService.hrApprove(ticket.id, user!.id, completionNotes || undefined);
        toast.success('Approved', 'Request has been approved and processed');
      }
      
      setIsActionModalOpen(false);
      setSelectedTicket(null);
      setCompletionNotes('');
      loadTickets();
    } catch (error) {
      console.error('Error completing ticket:', error);
      toast.error('Error', 'Failed to complete ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'open') return !['completed', 'approved', 'cancelled'].includes(t.status);
    if (filter === 'closed') return ['completed', 'approved', 'cancelled'].includes(t.status);
    return true;
  });

  const openCount = tickets.filter(t => !['completed', 'approved', 'cancelled'].includes(t.status)).length;
  const closedCount = tickets.filter(t => ['completed', 'approved', 'cancelled'].includes(t.status)).length;

  return (
    <div className="min-h-screen">
      <Header
        title="HR Tickets"
        subtitle={`${openCount} open, ${closedCount} closed`}
      />

      <div className="p-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'open'
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-grey-100 text-brand-slate-700 hover:bg-brand-grey-200'
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'closed'
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-grey-100 text-brand-slate-700 hover:bg-brand-grey-200'
            }`}
          >
            Closed ({closedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-grey-100 text-brand-slate-700 hover:bg-brand-grey-200'
            }`}
          >
            All
          </button>
        </div>

        {isLoading ? (
          <Card>
            <div className="text-center py-12 text-brand-grey-400">Loading tickets...</div>
          </Card>
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            title="No tickets"
            description={filter === 'open' ? "You're all caught up! No open tickets." : "No tickets found."}
          />
        ) : (
          <div className="space-y-4">
            {filteredTickets.map(ticket => {
              const config = ticketTypeConfig[ticket.ticket_type] || ticketTypeConfig.general;
              const Icon = config.icon;
              const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.normal;
              const ticketStatusInfo = statusConfig[ticket.status] || statusConfig.pending;
              
              return (
                <Card key={`${ticket.source}-${ticket.id}`} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-${config.colour}-100`}>
                        <Icon className={`h-6 w-6 text-${config.colour}-600`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-brand-slate-900">{ticket.title}</h3>
                          {ticket.source === 'approval_request' && (
                            <Badge variant="amber">Needs HR Approval</Badge>
                          )}
                          <Badge variant={ticketStatusInfo.colour as any}>{ticketStatusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-brand-grey-500">{ticket.description}</p>
                        
                        {/* Workflow progress for contract tickets */}
                        {ticket.ticket_type === 'contract_send' && ticket.status !== 'completed' && (
                          <div className="flex items-center gap-1 mt-3 flex-wrap">
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'pending' ? 'text-brand-cyan font-medium' : 'text-green-600'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'pending' ? 'bg-brand-cyan' : 'bg-green-500'}`} />
                              1. Send
                            </div>
                            <ArrowRight className="h-3 w-3 text-brand-grey-300" />
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'contract_sent' ? 'text-brand-cyan font-medium' : ticket.status === 'contract_signed' || ticket.status === 'it_access_created' || ticket.status === 'completed' ? 'text-green-600' : 'text-brand-grey-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'contract_sent' ? 'bg-brand-cyan' : ticket.status === 'contract_signed' || ticket.status === 'it_access_created' || ticket.status === 'completed' ? 'bg-green-500' : 'bg-brand-grey-300'}`} />
                              2. Signed
                            </div>
                            <ArrowRight className="h-3 w-3 text-brand-grey-300" />
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'contract_signed' ? 'text-brand-cyan font-medium' : ticket.status === 'it_access_created' || ticket.status === 'completed' ? 'text-green-600' : 'text-brand-grey-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'contract_signed' ? 'bg-brand-cyan' : ticket.status === 'it_access_created' || ticket.status === 'completed' ? 'bg-green-500' : 'bg-brand-grey-300'}`} />
                              3. IT Access
                            </div>
                            <ArrowRight className="h-3 w-3 text-brand-grey-300" />
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'it_access_created' ? 'text-brand-cyan font-medium' : 'text-brand-grey-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'it_access_created' ? 'bg-brand-cyan' : 'bg-brand-grey-300'}`} />
                              4. Convert
                            </div>
                          </div>
                        )}
                        
                        {/* Document downloads for contract tickets - only show when pending (before contract sent) */}
                        {ticket.ticket_type === 'contract_send' && ticket.status === 'pending' && (ticket.id_document_url || ticket.right_to_work_document_url) && (
                          <div className="flex items-center gap-3 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs text-blue-700 font-medium">Documents:</span>
                            {ticket.id_document_url && (
                              <button
                                onClick={() => handleDownloadDocument(ticket.id_document_url!, `ID-${ticket.candidate_name || 'document'}.pdf`)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <Download className="h-3 w-3" />
                                ID Document
                              </button>
                            )}
                            {ticket.right_to_work_document_url && (
                              <button
                                onClick={() => handleDownloadDocument(ticket.right_to_work_document_url!, `RTW-${ticket.candidate_name || 'document'}.pdf`)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <Download className="h-3 w-3" />
                                Right to Work
                              </button>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-brand-grey-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created: {formatDate(ticket.created_at)}
                          </span>
                          {ticket.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {formatDate(ticket.due_date)}
                            </span>
                          )}
                          {ticket.reference_id && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              Ref: {ticket.reference_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* For completed contract tickets, show View Consultant */}
                      {ticket.consultant_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/consultants/${ticket.consultant_id}`)}
                        >
                          View Consultant
                        </Button>
                      )}
                      {/* For open tickets, show View Candidate (but not if consultant exists) */}
                      {ticket.candidate_id && !ticket.consultant_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/candidates/${ticket.candidate_id}`)}
                        >
                          View Candidate
                        </Button>
                      )}
                      
                      {/* Contract workflow buttons */}
                      {ticket.ticket_type === 'contract_send' && ticket.source === 'hr_ticket' && (
                        <>
                          {ticket.status === 'pending' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openConfirmDialog('contract_sent', ticket)}
                              disabled={isProcessing}
                              leftIcon={<Send className="h-4 w-4" />}
                            >
                              Mark Contract Sent
                            </Button>
                          )}
                          {ticket.status === 'contract_sent' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openConfirmDialog('contract_signed', ticket)}
                              disabled={isProcessing}
                              leftIcon={<FileText className="h-4 w-4" />}
                            >
                              Mark Contract Signed
                            </Button>
                          )}
                          {ticket.status === 'contract_signed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openConfirmDialog('it_access', ticket)}
                              disabled={isProcessing}
                              leftIcon={<CheckCircle className="h-4 w-4" />}
                            >
                              Mark IT Access Created
                            </Button>
                          )}
                          {ticket.status === 'it_access_created' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => openConfirmDialog('convert', ticket)}
                              disabled={isProcessing}
                              leftIcon={<UserPlus className="h-4 w-4" />}
                            >
                              Convert to Consultant
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Generic workflow for other ticket types */}
                      {/* Generic workflow for other ticket types (salary, bonus, exit) */}
                      {ticket.ticket_type !== 'contract_send' && (
                        <>
                          {(ticket.status === 'pending' || ticket.status === 'in_progress') && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsActionModalOpen(true);
                              }}
                              rightIcon={<CheckCircle className="h-4 w-4" />}
                            >
                              Complete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete Ticket Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => { setIsActionModalOpen(false); setSelectedTicket(null); setCompletionNotes(''); }}
        title={selectedTicket?.source === 'approval_request' ? 'Approve Request' : 'Complete Ticket'}
        description={selectedTicket?.title || ''}
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="p-4 bg-brand-grey-50 rounded-lg">
              <p className="text-sm text-brand-slate-700">{selectedTicket.description}</p>
              
              {selectedTicket.ticket_data && (
                <div className="mt-3 space-y-2 text-sm border-t pt-3">
                  {Object.entries(selectedTicket.ticket_data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-brand-grey-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">
                        {typeof value === 'number' && (key.includes('salary') || key.includes('amount'))
                          ? `£${value.toLocaleString()}` 
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">
                Notes (optional)
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsActionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={() => handleComplete(selectedTicket)}
                isLoading={isProcessing}
                leftIcon={<CheckCircle className="h-4 w-4" />}
              >
                {selectedTicket.source === 'approval_request' ? 'Approve & Process' : 'Mark as Complete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Workflow Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmedAction}
        title={
          confirmAction === 'contract_sent' ? 'Confirm Contract Sent' :
          confirmAction === 'contract_signed' ? 'Confirm Contract Signed' :
          confirmAction === 'it_access' ? 'Confirm IT Access Created' :
          confirmAction === 'convert' ? 'Convert to Consultant' : ''
        }
        message={
          confirmAction === 'contract_sent' 
            ? `Do you confirm you have sent the contract to ${ticketForConfirm?.candidate_name || 'this candidate'}?` :
          confirmAction === 'contract_signed' 
            ? `Do you confirm you have received and verified the signed contract from ${ticketForConfirm?.candidate_name || 'this candidate'}?` :
          confirmAction === 'it_access'
            ? `Do you confirm IT credentials and access have been set up for ${ticketForConfirm?.candidate_name || 'this candidate'}?` :
          confirmAction === 'convert' 
            ? `This will create a new consultant record for ${ticketForConfirm?.candidate_name || 'this candidate'} and complete this ticket. Do you want to proceed?` : ''
        }
        confirmText={
          confirmAction === 'contract_sent' ? 'Yes, Contract Sent' :
          confirmAction === 'contract_signed' ? 'Yes, Contract Signed' :
          confirmAction === 'it_access' ? 'Yes, IT Access Created' :
          confirmAction === 'convert' ? 'Yes, Convert to Consultant' : 'Confirm'
        }
        variant={confirmAction === 'convert' ? 'primary' : 'primary'}
        isLoading={isProcessing}
      />
    </div>
  );
}
