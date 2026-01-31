import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Star,
  Target,
  Building2,
  Clock,
  Award,
  ChevronRight,
  Ticket,
  Play,
  UserCheck,
  Filter,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Select, Modal, Textarea } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  candidatesService, 
  requirementsService, 
  interviewsService, 
  offersService,
  approvalRequestsService,
  hrTicketsService,
  dashboardStatsService,
  consultantsService,
  type DbApprovalRequest,
  type DbOffer,
  type DbHrTicket,
  type SalaryIncreaseData,
  type BonusPaymentData,
  type EmployeeExitData,
} from '@/lib/services';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';

// Period options for filtering
const periodOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'semester', label: 'This Semester' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

function getDateRange(period: string): { from: string; to: string } | null {
  const now = new Date();
  const to = now.toISOString();
  
  switch (period) {
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      return { from: weekStart.toISOString(), to };
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: monthStart.toISOString(), to };
    case 'semester':
      const semesterMonth = now.getMonth() < 6 ? 0 : 6;
      const semesterStart = new Date(now.getFullYear(), semesterMonth, 1);
      return { from: semesterStart.toISOString(), to };
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { from: yearStart.toISOString(), to };
    default:
      return null;
  }
}

// Simple bar chart component
function BarChart({ data, title }: { data: { label: string; value: number }[]; title: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-brand-slate-700">{title}</h4>
      <div className="space-y-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-brand-grey-500 w-12">{item.label}</span>
            <div className="flex-1 h-4 bg-brand-grey-100 rounded overflow-hidden">
              <div 
                className="h-full bg-brand-cyan rounded transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-brand-slate-700 w-8 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Funnel chart component
function FunnelChart({ stages }: { stages: { label: string; value: number; conversion?: number }[] }) {
  const maxValue = Math.max(...stages.map(s => s.value), 1);
  
  return (
    <div className="space-y-2">
      {stages.map((stage, idx) => (
        <div key={idx} className="relative">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 bg-gradient-to-r from-brand-cyan to-brand-cyan/60 rounded flex items-center justify-between px-3 transition-all"
              style={{ width: `${Math.max((stage.value / maxValue) * 100, 30)}%` }}
            >
              <span className="text-sm font-medium text-white">{stage.label}</span>
              <span className="text-sm font-bold text-white">{stage.value}</span>
            </div>
            {stage.conversion !== undefined && (
              <span className="text-xs text-brand-grey-500">{stage.conversion}% →</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Stat card with trend
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  onClick,
  colour = 'cyan'
}: { 
  title: string; 
  value: number | string; 
  icon: any; 
  trend?: number;
  onClick?: () => void;
  colour?: 'cyan' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colours = {
    cyan: 'bg-brand-cyan/10 text-brand-cyan',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colours[colour]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-brand-slate-900">{value}</p>
          <p className="text-sm text-brand-grey-400">{title}</p>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// Gauge/Progress component
function Gauge({ value, max, label, colour = 'cyan' }: { value: number; max: number; label: string; colour?: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            className="text-brand-grey-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="32"
            cx="40"
            cy="40"
          />
          <circle
            className="text-brand-cyan"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="32"
            cx="40"
            cy="40"
            strokeDasharray={`${percentage * 2.01} 999`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-brand-slate-900">{value}</span>
        </div>
      </div>
      <p className="text-xs text-brand-grey-500 mt-1">{label}</p>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const toast = useToast();
  
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  
  // Manager stats
  const [managerStats, setManagerStats] = useState<any>(null);
  
  // Recruiter stats
  const [recruiterStats, setRecruiterStats] = useState<any>(null);
  
  // Director stats
  const [directorStats, setDirectorStats] = useState<any>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  
  // HR tickets
  const [hrTickets, setHrTickets] = useState<DbHrTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<DbHrTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Approvals
  const [pendingApprovals, setPendingApprovals] = useState<DbApprovalRequest[]>([]);
  const [pendingOffers, setPendingOffers] = useState<DbOffer[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [period, selectedManagerId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const dateRange = getDateRange(period);
      
      // Load based on role
      if (permissions.isManager && !permissions.isDirector) {
        const stats = await dashboardStatsService.getManagerStats(
          user!.id,
          dateRange?.from,
          dateRange?.to
        );
        setManagerStats(stats);
      }
      
      if (permissions.isRecruiter && !permissions.isManager && !permissions.isDirector) {
        const stats = await dashboardStatsService.getRecruiterStats(
          user!.id,
          dateRange?.from,
          dateRange?.to
        );
        setRecruiterStats(stats);
      }
      
      if (permissions.isDirector || permissions.isAdmin) {
        const stats = await dashboardStatsService.getDirectorStats(user!.id);
        setDirectorStats(stats);
        
        // If viewing a specific manager
        if (selectedManagerId) {
          const mgrStats = await dashboardStatsService.getManagerStats(
            selectedManagerId,
            dateRange?.from,
            dateRange?.to
          );
          setManagerStats(mgrStats);
        }
        
        // Load approvals
        const [approvals, offers] = await Promise.all([
          approvalRequestsService.getPendingForDirector(),
          offersService.getPendingApprovals(user!.id),
        ]);
        setPendingApprovals(approvals);
        setPendingOffers(offers);
      }
      
      // HR users see tickets
      if (permissions.isHR || permissions.isAdmin) {
        const tickets = await hrTicketsService.getPending();
        setHrTickets(tickets);
      }
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Approval handlers
  const handleApproveRequest = async (requestId: string) => {
    setProcessingApproval(requestId);
    try {
      await approvalRequestsService.directorApprove(requestId, user!.id);
      toast.success('Approved', 'Request has been approved');
      loadDashboardData();
    } catch (error) {
      toast.error('Error', 'Failed to approve request');
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setProcessingApproval(requestId);
    try {
      await approvalRequestsService.reject(requestId, user!.id, reason, 'director');
      toast.success('Rejected', 'Request has been rejected');
      loadDashboardData();
    } catch (error) {
      toast.error('Error', 'Failed to reject request');
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleApproveOffer = async (offerId: string) => {
    setProcessingApproval(offerId);
    try {
      await offersService.approve(offerId, user!.id);
      toast.success('Approved', 'Offer has been approved');
      loadDashboardData();
    } catch (error) {
      toast.error('Error', 'Failed to approve offer');
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setProcessingApproval(offerId);
    try {
      await offersService.reject(offerId, reason);
      toast.success('Rejected', 'Offer has been rejected');
      loadDashboardData();
    } catch (error) {
      toast.error('Error', 'Failed to reject offer');
    } finally {
      setProcessingApproval(null);
    }
  };

  // HR Ticket handlers
  const handleStartTicket = async (ticket: DbHrTicket) => {
    try {
      await hrTicketsService.startWork(ticket.id);
      toast.success('Started', 'Ticket marked as in progress');
      loadDashboardData();
    } catch (error) {
      toast.error('Error', 'Failed to update ticket');
    }
  };

  const handleCompleteTicket = async () => {
    if (!selectedTicket) return;
    
    setIsProcessing(true);
    try {
      await hrTicketsService.complete(selectedTicket.id, user!.id, completionNotes);
      toast.success('Completed', 'Ticket has been completed and system updated');
      setIsTicketModalOpen(false);
      setSelectedTicket(null);
      setCompletionNotes('');
      loadDashboardData();
    } catch (error) {
      toast.error('Error', 'Failed to complete ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const ticketTypeLabels: Record<string, string> = {
    contract_send: 'Send Contract',
    contract_signed: 'Process Signed Contract',
    salary_increase: 'Implement Salary Increase',
    bonus_payment: 'Process Bonus Payment',
    employee_exit: 'Process Employee Exit',
  };

  const ticketPriorityColours: Record<string, string> = {
    low: 'bg-brand-grey-100 text-brand-grey-600',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  };

  // Determine which dashboard to show
  const showManagerDashboard = permissions.isManager || (permissions.isDirector && selectedManagerId);
  const showRecruiterDashboard = permissions.isRecruiter && !permissions.isManager && !permissions.isDirector;
  const showDirectorDashboard = (permissions.isDirector || permissions.isAdmin) && !selectedManagerId;
  const showHRDashboard = permissions.isHR || permissions.isAdmin;

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'}`}
        subtitle={
          selectedManagerId && directorStats
            ? `Viewing: ${directorStats.managers.find((m: any) => m.id === selectedManagerId)?.name}`
            : 'Your performance cockpit'
        }
        actions={
          selectedManagerId && (
            <Button variant="ghost" onClick={() => setSelectedManagerId(null)}>
              ← Back to Overview
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Period Filter */}
        {(showManagerDashboard || showRecruiterDashboard) && (
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-brand-grey-400" />
            <Select
              options={periodOptions}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-40"
            />
          </div>
        )}

        {isLoading ? (
          <Card>
            <div className="text-center py-12 text-brand-grey-400">Loading dashboard...</div>
          </Card>
        ) : (
          <>
            {/* ============================================ */}
            {/* DIRECTOR OVERVIEW */}
            {/* ============================================ */}
            {showDirectorDashboard && directorStats && (
              <>
                {/* Pending Approvals */}
                {(pendingApprovals.length > 0 || pendingOffers.length > 0) && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-amber-800">
                          Pending Approvals ({pendingApprovals.length + pendingOffers.length})
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {pendingApprovals.map(request => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              request.request_type === 'salary_increase' ? 'bg-green-100' :
                              request.request_type === 'bonus_payment' ? 'bg-purple-100' : 'bg-red-100'
                            }`}>
                              {request.request_type === 'salary_increase' && <TrendingUp className="h-4 w-4 text-green-600" />}
                              {request.request_type === 'bonus_payment' && <Award className="h-4 w-4 text-purple-600" />}
                              {request.request_type === 'employee_exit' && <AlertCircle className="h-4 w-4 text-red-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-brand-slate-900">
                                {request.request_type === 'salary_increase' && `Salary: £${(request.request_data as SalaryIncreaseData).new_salary.toLocaleString()}`}
                                {request.request_type === 'bonus_payment' && `Bonus: £${(request.request_data as BonusPaymentData).amount.toLocaleString()}`}
                                {request.request_type === 'employee_exit' && `Exit: ${(request.request_data as EmployeeExitData).exit_reason}`}
                              </p>
                              <p className="text-sm text-brand-grey-500">
                                {request.consultant?.first_name} {request.consultant?.last_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="success" size="sm" leftIcon={<CheckCircle className="h-4 w-4" />} onClick={() => handleApproveRequest(request.id)} isLoading={processingApproval === request.id}>Approve</Button>
                            <Button variant="danger" size="sm" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => handleRejectRequest(request.id)} isLoading={processingApproval === request.id}>Reject</Button>
                          </div>
                        </div>
                      ))}
                      {pendingOffers.map(offer => (
                        <div key={offer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-100">
                              <FileText className="h-4 w-4 text-cyan-600" />
                            </div>
                            <div>
                              <p className="font-medium text-brand-slate-900">Contract: {offer.job_title}</p>
                              <p className="text-sm text-brand-grey-500">{offer.candidate?.first_name} {offer.candidate?.last_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="success" size="sm" leftIcon={<CheckCircle className="h-4 w-4" />} onClick={() => handleApproveOffer(offer.id)} isLoading={processingApproval === offer.id}>Approve</Button>
                            <Button variant="danger" size="sm" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => handleRejectOffer(offer.id)} isLoading={processingApproval === offer.id}>Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Business Unit Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard title="Total Interviews" value={directorStats.totals.interviews} icon={Calendar} colour="cyan" />
                  <StatCard title="Active Consultants" value={directorStats.totals.consultantsActive} icon={UserCheck} colour="green" />
                  <StatCard title="On Bench" value={directorStats.totals.consultantsBench} icon={Clock} colour="amber" />
                  <StatCard title="Pending Approvals" value={directorStats.pendingApprovals} icon={AlertCircle} colour="red" />
                </div>

                {/* Manager Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Manager Performance</CardTitle>
                  </CardHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {directorStats.managers.map((manager: any) => (
                      <div 
                        key={manager.id}
                        className="p-4 border border-brand-grey-200 rounded-lg hover:shadow-md cursor-pointer transition-all"
                        onClick={() => setSelectedManagerId(manager.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={manager.name} size="sm" />
                            <div>
                              <p className="font-medium text-brand-slate-900">{manager.name}</p>
                              <p className="text-xs text-brand-grey-500">Manager</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-brand-grey-400" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold text-brand-slate-900">{manager.interviews}</p>
                            <p className="text-xs text-brand-grey-500">Interviews</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-green-600">{manager.conversions}%</p>
                            <p className="text-xs text-brand-grey-500">Conversion</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-brand-cyan">{manager.consultantsActive}</p>
                            <p className="text-xs text-brand-grey-500">Active</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* ============================================ */}
            {/* MANAGER DASHBOARD */}
            {/* ============================================ */}
            {showManagerDashboard && managerStats && (
              <>
                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <StatCard title="Phone Interviews" value={managerStats.interviews.phone} icon={Calendar} colour="cyan" />
                  <StatCard title="Technical" value={managerStats.interviews.technical} icon={Target} colour="purple" />
                  <StatCard title="Director" value={managerStats.interviews.director} icon={Users} colour="amber" />
                  <StatCard title="Customer" value={managerStats.interviews.customer} icon={Building2} colour="green" />
                  <StatCard title="Active Consultants" value={managerStats.consultantsActive} icon={UserCheck} colour="green" />
                  <StatCard title="On Bench" value={managerStats.consultantsBench} icon={Clock} colour="amber" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Interview Funnel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Interview Funnel</CardTitle>
                    </CardHeader>
                    <FunnelChart stages={[
                      { label: 'Phone Qualification', value: managerStats.interviews.phone, conversion: managerStats.conversions.phoneToTech },
                      { label: 'Technical Interview', value: managerStats.interviews.technical, conversion: managerStats.conversions.techToDirector },
                      { label: 'Director Interview', value: managerStats.interviews.director, conversion: managerStats.conversions.directorToCustomer },
                      { label: 'Customer Assessment', value: managerStats.interviews.customer, conversion: managerStats.conversions.customerToSigned },
                      { label: 'Signed', value: Math.round(managerStats.interviews.customer * managerStats.conversions.customerToSigned / 100) },
                    ]} />
                  </Card>

                  {/* Conversion Rates */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversion Rates</CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <Gauge value={managerStats.conversions.phoneToTech} max={100} label="Phone → Tech" />
                      <Gauge value={managerStats.conversions.techToDirector} max={100} label="Tech → Director" />
                      <Gauge value={managerStats.conversions.directorToCustomer} max={100} label="Director → Customer" />
                      <Gauge value={managerStats.conversions.customerToSigned} max={100} label="Customer → Signed" />
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Weekly Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Interviews</CardTitle>
                    </CardHeader>
                    <BarChart 
                      data={managerStats.weeklyInterviews.map((w: any) => ({ label: w.week, value: w.count }))}
                      title=""
                    />
                  </Card>

                  {/* Other Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Summary</CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-brand-grey-600">Customer Meetings</span>
                        <span className="text-xl font-bold text-brand-slate-900">{managerStats.customerMeetings}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                        <span className="text-brand-grey-600">New Customers Added</span>
                        <span className="text-xl font-bold text-brand-slate-900">{managerStats.newCustomers}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-green-600">Requirements Won</span>
                        <span className="text-xl font-bold text-green-700">{managerStats.requirementsWon}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-red-600">Requirements Lost</span>
                        <span className="text-xl font-bold text-red-700">{managerStats.requirementsLost}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* ============================================ */}
            {/* RECRUITER DASHBOARD */}
            {/* ============================================ */}
            {showRecruiterDashboard && recruiterStats && (
              <>
                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Candidates Added" value={recruiterStats.candidatesAdded} icon={Users} colour="cyan" />
                  <StatCard title="This Week" value={recruiterStats.candidatesThisWeek} icon={TrendingUp} colour="green" />
                  <StatCard title="Offers Generated" value={recruiterStats.offersGenerated} icon={FileText} colour="purple" />
                  <StatCard title="Contracts Signed" value={recruiterStats.offersSigned} icon={CheckCircle} colour="green" />
                </div>

                {/* Quality Score */}
                <Card>
                  <CardHeader>
                    <CardTitle>Candidate Quality Score</CardTitle>
                  </CardHeader>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          className={`h-8 w-8 ${star <= Math.round(recruiterStats.averageQuality) ? 'text-amber-400 fill-amber-400' : 'text-brand-grey-200'}`} 
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-brand-slate-900">{recruiterStats.averageQuality}</p>
                      <p className="text-sm text-brand-grey-500">Average across all candidates</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Interview Funnel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Candidates&apos; Interview Funnel</CardTitle>
                    </CardHeader>
                    <FunnelChart stages={[
                      { label: 'Phone Qualification', value: recruiterStats.interviews.phone, conversion: recruiterStats.conversions.phoneToTech },
                      { label: 'Technical Interview', value: recruiterStats.interviews.technical, conversion: recruiterStats.conversions.techToDirector },
                      { label: 'Director Interview', value: recruiterStats.interviews.director, conversion: recruiterStats.conversions.directorToOffer },
                      { label: 'Offers Made', value: recruiterStats.offersGenerated },
                    ]} />
                  </Card>

                  {/* Weekly Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Candidates Added</CardTitle>
                    </CardHeader>
                    <BarChart 
                      data={recruiterStats.weeklyCandidates.map((w: any) => ({ label: w.week, value: w.count }))}
                      title=""
                    />
                  </Card>
                </div>
              </>
            )}

            {/* ============================================ */}
            {/* HR TICKET SYSTEM */}
            {/* ============================================ */}
            {showHRDashboard && hrTickets.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-brand-cyan" />
                    <CardTitle>HR Action Items ({hrTickets.length})</CardTitle>
                  </div>
                </CardHeader>
                <div className="space-y-3">
                  {hrTickets.map(ticket => (
                    <div 
                      key={ticket.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        ticket.status === 'in_progress' ? 'bg-blue-50 border-blue-200' : 'bg-white border-brand-grey-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          ticket.ticket_type === 'employee_exit' ? 'bg-red-100' :
                          ticket.ticket_type === 'salary_increase' ? 'bg-green-100' :
                          ticket.ticket_type === 'bonus_payment' ? 'bg-purple-100' :
                          'bg-cyan-100'
                        }`}>
                          {ticket.ticket_type === 'employee_exit' && <AlertCircle className="h-5 w-5 text-red-600" />}
                          {ticket.ticket_type === 'salary_increase' && <TrendingUp className="h-5 w-5 text-green-600" />}
                          {ticket.ticket_type === 'bonus_payment' && <Award className="h-5 w-5 text-purple-600" />}
                          {(ticket.ticket_type === 'contract_send' || ticket.ticket_type === 'contract_signed') && <FileText className="h-5 w-5 text-cyan-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-brand-slate-900">{ticketTypeLabels[ticket.ticket_type]}</p>
                            <Badge className={ticketPriorityColours[ticket.priority]}>{ticket.priority}</Badge>
                            {ticket.status === 'in_progress' && <Badge variant="blue">In Progress</Badge>}
                          </div>
                          <p className="text-sm text-brand-grey-500">
                            {ticket.consultant?.first_name} {ticket.consultant?.last_name} ({ticket.consultant?.reference_id})
                          </p>
                          {ticket.ticket_data && (
                            <p className="text-xs text-brand-grey-400 mt-1">
                              {ticket.ticket_type === 'salary_increase' && `New salary: £${ticket.ticket_data.new_salary?.toLocaleString()} from ${ticket.ticket_data.effective_date}`}
                              {ticket.ticket_type === 'bonus_payment' && `Amount: £${ticket.ticket_data.amount?.toLocaleString()} - ${ticket.ticket_data.bonus_type}`}
                              {ticket.ticket_type === 'employee_exit' && `Reason: ${ticket.ticket_data.exit_reason} - Last day: ${ticket.ticket_data.last_working_day}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.status === 'pending' && (
                          <Button variant="secondary" size="sm" leftIcon={<Play className="h-4 w-4" />} onClick={() => handleStartTicket(ticket)}>
                            Start
                          </Button>
                        )}
                        <Button 
                          variant="success" 
                          size="sm" 
                          leftIcon={<CheckCircle className="h-4 w-4" />}
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsTicketModalOpen(true);
                          }}
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Actions - For all roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-800">Add New Candidate</h3>
                    <p className="text-sm text-green-600">Start building your talent pipeline</p>
                  </div>
                  <Button variant="success" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/candidates')}>
                    Add Candidate
                  </Button>
                </div>
              </Card>
              <Card className="bg-cyan-50 border-cyan-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-cyan-800">Create Requirement</h3>
                    <p className="text-sm text-cyan-600">Define a new customer need</p>
                  </div>
                  <Button variant="accent" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/requirements')}>
                    New Requirement
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Complete Ticket Modal */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedTicket(null);
          setCompletionNotes('');
        }}
        title="Complete HR Action"
        size="md"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="p-4 bg-brand-grey-50 rounded-lg">
              <p className="font-medium text-brand-slate-900">{ticketTypeLabels[selectedTicket.ticket_type]}</p>
              <p className="text-sm text-brand-grey-500 mt-1">
                {selectedTicket.consultant?.first_name} {selectedTicket.consultant?.last_name}
              </p>
              {selectedTicket.ticket_data && (
                <div className="mt-2 text-sm">
                  {selectedTicket.ticket_type === 'salary_increase' && (
                    <p>Implement salary change to £{selectedTicket.ticket_data.new_salary?.toLocaleString()} effective {selectedTicket.ticket_data.effective_date}</p>
                  )}
                  {selectedTicket.ticket_type === 'bonus_payment' && (
                    <p>Process bonus payment of £{selectedTicket.ticket_data.amount?.toLocaleString()}</p>
                  )}
                  {selectedTicket.ticket_type === 'employee_exit' && (
                    <>
                      <p>Process exit for: {selectedTicket.ticket_data.exit_reason}</p>
                      <p>Last working day: {selectedTicket.ticket_data.last_working_day}</p>
                      <p className="mt-2 text-brand-grey-500">Required actions: Send exit letter, conduct exit interview, process final pay</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <Textarea
              label="Completion Notes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Document what was done to complete this action..."
              rows={4}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsTicketModalOpen(false)}>Cancel</Button>
              <Button variant="success" onClick={handleCompleteTicket} isLoading={isProcessing}>
                Mark as Complete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
