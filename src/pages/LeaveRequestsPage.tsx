import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, EmptyState, Modal, Avatar, Input } from '@/components/ui';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  Send,
  AlertCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  leaveRequestsService,
  consultantsService,
  timesheetEntriesService,
  type DbLeaveRequest,
  type DbConsultant,
  type DbTimesheetEntry,
  type LeaveType,
} from '@/lib/services';

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(dates: string[]): string {
  if (!dates || dates.length === 0) return '';
  const sorted = [...dates].sort();
  if (sorted.length === 1) return formatDate(sorted[0]);
  return `${formatDate(sorted[0])} - ${formatDate(sorted[sorted.length - 1])}`;
}

const leaveTypeConfig: Record<LeaveType, { label: string; bgClass: string; textClass: string; badgeVariant: string }> = {
  annual: { label: 'Annual Leave', bgClass: 'bg-blue-500', textClass: 'text-white', badgeVariant: 'info' },
  sick: { label: 'Sick Leave', bgClass: 'bg-orange-500', textClass: 'text-white', badgeVariant: 'amber' },
  unpaid: { label: 'Unpaid Leave', bgClass: 'bg-slate-500', textClass: 'text-white', badgeVariant: 'grey' },
};

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Pending', variant: 'amber' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
  cancellation_pending: { label: 'Cancellation Pending', variant: 'amber' },
  cancelled: { label: 'Cancelled', variant: 'grey' },
};

export function LeaveRequestsPage() {
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [myConsultant, setMyConsultant] = useState<DbConsultant | null>(null);
  const [myRequests, setMyRequests] = useState<DbLeaveRequest[]>([]);
  const [myTimesheetEntries, setMyTimesheetEntries] = useState<DbTimesheetEntry[]>([]);
  
  // Manager state
  const [allRequests, setAllRequests] = useState<DbLeaveRequest[]>([]);
  const [myConsultants, setMyConsultants] = useState<DbConsultant[]>([]);
  
  // Selection
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  // Request modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestLeaveType, setRequestLeaveType] = useState<LeaveType>('annual');
  const [requestNotes, setRequestNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Approval modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DbLeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Cancellation modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<DbLeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const isConsultant = permissions.isConsultant;
  const canApprove = permissions.canApproveTimesheets;

  useEffect(() => {
    loadData();
  }, [user?.id, currentMonth]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      if (isConsultant) {
        const allConsultants = await consultantsService.getAll();
        const myRecord = allConsultants.find(c => c.user_id === user.id);
        setMyConsultant(myRecord || null);
        
        if (myRecord) {
          const [requests, entries] = await Promise.all([
            leaveRequestsService.getByConsultant(myRecord.id),
            timesheetEntriesService.getByConsultant(myRecord.id),
          ]);
          setMyRequests(requests);
          setMyTimesheetEntries(entries);
        }
      }
      
      if (canApprove) {
        const [allConsultants, requests] = await Promise.all([
          consultantsService.getAll(),
          leaveRequestsService.getAll(),
        ]);
        
        const consultantsForManager = allConsultants.filter(c => 
          c.account_manager_id === user.id || 
          permissions.isAdmin || 
          permissions.isBusinessDirector
        );
        
        setMyConsultants(consultantsForManager);
        
        // Filter requests to only my consultants
        const myConsultantIds = consultantsForManager.map(c => c.id);
        setAllRequests(requests.filter(r => myConsultantIds.includes(r.consultant_id)));
      }
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast.error('Error', 'Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days = getMonthDays(year, month);
    
    const firstDay = days[0].getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const calendarWeeks: (Date | null)[][] = [];
    let currentRow: (Date | null)[] = [];
    
    for (let i = 0; i < startOffset; i++) {
      currentRow.push(null);
    }
    
    for (const day of days) {
      currentRow.push(day);
      if (currentRow.length === 7) {
        calendarWeeks.push(currentRow);
        currentRow = [];
      }
    }
    
    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push(null);
      }
      calendarWeeks.push(currentRow);
    }
    
    return calendarWeeks;
  }, [currentMonth]);

  // Leave balance calculation
  const leaveBalance = useMemo(() => {
    if (!myConsultant) return { allowance: 24, used: 0, pending: 0, remaining: 24 };
    
    const allowance = (myConsultant as any).annual_leave_allowance || 24;
    const currentYear = new Date().getFullYear();
    
    const approvedDays = myRequests
      .filter(r => r.leave_type === 'annual' && ['approved', 'cancellation_pending'].includes(r.status))
      .filter(r => r.dates.some(d => d.startsWith(String(currentYear))))
      .reduce((sum, r) => sum + r.total_days, 0);
    
    const pendingDays = myRequests
      .filter(r => r.leave_type === 'annual' && r.status === 'pending')
      .filter(r => r.dates.some(d => d.startsWith(String(currentYear))))
      .reduce((sum, r) => sum + r.total_days, 0);
    
    return {
      allowance,
      used: approvedDays,
      pending: pendingDays,
      remaining: allowance - approvedDays - pendingDays,
    };
  }, [myConsultant, myRequests]);

  // Get leave status for a date (for the consultant calendar)
  const getDateLeaveStatus = (date: Date): { status: string; leaveType?: LeaveType; request?: DbLeaveRequest } | null => {
    const dateKey = formatDateKey(date);
    
    for (const req of myRequests) {
      if (['cancelled', 'rejected'].includes(req.status)) continue;
      if (req.dates.includes(dateKey)) {
        return { status: req.status, leaveType: req.leave_type, request: req };
      }
    }
    return null;
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };

  // Toggle date selection
  const toggleDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return;
    
    // Don't allow selecting days that already have leave
    const leaveStatus = getDateLeaveStatus(date);
    if (leaveStatus && leaveStatus.status !== 'rejected') return;
    
    // Don't allow selecting days that have timesheet entries
    const hasEntry = myTimesheetEntries.some(e => e.date === dateKey && e.entry_type !== 'leave');
    if (hasEntry) return;
    
    setSelectedDates(prev => {
      if (prev.includes(dateKey)) {
        return prev.filter(d => d !== dateKey);
      }
      return [...prev, dateKey].sort();
    });
  };

  // Submit leave request
  const handleSubmitRequest = async () => {
    if (!myConsultant || selectedDates.length === 0) return;
    
    try {
      setIsSaving(true);
      
      await leaveRequestsService.create({
        consultant_id: myConsultant.id,
        leave_type: requestLeaveType,
        dates: selectedDates,
        total_days: selectedDates.length,
        notes: requestNotes || undefined,
      });
      
      toast.success('Submitted', 'Leave request submitted for approval');
      setIsRequestModalOpen(false);
      setSelectedDates([]);
      setRequestNotes('');
      loadData();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Error', 'Failed to submit leave request');
    } finally {
      setIsSaving(false);
    }
  };

  // Manager approve
  const handleApprove = async () => {
    if (!selectedRequest || !user?.id) return;
    
    try {
      setIsSaving(true);
      
      // Approve the request
      const approved = await leaveRequestsService.approve(selectedRequest.id, user.id);
      
      // Create timesheet entries
      await leaveRequestsService.createTimesheetEntries({ ...selectedRequest, status: 'approved' });
      
      toast.success('Approved', 'Leave request approved and calendar updated');
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Error', 'Failed to approve leave request');
    } finally {
      setIsSaving(false);
    }
  };

  // Manager reject
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Required', 'Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsSaving(true);
      await leaveRequestsService.reject(selectedRequest.id, rejectionReason);
      toast.success('Rejected', 'Leave request rejected');
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Error', 'Failed to reject leave request');
    } finally {
      setIsSaving(false);
    }
  };

  // Consultant request cancellation
  const handleRequestCancellation = async () => {
    if (!cancelRequest) return;
    
    try {
      setIsSaving(true);
      await leaveRequestsService.requestCancellation(cancelRequest.id, cancelReason);
      toast.success('Submitted', 'Cancellation request sent to manager');
      setIsCancelModalOpen(false);
      setCancelRequest(null);
      setCancelReason('');
      loadData();
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast.error('Error', 'Failed to request cancellation');
    } finally {
      setIsSaving(false);
    }
  };

  // Manager approve cancellation
  const handleApproveCancellation = async (request: DbLeaveRequest) => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      await leaveRequestsService.approveCancellation(request.id, user.id);
      
      // Remove timesheet entries
      await leaveRequestsService.removeTimesheetEntries(request.consultant_id, request.dates);
      
      toast.success('Cancelled', 'Leave cancelled and calendar updated');
      loadData();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast.error('Error', 'Failed to approve cancellation');
    } finally {
      setIsSaving(false);
    }
  };

  // Manager reject cancellation
  const handleRejectCancellation = async (request: DbLeaveRequest) => {
    try {
      setIsSaving(true);
      await leaveRequestsService.rejectCancellation(request.id);
      toast.success('Denied', 'Cancellation request denied, leave remains');
      loadData();
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast.error('Error', 'Failed to reject cancellation');
    } finally {
      setIsSaving(false);
    }
  };

  // Open cancellation modal from calendar click
  const handleLeaveClick = (request: DbLeaveRequest) => {
    if (request.status === 'approved') {
      setCancelRequest(request);
      setCancelReason('');
      setIsCancelModalOpen(true);
    }
  };

  // Consultant View
  if (isConsultant) {
    if (!myConsultant) {
      return (
        <div className="min-h-screen">
          <Header title="Leave Requests" subtitle="Request and manage your leave" />
          <div className="p-6">
            <Card>
              <EmptyState
                icon={<AlertCircle className="h-12 w-12" />}
                title="No Consultant Profile"
                description="Your account is not linked to a consultant profile. Please contact your manager."
              />
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen">
        <Header title="Leave Requests" subtitle="Request and manage your leave" />
        <div className="p-6 space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-slate-900">{leaveBalance.allowance}</p>
                <p className="text-xs text-brand-grey-400 mt-1">Annual Allowance</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{leaveBalance.used}</p>
                <p className="text-xs text-brand-grey-400 mt-1">Days Taken</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{leaveBalance.pending}</p>
                <p className="text-xs text-brand-grey-400 mt-1">Pending</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className={`text-2xl font-bold ${leaveBalance.remaining <= 3 ? 'text-red-500' : 'text-brand-cyan'}`}>
                  {leaveBalance.remaining}
                </p>
                <p className="text-xs text-brand-grey-400 mt-1">Remaining</p>
              </div>
            </Card>
          </div>

          {/* Month Navigation + Request Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToCurrentMonth}>
                Today
              </Button>
              <Button variant="secondary" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-brand-slate-900 ml-2">
                {formatMonthYear(currentMonth)}
              </h2>
            </div>
            
            {selectedDates.length > 0 && (
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={() => setSelectedDates([])}>
                  Clear ({selectedDates.length})
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => {
                    setRequestLeaveType('annual');
                    setRequestNotes('');
                    setIsRequestModalOpen(true);
                  }}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Request Leave ({selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'})
                </Button>
              </div>
            )}
          </div>

          {/* Calendar */}
          <Card className="p-5">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px bg-brand-grey-200 rounded-t-lg overflow-hidden">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-brand-grey-500 py-2 bg-brand-grey-50">{d}</div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="bg-brand-grey-200 rounded-b-lg overflow-hidden" style={{ display: 'grid', gap: '1px' }}>
              {calendarData.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7" style={{ gap: '1px' }}>
                  {week.map((date, di) => {
                    if (!date) {
                      return <div key={`empty-${di}`} className="h-20 bg-white" />;
                    }
                    
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isToday = formatDateKey(date) === formatDateKey(new Date());
                    const dateKey = formatDateKey(date);
                    const isSelected = selectedDates.includes(dateKey);
                    const leaveInfo = getDateLeaveStatus(date);
                    const hasTimesheetEntry = myTimesheetEntries.some(e => e.date === dateKey && e.entry_type !== 'leave');
                    
                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          if (leaveInfo?.request && leaveInfo.status === 'approved') {
                            handleLeaveClick(leaveInfo.request);
                          } else if (!isWeekend && !leaveInfo) {
                            toggleDate(date);
                          }
                        }}
                        disabled={isWeekend}
                        className={`h-20 p-1.5 text-left transition-all relative ${
                          isWeekend ? 'bg-slate-50 cursor-default' :
                          isSelected ? 'bg-brand-cyan/20 ring-2 ring-inset ring-brand-cyan cursor-pointer' :
                          leaveInfo?.status === 'approved' ? 'bg-blue-100 cursor-pointer hover:bg-blue-200' :
                          leaveInfo?.status === 'pending' ? 'bg-amber-50 cursor-default' :
                          leaveInfo?.status === 'cancellation_pending' ? 'bg-orange-50 cursor-default' :
                          hasTimesheetEntry ? 'bg-slate-100 cursor-default' :
                          'bg-white cursor-pointer hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-sm font-medium ${
                          isToday ? 'bg-brand-cyan text-white w-6 h-6 rounded-full flex items-center justify-center' :
                          isWeekend ? 'text-slate-300' :
                          isSelected ? 'text-brand-cyan' :
                          'text-brand-slate-600'
                        }`}>
                          {date.getDate()}
                        </span>
                        
                        {/* Leave indicator */}
                        {leaveInfo && !isWeekend && (
                          <div className="absolute bottom-1 left-1 right-1">
                            <div className={`text-[9px] font-medium px-1 py-0.5 rounded truncate ${
                              leaveInfo.status === 'approved' ? `${leaveTypeConfig[leaveInfo.leaveType!].bgClass} ${leaveTypeConfig[leaveInfo.leaveType!].textClass}` :
                              leaveInfo.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                              leaveInfo.status === 'cancellation_pending' ? 'bg-orange-200 text-orange-800' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {leaveInfo.status === 'pending' ? 'Pending' :
                               leaveInfo.status === 'cancellation_pending' ? 'Cancel...' :
                               leaveTypeConfig[leaveInfo.leaveType!].label.split(' ')[0]}
                            </div>
                          </div>
                        )}
                        
                        {/* Timesheet entry indicator */}
                        {hasTimesheetEntry && !leaveInfo && !isWeekend && (
                          <div className="absolute bottom-1 left-1 right-1">
                            <div className="text-[9px] text-slate-400 px-1">Booked</div>
                          </div>
                        )}
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-4 w-4 text-brand-cyan" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Calendar legend */}
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-brand-grey-500">Annual</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-brand-grey-500">Sick</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-500" />
                <span className="text-brand-grey-500">Unpaid</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-200" />
                <span className="text-brand-grey-500">Pending Approval</span>
              </div>
            </div>
          </Card>

          {/* Recent Requests */}
          <Card>
            <div className="p-4 border-b border-brand-grey-200">
              <h3 className="font-semibold text-brand-slate-900">My Requests</h3>
            </div>
            {myRequests.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-12 w-12" />}
                title="No Requests"
                description="Select dates on the calendar to request leave"
              />
            ) : (
              <div className="divide-y divide-brand-grey-100">
                {myRequests.map(req => (
                  <div key={req.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-10 rounded-full ${leaveTypeConfig[req.leave_type].bgClass}`} />
                      <div>
                        <p className="text-sm font-medium text-brand-slate-900">
                          {leaveTypeConfig[req.leave_type].label}
                        </p>
                        <p className="text-xs text-brand-grey-500">
                          {formatDateRange(req.dates)} · {req.total_days} {req.total_days === 1 ? 'day' : 'days'}
                        </p>
                        {req.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">Rejected: {req.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusConfig[req.status]?.variant as any}>
                      {statusConfig[req.status]?.label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Request Leave Modal */}
        <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Request Leave" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-brand-grey-600">
              {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'} selected: {formatDateRange(selectedDates)}
            </p>
            
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">Leave Type</label>
              <div className="space-y-2">
                {(['annual', 'sick', 'unpaid'] as LeaveType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setRequestLeaveType(type)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      requestLeaveType === type ? 'border-brand-cyan bg-brand-cyan/5' : 'border-brand-grey-200 hover:border-brand-grey-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded ${leaveTypeConfig[type].bgClass}`} />
                      <span className="text-sm font-medium">{leaveTypeConfig[type].label}</span>
                      {type === 'annual' && (
                        <span className="text-xs text-brand-grey-400 ml-auto">
                          {leaveBalance.remaining} days remaining
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">Notes (optional)</label>
              <Input
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Any additional details..."
              />
            </div>
            
            {requestLeaveType === 'annual' && selectedDates.length > leaveBalance.remaining && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  You only have {leaveBalance.remaining} days remaining. This request exceeds your allowance.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleSubmitRequest}
                isLoading={isSaving}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </Modal>

        {/* Cancellation Modal */}
        <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Request Cancellation" size="sm">
          {cancelRequest && (
            <div className="space-y-4">
              <p className="text-sm text-brand-grey-600">
                Cancel {leaveTypeConfig[cancelRequest.leave_type].label}: {formatDateRange(cancelRequest.dates)} ({cancelRequest.total_days} {cancelRequest.total_days === 1 ? 'day' : 'days'})
              </p>
              
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-2">Reason (optional)</label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why do you need to cancel?"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>Back</Button>
                <Button 
                  variant="danger" 
                  onClick={handleRequestCancellation}
                  isLoading={isSaving}
                >
                  Request Cancellation
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // Manager View
  const pendingRequests = allRequests.filter(r => r.status === 'pending');
  const cancellationRequests = allRequests.filter(r => r.status === 'cancellation_pending');
  const recentRequests = allRequests.filter(r => !['pending', 'cancellation_pending'].includes(r.status)).slice(0, 20);

  return (
    <div className="min-h-screen">
      <Header title="Leave Requests" subtitle="Review and approve leave requests" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{pendingRequests.length}</p>
                <p className="text-sm text-brand-grey-400">Pending Approval</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Ban className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{cancellationRequests.length}</p>
                <p className="text-sm text-brand-grey-400">Cancellation Requests</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">
                  {allRequests.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-sm text-brand-grey-400">Currently Approved</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Leave Requests */}
        {pendingRequests.length > 0 && (
          <Card>
            <div className="p-4 border-b border-brand-grey-200">
              <h3 className="font-semibold text-brand-slate-900">Pending Leave Requests</h3>
            </div>
            <div className="divide-y divide-brand-grey-100">
              {pendingRequests.map(req => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={req.consultant ? `${req.consultant.first_name} ${req.consultant.last_name}` : 'Unknown'} size="md" />
                    <div>
                      <p className="font-medium text-brand-slate-900">
                        {req.consultant ? `${req.consultant.first_name} ${req.consultant.last_name}` : 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={leaveTypeConfig[req.leave_type].badgeVariant as any}>
                          {leaveTypeConfig[req.leave_type].label}
                        </Badge>
                        <span className="text-xs text-brand-grey-500">
                          {formatDateRange(req.dates)} · {req.total_days} {req.total_days === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      {req.notes && <p className="text-xs text-brand-grey-400 mt-1">{req.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(req);
                        setRejectionReason('');
                        setIsApprovalModalOpen(true);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Cancellation Requests */}
        {cancellationRequests.length > 0 && (
          <Card>
            <div className="p-4 border-b border-brand-grey-200">
              <h3 className="font-semibold text-brand-slate-900">Cancellation Requests</h3>
            </div>
            <div className="divide-y divide-brand-grey-100">
              {cancellationRequests.map(req => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={req.consultant ? `${req.consultant.first_name} ${req.consultant.last_name}` : 'Unknown'} size="md" />
                    <div>
                      <p className="font-medium text-brand-slate-900">
                        {req.consultant ? `${req.consultant.first_name} ${req.consultant.last_name}` : 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={leaveTypeConfig[req.leave_type].badgeVariant as any}>
                          {leaveTypeConfig[req.leave_type].label}
                        </Badge>
                        <span className="text-xs text-brand-grey-500">
                          {formatDateRange(req.dates)} · {req.total_days} {req.total_days === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      {req.cancellation_reason && <p className="text-xs text-brand-grey-400 mt-1">Reason: {req.cancellation_reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleRejectCancellation(req)}>
                      Deny
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleApproveCancellation(req)} leftIcon={<Check className="h-4 w-4" />}>
                      Cancel Leave
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* No pending */}
        {pendingRequests.length === 0 && cancellationRequests.length === 0 && (
          <Card>
            <EmptyState
              icon={<CalendarDays className="h-12 w-12" />}
              title="All Caught Up"
              description="No leave requests pending approval"
            />
          </Card>
        )}

        {/* Recent History */}
        {recentRequests.length > 0 && (
          <Card>
            <div className="p-4 border-b border-brand-grey-200">
              <h3 className="font-semibold text-brand-slate-900">Recent History</h3>
            </div>
            <div className="divide-y divide-brand-grey-100">
              {recentRequests.map(req => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={req.consultant ? `${req.consultant.first_name} ${req.consultant.last_name}` : 'Unknown'} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-brand-slate-900">
                        {req.consultant ? `${req.consultant.first_name} ${req.consultant.last_name}` : 'Unknown'}
                      </p>
                      <p className="text-xs text-brand-grey-500">
                        {leaveTypeConfig[req.leave_type].label} · {formatDateRange(req.dates)} · {req.total_days} days
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusConfig[req.status]?.variant as any}>
                    {statusConfig[req.status]?.label}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Approval Modal */}
      <Modal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} title="Review Leave Request" size="md">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selectedRequest.consultant ? `${selectedRequest.consultant.first_name} ${selectedRequest.consultant.last_name}` : 'Unknown'} size="lg" />
              <div>
                <p className="font-semibold text-brand-slate-900">
                  {selectedRequest.consultant ? `${selectedRequest.consultant.first_name} ${selectedRequest.consultant.last_name}` : 'Unknown'}
                </p>
                <Badge variant={leaveTypeConfig[selectedRequest.leave_type].badgeVariant as any}>
                  {leaveTypeConfig[selectedRequest.leave_type].label}
                </Badge>
              </div>
            </div>
            
            <div className="bg-brand-grey-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brand-grey-500">Dates</span>
                <span className="font-medium text-brand-slate-900">{formatDateRange(selectedRequest.dates)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-grey-500">Duration</span>
                <span className="font-medium text-brand-slate-900">{selectedRequest.total_days} {selectedRequest.total_days === 1 ? 'day' : 'days'}</span>
              </div>
              {selectedRequest.notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-grey-500">Notes</span>
                  <span className="text-brand-slate-900">{selectedRequest.notes}</span>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">Rejection Reason (required if rejecting)</label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason..."
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsApprovalModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleReject} isLoading={isSaving}>Reject</Button>
              <Button variant="success" onClick={handleApprove} leftIcon={<Check className="h-4 w-4" />} isLoading={isSaving}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
