import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp,
  Plus,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  ChevronRight,
  Clock,
  UserCheck,
  Target,
  Building2,
  Award,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Avatar } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  requirementsService,
  interviewsService, 
  offersService,
  approvalRequestsService,
  consultantsService,
  type DbApprovalRequest,
  type DbOffer,
  type DbRequirement,
  type DbInterview,
  type DbConsultant,
  type SalaryIncreaseData,
  type BonusPaymentData,
  type EmployeeExitData,
} from '@/lib/services';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { supabase } from '@/lib/supabase';

// Get current semester range
function getSemesterRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  if (month < 6) {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 5, 30),
      label: `H1 ${year} (Jan-Jun)`
    };
  } else {
    return {
      start: new Date(year, 6, 1),
      end: new Date(year, 11, 31),
      label: `H2 ${year} (Jul-Dec)`
    };
  }
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate weeks for semester
function getSemesterWeeks(): { week: number; label: string; start: Date }[] {
  const { start, end } = getSemesterRange();
  const weeks: { week: number; label: string; start: Date }[] = [];
  
  const current = new Date(start);
  current.setDate(current.getDate() - current.getDay() + 1);
  
  while (current <= end) {
    const weekNum = getWeekNumber(current);
    weeks.push({
      week: weekNum,
      label: `W${weekNum}`,
      start: new Date(current)
    });
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
}

// Visual Funnel Component - Simple rounded bars
function InterviewFunnel({ data }: { 
  data: { 
    phone: number; 
    technical: number; 
    director: number; 
    signed: number;
    conversions: {
      phoneToTech: number;
      techToDirector: number;
      directorToSigned: number;
    }
  } 
}) {
  const stages = [
    { label: 'Phone', value: data.phone, colour: '#06b6d4', conversion: data.conversions.phoneToTech },
    { label: 'Technical', value: data.technical, colour: '#0891b2', conversion: data.conversions.techToDirector },
    { label: 'Director', value: data.director, colour: '#0e7490', conversion: data.conversions.directorToSigned },
    { label: 'Signed', value: data.signed, colour: '#134e4a' },
  ];
  
  const maxValue = Math.max(...stages.map(s => s.value), 1);
  
  return (
    <div className="space-y-3 py-2">
      {stages.map((stage, idx) => {
        const widthPercent = Math.max((stage.value / maxValue) * 100, 15);
        
        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-center gap-3">
              <div 
                className="h-8 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: stage.colour,
                  minWidth: '80px'
                }}
              >
                {stage.label}: {stage.value}
              </div>
            </div>
            {stage.conversion !== undefined && (
              <div className="text-xs text-brand-grey-500 pl-2">
                ↓ {stage.conversion}% conversion
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Weekly Bar Chart Component
function WeeklyChart({ 
  data, 
  title, 
  colour = '#06b6d4' 
}: { 
  data: { week: string; value: number }[]; 
  title: string;
  colour?: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const currentWeek = getWeekNumber(new Date());
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-brand-slate-700">{title}</h4>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((item, idx) => {
          const height = (item.value / maxValue) * 100;
          const weekNum = parseInt(item.week.replace('W', ''));
          const isCurrent = weekNum === currentWeek;
          
          return (
            <div 
              key={idx} 
              className="flex-1 flex flex-col items-center"
              title={`${item.week}: ${item.value}`}
            >
              <span className="text-[8px] text-brand-grey-500 mb-0.5">{item.value > 0 ? item.value : ''}</span>
              <div 
                className={`w-full rounded-t transition-all ${isCurrent ? 'ring-2 ring-amber-400' : ''}`}
                style={{ 
                  height: `${Math.max(height, 2)}%`,
                  backgroundColor: item.value > 0 ? colour : '#f3f4f6',
                  minHeight: '2px'
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5">
        {data.map((item, idx) => {
          const weekNum = parseInt(item.week.replace('W', ''));
          const isCurrent = weekNum === currentWeek;
          return (
            <div key={idx} className="flex-1 text-center">
              <span className={`text-[7px] ${isCurrent ? 'text-amber-600 font-bold' : 'text-brand-grey-400'}`}>
                {item.week}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Stat Card
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  colour = 'cyan',
  onClick,
}: { 
  title: string; 
  value: number | string; 
  icon: any;
  colour?: 'cyan' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
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
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${colours[colour]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-brand-slate-900">{value}</p>
          <p className="text-xs text-brand-grey-400">{title}</p>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Data
  const [requirements, setRequirements] = useState<DbRequirement[]>([]);
  const [interviews, setInterviews] = useState<DbInterview[]>([]);
  const [consultants, setConsultants] = useState<DbConsultant[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  
  // Director specific
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<DbApprovalRequest[]>([]);
  const [pendingOffers, setPendingOffers] = useState<DbOffer[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  const semesterRange = getSemesterRange();
  const semesterWeeks = getSemesterWeeks();

  useEffect(() => {
    loadDashboardData();
  }, [selectedManagerId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const isDirectorView = permissions.isDirector || permissions.isAdmin;
      const targetManagerId = selectedManagerId || (isDirectorView ? null : user?.id);
      
      // Load requirements
      let reqQuery = supabase.from('requirements').select('*');
      if (targetManagerId) {
        reqQuery = reqQuery.eq('manager_id', targetManagerId);
      }
      const { data: reqData } = await reqQuery;
      setRequirements(reqData || []);
      
      // Load interviews
      let intQuery = supabase.from('interviews').select('*');
      if (targetManagerId) {
        intQuery = intQuery.eq('interviewer_id', targetManagerId);
      }
      const { data: intData } = await intQuery;
      setInterviews(intData || []);
      
      // Load consultants
      const { data: consData } = await supabase
        .from('consultants')
        .select('*')
        .is('deleted_at', null);
      setConsultants(consData || []);
      
      // Load customer meetings
      let meetQuery = supabase.from('customer_meetings').select('*');
      if (targetManagerId) {
        meetQuery = meetQuery.eq('created_by', targetManagerId);
      }
      const { data: meetData } = await meetQuery;
      setMeetings(meetData || []);
      
      // Load managers for director view
      if (isDirectorView && !selectedManagerId) {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .contains('roles', ['manager']);
        setManagers(usersData || []);
        
        const [approvals, offers] = await Promise.all([
          approvalRequestsService.getPendingForDirector(),
          offersService.getPendingApprovals(user!.id),
        ]);
        setPendingApprovals(approvals);
        setPendingOffers(offers);
      }
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const semesterStart = semesterRange.start.toISOString();
    const semesterEnd = semesterRange.end.toISOString();
    
    const semesterInterviews = interviews.filter(i => 
      i.scheduled_at && i.scheduled_at >= semesterStart.split('T')[0] && 
      i.scheduled_at <= semesterEnd.split('T')[0]
    );
    
    const semesterMeetings = meetings.filter(m => 
      m.meeting_date >= semesterStart.split('T')[0] && 
      m.meeting_date <= semesterEnd.split('T')[0]
    );
    
    const interviewCounts = {
      phone: semesterInterviews.filter(i => i.stage === 'phone_qualification').length,
      technical: semesterInterviews.filter(i => i.stage === 'technical_interview').length,
      director: semesterInterviews.filter(i => i.stage === 'director_interview').length,
      signed: 0, // TODO: count from signed offers
    };
    
    const passedPhone = semesterInterviews.filter(i => i.stage === 'phone_qualification' && i.outcome === 'pass').length;
    const passedTech = semesterInterviews.filter(i => i.stage === 'technical_interview' && i.outcome === 'pass').length;
    const passedDirector = semesterInterviews.filter(i => i.stage === 'director_interview' && i.outcome === 'pass').length;
    
    const conversions = {
      phoneToTech: interviewCounts.phone > 0 ? Math.round((passedPhone / interviewCounts.phone) * 100) : 0,
      techToDirector: interviewCounts.technical > 0 ? Math.round((passedTech / interviewCounts.technical) * 100) : 0,
      directorToSigned: interviewCounts.director > 0 ? Math.round((passedDirector / interviewCounts.director) * 100) : 0,
    };
    
    const interviewsByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const count = semesterInterviews.filter(i => {
        if (!i.scheduled_at) return false;
        const d = new Date(i.scheduled_at);
        return d >= w.start && d <= weekEnd;
      }).length;
      return { week: w.label, value: count };
    });
    
    const meetingsByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const count = semesterMeetings.filter(m => {
        const d = new Date(m.meeting_date);
        return d >= w.start && d <= weekEnd;
      }).length;
      return { week: w.label, value: count };
    });
    
    // Filter out soft-deleted requirements
    const nonDeletedRequirements = requirements.filter(r => !r.deleted_at);
    const activeRequirements = nonDeletedRequirements.filter(r => 
      r.status === 'active' || r.status === 'opportunity'
    );
    const wonRequirements = nonDeletedRequirements.filter(r => r.status === 'won' || r.status === 'filled');
    const lostRequirements = nonDeletedRequirements.filter(r => r.status === 'lost');
    
    const activeConsultants = consultants.filter(c => c.status === 'in_mission').length;
    const benchConsultants = consultants.filter(c => c.status === 'bench').length;
    
    return {
      interviewCounts,
      conversions,
      interviewsByWeek,
      meetingsByWeek,
      activeRequirements,
      wonRequirements,
      lostRequirements,
      totalInterviews: semesterInterviews.length,
      totalMeetings: semesterMeetings.length,
      activeConsultants,
      benchConsultants,
    };
  }, [interviews, meetings, requirements, consultants, semesterRange, semesterWeeks]);

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

  const isDirectorView = (permissions.isDirector || permissions.isAdmin) && !selectedManagerId;
  const totalPendingApprovals = pendingApprovals.length + pendingOffers.length;

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'}`}
        subtitle={
          selectedManagerId 
            ? `Viewing: ${managers.find(m => m.id === selectedManagerId)?.full_name || 'Manager'}`
            : `${semesterRange.label} Performance`
        }
        actions={
          selectedManagerId ? (
            <Button variant="ghost" onClick={() => setSelectedManagerId(null)}>
              ← Back to Overview
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <Card>
            <div className="text-center py-12 text-brand-grey-400">Loading dashboard...</div>
          </Card>
        ) : (
          <>
            {/* Director Only: Pending Approvals */}
            {isDirectorView && totalPendingApprovals > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-amber-800">Pending Approvals ({totalPendingApprovals})</CardTitle>
                  </div>
                </CardHeader>
                <div className="space-y-2 max-h-48 overflow-y-auto">
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
                          <p className="text-sm font-medium text-brand-slate-900">
                            {request.request_type === 'salary_increase' && `Salary: £${(request.request_data as SalaryIncreaseData).new_salary.toLocaleString()}`}
                            {request.request_type === 'bonus_payment' && `Bonus: £${(request.request_data as BonusPaymentData).amount.toLocaleString()}`}
                            {request.request_type === 'employee_exit' && `Exit: ${(request.request_data as EmployeeExitData).exit_reason}`}
                          </p>
                          <p className="text-xs text-brand-grey-500">{request.consultant?.first_name} {request.consultant?.last_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="success" size="sm" onClick={() => handleApproveRequest(request.id)} isLoading={processingApproval === request.id}>Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleRejectRequest(request.id)} isLoading={processingApproval === request.id}>Reject</Button>
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
                          <p className="text-sm font-medium text-brand-slate-900">Contract: {offer.job_title}</p>
                          <p className="text-xs text-brand-grey-500">{offer.candidate?.first_name} {offer.candidate?.last_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="success" size="sm" onClick={() => handleApproveOffer(offer.id)} isLoading={processingApproval === offer.id}>Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleRejectOffer(offer.id)} isLoading={processingApproval === offer.id}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Director Only: Manager Cards */}
            {isDirectorView && managers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Managers</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {managers.map(manager => (
                    <div 
                      key={manager.id}
                      className="p-3 border border-brand-grey-200 rounded-lg hover:shadow-md hover:border-brand-cyan cursor-pointer transition-all flex items-center gap-3"
                      onClick={() => setSelectedManagerId(manager.id)}
                    >
                      <Avatar name={manager.full_name || manager.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-slate-900 truncate">{manager.full_name || manager.email}</p>
                        <p className="text-xs text-brand-grey-500">View dashboard</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-brand-grey-400" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard title="Active Requirements" value={stats.activeRequirements.length} icon={Target} colour="cyan" onClick={() => navigate('/requirements')} />
              <StatCard title="Won" value={stats.wonRequirements.length} icon={CheckCircle} colour="green" />
              <StatCard title="Lost" value={stats.lostRequirements.length} icon={XCircle} colour="red" />
              <StatCard title="Interviews" value={stats.totalInterviews} icon={Calendar} colour="purple" />
              <StatCard title="Active Consultants" value={stats.activeConsultants} icon={UserCheck} colour="green" />
              <StatCard title="On Bench" value={stats.benchConsultants} icon={Clock} colour="amber" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Requirements List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Requirements ({stats.activeRequirements.length})</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/requirements')}>View All</Button>
                  </div>
                </CardHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {stats.activeRequirements.length > 0 ? (
                    stats.activeRequirements.slice(0, 10).map(req => (
                      <div 
                        key={req.id} 
                        className="p-3 border border-brand-grey-200 rounded-lg hover:bg-brand-grey-50 cursor-pointer"
                        onClick={() => navigate(`/requirements/${req.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-brand-slate-900 truncate">{req.title || req.reference_id}</span>
                          <Badge variant={req.status === 'active' ? 'green' : 'amber'} className="text-xs">{req.status}</Badge>
                        </div>
                        <p className="text-xs text-brand-grey-500">{req.reference_id}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-brand-grey-400 text-center py-4">No active requirements</p>
                  )}
                </div>
              </Card>

              {/* Middle Column: Charts */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Activity This Semester</CardTitle>
                </CardHeader>
                <div className="space-y-6">
                  <WeeklyChart 
                    data={stats.interviewsByWeek} 
                    title="Interviews per Week" 
                    colour="#06b6d4"
                  />
                  <WeeklyChart 
                    data={stats.meetingsByWeek} 
                    title="Customer Meetings per Week" 
                    colour="#8b5cf6"
                  />
                </div>
              </Card>

              {/* Right Column: Funnel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Interview Funnel</CardTitle>
                </CardHeader>
                <InterviewFunnel 
                  data={{
                    ...stats.interviewCounts,
                    conversions: stats.conversions,
                  }}
                />
              </Card>
            </div>

            {/* Quick Actions */}
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
    </div>
  );
}
