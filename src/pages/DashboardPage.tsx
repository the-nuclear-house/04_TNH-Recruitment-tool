import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  TrendingUp,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Users,
  Target,
  Award,
  Phone,
  Building2,
  UserCheck,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Avatar } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  approvalRequestsService,
  offersService,
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

// Semester utilities
function getSemesterOptions(): { value: string; label: string; start: Date; end: Date }[] {
  const options: { value: string; label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentHalf = now.getMonth() < 6 ? 1 : 2;
  
  for (let i = 0; i < 6; i++) {
    let year = currentYear;
    let half = currentHalf;
    
    // Go back i semesters
    for (let j = 0; j < i; j++) {
      half--;
      if (half === 0) {
        half = 2;
        year--;
      }
    }
    
    const start = half === 1 ? new Date(year, 0, 1) : new Date(year, 6, 1);
    const end = half === 1 ? new Date(year, 5, 30) : new Date(year, 11, 31);
    
    options.push({
      value: `${year}-H${half}`,
      label: `H${half} ${year}`,
      start,
      end,
    });
  }
  
  return options;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getSemesterWeeks(start: Date, end: Date): { week: number; label: string; start: Date }[] {
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

// Big Number Card
function BigNumberCard({ 
  title, 
  value, 
  icon: Icon, 
  colour,
}: { 
  title: string; 
  value: number; 
  icon: any;
  colour: 'cyan' | 'green' | 'amber';
}) {
  const colours = {
    cyan: 'from-cyan-500 to-cyan-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
  };
  
  const bgColours = {
    cyan: 'bg-cyan-50',
    green: 'bg-green-50',
    amber: 'bg-amber-50',
  };

  return (
    <Card className={`${bgColours[colour]} border-none`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-bold text-brand-slate-900">{value}</p>
          <p className="text-sm text-brand-grey-500 mt-1">{title}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${colours[colour]} text-white`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
}

// Centred Interview Funnel
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
    { label: 'Phone', value: data.phone, colour: '#06b6d4', width: 100 },
    { label: 'Technical', value: data.technical, colour: '#0891b2', width: 80 },
    { label: 'Director', value: data.director, colour: '#0e7490', width: 60 },
    { label: 'Signed', value: data.signed, colour: '#134e4a', width: 40 },
  ];
  
  const conversions = [
    data.conversions.phoneToTech,
    data.conversions.techToDirector,
    data.conversions.directorToSigned,
  ];
  
  return (
    <div className="flex flex-col items-center py-4">
      {stages.map((stage, idx) => (
        <div key={stage.label} className="flex flex-col items-center w-full">
          <div 
            className="flex items-center justify-center py-3 text-white font-semibold text-sm rounded-lg shadow-sm"
            style={{
              width: `${stage.width}%`,
              backgroundColor: stage.colour,
              minHeight: '44px',
            }}
          >
            {stage.label}: {stage.value}
          </div>
          {idx < stages.length - 1 && (
            <div className="text-xs text-brand-grey-500 py-1">
              ↓ {conversions[idx]}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Weekly Bar Chart
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
      <div className="flex items-end gap-0.5 h-20">
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
      <div className="flex gap-0.5 overflow-hidden">
        {data.filter((_, i) => i % 4 === 0).map((item, idx) => (
          <div key={idx} className="flex-1 text-center" style={{ flex: 4 }}>
            <span className="text-[8px] text-brand-grey-400">{item.week}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini Conversion Funnel for Requirements
function MiniConversionFunnel({ 
  meetings, 
  presentations, 
  projects 
}: { 
  meetings: number; 
  presentations: number; 
  projects: number;
}) {
  const meetToPresent = meetings > 0 ? Math.round((presentations / meetings) * 100) : 0;
  const presentToProject = presentations > 0 ? Math.round((projects / presentations) * 100) : 0;
  
  return (
    <div className="bg-brand-grey-50 rounded-lg p-3 mt-3">
      <p className="text-xs font-medium text-brand-grey-600 mb-2">Conversion Rates</p>
      <div className="flex items-center gap-2 text-xs">
        <div className="text-center">
          <p className="font-bold text-brand-slate-900">{meetings}</p>
          <p className="text-brand-grey-400">Meetings</p>
        </div>
        <div className="text-brand-grey-300">→</div>
        <div className="text-center">
          <p className="text-green-600 font-medium">{meetToPresent}%</p>
        </div>
        <div className="text-brand-grey-300">→</div>
        <div className="text-center">
          <p className="font-bold text-brand-slate-900">{presentations}</p>
          <p className="text-brand-grey-400">Presented</p>
        </div>
        <div className="text-brand-grey-300">→</div>
        <div className="text-center">
          <p className="text-green-600 font-medium">{presentToProject}%</p>
        </div>
        <div className="text-brand-grey-300">→</div>
        <div className="text-center">
          <p className="font-bold text-brand-slate-900">{projects}</p>
          <p className="text-brand-grey-400">Won</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  
  // Data
  const [requirements, setRequirements] = useState<DbRequirement[]>([]);
  const [interviews, setInterviews] = useState<DbInterview[]>([]);
  const [consultants, setConsultants] = useState<DbConsultant[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  
  // Director specific
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<DbApprovalRequest[]>([]);
  const [pendingOffers, setPendingOffers] = useState<DbOffer[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  const semesterOptions = useMemo(() => getSemesterOptions(), []);
  
  // Set default semester on load
  useEffect(() => {
    if (semesterOptions.length > 0 && !selectedSemester) {
      setSelectedSemester(semesterOptions[0].value);
    }
  }, [semesterOptions]);

  const currentSemester = useMemo(() => 
    semesterOptions.find(s => s.value === selectedSemester) || semesterOptions[0],
    [selectedSemester, semesterOptions]
  );

  const semesterWeeks = useMemo(() => 
    currentSemester ? getSemesterWeeks(currentSemester.start, currentSemester.end) : [],
    [currentSemester]
  );

  useEffect(() => {
    if (currentSemester) {
      loadDashboardData();
    }
  }, [selectedManagerId, currentSemester]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const isDirectorView = permissions.isDirector || permissions.isAdmin;
      const targetManagerId = selectedManagerId || (isDirectorView ? null : user?.id);
      
      // Load requirements
      let reqQuery = supabase.from('requirements').select('*').is('deleted_at', null);
      if (targetManagerId) {
        reqQuery = reqQuery.eq('manager_id', targetManagerId);
      }
      const { data: reqData } = await reqQuery;
      setRequirements(reqData || []);
      
      // Load interviews
      let intQuery = supabase.from('interviews').select('*').is('deleted_at', null);
      if (targetManagerId) {
        intQuery = intQuery.eq('interviewer_id', targetManagerId);
      }
      const { data: intData } = await intQuery;
      setInterviews(intData || []);
      
      // Load consultants
      let consQuery = supabase.from('consultants').select('*').is('deleted_at', null);
      // TODO: Filter by manager when we have that relationship
      const { data: consData } = await consQuery;
      setConsultants(consData || []);
      
      // Load missions
      let missQuery = supabase.from('missions').select('*').is('deleted_at', null);
      const { data: missData } = await missQuery;
      setMissions(missData || []);
      
      // Load customer meetings
      let meetQuery = supabase.from('customer_meetings').select('*');
      if (targetManagerId) {
        meetQuery = meetQuery.eq('created_by', targetManagerId);
      }
      const { data: meetData } = await meetQuery;
      setMeetings(meetData || []);
      
      // Load customer assessments
      let assessQuery = supabase.from('customer_assessments').select('*');
      const { data: assessData } = await assessQuery;
      setAssessments(assessData || []);
      
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
    if (!currentSemester) return null;
    
    const semesterStart = currentSemester.start.toISOString().split('T')[0];
    const semesterEnd = currentSemester.end.toISOString().split('T')[0];
    
    // Filter to semester
    const semesterInterviews = interviews.filter(i => 
      i.scheduled_at && i.scheduled_at >= semesterStart && i.scheduled_at <= semesterEnd
    );
    
    const semesterMeetings = meetings.filter(m => 
      m.meeting_date >= semesterStart && m.meeting_date <= semesterEnd
    );
    
    const semesterAssessments = assessments.filter(a => 
      a.assessment_date >= semesterStart && a.assessment_date <= semesterEnd
    );
    
    // Interview counts by stage
    const interviewCounts = {
      phone: semesterInterviews.filter(i => i.stage === 'phone_qualification').length,
      technical: semesterInterviews.filter(i => i.stage === 'technical_interview').length,
      director: semesterInterviews.filter(i => i.stage === 'director_interview').length,
      signed: 0,
    };
    
    // Conversions
    const passedPhone = semesterInterviews.filter(i => i.stage === 'phone_qualification' && i.outcome === 'pass').length;
    const passedTech = semesterInterviews.filter(i => i.stage === 'technical_interview' && i.outcome === 'pass').length;
    const passedDirector = semesterInterviews.filter(i => i.stage === 'director_interview' && i.outcome === 'pass').length;
    
    const conversions = {
      phoneToTech: interviewCounts.phone > 0 ? Math.round((passedPhone / interviewCounts.phone) * 100) : 0,
      techToDirector: interviewCounts.technical > 0 ? Math.round((passedTech / interviewCounts.technical) * 100) : 0,
      directorToSigned: interviewCounts.director > 0 ? Math.round((passedDirector / interviewCounts.director) * 100) : 0,
    };
    
    // Weekly data for charts - Phone interviews
    const phoneByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const count = semesterInterviews.filter(i => {
        if (!i.scheduled_at || i.stage !== 'phone_qualification') return false;
        const d = new Date(i.scheduled_at);
        return d >= w.start && d <= weekEnd;
      }).length;
      return { week: w.label, value: count };
    });
    
    // Customer meetings by week
    const meetingsByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const count = semesterMeetings.filter(m => {
        const d = new Date(m.meeting_date);
        return d >= w.start && d <= weekEnd;
      }).length;
      return { week: w.label, value: count };
    });
    
    // Customer assessments (presentations) by week
    const assessmentsByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const count = semesterAssessments.filter(a => {
        const d = new Date(a.assessment_date);
        return d >= w.start && d <= weekEnd;
      }).length;
      return { week: w.label, value: count };
    });
    
    // Requirements stats
    const nonDeletedRequirements = requirements.filter(r => !r.deleted_at);
    const activeRequirements = nonDeletedRequirements.filter(r => 
      r.status === 'active' || r.status === 'opportunity'
    );
    const wonRequirements = nonDeletedRequirements.filter(r => r.status === 'won' || r.status === 'filled');
    const lostRequirements = nonDeletedRequirements.filter(r => r.status === 'lost');
    
    // Consultant stats
    const totalConsultants = consultants.length;
    const benchConsultants = consultants.filter(c => c.status === 'bench').length;
    const totalMissions = missions.filter(m => !m.end_date || new Date(m.end_date) >= new Date()).length;
    
    return {
      interviewCounts,
      conversions,
      phoneByWeek,
      meetingsByWeek,
      assessmentsByWeek,
      activeRequirements,
      wonRequirements,
      lostRequirements,
      totalConsultants,
      benchConsultants,
      totalMissions,
      totalMeetings: semesterMeetings.length,
      totalAssessments: semesterAssessments.length,
    };
  }, [interviews, meetings, assessments, requirements, consultants, missions, currentSemester, semesterWeeks]);

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

  const handlePrevSemester = () => {
    const currentIndex = semesterOptions.findIndex(s => s.value === selectedSemester);
    if (currentIndex < semesterOptions.length - 1) {
      setSelectedSemester(semesterOptions[currentIndex + 1].value);
    }
  };

  const handleNextSemester = () => {
    const currentIndex = semesterOptions.findIndex(s => s.value === selectedSemester);
    if (currentIndex > 0) {
      setSelectedSemester(semesterOptions[currentIndex - 1].value);
    }
  };

  if (!stats) return null;

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'}`}
        subtitle={
          selectedManagerId 
            ? `Viewing: ${managers.find(m => m.id === selectedManagerId)?.full_name || 'Manager'}`
            : 'Dashboard'
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

            {/* Top 3 Big Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BigNumberCard 
                title="Total Missions" 
                value={stats.totalMissions} 
                icon={Briefcase} 
                colour="cyan" 
              />
              <BigNumberCard 
                title="Total Consultants" 
                value={stats.totalConsultants} 
                icon={Users} 
                colour="green" 
              />
              <BigNumberCard 
                title="On Bench" 
                value={stats.benchConsultants} 
                icon={Clock} 
                colour="amber" 
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Requirements Block */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Requirements</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/requirements')}>View All</Button>
                  </div>
                </CardHeader>
                
                {/* Stats Row */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-sm text-brand-grey-600">Active: {stats.activeRequirements.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-brand-grey-600">Won: {stats.wonRequirements.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-brand-grey-600">Lost: {stats.lostRequirements.length}</span>
                  </div>
                </div>
                
                {/* Requirements List */}
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {stats.activeRequirements.length > 0 ? (
                    stats.activeRequirements.slice(0, 5).map(req => (
                      <div 
                        key={req.id} 
                        className="p-2 border border-brand-grey-200 rounded-lg hover:bg-brand-grey-50 cursor-pointer"
                        onClick={() => navigate(`/requirements/${req.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-brand-slate-900 truncate">{req.title || req.reference_id}</span>
                          <Badge variant="cyan" className="text-xs">{req.status}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-brand-grey-400 text-center py-4">No active requirements</p>
                  )}
                </div>
                
                {/* Mini Conversion Funnel */}
                <MiniConversionFunnel 
                  meetings={stats.totalMeetings}
                  presentations={stats.totalAssessments}
                  projects={stats.wonRequirements.length}
                />
              </Card>

              {/* Centre: Interview Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Interview Funnel</CardTitle>
                </CardHeader>
                <InterviewFunnel 
                  data={{
                    ...stats.interviewCounts,
                    conversions: stats.conversions,
                  }}
                />
              </Card>

              {/* Right: 3 KPI Charts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Weekly Activity</CardTitle>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handlePrevSemester}
                        disabled={semesterOptions.findIndex(s => s.value === selectedSemester) >= semesterOptions.length - 1}
                        className="p-1 hover:bg-brand-grey-100 rounded disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-medium text-brand-slate-700 min-w-[70px] text-center">
                        {currentSemester?.label}
                      </span>
                      <button 
                        onClick={handleNextSemester}
                        disabled={semesterOptions.findIndex(s => s.value === selectedSemester) <= 0}
                        className="p-1 hover:bg-brand-grey-100 rounded disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <div className="space-y-6">
                  <WeeklyChart 
                    data={stats.phoneByWeek} 
                    title="Phone Interviews" 
                    colour="#06b6d4"
                  />
                  <WeeklyChart 
                    data={stats.meetingsByWeek} 
                    title="Customer Meetings" 
                    colour="#8b5cf6"
                  />
                  <WeeklyChart 
                    data={stats.assessmentsByWeek} 
                    title="Customer Assessments" 
                    colour="#f59e0b"
                  />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
