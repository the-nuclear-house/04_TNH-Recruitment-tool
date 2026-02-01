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
  pending: { label: 'Pending', colour: 'amber' },
  in_progress: { label: 'In Progress', colour: 'blue' },
  contract_sent: { label: 'Contract Sent', colour: 'cyan' },
  contract_signed: { label: 'Contract Signed', colour: 'purple' },
  completed: { label: 'Completed', colour: 'green' },
  cancelled: { label: 'Cancelled', colour: 'grey' },
  approved: { label: 'Approved', colour: 'green' },
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
  const [filter, setFilter] = useState<'pending' | 'in_progress' | 'completed' | 'all'>('pending');
  const [completionNotes, setCompletionNotes] = useState('');
  
  // Workflow confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<'contract_sent' | 'contract_signed' | 'convert' | null>(null);
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

  const handleStartWork = async (ticket: UITicket) => {
    if (ticket.source !== 'hr_ticket') return;
    
    setIsProcessing(true);
    try {
      await hrTicketsService.startWork(ticket.id);
      toast.success('Started', 'Ticket marked as in progress');
      loadTickets();
    } catch (error) {
      console.error('Error starting work:', error);
      toast.error('Error', 'Failed to update ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  // Contract workflow handlers - these show confirmation first
  const openConfirmDialog = (action: 'contract_sent' | 'contract_signed' | 'convert', ticket: UITicket) => {
    setConfirmAction(action);
    setTicketForConfirm(ticket);
  };

  const closeConfirmDialog = () => {
    setConfirmAction(null);
    setTicketForConfirm(null);
  };

  const handleConfirmedAction = async () => {
    if (!ticketForConfirm || !confirmAction) return;
    
    setIsProcessing(true);
    try {
      if (confirmAction === 'contract_sent') {
        await hrTicketsService.markContractSent(ticketForConfirm.id, user!.id);
        toast.success('Contract Sent', 'Ticket updated - contract has been sent to candidate');
      } else if (confirmAction === 'contract_signed') {
        await hrTicketsService.markContractSigned(ticketForConfirm.id, user!.id);
        toast.success('Contract Signed', 'Ticket updated - contract has been signed');
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
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'in_progress') return ['in_progress', 'contract_sent', 'contract_signed'].includes(t.status);
    if (filter === 'completed') return t.status === 'completed' || t.status === 'approved';
    return true;
  });

  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const inProgressCount = tickets.filter(t => ['in_progress', 'contract_sent', 'contract_signed'].includes(t.status)).length;

  return (
    <div className="min-h-screen">
      <Header
        title="HR Tickets"
        subtitle={`${pendingCount} pending, ${inProgressCount} in progress`}
      />

      <div className="p-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-grey-100 text-brand-slate-700 hover:bg-brand-grey-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'in_progress'
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-grey-100 text-brand-slate-700 hover:bg-brand-grey-200'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-grey-100 text-brand-slate-700 hover:bg-brand-grey-200'
            }`}
          >
            Completed
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
            description={filter === 'pending' ? "You're all caught up! No pending actions." : "No tickets found."}
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
                          <Badge variant={config.colour as any}>{config.label}</Badge>
                          {ticket.source === 'approval_request' && (
                            <Badge variant="amber">Needs HR Approval</Badge>
                          )}
                          {ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                            <Badge variant="red">{priorityInfo.label}</Badge>
                          ) : null}
                          {/* Status badge */}
                          <Badge variant={ticketStatusInfo.colour as any}>{ticketStatusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-brand-grey-500">{ticket.description}</p>
                        
                        {/* Workflow progress for contract tickets */}
                        {ticket.ticket_type === 'contract_send' && ticket.status !== 'completed' && (
                          <div className="flex items-center gap-2 mt-3">
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'pending' ? 'text-brand-cyan font-medium' : 'text-green-600'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'pending' ? 'bg-brand-cyan' : 'bg-green-500'}`} />
                              1. Send Contract
                            </div>
                            <ArrowRight className="h-3 w-3 text-brand-grey-300" />
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'contract_sent' ? 'text-brand-cyan font-medium' : ticket.status === 'contract_signed' || ticket.status === 'completed' ? 'text-green-600' : 'text-brand-grey-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'contract_sent' ? 'bg-brand-cyan' : ticket.status === 'contract_signed' || ticket.status === 'completed' ? 'bg-green-500' : 'bg-brand-grey-300'}`} />
                              2. Contract Signed
                            </div>
                            <ArrowRight className="h-3 w-3 text-brand-grey-300" />
                            <div className={`flex items-center gap-1 text-xs ${ticket.status === 'contract_signed' ? 'text-brand-cyan font-medium' : 'text-brand-grey-400'}`}>
                              <div className={`w-2 h-2 rounded-full ${ticket.status === 'contract_signed' ? 'bg-brand-cyan' : 'bg-brand-grey-300'}`} />
                              3. Convert to Consultant
                            </div>
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
                      {ticket.consultant_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/consultants/${ticket.consultant_id}`)}
                        >
                          View Consultant
                        </Button>
                      )}
                      {ticket.candidate_id && (
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
                      {ticket.ticket_type !== 'contract_send' && (
                        <>
                          {ticket.status === 'pending' && ticket.source === 'hr_ticket' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStartWork(ticket)}
                              disabled={isProcessing}
                            >
                              Start Work
                            </Button>
                          )}
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
          confirmAction === 'convert' ? 'Convert to Consultant' : ''
        }
        message={
          confirmAction === 'contract_sent' 
            ? `Do you confirm you have sent the contract to ${ticketForConfirm?.candidate_name || 'this candidate'}?` :
          confirmAction === 'contract_signed' 
            ? `Do you confirm you have received and verified the signed contract from ${ticketForConfirm?.candidate_name || 'this candidate'}?` :
          confirmAction === 'convert' 
            ? `This will create a new consultant record for ${ticketForConfirm?.candidate_name || 'this candidate'} and complete this ticket. Do you want to proceed?` : ''
        }
        confirmText={
          confirmAction === 'contract_sent' ? 'Yes, Contract Sent' :
          confirmAction === 'contract_signed' ? 'Yes, Contract Signed' :
          confirmAction === 'convert' ? 'Yes, Convert to Consultant' : 'Confirm'
        }
        variant={confirmAction === 'convert' ? 'primary' : 'primary'}
        isLoading={isProcessing}
      />
    </div>
  );
}
