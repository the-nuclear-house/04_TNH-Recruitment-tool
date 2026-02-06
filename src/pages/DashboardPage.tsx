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
  Calendar,
  ClipboardList,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Modal } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  approvalRequestsService,
  offersService,
  requirementsService,
  type DbApprovalRequest,
  type DbOffer,
  type DbRequirement,
  type DbInterview,
  type DbConsultant,
  type DbConsultantMeeting,
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

// Headline Card with forecast + sparkline (Layer 1)
function HeadlineCard({
  title,
  current,
  forecast,
  forecastLabel,
  forecastDirection,
  icon: Icon,
  iconBg,
  barColour,
  barForecastColour,
  sparklineData,
  semesterLabel,
}: {
  title: string;
  current: number;
  forecast: number;
  forecastLabel: string;
  forecastDirection: 'up' | 'down' | 'same';
  icon: any;
  iconBg: string;
  barColour: string;
  barForecastColour: string;
  sparklineData: { week: string; value: number; isPast: boolean; isCurrent: boolean }[];
  semesterLabel: string;
}) {
  const maxVal = Math.max(...sparklineData.map(d => d.value), 1);
  const forecastColour = forecastDirection === 'down' && title !== 'On Bench' 
    ? 'text-red-600' 
    : forecastDirection === 'up' && title === 'On Bench'
    ? 'text-red-600'
    : forecastDirection === 'same' 
    ? 'text-brand-grey-400'
    : 'text-green-600';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-brand-grey-400">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-bold text-brand-slate-900">{current}</span>
            {current !== forecast && (
              <span className={`text-base font-semibold ${forecastColour}`}>({forecast})</span>
            )}
          </div>
          {forecastLabel && current !== forecast && (
            <p className={`text-xs mt-1 ${forecastColour}`}>{forecastLabel}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-4 pt-3 border-t border-brand-grey-200/50">
        <p className="text-xs text-brand-grey-400 mb-2">{semesterLabel}</p>
        <div className="flex items-end gap-[2px] h-9">
          {sparklineData.map((d, i) => {
            const height = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all ${d.isCurrent ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                style={{
                  height: `${Math.max(height, 8)}%`,
                  backgroundColor: d.isPast ? barColour : barForecastColour,
                  minHeight: '3px',
                }}
                title={`${d.week}: ${d.value}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-brand-grey-400">{sparklineData[0]?.week}</span>
          <span className="text-[9px] font-semibold text-amber-500">
            {sparklineData.find(d => d.isCurrent)?.week || ''} ← now
          </span>
          <span className="text-[9px] text-brand-grey-400">{sparklineData[sparklineData.length - 1]?.week}</span>
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
  // Calculate dynamic widths based on actual numbers
  const maxValue = Math.max(data.phone, data.technical, data.director, data.signed, 1);
  
  // Calculate width as percentage of max, with minimum 25% for visibility
  const getWidth = (value: number) => {
    if (maxValue === 0) return 25;
    const percentage = (value / maxValue) * 100;
    return Math.max(percentage, 25); // Minimum 25% width for visibility
  };
  
  const stages = [
    { label: 'Phone', value: data.phone, colour: '#06b6d4', width: getWidth(data.phone) },
    { label: 'Technical', value: data.technical, colour: '#0891b2', width: getWidth(data.technical) },
    { label: 'Director', value: data.director, colour: '#0e7490', width: getWidth(data.director) },
    { label: 'Signed', value: data.signed, colour: '#134e4a', width: getWidth(data.signed) },
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
  
  // Recruiter specific
  const [recruiterCandidates, setRecruiterCandidates] = useState<any[]>([]);
  const [recruiterInterviews, setRecruiterInterviews] = useState<any[]>([]);
  
  // Director specific
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<DbApprovalRequest[]>([]);
  const [pendingOffers, setPendingOffers] = useState<DbOffer[]>([]);
  const [pendingBidGoNoGo, setPendingBidGoNoGo] = useState<DbRequirement[]>([]);
  const [pendingBidOfferReview, setPendingBidOfferReview] = useState<DbRequirement[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  
  // Approval detail modal
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<DbApprovalRequest | null>(null);
  const [selectedOfferForApproval, setSelectedOfferForApproval] = useState<DbOffer | null>(null);
  const [isApprovalDetailOpen, setIsApprovalDetailOpen] = useState(false);

  // Layer 4: Admin & People Management data
  const [consultantMeetings, setConsultantMeetings] = useState<DbConsultantMeeting[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [timesheetWeeks, setTimesheetWeeks] = useState<any[]>([]);
  const [allOffers, setAllOffers] = useState<DbOffer[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customerMeetingsUpcoming, setCustomerMeetingsUpcoming] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<DbInterview[]>([]);

  // Determine if recruiter view (recruiter or recruiter_manager, not business/admin/technical roles)
  const isRecruiterView = (permissions.isRecruiter || permissions.isRecruiterManager) && 
    !permissions.isBusinessManager && 
    !permissions.isBusinessDirector && 
    !permissions.isTechnicalDirector &&
    !permissions.isAdmin;

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
      
      // Recruiter view - load their candidates and interviews
      if (isRecruiterView && user?.id) {
        // Load candidates assigned to this recruiter
        const { data: candidatesData } = await supabase
          .from('candidates')
          .select('*')
          .eq('assigned_recruiter_id', user.id)
          .is('deleted_at', null);
        setRecruiterCandidates(candidatesData || []);
        
        // Load all interviews for recruiter's candidates
        const candidateIds = (candidatesData || []).map(c => c.id);
        if (candidateIds.length > 0) {
          const { data: interviewsData } = await supabase
            .from('interviews')
            .select('*')
            .in('candidate_id', candidateIds)
            .is('deleted_at', null);
          setRecruiterInterviews(interviewsData || []);
        } else {
          setRecruiterInterviews([]);
        }
        
        setIsLoading(false);
        return;
      }
      
      const isDirectorView = permissions.isBusinessDirector || permissions.isTechnicalDirector || permissions.isAdmin;
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
      
      // Load consultants (filtered by account_manager for manager view)
      let consQuery = supabase.from('consultants').select('*').is('deleted_at', null);
      if (targetManagerId) {
        consQuery = consQuery.eq('account_manager_id', targetManagerId);
      }
      const { data: consData } = await consQuery;
      setConsultants(consData || []);
      
      // Load missions (filtered to consultants the manager owns)
      let missQuery = supabase.from('missions').select('*').is('deleted_at', null);
      if (targetManagerId && consData && consData.length > 0) {
        missQuery = missQuery.in('consultant_id', consData.map(c => c.id));
      }
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

      // === Layer 4 Data Loading ===
      
      // Load consultant meetings (for career management block)
      const consultantIds = (consData || []).map((c: any) => c.id);
      if (consultantIds.length > 0) {
        const { data: meetingsData } = await supabase
          .from('consultant_meetings')
          .select('*, consultant:consultant_id(*), conductor:conducted_by(*)')
          .in('consultant_id', consultantIds)
          .is('deleted_at', null);
        setConsultantMeetings(meetingsData || []);
      } else {
        setConsultantMeetings([]);
      }

      // Load leave requests pending approval (for admin block)
      if (consultantIds.length > 0) {
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('*, consultant:consultant_id(*)')
          .in('consultant_id', consultantIds)
          .eq('status', 'pending')
          .is('deleted_at', null);
        setLeaveRequests(leaveData || []);
      } else {
        setLeaveRequests([]);
      }

      // Load timesheet weeks for current week (for admin block - missing timesheets)
      const now = new Date();
      const currentWeekNum = getWeekNumber(now);
      const currentYear = now.getFullYear();
      if (consultantIds.length > 0) {
        const { data: tsData } = await supabase
          .from('timesheet_weeks')
          .select('*, consultant:consultant_id(*)')
          .in('consultant_id', consultantIds)
          .eq('week_number', currentWeekNum)
          .eq('year', currentYear);
        setTimesheetWeeks(tsData || []);
      } else {
        setTimesheetWeeks([]);
      }

      // Load offers for business block (pending ones for this manager's requirements)
      const { data: offersData } = await supabase
        .from('offers')
        .select('*, candidate:candidate_id(*), requirement:requirement_id(*)')
        .in('status', ['pending_approval', 'approved', 'contract_sent'])
        .is('deleted_at', null);
      // Filter to manager's requirements if not director
      const managerReqIds = (reqData || []).map((r: any) => r.id);
      setAllOffers((offersData || []).filter((o: any) => 
        !targetManagerId || managerReqIds.includes(o.requirement_id)
      ));

      // Load projects (for business block - check if won requirements have projects)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, requirement:won_bid_requirement_id(*)')
        .is('deleted_at', null);
      setProjects(projectsData || []);

      // Load upcoming customer meetings (next 30 days)
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      let upcomingMeetQuery = supabase
        .from('customer_meetings')
        .select('*, customer:customer_id(*)')
        .gte('meeting_date', now.toISOString().split('T')[0])
        .lte('meeting_date', in30Days.toISOString().split('T')[0])
        .order('meeting_date', { ascending: true });
      if (targetManagerId) {
        upcomingMeetQuery = upcomingMeetQuery.eq('created_by', targetManagerId);
      }
      const { data: upcomingMeetData } = await upcomingMeetQuery;
      setCustomerMeetingsUpcoming(upcomingMeetData || []);

      // Load upcoming interviews (next 30 days)
      let upcomingIntQuery = supabase
        .from('interviews')
        .select('*, candidate:candidate_id(*)')
        .gte('scheduled_at', now.toISOString().split('T')[0])
        .lte('scheduled_at', in30Days.toISOString().split('T')[0])
        .eq('outcome', 'pending')
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true });
      if (targetManagerId) {
        upcomingIntQuery = upcomingIntQuery.eq('interviewer_id', targetManagerId);
      }
      const { data: upcomingIntData } = await upcomingIntQuery;
      setUpcomingInterviews(upcomingIntData || []);
      
      // Load managers for director view
      if (isDirectorView && !selectedManagerId) {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .contains('roles', ['business_manager']);
        setManagers(usersData || []);
        
        const [approvals, offers, bidApprovals] = await Promise.all([
          approvalRequestsService.getPendingForDirector(),
          offersService.getPendingApprovals(user!.id),
          requirementsService.getAllPendingBidApprovals(user!.id),
        ]);
        setPendingApprovals(approvals);
        setPendingOffers(offers);
        setPendingBidGoNoGo(bidApprovals.goNoGo);
        setPendingBidOfferReview(bidApprovals.offer);
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

  // Headline stats for Layer 1 (consultants/missions/bench with forecast + sparklines)
  const headlineStats = useMemo(() => {
    if (!currentSemester || !consultants.length) return null;

    const today = new Date();
    const semesterEnd = currentSemester.end;
    const activeConsultants = consultants.filter(c => c.status !== 'terminated');
    const benchConsultants = activeConsultants.filter(c => c.status === 'bench');
    const activeMissions = missions.filter(m => {
      if (m.status === 'cancelled' || m.status === 'on_hold') return false;
      if (!m.end_date) return true;
      return new Date(m.end_date) >= today;
    });

    // Forecast: consultants serving notice (terminated status with future last_working_day, or exit records)
    const consultantsServingNotice = consultants.filter(c => 
      c.status === 'terminated' && c.start_date // crude check; ideally we'd have an exit date
    ).length;
    // Forecast: missions ending before semester end
    const missionsEndingBeforeSemester = activeMissions.filter(m => 
      m.end_date && new Date(m.end_date) <= semesterEnd
    );
    
    const forecastConsultants = activeConsultants.length - consultantsServingNotice;
    const forecastMissions = activeMissions.length - missionsEndingBeforeSemester.length;
    const forecastBench = Math.max(0, benchConsultants.length + missionsEndingBeforeSemester.length);

    // Sparkline data: simulate weekly counts across semester
    // For now, use current values as the "actual" and project forward
    const sparklineWeeks = semesterWeeks.map((w, idx) => {
      const weekDate = w.start;
      const isPast = weekDate <= today;
      const isCurrent = isPast && (idx === semesterWeeks.length - 1 || semesterWeeks[idx + 1].start > today);

      // Count active missions for this week
      const weekMissions = isPast ? activeMissions.filter(m => {
        const start = new Date(m.start_date || m.created_at);
        const end = m.end_date ? new Date(m.end_date) : semesterEnd;
        return start <= weekDate && end >= weekDate;
      }).length : Math.max(0, activeMissions.length - missionsEndingBeforeSemester.filter(m => 
        new Date(m.end_date) <= weekDate
      ).length);

      return {
        week: w.label,
        consultants: isPast ? activeConsultants.length : forecastConsultants,
        missions: weekMissions,
        bench: isPast ? benchConsultants.length : forecastBench,
        isPast,
        isCurrent,
      };
    });

    return {
      activeConsultants: activeConsultants.length,
      forecastConsultants,
      consultantsServingNotice,
      activeMissions: activeMissions.length,
      forecastMissions,
      missionsEndingCount: missionsEndingBeforeSemester.length,
      missionsEndingSoon: missionsEndingBeforeSemester,
      bench: benchConsultants.length,
      forecastBench,
      sparklineWeeks,
    };
  }, [consultants, missions, currentSemester, semesterWeeks]);

  // Layer 4: Admin & People Management computed stats
  const layer4Stats = useMemo(() => {
    const today = new Date();
    const activeConsultants = consultants.filter(c => c.status !== 'terminated');

    // === CAREER MANAGEMENT ===
    
    // Appraisals: due on start_date anniversary, warning 30 days before, overdue after
    const appraisals: { consultant: any; dueDate: Date; daysUntil: number; status: 'overdue' | 'due_soon' }[] = [];
    activeConsultants.forEach(c => {
      if (!c.start_date) return;
      const start = new Date(c.start_date);
      // Next anniversary
      let anniversary = new Date(start);
      anniversary.setFullYear(today.getFullYear());
      if (anniversary < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 60)) {
        anniversary.setFullYear(today.getFullYear() + 1);
      }
      
      // Check if there's a completed appraisal within 60 days of this anniversary
      const hasRecentAppraisal = consultantMeetings.some(m => 
        m.consultant_id === c.id && 
        m.meeting_type === 'annual_appraisal' && 
        m.status === 'completed' &&
        Math.abs(new Date(m.scheduled_date).getTime() - anniversary.getTime()) < 60 * 24 * 60 * 60 * 1000
      );
      if (hasRecentAppraisal) return;

      const daysUntil = Math.floor((anniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < -60) return; // Too far in the past, skip
      if (daysUntil <= 0) {
        appraisals.push({ consultant: c, dueDate: anniversary, daysUntil, status: 'overdue' });
      } else if (daysUntil <= 30) {
        appraisals.push({ consultant: c, dueDate: anniversary, daysUntil, status: 'due_soon' });
      }
    });

    // Career meetings overdue: last quarterly_review or annual_appraisal more than 3 months ago
    const careerMeetingsOverdue: { consultant: any; lastMeeting: Date | null; daysSince: number }[] = [];
    activeConsultants.forEach(c => {
      const meetings = consultantMeetings
        .filter(m => m.consultant_id === c.id && (m.meeting_type === 'quarterly_review' || m.meeting_type === 'annual_appraisal') && m.status === 'completed')
        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
      
      const lastMeeting = meetings[0];
      if (!lastMeeting) {
        // No meetings at all, check if consultant started more than 3 months ago
        if (c.start_date && new Date(c.start_date) < new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)) {
          const daysSince = Math.floor((today.getTime() - new Date(c.start_date).getTime()) / (1000 * 60 * 60 * 24));
          careerMeetingsOverdue.push({ consultant: c, lastMeeting: null, daysSince });
        }
      } else {
        const daysSince = Math.floor((today.getTime() - new Date(lastMeeting.scheduled_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 90) {
          careerMeetingsOverdue.push({ consultant: c, lastMeeting: new Date(lastMeeting.scheduled_date), daysSince });
        }
      }
    });

    // Inductions missing: consultants with no induction meeting at all
    const inductionsMissing: { consultant: any; startDate: string }[] = [];
    activeConsultants.forEach(c => {
      const hasInduction = consultantMeetings.some(m => 
        m.consultant_id === c.id && m.meeting_type === 'induction' && (m.status === 'completed' || m.status === 'scheduled')
      );
      if (!hasInduction) {
        inductionsMissing.push({ consultant: c, startDate: c.start_date });
      }
    });

    // === ADMIN ===
    
    // Missing timesheets: active consultants who don't have a timesheet_week entry for current week
    const consultantsWithTimesheet = new Set(timesheetWeeks.map((tw: any) => tw.consultant_id));
    const missingTimesheets = activeConsultants
      .filter(c => c.status === 'in_mission' && !consultantsWithTimesheet.has(c.id))
      .map(c => ({ consultant: c }));

    // Leave requests: already loaded and filtered to pending

    // === BUSINESS ===
    
    // Offers pending (already loaded)
    const offersPending = allOffers;

    // Projects to create: requirements with status 'won' that have no project
    const wonReqIds = new Set(projects.map((p: any) => p.won_bid_requirement_id).filter(Boolean));
    const projectsToCreate = requirements
      .filter(r => r.status === 'won' && !wonReqIds.has(r.id))
      .map(r => r);

    // Missions to create: offers with status 'contract_signed' where consultant doesn't have active mission
    const activeConsultantMissionIds = new Set(
      missions.filter(m => m.status === 'active' || (!m.end_date || new Date(m.end_date) >= today)).map(m => m.consultant_id)
    );
    const signedOffers = allOffers.filter(o => o.status === 'contract_signed' as any);
    // Also check from offers table directly
    const missionsToCreate: any[] = [];

    // Upcoming consultant meetings (scheduled, future)
    const upcomingConsultantMeetings = consultantMeetings
      .filter(m => m.status === 'scheduled' && new Date(m.scheduled_date) >= today)
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 5);

    // Missions ending within 30 days
    const missionsEndingSoon = missions
      .filter(m => {
        if (!m.end_date || m.status === 'cancelled') return false;
        const end = new Date(m.end_date);
        const daysUntil = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 30;
      })
      .map(m => {
        const daysUntil = Math.floor((new Date(m.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const consultant = consultants.find(c => c.id === m.consultant_id);
        return { ...m, daysUntil, consultant };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      // Career management
      appraisalsOverdue: appraisals.filter(a => a.status === 'overdue'),
      appraisalsDueSoon: appraisals.filter(a => a.status === 'due_soon'),
      careerMeetingsOverdue,
      inductionsMissing,
      // Admin
      missingTimesheets,
      leaveRequestsPending: leaveRequests,
      // Business
      offersPending,
      projectsToCreate,
      missionsToCreate,
      // Upcoming
      upcomingConsultantMeetings,
      upcomingCustomerMeetings: customerMeetingsUpcoming,
      upcomingInterviews: upcomingInterviews.slice(0, 5),
      missionsEndingSoon,
    };
  }, [consultants, consultantMeetings, timesheetWeeks, leaveRequests, allOffers, requirements, projects, missions, customerMeetingsUpcoming, upcomingInterviews]);

  // Calculate recruiter stats
  const recruiterStats = useMemo(() => {
    if (!currentSemester || !isRecruiterView) return null;
    
    const semesterStart = currentSemester.start.toISOString().split('T')[0];
    const semesterEnd = currentSemester.end.toISOString().split('T')[0];
    
    // Filter candidates to semester
    const semesterCandidates = recruiterCandidates.filter(c => 
      c.created_at >= semesterStart && c.created_at <= semesterEnd
    );
    
    // Total candidates sourced
    const totalSourced = semesterCandidates.length;
    
    // Candidates by status
    const signedCandidates = recruiterCandidates.filter(c => c.status === 'hired');
    const activeCandidates = recruiterCandidates.filter(c => 
      !['hired', 'rejected', 'withdrawn'].includes(c.status)
    );
    
    // Interview stats for their candidates
    const phoneInterviews = recruiterInterviews.filter(i => i.stage === 'phone_qualification');
    const techInterviews = recruiterInterviews.filter(i => i.stage === 'technical_interview');
    const directorInterviews = recruiterInterviews.filter(i => i.stage === 'director_interview');
    
    const passedPhone = phoneInterviews.filter(i => i.outcome === 'pass').length;
    const passedTech = techInterviews.filter(i => i.outcome === 'pass').length;
    const passedDirector = directorInterviews.filter(i => i.outcome === 'pass').length;
    
    // Conversion rates
    const phoneToTechRate = phoneInterviews.length > 0 ? Math.round((passedPhone / phoneInterviews.length) * 100) : 0;
    const techToDirectorRate = techInterviews.length > 0 ? Math.round((passedTech / techInterviews.length) * 100) : 0;
    const directorToSignedRate = directorInterviews.length > 0 ? Math.round((passedDirector / directorInterviews.length) * 100) : 0;
    
    // === ASSESSMENT COMPARISON ===
    // Get candidate IDs that progressed to technical interviews
    const candidatesWithTechInterview = new Set(techInterviews.map(i => i.candidate_id));
    
    // Recruiter's average (only for candidates who progressed to technical)
    const phoneInterviewsForProgressed = phoneInterviews.filter(i => 
      candidatesWithTechInterview.has(i.candidate_id) && 
      i.communication_score && i.professionalism_score && i.enthusiasm_score && i.cultural_fit_score
    );
    
    let recruiterAvgScore = 'N/A';
    if (phoneInterviewsForProgressed.length > 0) {
      const totalPhoneScores = phoneInterviewsForProgressed.reduce((sum, i) => {
        const avg = (i.communication_score + i.professionalism_score + i.enthusiasm_score + i.cultural_fit_score) / 4;
        return sum + avg;
      }, 0);
      recruiterAvgScore = (totalPhoneScores / phoneInterviewsForProgressed.length).toFixed(1);
    }
    
    // Technical + Director average (for same candidates)
    const seniorInterviews = [...techInterviews, ...directorInterviews].filter(i => 
      i.communication_score && i.professionalism_score && i.enthusiasm_score && i.cultural_fit_score
    );
    
    let seniorAvgScore = 'N/A';
    if (seniorInterviews.length > 0) {
      const totalSeniorScores = seniorInterviews.reduce((sum, i) => {
        const avg = (i.communication_score + i.professionalism_score + i.enthusiasm_score + i.cultural_fit_score) / 4;
        return sum + avg;
      }, 0);
      seniorAvgScore = (totalSeniorScores / seniorInterviews.length).toFixed(1);
    }
    
    // Candidates sourced by week
    const candidatesByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const count = semesterCandidates.filter(c => {
        const d = new Date(c.created_at);
        return d >= w.start && d <= weekEnd;
      }).length;
      return { week: w.label, value: count };
    });
    
    // Interviews by week (stacked by type)
    const interviewsByWeek = semesterWeeks.map(w => {
      const weekEnd = new Date(w.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekStart = w.start;
      
      const phoneCount = recruiterInterviews.filter(i => {
        if (!i.scheduled_at || i.stage !== 'phone_qualification') return false;
        const d = new Date(i.scheduled_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      
      const techCount = recruiterInterviews.filter(i => {
        if (!i.scheduled_at || i.stage !== 'technical_interview') return false;
        const d = new Date(i.scheduled_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      
      const directorCount = recruiterInterviews.filter(i => {
        if (!i.scheduled_at || i.stage !== 'director_interview') return false;
        const d = new Date(i.scheduled_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      
      return { week: w.label, phone: phoneCount, technical: techCount, director: directorCount };
    });
    
    // Total interviews done
    const totalInterviews = recruiterInterviews.filter(i => i.outcome !== 'pending').length;
    
    // Upcoming interviews (phone) for their candidates
    const today = new Date().toISOString().split('T')[0];
    const upcomingInterviews = recruiterInterviews
      .filter(i => i.scheduled_at && i.scheduled_at >= today && i.outcome === 'pending')
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .slice(0, 5);
    
    return {
      totalSourced,
      signedCount: signedCandidates.length,
      totalInterviews,
      phoneToTechRate,
      techToDirectorRate,
      directorToSignedRate,
      recruiterAvgScore: parseFloat(recruiterAvgScore) || 0,
      seniorAvgScore: parseFloat(seniorAvgScore) || 0,
      progressedCount: candidatesWithTechInterview.size,
      candidatesByWeek,
      interviewsByWeek,
      upcomingInterviews,
      signedCandidates: signedCandidates.slice(0, 5),
      interviewCounts: {
        phone: phoneInterviews.length,
        technical: techInterviews.length,
        director: directorInterviews.length,
        signed: signedCandidates.length,
      },
    };
  }, [recruiterCandidates, recruiterInterviews, currentSemester, semesterWeeks, isRecruiterView]);

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
      await approvalRequestsService.reject(requestId, user!.id, reason, 'business_director');
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

  const isDirectorView = (permissions.isBusinessDirector || permissions.isTechnicalDirector || permissions.isAdmin) && !selectedManagerId;
  const totalPendingApprovals = pendingApprovals.length + pendingOffers.length + pendingBidGoNoGo.length + pendingBidOfferReview.length;

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

  // Recruiter Dashboard
  if (isRecruiterView) {
    // Calculate dynamic funnel widths based on max value
    const maxFunnelValue = Math.max(
      recruiterStats?.interviewCounts.phone || 1,
      recruiterStats?.interviewCounts.technical || 0,
      recruiterStats?.interviewCounts.director || 0,
      recruiterStats?.signedCount || 0
    );
    const getFunnelWidth = (value: number) => {
      const percentage = maxFunnelValue > 0 ? (value / maxFunnelValue) * 100 : 0;
      return Math.max(percentage, 20); // Minimum 20% width for visibility
    };

    // Star rating component
    const StarRatingVisual = ({ rating, label }: { rating: number; label: string }) => {
      const fullStars = Math.floor(rating);
      const partialStar = rating - fullStars;
      const emptyStars = 5 - Math.ceil(rating);
      
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-2xl font-bold text-brand-slate-900">{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
          </div>
          {rating > 0 && (
            <div className="flex gap-0.5">
              {[...Array(fullStars)].map((_, i) => (
                <Award key={`full-${i}`} className="h-5 w-5 text-amber-400 fill-amber-400" />
              ))}
              {partialStar > 0 && (
                <div className="relative">
                  <Award className="h-5 w-5 text-gray-300" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${partialStar * 100}%` }}>
                    <Award className="h-5 w-5 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              )}
              {[...Array(emptyStars)].map((_, i) => (
                <Award key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
              ))}
            </div>
          )}
          <p className="text-sm text-brand-grey-400 mt-1">{label}</p>
        </div>
      );
    };

    return (
      <div className="min-h-screen">
        <Header
          title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Recruiter'}`}
          subtitle="Your Recruitment Dashboard"
        />

        <div className="p-6 space-y-6">
          {isLoading ? (
            <Card>
              <div className="text-center py-12 text-brand-grey-400">Loading dashboard...</div>
            </Card>
          ) : recruiterStats ? (
            <>
              {/* Row 1: Key Metrics (3 cards) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-100 rounded-lg">
                      <Users className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-brand-slate-900">{recruiterStats.totalSourced}</p>
                      <p className="text-sm text-brand-grey-400">Candidates Sourced</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-brand-slate-900">{recruiterStats.signedCount}</p>
                      <p className="text-sm text-brand-grey-400">Signed</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Phone className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-brand-slate-900">{recruiterStats.totalInterviews}</p>
                      <p className="text-sm text-brand-grey-400">Interviews Done</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Row 2: Star Ratings Comparison (2 cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <StarRatingVisual rating={recruiterStats.recruiterAvgScore} label="Your Avg Rating" />
                </Card>
                <Card className="p-6">
                  <StarRatingVisual rating={recruiterStats.seniorAvgScore} label="Senior Avg Rating" />
                </Card>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Dynamic Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Pipeline</CardTitle>
                  </CardHeader>
                  <div className="flex flex-col items-center gap-2 px-4">
                    <div 
                      className="bg-cyan-500 text-white py-3 px-4 rounded-lg text-center transition-all"
                      style={{ width: `${getFunnelWidth(recruiterStats.interviewCounts.phone)}%` }}
                    >
                      Phone: {recruiterStats.interviewCounts.phone}
                    </div>
                    <div className="text-sm text-brand-grey-400">↓ {recruiterStats.phoneToTechRate}%</div>
                    <div 
                      className="bg-blue-500 text-white py-3 px-4 rounded-lg text-center transition-all"
                      style={{ width: `${getFunnelWidth(recruiterStats.interviewCounts.technical)}%` }}
                    >
                      Technical: {recruiterStats.interviewCounts.technical}
                    </div>
                    <div className="text-sm text-brand-grey-400">↓ {recruiterStats.techToDirectorRate}%</div>
                    <div 
                      className="bg-amber-500 text-white py-3 px-4 rounded-lg text-center transition-all"
                      style={{ width: `${getFunnelWidth(recruiterStats.interviewCounts.director)}%` }}
                    >
                      Director: {recruiterStats.interviewCounts.director}
                    </div>
                    <div className="text-sm text-brand-grey-400">↓ {recruiterStats.directorToSignedRate}%</div>
                    <div 
                      className="bg-green-500 text-white py-3 px-4 rounded-lg text-center transition-all"
                      style={{ width: `${getFunnelWidth(recruiterStats.signedCount)}%` }}
                    >
                      Signed: {recruiterStats.signedCount}
                    </div>
                  </div>
                </Card>

                {/* Weekly Activity Chart - Stacked Interviews */}
                <Card className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Interviews</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handlePrevSemester}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-brand-grey-500">{currentSemester?.label}</span>
                        <Button variant="ghost" size="sm" onClick={handleNextSemester}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="px-4 pb-4 overflow-x-auto">
                    {/* Legend */}
                    <div className="flex gap-4 mb-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-cyan-500 rounded" />
                        <span>Phone</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded" />
                        <span>Technical</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-500 rounded" />
                        <span>Director</span>
                      </div>
                    </div>
                    {/* Stacked Bar Chart */}
                    <div className="flex items-end justify-between h-24 gap-1 min-w-[400px]">
                      {recruiterStats.interviewsByWeek.slice(0, 12).map((week: any, idx: number) => {
                        const total = week.phone + week.technical + week.director;
                        const maxTotal = Math.max(...recruiterStats.interviewsByWeek.map((w: any) => w.phone + w.technical + w.director), 1);
                        const scale = 80 / maxTotal;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center min-w-[20px]">
                            <div className="w-full flex flex-col-reverse">
                              {week.phone > 0 && (
                                <div 
                                  className="bg-cyan-500 w-full"
                                  style={{ height: `${Math.max(week.phone * scale, 4)}px` }}
                                  title={`Phone: ${week.phone}`}
                                />
                              )}
                              {week.technical > 0 && (
                                <div 
                                  className="bg-blue-500 w-full"
                                  style={{ height: `${Math.max(week.technical * scale, 4)}px` }}
                                  title={`Technical: ${week.technical}`}
                                />
                              )}
                              {week.director > 0 && (
                                <div 
                                  className="bg-amber-500 w-full rounded-t"
                                  style={{ height: `${Math.max(week.director * scale, 4)}px` }}
                                  title={`Director: ${week.director}`}
                                />
                              )}
                            </div>
                            <span className="text-[9px] text-brand-grey-400 mt-1">{week.week}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Upcoming Interviews */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Interviews</CardTitle>
                  </CardHeader>
                  {recruiterStats.upcomingInterviews.length > 0 ? (
                    <div className="space-y-2">
                      {recruiterStats.upcomingInterviews.map((interview: any) => {
                        const candidate = recruiterCandidates.find(c => c.id === interview.candidate_id);
                        return (
                          <div key={interview.id} className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-cyan-500" />
                              <div>
                                <p className="font-medium text-brand-slate-900 text-sm">
                                  {candidate?.first_name} {candidate?.last_name}
                                </p>
                                <p className="text-xs text-brand-grey-400">
                                  {formatDate(interview.scheduled_at)}
                                </p>
                              </div>
                            </div>
                            <Badge variant="cyan">
                              {interview.stage === 'phone_qualification' ? 'Phone' : 
                               interview.stage === 'technical_interview' ? 'Tech' : 'Director'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-brand-grey-400">No upcoming interviews</p>
                  )}
                </Card>
              </div>

              {/* Second Row: Sourced Chart */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Candidates Sourced per Week</CardTitle>
                </CardHeader>
                <div className="px-4 pb-4">
                  <div className="h-32">
                    <WeeklyChart data={recruiterStats.candidatesByWeek} title="Candidates" colour="cyan" />
                  </div>
                </div>
              </Card>

              {/* Recent Signed Candidates */}
              {recruiterStats.signedCandidates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Your Signed Candidates
                    </CardTitle>
                  </CardHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {recruiterStats.signedCandidates.map((candidate: any) => (
                      <div 
                        key={candidate.id} 
                        className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                      >
                        <p className="font-medium text-green-800">
                          {candidate.first_name} {candidate.last_name}
                        </p>
                        <p className="text-sm text-green-600">{candidate.current_title || 'Consultant'}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // For Technical Directors without stats, still show the pending approvals
  if (!stats && !isDirectorView) return null;

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
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                      onClick={() => {
                        setSelectedApprovalRequest(request);
                        setIsApprovalDetailOpen(true);
                      }}
                    >
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
                      <Button variant="secondary" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                  {pendingOffers.map(offer => (
                    <div 
                      key={offer.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                      onClick={() => {
                        setSelectedOfferForApproval(offer);
                        setIsApprovalDetailOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-100">
                          <FileText className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-brand-slate-900">Contract: {offer.job_title}</p>
                          <p className="text-xs text-brand-grey-500">{offer.candidate?.first_name} {offer.candidate?.last_name}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                  {/* Bid Go/No-Go Approvals */}
                  {pendingBidGoNoGo.map(bid => (
                    <div 
                      key={bid.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                      onClick={() => navigate(`/bids/${bid.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-100">
                          <Target className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-brand-slate-900">Bid Go/No-Go: {bid.title}</p>
                          <p className="text-xs text-brand-grey-500">{bid.company?.name} • {bid.manager?.full_name}</p>
                        </div>
                      </div>
                      <Badge variant="amber">Review</Badge>
                    </div>
                  ))}
                  {/* Bid Offer Review Approvals */}
                  {pendingBidOfferReview.map(bid => (
                    <div 
                      key={bid.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                      onClick={() => navigate(`/bids/${bid.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-brand-slate-900">Bid Offer Review: {bid.title}</p>
                          <p className="text-xs text-brand-grey-500">{bid.company?.name} • £{bid.proposal_value?.toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="cyan">Review</Badge>
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

            {/* Stats-dependent content - only show if stats available */}
            {stats && (
              <>
                {/* Layer 1: Headline Cards with forecast + sparklines */}
                {headlineStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <HeadlineCard
                      title="Active Consultants"
                      current={headlineStats.activeConsultants}
                      forecast={headlineStats.forecastConsultants}
                      forecastLabel={headlineStats.consultantsServingNotice > 0 ? `${headlineStats.consultantsServingNotice} serving notice` : ''}
                      forecastDirection={headlineStats.forecastConsultants < headlineStats.activeConsultants ? 'down' : 'same'}
                      icon={Users}
                      iconBg="bg-cyan-50 text-cyan-600"
                      barColour="#0891b2"
                      barForecastColour="#b0dfef"
                      sparklineData={headlineStats.sparklineWeeks.map(w => ({
                        week: w.week,
                        value: w.consultants,
                        isPast: w.isPast,
                        isCurrent: w.isCurrent,
                      }))}
                      semesterLabel={`${currentSemester?.label || ''} weekly trend`}
                    />
                    <HeadlineCard
                      title="Active Missions"
                      current={headlineStats.activeMissions}
                      forecast={headlineStats.forecastMissions}
                      forecastLabel={headlineStats.missionsEndingCount > 0 ? `${headlineStats.missionsEndingCount} ending before ${currentSemester?.label?.split(' ')[0] === 'H1' ? 'Jun' : 'Dec'}` : ''}
                      forecastDirection={headlineStats.forecastMissions < headlineStats.activeMissions ? 'down' : 'same'}
                      icon={Briefcase}
                      iconBg="bg-green-50 text-green-600"
                      barColour="#16a34a"
                      barForecastColour="#b5e8c3"
                      sparklineData={headlineStats.sparklineWeeks.map(w => ({
                        week: w.week,
                        value: w.missions,
                        isPast: w.isPast,
                        isCurrent: w.isCurrent,
                      }))}
                      semesterLabel={`${currentSemester?.label || ''} weekly trend`}
                    />
                    <HeadlineCard
                      title="On Bench"
                      current={headlineStats.bench}
                      forecast={headlineStats.forecastBench}
                      forecastLabel={headlineStats.forecastBench > headlineStats.bench ? `+${headlineStats.forecastBench - headlineStats.bench} if missions not renewed` : ''}
                      forecastDirection={headlineStats.forecastBench > headlineStats.bench ? 'up' : 'same'}
                      icon={Clock}
                      iconBg="bg-amber-50 text-amber-600"
                      barColour="#d97706"
                      barForecastColour="#f5d9a0"
                      sparklineData={headlineStats.sparklineWeeks.map(w => ({
                        week: w.week,
                        value: w.bench,
                        isPast: w.isPast,
                        isCurrent: w.isCurrent,
                      }))}
                      semesterLabel={`${currentSemester?.label || ''} weekly trend`}
                    />
                  </div>
                )}

            {/* Layer 2: Two Funnels Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Recruitment Funnel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle>Recruitment Funnel</CardTitle>
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
                <InterviewFunnel 
                  data={{
                    ...stats.interviewCounts,
                    conversions: stats.conversions,
                  }}
                />
                <div className="mt-4 space-y-4">
                  <WeeklyChart 
                    data={stats.phoneByWeek} 
                    title="Phone Interviews per week" 
                    colour="#06b6d4"
                  />
                </div>
              </Card>

              {/* Right: Business Development Funnel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle>Business Development Funnel</CardTitle>
                    <span className="text-sm text-brand-grey-400">{currentSemester?.label}</span>
                  </div>
                </CardHeader>
                {/* BD Funnel */}
                <div className="flex flex-col items-center py-4">
                  {(() => {
                    const bdStages = [
                      { label: 'Customer Meetings', value: stats.totalMeetings, colour: '#8b5cf6' },
                      { label: 'Assessments / Presentations', value: stats.totalAssessments, colour: '#7c3aed' },
                      { label: 'Requirements Won', value: stats.wonRequirements.length, colour: '#5b21b6' },
                    ];
                    const maxBd = Math.max(...bdStages.map(s => s.value), 1);
                    const getWidth = (v: number) => Math.max((v / maxBd) * 100, 25);
                    const meetToPresent = stats.totalMeetings > 0 ? Math.round((stats.totalAssessments / stats.totalMeetings) * 100) : 0;
                    const presentToWon = stats.totalAssessments > 0 ? Math.round((stats.wonRequirements.length / stats.totalAssessments) * 100) : 0;
                    const bdConversions = [meetToPresent, presentToWon];

                    return bdStages.map((stage, idx) => (
                      <div key={stage.label} className="flex flex-col items-center w-full">
                        <div 
                          className="flex items-center justify-center py-3 text-white font-semibold text-sm rounded-lg shadow-sm"
                          style={{
                            width: `${getWidth(stage.value)}%`,
                            backgroundColor: stage.colour,
                            minHeight: '44px',
                          }}
                        >
                          {stage.label}: {stage.value}
                        </div>
                        {idx < bdStages.length - 1 && (
                          <div className="text-xs text-brand-grey-500 py-1">
                            ↓ {bdConversions[idx]}%
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
                <div className="mt-4 space-y-4">
                  <WeeklyChart 
                    data={stats.meetingsByWeek} 
                    title="Customer Meetings per week" 
                    colour="#8b5cf6"
                  />
                  <WeeklyChart 
                    data={stats.assessmentsByWeek} 
                    title="Assessments / Presentations per week" 
                    colour="#f59e0b"
                  />
                </div>
              </Card>
            </div>

            {/* Layer 3: Requirements Pipeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>My Requirements</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/requirements')}>View All</Button>
                </div>
              </CardHeader>
              
              {/* Summary strip */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-cyan-50 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span className="text-sm text-brand-slate-700">Active</span>
                  <span className="text-xl font-bold text-cyan-600 ml-auto">{stats.activeRequirements.length}</span>
                </div>
                <div className="flex-1 bg-green-50 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm text-brand-slate-700">Won</span>
                  <span className="text-xl font-bold text-green-600 ml-auto">{stats.wonRequirements.length}</span>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-brand-slate-700">Lost</span>
                  <span className="text-xl font-bold text-red-600 ml-auto">{stats.lostRequirements.length}</span>
                </div>
              </div>
              
              {/* Active requirements in two-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4">
                {stats.activeRequirements.length > 0 ? (
                  stats.activeRequirements.map(req => (
                    <div 
                      key={req.id} 
                      className="flex items-center gap-3 p-3 border border-brand-grey-200 rounded-lg hover:bg-brand-grey-50 cursor-pointer"
                      onClick={() => navigate(`/requirements/${req.id}`)}
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-brand-slate-900 truncate block">{req.title || req.reference_id}</span>
                      </div>
                      <Badge variant="cyan" className="text-xs flex-shrink-0">{req.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-brand-grey-400 text-center py-4 col-span-2">No active requirements</p>
                )}
              </div>
              
              {/* Conversion funnel */}
              <MiniConversionFunnel 
                meetings={stats.totalMeetings}
                presentations={stats.totalAssessments}
                projects={stats.wonRequirements.length}
              />
            </Card>

            {/* Layer 4: Admin & People Management - Three Blocks */}
            {layer4Stats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Block 1: Career Management */}
                <Card className="border-t-[3px] border-t-purple-500">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      <CardTitle className="text-sm">Career Management</CardTitle>
                    </div>
                  </CardHeader>

                  {/* Counters */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-red-50 rounded-lg p-2.5">
                      <p className="text-xl font-bold text-red-600">{layer4Stats.appraisalsOverdue.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Appraisals overdue</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2.5">
                      <p className="text-xl font-bold text-amber-600">{layer4Stats.appraisalsDueSoon.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Appraisals due 30d</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2.5">
                      <p className="text-xl font-bold text-red-600">{layer4Stats.careerMeetingsOverdue.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Career meetings overdue</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2.5">
                      <p className="text-xl font-bold text-amber-600">{layer4Stats.inductionsMissing.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Inductions missing</p>
                    </div>
                  </div>

                  {/* Detail items */}
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {layer4Stats.appraisalsOverdue.map(a => (
                      <div key={`appr-${a.consultant.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/consultants/${a.consultant.id}`)}>
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{a.consultant.first_name} {a.consultant.last_name}</strong> — appraisal overdue</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-600 font-semibold flex-shrink-0">{Math.abs(a.daysUntil)}d late</span>
                      </div>
                    ))}
                    {layer4Stats.careerMeetingsOverdue.map(c => (
                      <div key={`career-${c.consultant.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/consultants/${c.consultant.id}`)}>
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{c.consultant.first_name} {c.consultant.last_name}</strong> — no meeting for {Math.floor(c.daysSince / 30)}m</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-600 font-semibold flex-shrink-0">{c.daysSince - 90}d overdue</span>
                      </div>
                    ))}
                    {layer4Stats.appraisalsDueSoon.map(a => (
                      <div key={`appr-soon-${a.consultant.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/consultants/${a.consultant.id}`)}>
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{a.consultant.first_name} {a.consultant.last_name}</strong> — appraisal due {formatDate(a.dueDate.toISOString())}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold flex-shrink-0">{a.daysUntil}d</span>
                      </div>
                    ))}
                    {layer4Stats.inductionsMissing.map(i => (
                      <div key={`induct-${i.consultant.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/consultants/${i.consultant.id}`)}>
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{i.consultant.first_name} {i.consultant.last_name}</strong> — induction missing</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold flex-shrink-0">Since {formatDate(i.startDate)}</span>
                      </div>
                    ))}
                    {layer4Stats.appraisalsOverdue.length === 0 && layer4Stats.appraisalsDueSoon.length === 0 && 
                     layer4Stats.careerMeetingsOverdue.length === 0 && layer4Stats.inductionsMissing.length === 0 && (
                      <p className="text-sm text-brand-grey-400 text-center py-4">All clear ✓</p>
                    )}
                  </div>
                </Card>

                {/* Block 2: Admin */}
                <Card className="border-t-[3px] border-t-amber-500">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-sm">Admin</CardTitle>
                    </div>
                  </CardHeader>

                  {/* Counters */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className={`${layer4Stats.missingTimesheets.length > 0 ? 'bg-red-50' : 'bg-green-50'} rounded-lg p-2.5`}>
                      <p className={`text-xl font-bold ${layer4Stats.missingTimesheets.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{layer4Stats.missingTimesheets.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Timesheets missing</p>
                    </div>
                    <div className={`${layer4Stats.leaveRequestsPending.length > 0 ? 'bg-amber-50' : 'bg-green-50'} rounded-lg p-2.5`}>
                      <p className={`text-xl font-bold ${layer4Stats.leaveRequestsPending.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{layer4Stats.leaveRequestsPending.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Leave requests</p>
                    </div>
                  </div>

                  {/* Detail items */}
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {layer4Stats.missingTimesheets.length > 0 && (
                      <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mb-1">Timesheets</p>
                    )}
                    {layer4Stats.missingTimesheets.map(t => (
                      <div key={`ts-${t.consultant.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/consultants/${t.consultant.id}`)}>
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{t.consultant.first_name} {t.consultant.last_name}</strong> — W{getWeekNumber(new Date())} missing</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-600 font-semibold flex-shrink-0">Late</span>
                      </div>
                    ))}
                    {layer4Stats.leaveRequestsPending.length > 0 && (
                      <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mt-3 mb-1">Leave Requests</p>
                    )}
                    {layer4Stats.leaveRequestsPending.map((lr: any) => (
                      <div key={`lr-${lr.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/consultants/${lr.consultant_id}`)}>
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{lr.consultant?.first_name} {lr.consultant?.last_name}</strong> — {lr.leave_type?.replace(/_/g, ' ')} {lr.start_date ? formatDate(lr.start_date) : ''}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold flex-shrink-0">Approve</span>
                      </div>
                    ))}
                    {layer4Stats.missingTimesheets.length === 0 && layer4Stats.leaveRequestsPending.length === 0 && (
                      <p className="text-sm text-brand-grey-400 text-center py-4">All clear ✓</p>
                    )}
                  </div>
                </Card>

                {/* Block 3: Business */}
                <Card className="border-t-[3px] border-t-cyan-500">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-cyan-500" />
                      <CardTitle className="text-sm">Business</CardTitle>
                    </div>
                  </CardHeader>

                  {/* Counters */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className={`${layer4Stats.offersPending.length > 0 ? 'bg-cyan-50' : 'bg-green-50'} rounded-lg p-2.5`}>
                      <p className={`text-xl font-bold ${layer4Stats.offersPending.length > 0 ? 'text-cyan-600' : 'text-green-600'}`}>{layer4Stats.offersPending.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Offers pending</p>
                    </div>
                    <div className={`${layer4Stats.projectsToCreate.length > 0 ? 'bg-amber-50' : 'bg-green-50'} rounded-lg p-2.5`}>
                      <p className={`text-xl font-bold ${layer4Stats.projectsToCreate.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{layer4Stats.projectsToCreate.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Projects to create</p>
                    </div>
                    <div className={`${layer4Stats.missionsToCreate.length > 0 ? 'bg-amber-50' : 'bg-green-50'} rounded-lg p-2.5`}>
                      <p className={`text-xl font-bold ${layer4Stats.missionsToCreate.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{layer4Stats.missionsToCreate.length}</p>
                      <p className="text-[11px] text-brand-grey-400">Missions to create</p>
                    </div>
                  </div>

                  {/* Detail items */}
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {layer4Stats.offersPending.length > 0 && (
                      <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mb-1">Offers Pending</p>
                    )}
                    {layer4Stats.offersPending.map((o: any) => (
                      <div key={`offer-${o.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/offers`)}>
                        <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{o.candidate?.first_name} {o.candidate?.last_name}</strong> — {o.job_title || 'Offer'}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-50 text-cyan-600 font-semibold flex-shrink-0">{o.status?.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                    {layer4Stats.projectsToCreate.length > 0 && (
                      <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mt-3 mb-1">Projects to Create</p>
                    )}
                    {layer4Stats.projectsToCreate.map((r: any) => (
                      <div key={`proj-${r.id}`} className="flex items-center gap-2 p-2 rounded-lg border border-brand-grey-200/50 hover:bg-brand-grey-50 cursor-pointer text-sm"
                        onClick={() => navigate(`/requirements/${r.id}`)}>
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="flex-1 truncate"><strong className="font-medium text-brand-slate-900">{r.title || r.reference_id}</strong> — won, no project</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold flex-shrink-0">Create</span>
                      </div>
                    ))}
                    {layer4Stats.offersPending.length === 0 && layer4Stats.projectsToCreate.length === 0 && layer4Stats.missionsToCreate.length === 0 && (
                      <p className="text-sm text-brand-grey-400 text-center py-4">All clear ✓</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Upcoming Schedule (full width) */}
            {layer4Stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Schedule</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Customer Meetings */}
                  <div>
                    <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mb-2">Customer Meetings</p>
                    {layer4Stats.upcomingCustomerMeetings.length > 0 ? (
                      layer4Stats.upcomingCustomerMeetings.slice(0, 4).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-brand-grey-200/50 last:border-b-0">
                          <div className="w-11 text-center flex-shrink-0">
                            <p className="text-lg font-bold text-brand-slate-900 leading-none">{new Date(m.meeting_date).getDate()}</p>
                            <p className="text-[10px] text-brand-grey-400 uppercase">{new Date(m.meeting_date).toLocaleString('en-GB', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-slate-900 truncate">{m.customer?.name || 'Customer meeting'}</p>
                            <p className="text-xs text-brand-grey-400 truncate">{m.purpose || m.meeting_type?.replace(/_/g, ' ') || ''}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-brand-grey-400 py-3">None scheduled</p>
                    )}
                  </div>

                  {/* Consultant Meetings */}
                  <div>
                    <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mb-2">Consultant Meetings</p>
                    {layer4Stats.upcomingConsultantMeetings.length > 0 ? (
                      layer4Stats.upcomingConsultantMeetings.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-brand-grey-200/50 last:border-b-0"
                          onClick={() => navigate(`/consultants/${m.consultant_id}`)} style={{ cursor: 'pointer' }}>
                          <div className="w-11 text-center flex-shrink-0">
                            <p className="text-lg font-bold text-brand-slate-900 leading-none">{new Date(m.scheduled_date).getDate()}</p>
                            <p className="text-[10px] text-brand-grey-400 uppercase">{new Date(m.scheduled_date).toLocaleString('en-GB', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-slate-900 truncate">{m.consultant?.first_name} {m.consultant?.last_name}</p>
                            <p className="text-xs text-brand-grey-400 truncate">{m.meeting_type?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-brand-grey-400 py-3">None scheduled</p>
                    )}
                  </div>

                  {/* Interviews + Missions Ending */}
                  <div>
                    <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mb-2">Interviews</p>
                    {layer4Stats.upcomingInterviews.length > 0 ? (
                      layer4Stats.upcomingInterviews.map((i: any) => (
                        <div key={i.id} className="flex items-center gap-3 py-2.5 border-b border-brand-grey-200/50 last:border-b-0">
                          <div className="w-11 text-center flex-shrink-0">
                            <p className="text-lg font-bold text-brand-slate-900 leading-none">{new Date(i.scheduled_at).getDate()}</p>
                            <p className="text-[10px] text-brand-grey-400 uppercase">{new Date(i.scheduled_at).toLocaleString('en-GB', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-slate-900 truncate">{i.candidate?.first_name} {i.candidate?.last_name}</p>
                            <p className="text-xs text-brand-grey-400 truncate">{i.stage?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-brand-grey-400 py-3">None scheduled</p>
                    )}

                    {layer4Stats.missionsEndingSoon.length > 0 && (
                      <>
                        <p className="text-[11px] font-semibold text-brand-slate-700 uppercase tracking-wide mt-4 mb-2">Missions Ending</p>
                        {layer4Stats.missionsEndingSoon.map((m: any) => (
                          <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-brand-grey-200/50 last:border-b-0">
                            <div className="w-11 text-center flex-shrink-0">
                              <p className="text-lg font-bold text-brand-slate-900 leading-none">{new Date(m.end_date).getDate()}</p>
                              <p className="text-[10px] text-brand-grey-400 uppercase">{new Date(m.end_date).toLocaleString('en-GB', { month: 'short' })}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-brand-slate-900 truncate">{m.consultant?.first_name} {m.consultant?.last_name}</p>
                              <p className={`text-xs ${m.daysUntil <= 14 ? 'text-red-500' : 'text-amber-500'}`}>{m.daysUntil} days remaining</p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )}
              </>
            )}
          </>
        )}
      </div>

      {/* Approval Detail Modal */}
      <Modal
        isOpen={isApprovalDetailOpen}
        onClose={() => {
          setIsApprovalDetailOpen(false);
          setSelectedApprovalRequest(null);
          setSelectedOfferForApproval(null);
        }}
        title={
          selectedApprovalRequest 
            ? selectedApprovalRequest.request_type === 'salary_increase' ? 'Salary Increase Request'
              : selectedApprovalRequest.request_type === 'bonus_payment' ? 'Bonus Payment Request'
              : 'Employee Exit Request'
            : selectedOfferForApproval ? 'Contract Approval Request' : 'Approval Request'
        }
        size="lg"
      >
        {selectedApprovalRequest && (
          <div className="space-y-4">
            {/* Consultant Info */}
            <div className="p-4 bg-brand-grey-50 rounded-lg">
              <h4 className="font-medium text-brand-slate-900 mb-2">Consultant</h4>
              <p className="text-brand-slate-700">
                {selectedApprovalRequest.consultant?.first_name} {selectedApprovalRequest.consultant?.last_name}
              </p>
              {selectedApprovalRequest.consultant?.job_title && (
                <p className="text-sm text-brand-grey-500">{selectedApprovalRequest.consultant.job_title}</p>
              )}
            </div>

            {/* Request Details */}
            {selectedApprovalRequest.request_type === 'salary_increase' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">Current Salary</p>
                    <p className="text-lg font-semibold text-red-700">
                      £{(selectedApprovalRequest.request_data as SalaryIncreaseData).current_salary?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">New Salary</p>
                    <p className="text-lg font-semibold text-green-700">
                      £{(selectedApprovalRequest.request_data as SalaryIncreaseData).new_salary.toLocaleString()}
                    </p>
                  </div>
                </div>
                {(selectedApprovalRequest.request_data as any).effective_date && (
                  <div className="p-3 bg-brand-grey-50 rounded-lg">
                    <p className="text-xs text-brand-grey-500">Effective Date</p>
                    <p className="font-medium">{formatDate((selectedApprovalRequest.request_data as any).effective_date)}</p>
                  </div>
                )}
              </div>
            )}

            {selectedApprovalRequest.request_type === 'bonus_payment' && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">Bonus Amount</p>
                  <p className="text-lg font-semibold text-purple-700">
                    £{(selectedApprovalRequest.request_data as BonusPaymentData).amount.toLocaleString()}
                  </p>
                </div>
                {(selectedApprovalRequest.request_data as any).payment_date && (
                  <div className="p-3 bg-brand-grey-50 rounded-lg">
                    <p className="text-xs text-brand-grey-500">Payment Date</p>
                    <p className="font-medium">{formatDate((selectedApprovalRequest.request_data as any).payment_date)}</p>
                  </div>
                )}
              </div>
            )}

            {selectedApprovalRequest.request_type === 'employee_exit' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">Exit Reason</p>
                    <p className="font-medium text-red-700 capitalize">
                      {(selectedApprovalRequest.request_data as EmployeeExitData).exit_reason.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="p-3 bg-brand-grey-50 rounded-lg">
                    <p className="text-xs text-brand-grey-500">Last Working Day</p>
                    <p className="font-medium">{formatDate((selectedApprovalRequest.request_data as EmployeeExitData).last_working_day)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Justification */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">Justification</h4>
              <p className="text-brand-slate-700 whitespace-pre-wrap">
                {selectedApprovalRequest.request_type === 'employee_exit' 
                  ? (selectedApprovalRequest.request_data as EmployeeExitData).exit_details || 'No justification provided'
                  : (selectedApprovalRequest.request_data as any).justification || (selectedApprovalRequest.request_data as any).reason || 'No justification provided'}
              </p>
            </div>

            {/* Requested By & Date */}
            <div className="flex items-center justify-between text-sm text-brand-grey-500">
              <span>Requested by: {selectedApprovalRequest.requester?.full_name || 'Unknown'}</span>
              <span>Date: {formatDate(selectedApprovalRequest.created_at)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsApprovalDetailOpen(false);
                  setSelectedApprovalRequest(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  handleRejectRequest(selectedApprovalRequest.id);
                  setIsApprovalDetailOpen(false);
                  setSelectedApprovalRequest(null);
                }}
                isLoading={processingApproval === selectedApprovalRequest.id}
              >
                Reject
              </Button>
              <Button 
                variant="success" 
                onClick={() => {
                  handleApproveRequest(selectedApprovalRequest.id);
                  setIsApprovalDetailOpen(false);
                  setSelectedApprovalRequest(null);
                }}
                isLoading={processingApproval === selectedApprovalRequest.id}
              >
                Approve
              </Button>
            </div>
          </div>
        )}

        {selectedOfferForApproval && (
          <div className="space-y-4">
            {/* Candidate Info */}
            <div className="p-4 bg-brand-grey-50 rounded-lg">
              <h4 className="font-medium text-brand-slate-900 mb-2">Candidate</h4>
              <p className="text-brand-slate-700">
                {selectedOfferForApproval.candidate?.first_name} {selectedOfferForApproval.candidate?.last_name}
              </p>
              <p className="text-sm text-brand-grey-500">{selectedOfferForApproval.candidate?.email}</p>
            </div>

            {/* Offer Details */}
            <div className="space-y-3">
              <div className="p-3 bg-cyan-50 rounded-lg">
                <p className="text-xs text-cyan-600">Job Title</p>
                <p className="font-medium text-cyan-700">{selectedOfferForApproval.job_title}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-brand-grey-50 rounded-lg">
                  <p className="text-xs text-brand-grey-500">Contract Type</p>
                  <p className="font-medium capitalize">{selectedOfferForApproval.contract_type?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
                <div className="p-3 bg-brand-grey-50 rounded-lg">
                  <p className="text-xs text-brand-grey-500">Start Date</p>
                  <p className="font-medium">{selectedOfferForApproval.start_date ? formatDate(selectedOfferForApproval.start_date) : 'TBD'}</p>
                </div>
              </div>

              {selectedOfferForApproval.salary_amount && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Salary</p>
                  <p className="text-lg font-semibold text-green-700">£{selectedOfferForApproval.salary_amount.toLocaleString()}</p>
                </div>
              )}

              {selectedOfferForApproval.day_rate && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Day Rate</p>
                  <p className="text-lg font-semibold text-green-700">£{selectedOfferForApproval.day_rate.toLocaleString()}/day</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedOfferForApproval.notes && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-800 mb-2">Notes</h4>
                <p className="text-brand-slate-700 whitespace-pre-wrap">{selectedOfferForApproval.notes}</p>
              </div>
            )}

            {/* Requirement Link */}
            {selectedOfferForApproval.requirement && (
              <div className="p-3 bg-brand-grey-50 rounded-lg">
                <p className="text-xs text-brand-grey-500">For Requirement</p>
                <p className="font-medium">{selectedOfferForApproval.requirement.title}</p>
              </div>
            )}

            {/* Requested By & Date */}
            <div className="flex items-center justify-between text-sm text-brand-grey-500">
              <span>Requested by: {selectedOfferForApproval.requester?.full_name || 'Unknown'}</span>
              <span>Date: {formatDate(selectedOfferForApproval.created_at)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsApprovalDetailOpen(false);
                  setSelectedOfferForApproval(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  handleRejectOffer(selectedOfferForApproval.id);
                  setIsApprovalDetailOpen(false);
                  setSelectedOfferForApproval(null);
                }}
                isLoading={processingApproval === selectedOfferForApproval.id}
              >
                Reject
              </Button>
              <Button 
                variant="success" 
                onClick={() => {
                  handleApproveOffer(selectedOfferForApproval.id);
                  setIsApprovalDetailOpen(false);
                  setSelectedOfferForApproval(null);
                }}
                isLoading={processingApproval === selectedOfferForApproval.id}
              >
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
