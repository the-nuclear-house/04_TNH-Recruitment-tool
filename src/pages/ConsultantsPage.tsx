import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Users, 
  Search,
  Building2,
  Calendar,
  PoundSterling,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Shield,
  Flag,
  Briefcase,
  ArrowLeft,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  CalendarDays,
  List,
  Plus,
  CheckCircle,
  Edit,
  ClipboardList,
  TrendingUp,
  Gift,
  LogOut,
  AlertCircle,
  XCircle,
  Check,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle,
  Button, 
  Input,
  Badge,
  Avatar,
  EmptyState,
  Modal,
  Select,
  Textarea,
} from '@/components/ui';
import { ConfirmDialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  consultantsService, 
  consultantMeetingsService,
  missionsService,
  approvalRequestsService,
  salaryHistoryService,
  bonusPaymentsService,
  consultantExitsService,
  timesheetEntriesService,
  type DbConsultant, 
  type DbConsultantMeeting,
  type DbMission,
  type DbApprovalRequest,
  type DbSalaryHistory,
  type DbBonusPayment,
  type DbConsultantExit,
  type InductionChecklist,
  type QuarterlyFeedback,
  type AppraisalData,
  type SalaryIncreaseData,
  type BonusPaymentData,
  type EmployeeExitData,
} from '@/lib/services';
import type { BadgeVariant } from '@/components/ui';

const statusConfig: Record<string, { label: string; colour: BadgeVariant }> = {
  bench: { label: 'On Bench', colour: 'amber' },
  in_mission: { label: 'In Mission', colour: 'green' },
  on_leave: { label: 'On Leave', colour: 'blue' },
  terminated: { label: 'Terminated', colour: 'red' },
};

const meetingTypeConfig: Record<string, { label: string; colour: string; shortLabel: string }> = {
  induction: { label: 'Induction Meeting', colour: 'bg-purple-500', shortLabel: 'IND' },
  quarterly_review: { label: 'Quarterly Review', colour: 'bg-blue-500', shortLabel: 'QTR' },
  annual_appraisal: { label: 'Annual Appraisal', colour: 'bg-green-500', shortLabel: 'APR' },
};

// Timeline helpers
function getWeeksInRange(startDate: Date, numWeeks: number): Date[] {
  const weeks: Date[] = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() - current.getDay() + 1);
  
  for (let i = 0; i < numWeeks; i++) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function formatWeekLabel(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  // Get ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `W${weekNo} - ${day} ${month}`;
}

function getBarStyle(startDate: string, endDate: string | null, weeks: Date[]): { left: string; width: string } | null {
  if (weeks.length === 0) return null;
  
  const timelineStart = weeks[0];
  const timelineEnd = new Date(weeks[weeks.length - 1]);
  timelineEnd.setDate(timelineEnd.getDate() + 6);
  
  const itemStart = new Date(startDate);
  const itemEnd = endDate ? new Date(endDate) : timelineEnd;
  
  const visibleStart = itemStart < timelineStart ? timelineStart : itemStart;
  const visibleEnd = itemEnd > timelineEnd ? timelineEnd : itemEnd;
  
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  const startOffset = (visibleStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  const duration = (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24);
  
  const left = (startOffset / totalDays) * 100;
  const width = (duration / totalDays) * 100;
  
  if (width <= 0) return null;
  
  return {
    left: `${Math.max(0, left)}%`,
    width: `${Math.min(100 - left, width)}%`,
  };
}

function getMeetingPosition(meetingDate: string, weeks: Date[]): string | null {
  if (weeks.length === 0) return null;
  
  const timelineStart = weeks[0];
  const timelineEnd = new Date(weeks[weeks.length - 1]);
  timelineEnd.setDate(timelineEnd.getDate() + 6);
  
  const meeting = new Date(meetingDate);
  if (meeting < timelineStart || meeting > timelineEnd) return null;
  
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  const offset = (meeting.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  
  return `${(offset / totalDays) * 100}%`;
}

// Default checklist for induction
const defaultInductionChecklist: InductionChecklist = {
  induction_pack_presented: false,
  risk_assessment_presented: false,
  health_safety_briefing: false,
  it_systems_access: false,
  company_policies_reviewed: false,
  emergency_procedures: false,
  team_introductions: false,
  mission_briefing: false,
};

// Default feedback for quarterly review
const defaultQuarterlyFeedback: QuarterlyFeedback = {
  customer_satisfaction: 3,
  mission_satisfaction: 3,
  company_satisfaction: 3,
  work_life_balance: 3,
  career_development: 3,
  communication_rating: 3,
};

// Default appraisal data
const defaultAppraisalData: AppraisalData = {
  overall_performance: 3,
  technical_skills: 3,
  communication_skills: 3,
  teamwork: 3,
  initiative: 3,
  reliability: 3,
  goals_achieved: '',
  areas_of_strength: '',
  development_areas: '',
  training_needs: '',
  career_aspirations: '',
  salary_discussion_notes: '',
  next_year_objectives: '',
};

// ============================================
// CONSULTANTS LIST PAGE
// ============================================

export function ConsultantsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [consultants, setConsultants] = useState<DbConsultant[]>([]);
  const [meetings, setMeetings] = useState<DbConsultantMeeting[]>([]);
  const [allMissions, setAllMissions] = useState<DbMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [activeTab, setActiveTab] = useState<'gantt' | 'cards' | 'meetings'>('gantt');
  
  // Timeline state
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 14);
    return today;
  });
  const numWeeks = 12;

  // Meeting modal state
  const [isBookMeetingModalOpen, setIsBookMeetingModalOpen] = useState(false);
  const [selectedConsultantForMeeting, setSelectedConsultantForMeeting] = useState<DbConsultant | null>(null);
  const [bookMeetingForm, setBookMeetingForm] = useState({
    meeting_type: 'quarterly_review' as 'induction' | 'quarterly_review' | 'annual_appraisal',
    scheduled_date: '',
  });
  const [isBookingMeeting, setIsBookingMeeting] = useState(false);

  // Meeting detail modal
  const [selectedMeeting, setSelectedMeeting] = useState<DbConsultantMeeting | null>(null);
  const [isMeetingDetailModalOpen, setIsMeetingDetailModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [consultantsData, meetingsData, missionsData] = await Promise.all([
        consultantsService.getAll(),
        consultantMeetingsService.getAll(),
        missionsService.getAll(),
      ]);
      setConsultants(consultantsData);
      setMeetings(meetingsData);
      setAllMissions(missionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load consultants');
    } finally {
      setIsLoading(false);
    }
  };

  const weeks = useMemo(() => getWeeksInRange(timelineStart, numWeeks), [timelineStart, numWeeks]);

  // Filter consultants
  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => {
      const matchesSearch = !searchQuery || 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.reference_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.job_title?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        statusFilter === 'active' ? c.status !== 'terminated' :
        c.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [consultants, searchQuery, statusFilter]);

  // Get meetings for a consultant
  const getMeetingsForConsultant = (consultantId: string) => {
    return meetings.filter(m => m.consultant_id === consultantId);
  };

  // Get missions for a consultant
  const getMissionsForConsultant = (consultantId: string) => {
    return allMissions
      .filter(m => m.consultant_id === consultantId && m.status !== 'cancelled')
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  };

  // Check if a consultant is on bench TODAY based on mission dates
  const isOnBenchToday = (consultantId: string, consultantStatus: string): boolean => {
    if (consultantStatus === 'terminated' || consultantStatus === 'on_leave') return false;
    
    const today = new Date().toISOString().split('T')[0];
    const consultantMissions = getMissionsForConsultant(consultantId);
    
    // Check if any active/completed mission covers today
    const hasActiveMissionToday = consultantMissions.some(m => {
      if (m.status === 'cancelled' || m.status === 'on_hold') return false;
      const startDate = m.start_date;
      const endDate = m.end_date || '9999-12-31'; // If no end date, assume ongoing
      return startDate <= today && endDate >= today;
    });
    
    return !hasActiveMissionToday;
  };

  // Calculate bench count based on today's date
  const benchCountToday = useMemo(() => {
    return consultants.filter(c => 
      c.status !== 'terminated' && isOnBenchToday(c.id, c.status)
    ).length;
  }, [consultants, allMissions]);

  // Upcoming meetings
  const upcomingMeetings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return meetings
      .filter(m => m.status === 'scheduled' && m.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [meetings]);

  // Timeline navigation
  const goToPreviousWeeks = () => {
    setTimelineStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7 * 4);
      return newDate;
    });
  };

  const goToNextWeeks = () => {
    setTimelineStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7 * 4);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 14);
    setTimelineStart(today);
  };

  // Book meeting
  const handleBookMeeting = async () => {
    if (!selectedConsultantForMeeting || !bookMeetingForm.scheduled_date) {
      toast.error('Error', 'Please select a date');
      return;
    }

    setIsBookingMeeting(true);
    try {
      await consultantMeetingsService.create({
        consultant_id: selectedConsultantForMeeting.id,
        meeting_type: bookMeetingForm.meeting_type,
        scheduled_date: bookMeetingForm.scheduled_date,
        created_by: user?.id,
      });
      toast.success('Meeting Scheduled', `${meetingTypeConfig[bookMeetingForm.meeting_type].label} scheduled`);
      setIsBookMeetingModalOpen(false);
      setSelectedConsultantForMeeting(null);
      setBookMeetingForm({ meeting_type: 'quarterly_review', scheduled_date: '' });
      loadData();
    } catch (error) {
      console.error('Error booking meeting:', error);
      toast.error('Error', 'Failed to schedule meeting');
    } finally {
      setIsBookingMeeting(false);
    }
  };

  // Open meeting detail
  const openMeetingDetail = async (meetingId: string) => {
    try {
      const meeting = await consultantMeetingsService.getById(meetingId);
      if (meeting) {
        setSelectedMeeting(meeting);
        setIsMeetingDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading meeting:', error);
      toast.error('Error', 'Failed to load meeting details');
    }
  };

  // Stats - bench count based on TODAY's mission coverage
  const stats = {
    total: consultants.length,
    active: consultants.filter(c => c.status !== 'terminated').length,
    bench: benchCountToday, // Now calculated based on today's date
    inMission: consultants.filter(c => c.status !== 'terminated').length - benchCountToday - consultants.filter(c => c.status === 'on_leave').length,
    onLeave: consultants.filter(c => c.status === 'on_leave').length,
    terminated: consultants.filter(c => c.status === 'terminated').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Consultants" />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading consultants...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Consultants" 
        subtitle={`${stats.total} consultants`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Active card (primary) with breakdown */}
          <Card 
            className={`cursor-pointer transition-all flex-1 ${statusFilter === 'active' ? 'ring-2 ring-brand-cyan' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Users className="h-5 w-5 text-brand-cyan" />
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-cyan">{stats.active}</p>
                <p className="text-sm text-brand-grey-400">Active Consultants</p>
              </div>
            </div>
            <div className="border-t border-brand-grey-200/50 pt-3 flex gap-4">
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${statusFilter === 'in_mission' ? 'bg-green-100 ring-1 ring-green-400' : 'hover:bg-green-50'}`}
                onClick={(e) => { e.stopPropagation(); setStatusFilter('in_mission'); }}
              >
                <Briefcase className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">{stats.inMission}</span>
                <span className="text-brand-grey-400">On Mission</span>
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${statusFilter === 'bench' ? 'bg-amber-100 ring-1 ring-amber-400' : 'hover:bg-amber-50'}`}
                onClick={(e) => { e.stopPropagation(); setStatusFilter('bench'); }}
              >
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-600">{stats.bench}</span>
                <span className="text-brand-grey-400">On Bench</span>
              </button>
            </div>
          </Card>

          {/* Exited card */}
          <Card 
            className={`cursor-pointer transition-all w-full sm:w-44 ${statusFilter === 'terminated' ? 'ring-2 ring-red-400' : ''}`}
            onClick={() => setStatusFilter('terminated')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.terminated}</p>
                <p className="text-sm text-brand-grey-400">Exited</p>
              </div>
            </div>
          </Card>

          {/* All card */}
          <Card 
            className={`cursor-pointer transition-all w-full sm:w-44 ${statusFilter === 'all' ? 'ring-2 ring-brand-slate-500' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-grey-100 rounded-lg">
                <Users className="h-5 w-5 text-brand-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.total}</p>
                <p className="text-sm text-brand-grey-400">All</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey-400" />
            <Input
              placeholder="Search consultants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-brand-grey-100 rounded-lg p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'gantt' ? 'bg-white shadow text-brand-slate-900' : 'text-brand-grey-500 hover:text-brand-slate-700'
              }`}
              onClick={() => setActiveTab('gantt')}
            >
              <CalendarDays className="h-4 w-4" />
              Timeline
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'cards' ? 'bg-white shadow text-brand-slate-900' : 'text-brand-grey-500 hover:text-brand-slate-700'
              }`}
              onClick={() => setActiveTab('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'meetings' ? 'bg-white shadow text-brand-slate-900' : 'text-brand-grey-500 hover:text-brand-slate-700'
              }`}
              onClick={() => setActiveTab('meetings')}
            >
              <List className="h-4 w-4" />
              Meetings
              {upcomingMeetings.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-brand-cyan text-white text-xs rounded-full">
                  {upcomingMeetings.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'gantt' && (
          <>
            {/* Timeline Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={goToPreviousWeeks}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="secondary" size="sm" onClick={goToNextWeeks}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-brand-grey-500">
                {formatWeekLabel(weeks[0])} - {formatWeekLabel(weeks[weeks.length - 1])}
              </p>
            </div>

            {/* Gantt Chart */}
            {filteredConsultants.length === 0 ? (
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No consultants found"
                description="No consultants match your search criteria"
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  {/* Timeline Header */}
                  <div className="flex border-b border-brand-grey-200 min-w-[900px]">
                    <div className="w-56 flex-shrink-0 p-3 bg-brand-grey-50 font-medium text-brand-slate-700 border-r border-brand-grey-200">
                      Consultant
                    </div>
                    <div className="flex-1 flex">
                      {weeks.map((week, idx) => {
                        const isCurrentWeek = new Date() >= week && new Date() < new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000);
                        return (
                          <div 
                            key={idx} 
                            className={`flex-1 p-2 text-center text-xs border-r border-brand-grey-100 ${
                              isCurrentWeek ? 'bg-brand-cyan/10 font-medium' : 'bg-brand-grey-50'
                            }`}
                          >
                            {formatWeekLabel(week)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consultant Rows */}
                  {filteredConsultants.map(consultant => {
                    const consultantMeetings = getMeetingsForConsultant(consultant.id);
                    const consultantMissions = getMissionsForConsultant(consultant.id);
                    const isTerminated = consultant.status === 'terminated';
                    
                    // For terminated consultants, use terminated_at as end date
                    const terminatedDate = consultant.terminated_at && consultant.terminated_at.length > 0 
                      ? consultant.terminated_at 
                      : null;
                    const consultantEndDate = consultant.end_date && consultant.end_date.length > 0 
                      ? consultant.end_date 
                      : null;
                    
                    // For terminated consultants without a termination date, default to today to show the bar ending
                    const effectiveEndDate = isTerminated 
                      ? (terminatedDate || consultantEndDate || new Date().toISOString().split('T')[0])
                      : consultantEndDate;
                    
                    // Get termination marker position - only show if we have a specific date
                    const terminationPosition = isTerminated && (terminatedDate || consultantEndDate)
                      ? getMeetingPosition(terminatedDate || consultantEndDate!, weeks) 
                      : null;

                    // Calculate timeline boundaries
                    const timelineStartDate = weeks[0];
                    const timelineEndDate = new Date(weeks[weeks.length - 1]);
                    timelineEndDate.setDate(timelineEndDate.getDate() + 6);
                    const totalDays = (timelineEndDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);

                    // Employment period (from consultant start to end/today)
                    const employmentStart = new Date(consultant.start_date);
                    const employmentEnd = effectiveEndDate ? new Date(effectiveEndDate) : new Date('2099-12-31');

                    // Build segments: missions (green) and bench periods (amber)
                    const segments: { start: Date; end: Date; type: 'mission' | 'bench' | 'leave' }[] = [];
                    
                    // Sort missions by start date
                    const sortedMissions = [...consultantMissions]
                      .filter(m => m.status !== 'cancelled')
                      .sort((a, b) => a.start_date.localeCompare(b.start_date));

                    // If on leave, show entire period as leave
                    if (consultant.status === 'on_leave') {
                      segments.push({
                        start: employmentStart > timelineStartDate ? employmentStart : timelineStartDate,
                        end: employmentEnd < timelineEndDate ? employmentEnd : timelineEndDate,
                        type: 'leave'
                      });
                    } else {
                      // Calculate bench and mission segments within the visible timeline
                      let currentDate = employmentStart > timelineStartDate ? employmentStart : timelineStartDate;
                      const visibleEnd = employmentEnd < timelineEndDate ? employmentEnd : timelineEndDate;

                      sortedMissions.forEach(mission => {
                        const missionStart = new Date(mission.start_date);
                        const missionEnd = mission.end_date ? new Date(mission.end_date) : new Date('2099-12-31');

                        // If there's a gap before this mission, it's bench time
                        if (missionStart > currentDate && currentDate < visibleEnd) {
                          const benchEnd = missionStart < visibleEnd ? missionStart : visibleEnd;
                          if (benchEnd > currentDate) {
                            segments.push({
                              start: new Date(currentDate),
                              end: benchEnd,
                              type: 'bench'
                            });
                          }
                        }

                        // Add mission segment if it overlaps with visible range
                        const visibleMissionStart = missionStart > currentDate ? missionStart : currentDate;
                        const visibleMissionEnd = missionEnd < visibleEnd ? missionEnd : visibleEnd;
                        
                        if (visibleMissionStart < visibleMissionEnd && visibleMissionStart < visibleEnd) {
                          segments.push({
                            start: visibleMissionStart > timelineStartDate ? visibleMissionStart : timelineStartDate,
                            end: visibleMissionEnd,
                            type: 'mission'
                          });
                          currentDate = missionEnd > currentDate ? missionEnd : currentDate;
                        }
                      });

                      // If there's remaining time after all missions, it's bench
                      if (currentDate < visibleEnd) {
                        segments.push({
                          start: new Date(currentDate),
                          end: visibleEnd,
                          type: 'bench'
                        });
                      }
                    }
                    
                    return (
                      <div 
                        key={consultant.id} 
                        className={`flex border-b border-brand-grey-100 hover:bg-brand-grey-50/50 transition-colors min-w-[900px] ${isTerminated ? 'opacity-60' : ''}`}
                      >
                        {/* Consultant Info */}
                        <div 
                          className="w-56 flex-shrink-0 p-3 border-r border-brand-grey-200 cursor-pointer hover:bg-brand-grey-50"
                          onClick={() => navigate(`/consultants/${consultant.id}`)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="sm" />
                            <div className="min-w-0">
                              <p className={`font-medium text-sm truncate ${isTerminated ? 'line-through text-brand-grey-400' : 'text-brand-slate-900'}`}>
                                {consultant.first_name} {consultant.last_name}
                              </p>
                              <p className="text-xs text-brand-grey-400 truncate flex items-center gap-1">
                                {consultant.reference_id}
                                {isTerminated && (
                                  <Badge variant="red" className="text-[10px] px-1 py-0">Exited</Badge>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Timeline */}
                        <div className="flex-1 relative py-2">
                          {/* Mission and Bench segments */}
                          {segments.map((segment, idx) => {
                            const segStart = segment.start.getTime();
                            const segEnd = segment.end.getTime();
                            const tlStart = timelineStartDate.getTime();
                            
                            // Calculate position and width as percentages
                            const left = Math.max(0, ((segStart - tlStart) / (totalDays * 24 * 60 * 60 * 1000)) * 100);
                            const width = Math.min(100 - left, ((segEnd - segStart) / (totalDays * 24 * 60 * 60 * 1000)) * 100);
                            
                            if (width <= 0) return null;
                            
                            return (
                              <div
                                key={idx}
                                className={`absolute top-1/2 -translate-y-1/2 h-5 rounded ${
                                  isTerminated ? 'bg-red-200' :
                                  segment.type === 'mission' ? 'bg-green-500' :
                                  segment.type === 'leave' ? 'bg-blue-400' :
                                  'bg-amber-400'
                                }`}
                                style={{ 
                                  left: `${left}%`, 
                                  width: `${width}%`, 
                                  minWidth: '2px' 
                                }}
                                title={segment.type === 'mission' ? 'On Mission' : segment.type === 'leave' ? 'On Leave' : 'On Bench'}
                              />
                            );
                          })}
                          
                          {/* Termination marker */}
                          {isTerminated && terminationPosition && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md border-2 border-white z-10"
                              style={{ left: terminationPosition }}
                              title={`Exit date: ${formatDate(consultant.terminated_at || consultant.end_date || '')}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </div>
                          )}
                          
                          {/* Meeting markers */}
                          {consultantMeetings.map(meeting => {
                            const position = getMeetingPosition(meeting.scheduled_date, weeks);
                            if (!position) return null;
                            
                            const typeConfig = meetingTypeConfig[meeting.meeting_type];
                            const isCompleted = meeting.status === 'completed';
                            
                            return (
                              <div
                                key={meeting.id}
                                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-125 transition-transform shadow-md border-2 border-white ${
                                  isCompleted ? typeConfig.colour : 'bg-white border-2'
                                }`}
                                style={{ 
                                  left: position,
                                  borderColor: !isCompleted ? typeConfig.colour.replace('bg-', '').includes('purple') ? '#9333ea' : typeConfig.colour.replace('bg-', '').includes('cyan') ? '#06b6d4' : '#22c55e' : 'white',
                                  color: !isCompleted ? (typeConfig.colour.includes('purple') ? '#9333ea' : typeConfig.colour.includes('cyan') ? '#06b6d4' : '#22c55e') : 'white'
                                }}
                                title={`${typeConfig.label} - ${formatDate(meeting.scheduled_date)} ${isCompleted ? '(Completed)' : '(Scheduled)'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMeetingDetail(meeting.id);
                                }}
                              >
                                {typeConfig.shortLabel.charAt(0)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-grey-500">
              <span className="font-medium">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded bg-green-500" />
                <span>On Mission</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded bg-amber-400" />
                <span>On Bench</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded bg-blue-400" />
                <span>On Leave</span>
              </div>
              <span className="mx-2">|</span>
              {Object.entries(meetingTypeConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded-full ${config.colour}`} />
                  <span>{config.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-brand-grey-300 border-2 border-dashed border-brand-grey-400" />
                <span>Scheduled</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConsultants.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No consultants found"
                  description="No consultants match your search criteria"
                />
              </div>
            ) : (
              filteredConsultants.map(consultant => {
                const statusInfo = statusConfig[consultant.status] || statusConfig.bench;
                const consultantMeetings = getMeetingsForConsultant(consultant.id);
                const nextMeeting = consultantMeetings.find(m => m.status === 'scheduled');
                
                return (
                  <Card 
                    key={consultant.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/consultants/${consultant.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-brand-slate-900 truncate">
                            {consultant.first_name} {consultant.last_name}
                          </h3>
                          <Badge variant={statusInfo.colour}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-brand-grey-500 truncate">{consultant.job_title || 'Consultant'}</p>
                        <p className="text-xs text-brand-grey-400">{consultant.reference_id}</p>
                        
                        <div className="mt-3 pt-3 border-t border-brand-grey-100 space-y-1 text-sm">
                          {consultant.location && (
                            <div className="flex items-center gap-2 text-brand-grey-500">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{consultant.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-brand-grey-500">
                            <Calendar className="h-3 w-3" />
                            <span>Started {formatDate(consultant.start_date)}</span>
                          </div>
                          {consultant.day_rate && (
                            <div className="flex items-center gap-2 text-brand-grey-500">
                              <PoundSterling className="h-3 w-3" />
                              <span>£{consultant.day_rate}/day</span>
                            </div>
                          )}
                          {nextMeeting && (
                            <div className="flex items-center gap-2 text-brand-cyan">
                              <ClipboardList className="h-3 w-3" />
                              <span>Next: {meetingTypeConfig[nextMeeting.meeting_type].label} on {formatDate(nextMeeting.scheduled_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-slate-900">Upcoming Meetings</h2>
            </div>
            
            {upcomingMeetings.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-12 w-12" />}
                title="No upcoming meetings"
                description="Schedule meetings with consultants to see them here"
              />
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map(meeting => {
                  const consultant = consultants.find(c => c.id === meeting.consultant_id);
                  const typeConfig = meetingTypeConfig[meeting.meeting_type];
                  
                  return (
                    <Card 
                      key={meeting.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openMeetingDetail(meeting.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${typeConfig.colour.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                          <ClipboardList className={`h-5 w-5 ${typeConfig.colour.replace('bg-', 'text-')}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-brand-slate-900">{typeConfig.label}</span>
                            <Badge variant="grey">{meeting.status}</Badge>
                          </div>
                          <p className="text-sm text-brand-grey-500">
                            with {consultant?.first_name} {consultant?.last_name} ({consultant?.reference_id})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-brand-slate-900">{formatDate(meeting.scheduled_date)}</p>
                          {meeting.scheduled_time && (
                            <p className="text-sm text-brand-grey-500">{meeting.scheduled_time}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book Meeting Modal */}
      <Modal
        isOpen={isBookMeetingModalOpen}
        onClose={() => {
          setIsBookMeetingModalOpen(false);
          setSelectedConsultantForMeeting(null);
        }}
        title="Schedule Meeting"
        size="sm"
      >
        <div className="space-y-4">
          {selectedConsultantForMeeting && (
            <div className="p-3 bg-brand-grey-50 rounded-lg flex items-center gap-3">
              <Avatar name={`${selectedConsultantForMeeting.first_name} ${selectedConsultantForMeeting.last_name}`} size="sm" />
              <div>
                <p className="font-medium text-brand-slate-900">
                  {selectedConsultantForMeeting.first_name} {selectedConsultantForMeeting.last_name}
                </p>
                <p className="text-sm text-brand-grey-500">{selectedConsultantForMeeting.reference_id}</p>
              </div>
            </div>
          )}
          
          <Select
            label="Meeting Type"
            options={[
              { value: 'induction', label: 'Induction Meeting' },
              { value: 'quarterly_review', label: 'Quarterly Review' },
              { value: 'annual_appraisal', label: 'Annual Appraisal' },
            ]}
            value={bookMeetingForm.meeting_type}
            onChange={(e) => setBookMeetingForm(prev => ({ 
              ...prev, 
              meeting_type: e.target.value as 'induction' | 'quarterly_review' | 'annual_appraisal' 
            }))}
          />
          
          <Input
            label="Scheduled Date"
            type="date"
            value={bookMeetingForm.scheduled_date}
            onChange={(e) => setBookMeetingForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsBookMeetingModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleBookMeeting}
              isLoading={isBookingMeeting}
            >
              Schedule Meeting
            </Button>
          </div>
        </div>
      </Modal>

      {/* Meeting Detail Modal - will be expanded in ConsultantProfilePage */}
      <Modal
        isOpen={isMeetingDetailModalOpen}
        onClose={() => {
          setIsMeetingDetailModalOpen(false);
          setSelectedMeeting(null);
        }}
        title={selectedMeeting ? meetingTypeConfig[selectedMeeting.meeting_type]?.label : 'Meeting Details'}
        size="lg"
      >
        {selectedMeeting && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
              <div>
                <p className="text-xs text-brand-grey-400">Consultant</p>
                <p className="font-medium text-brand-slate-900">
                  {selectedMeeting.consultant?.first_name} {selectedMeeting.consultant?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400">Date</p>
                <p className="font-medium text-brand-slate-900">{formatDate(selectedMeeting.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400">Status</p>
                <Badge variant={selectedMeeting.status === 'completed' ? 'green' : 'amber'}>
                  {selectedMeeting.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-brand-grey-400">Type</p>
                <p className="font-medium text-brand-slate-900">
                  {meetingTypeConfig[selectedMeeting.meeting_type]?.label}
                </p>
              </div>
            </div>

            {selectedMeeting.general_comments && (
              <div>
                <p className="text-sm font-medium text-brand-slate-700 mb-1">General Comments</p>
                <p className="text-sm text-brand-grey-500">{selectedMeeting.general_comments}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="secondary" 
                onClick={() => setIsMeetingDetailModalOpen(false)}
              >
                Close
              </Button>
              <Button 
                variant="primary"
                onClick={() => {
                  setIsMeetingDetailModalOpen(false);
                  navigate(`/consultants/${selectedMeeting.consultant_id}`);
                }}
              >
                View Full Details
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================
// CONSULTANT PROFILE PAGE
// ============================================

export function ConsultantProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [consultant, setConsultant] = useState<DbConsultant | null>(null);
  const [meetings, setMeetings] = useState<DbConsultantMeeting[]>([]);
  const [missions, setMissions] = useState<DbMission[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<DbSalaryHistory[]>([]);
  const [bonusPayments, setBonusPayments] = useState<DbBonusPayment[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<DbApprovalRequest[]>([]);
  const [exitRecord, setExitRecord] = useState<DbConsultantExit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Book meeting modal
  const [isBookMeetingModalOpen, setIsBookMeetingModalOpen] = useState(false);
  const [bookMeetingForm, setBookMeetingForm] = useState({
    meeting_type: 'quarterly_review' as 'induction' | 'quarterly_review' | 'annual_appraisal',
    scheduled_date: '',
  });
  const [isBookingMeeting, setIsBookingMeeting] = useState(false);

  // Complete meeting modal
  const [selectedMeetingToComplete, setSelectedMeetingToComplete] = useState<DbConsultantMeeting | null>(null);
  const [isCompleteMeetingModalOpen, setIsCompleteMeetingModalOpen] = useState(false);
  const [completeMeetingForm, setCompleteMeetingForm] = useState({
    general_comments: '',
    risks_identified: '',
    consultant_requests: '',
    induction_checklist: { ...defaultInductionChecklist },
    quarterly_feedback: { ...defaultQuarterlyFeedback },
    appraisal_data: { ...defaultAppraisalData },
  });
  const [isCompletingMeeting, setIsCompletingMeeting] = useState(false);

  // HR Process modals
  const [isProcessMenuOpen, setIsProcessMenuOpen] = useState(false);
  const [isSalaryIncreaseModalOpen, setIsSalaryIncreaseModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [salaryIncreaseForm, setSalaryIncreaseForm] = useState({
    new_salary: '',
    salary_type: 'annual_salary' as 'annual_salary' | 'day_rate',
    reason: '',
    effective_month: new Date().getMonth() + 1,
    effective_year: new Date().getFullYear(),
  });

  const [bonusForm, setBonusForm] = useState({
    amount: '',
    bonus_type: 'performance' as 'performance' | 'retention' | 'project' | 'referral' | 'other',
    reason: '',
    payment_month: new Date().getMonth() + 1,
    payment_year: new Date().getFullYear(),
  });

  const [exitForm, setExitForm] = useState({
    exit_reason: 'resignation' as 'resignation' | 'redundancy' | 'end_of_contract' | 'dismissal' | 'mutual_agreement' | 'retirement',
    exit_details: '',
    last_working_day: '',
  });
  const [exitValidationErrors, setExitValidationErrors] = useState<string[]>([]);
  const [isExitShaking, setIsExitShaking] = useState(false);

  // HR can edit consultant details
  const canEditDates = permissions.isHR || permissions.isHRManager || permissions.isAdmin;

  // HR Edit Consultant Modal
  const [isEditConsultantModalOpen, setIsEditConsultantModalOpen] = useState(false);
  const [editConsultantForm, setEditConsultantForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    job_title: '',
    company_email: '',
    contract_type: 'permanent' as 'permanent' | 'contract',
    salary_amount: '',
    day_rate: '',
    start_date: '',
    end_date: '',
    security_vetting: '',
    annual_leave_allowance: '',
  });
  const [editConsultantErrors, setEditConsultantErrors] = useState<string[]>([]);
  const [isSavingConsultant, setIsSavingConsultant] = useState(false);
  const [consultantTimesheetEntries, setConsultantTimesheetEntries] = useState<any[]>([]);

  const openEditConsultantModal = async () => {
    if (!consultant) return;
    // Load timesheet entries to validate date changes
    try {
      const entries = await timesheetEntriesService.getByConsultant(consultant.id);
      setConsultantTimesheetEntries(entries);
    } catch {
      setConsultantTimesheetEntries([]);
    }
    setEditConsultantForm({
      first_name: consultant.first_name,
      last_name: consultant.last_name,
      email: consultant.email,
      phone: consultant.phone || '',
      location: consultant.location || '',
      job_title: consultant.job_title || '',
      company_email: consultant.company_email || '',
      contract_type: (consultant.contract_type as 'permanent' | 'contract') || 'permanent',
      salary_amount: consultant.salary_amount?.toString() || '',
      day_rate: consultant.day_rate?.toString() || '',
      start_date: consultant.start_date,
      end_date: consultant.end_date || '',
      security_vetting: consultant.security_vetting || '',
      annual_leave_allowance: consultant.annual_leave_allowance?.toString() || '25',
    });
    setEditConsultantErrors([]);
    setIsEditConsultantModalOpen(true);
  };

  const handleSaveConsultant = async () => {
    if (!consultant) return;
    const errors: string[] = [];
    
    // Validate required fields
    if (!editConsultantForm.first_name.trim()) errors.push('First name is required');
    if (!editConsultantForm.last_name.trim()) errors.push('Last name is required');
    if (!editConsultantForm.email.trim()) errors.push('Email is required');
    if (!editConsultantForm.start_date) errors.push('Start date is required');
    
    // Validate start date against existing timesheet entries
    if (editConsultantForm.start_date && consultantTimesheetEntries.length > 0) {
      const earliestEntry = consultantTimesheetEntries
        .map(e => e.date)
        .sort()[0];
      if (earliestEntry && editConsultantForm.start_date > earliestEntry) {
        errors.push(`Start date cannot be after existing timesheet entries (earliest: ${earliestEntry})`);
      }
    }
    
    // Validate end date against existing timesheet entries
    if (editConsultantForm.end_date && consultantTimesheetEntries.length > 0) {
      const latestEntry = consultantTimesheetEntries
        .map(e => e.date)
        .sort()
        .reverse()[0];
      if (latestEntry && editConsultantForm.end_date < latestEntry) {
        errors.push(`End date cannot be before existing timesheet entries (latest: ${latestEntry})`);
      }
    }
    
    // Validate end date is after start date
    if (editConsultantForm.end_date && editConsultantForm.start_date > editConsultantForm.end_date) {
      errors.push('End date must be after start date');
    }
    
    if (errors.length > 0) {
      setEditConsultantErrors(errors);
      return;
    }
    
    try {
      setIsSavingConsultant(true);
      const updated = await consultantsService.update(consultant.id, {
        first_name: editConsultantForm.first_name.trim(),
        last_name: editConsultantForm.last_name.trim(),
        email: editConsultantForm.email.trim(),
        phone: editConsultantForm.phone.trim() || undefined,
        location: editConsultantForm.location.trim() || undefined,
        job_title: editConsultantForm.job_title.trim() || undefined,
        company_email: editConsultantForm.company_email.trim() || undefined,
        contract_type: editConsultantForm.contract_type,
        salary_amount: editConsultantForm.salary_amount ? parseFloat(editConsultantForm.salary_amount) : undefined,
        day_rate: editConsultantForm.day_rate ? parseFloat(editConsultantForm.day_rate) : undefined,
        start_date: editConsultantForm.start_date,
        end_date: editConsultantForm.end_date || undefined,
        security_vetting: editConsultantForm.security_vetting || undefined,
      });
      // Update annual leave allowance separately if changed
      if (editConsultantForm.annual_leave_allowance !== consultant.annual_leave_allowance?.toString()) {
        await consultantsService.update(consultant.id, {
          annual_leave_allowance: parseInt(editConsultantForm.annual_leave_allowance) || 25,
        } as any);
      }
      setConsultant({ ...consultant, ...updated });
      toast.success('Updated', 'Consultant details updated successfully');
      setIsEditConsultantModalOpen(false);
      loadData(); // Reload to get fresh data
    } catch (error: any) {
      toast.error('Error', error.message || 'Failed to update consultant');
    } finally {
      setIsSavingConsultant(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [consultantData, meetingsData, missionsData, salaryData, bonusData, approvalsData, exitData] = await Promise.all([
        consultantsService.getById(id!),
        consultantMeetingsService.getByConsultant(id!),
        missionsService.getByConsultant(id!),
        salaryHistoryService.getByConsultant(id!),
        bonusPaymentsService.getByConsultant(id!),
        approvalRequestsService.getByConsultant(id!),
        consultantExitsService.getByConsultant(id!),
      ]);
      setConsultant(consultantData);
      setMeetings(meetingsData);
      setMissions(missionsData);
      setSalaryHistory(salaryData);
      setBonusPayments(bonusData);
      setApprovalRequests(approvalsData);
      setExitRecord(exitData);
    } catch (error) {
      console.error('Error loading consultant:', error);
      toast.error('Error', 'Failed to load consultant');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await consultantsService.delete(id!, user?.id);
      toast.success('Consultant Deleted', 'The consultant has been deleted');
      navigate('/consultants');
    } catch (error) {
      console.error('Error deleting consultant:', error);
      toast.error('Error', 'Failed to delete consultant');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBookMeeting = async () => {
    if (!bookMeetingForm.scheduled_date) {
      toast.error('Error', 'Please select a date');
      return;
    }

    setIsBookingMeeting(true);
    try {
      await consultantMeetingsService.create({
        consultant_id: id!,
        meeting_type: bookMeetingForm.meeting_type,
        scheduled_date: bookMeetingForm.scheduled_date,
        created_by: user?.id,
      });
      toast.success('Meeting Scheduled', `${meetingTypeConfig[bookMeetingForm.meeting_type].label} scheduled`);
      setIsBookMeetingModalOpen(false);
      setBookMeetingForm({ meeting_type: 'quarterly_review', scheduled_date: '' });
      loadData();
    } catch (error) {
      console.error('Error booking meeting:', error);
      toast.error('Error', 'Failed to schedule meeting');
    } finally {
      setIsBookingMeeting(false);
    }
  };

  const openCompleteMeetingModal = (meeting: DbConsultantMeeting) => {
    setSelectedMeetingToComplete(meeting);
    // Pre-populate form with existing data if available
    setCompleteMeetingForm({
      general_comments: meeting.general_comments || '',
      risks_identified: meeting.risks_identified || '',
      consultant_requests: meeting.consultant_requests || '',
      induction_checklist: meeting.induction_checklist || { ...defaultInductionChecklist },
      quarterly_feedback: meeting.quarterly_feedback || { ...defaultQuarterlyFeedback },
      appraisal_data: meeting.appraisal_data || { ...defaultAppraisalData },
    });
    setIsCompleteMeetingModalOpen(true);
  };

  const handleCompleteMeeting = async () => {
    if (!selectedMeetingToComplete) return;

    setIsCompletingMeeting(true);
    try {
      const updateData: any = {
        general_comments: completeMeetingForm.general_comments,
        risks_identified: completeMeetingForm.risks_identified,
        consultant_requests: completeMeetingForm.consultant_requests,
        conducted_by: user?.id,
      };

      if (selectedMeetingToComplete.meeting_type === 'induction') {
        updateData.induction_checklist = completeMeetingForm.induction_checklist;
      } else if (selectedMeetingToComplete.meeting_type === 'quarterly_review') {
        updateData.quarterly_feedback = completeMeetingForm.quarterly_feedback;
      } else if (selectedMeetingToComplete.meeting_type === 'annual_appraisal') {
        updateData.appraisal_data = completeMeetingForm.appraisal_data;
      }

      await consultantMeetingsService.complete(selectedMeetingToComplete.id, updateData);
      toast.success('Meeting Completed', 'Meeting notes have been saved');
      setIsCompleteMeetingModalOpen(false);
      setSelectedMeetingToComplete(null);
      loadData();
    } catch (error) {
      console.error('Error completing meeting:', error);
      toast.error('Error', 'Failed to save meeting');
    } finally {
      setIsCompletingMeeting(false);
    }
  };

  // HR Process handlers
  const handleSubmitSalaryIncrease = async () => {
    if (!salaryIncreaseForm.new_salary || !salaryIncreaseForm.reason) {
      toast.error('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      // Auto-detect salary type from consultant contract type
      const isContractor = consultant?.contract_type === 'contract';
      const salaryType = isContractor ? 'day_rate' : 'annual_salary';
      const currentSalary = isContractor 
        ? consultant?.day_rate || 0 
        : consultant?.salary_amount || 0;

      await approvalRequestsService.create({
        request_type: 'salary_increase',
        consultant_id: id!,
        request_data: {
          current_salary: currentSalary,
          new_salary: parseFloat(salaryIncreaseForm.new_salary),
          salary_type: salaryType,
          reason: salaryIncreaseForm.reason,
        } as SalaryIncreaseData,
        effective_month: salaryIncreaseForm.effective_month,
        effective_year: salaryIncreaseForm.effective_year,
        requested_by: user!.id,
        hr_required: true, // Requires HR to process payroll change
      });

      toast.success('Request Submitted', `${isContractor ? 'Rate' : 'Salary'} increase request sent for director approval`);
      setIsSalaryIncreaseModalOpen(false);
      setSalaryIncreaseForm({
        new_salary: '',
        salary_type: 'annual_salary',
        reason: '',
        effective_month: new Date().getMonth() + 1,
        effective_year: new Date().getFullYear(),
      });
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Error', 'Failed to submit request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleSubmitBonus = async () => {
    if (!bonusForm.amount || !bonusForm.reason) {
      toast.error('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await approvalRequestsService.create({
        request_type: 'bonus_payment',
        consultant_id: id!,
        request_data: {
          amount: parseFloat(bonusForm.amount),
          bonus_type: bonusForm.bonus_type,
          reason: bonusForm.reason,
        } as BonusPaymentData,
        effective_month: bonusForm.payment_month,
        effective_year: bonusForm.payment_year,
        requested_by: user!.id,
        hr_required: true, // Requires HR to process bonus payment
      });

      toast.success('Request Submitted', 'Bonus payment request sent for director approval');
      setIsBonusModalOpen(false);
      setBonusForm({
        amount: '',
        bonus_type: 'performance',
        reason: '',
        payment_month: new Date().getMonth() + 1,
        payment_year: new Date().getFullYear(),
      });
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Error', 'Failed to submit request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleSubmitExit = async () => {
    const errors: string[] = [];
    
    if (!exitForm.last_working_day) errors.push('last_working_day');
    if (!exitForm.exit_details.trim()) errors.push('exit_details');
    
    if (errors.length > 0) {
      setExitValidationErrors(errors);
      setIsExitShaking(true);
      setTimeout(() => setIsExitShaking(false), 500);
      return;
    }
    
    setExitValidationErrors([]);
    const exitDate = new Date(exitForm.last_working_day);

    setIsSubmittingRequest(true);
    try {
      await approvalRequestsService.create({
        request_type: 'employee_exit',
        consultant_id: id!,
        request_data: {
          exit_reason: exitForm.exit_reason,
          exit_details: exitForm.exit_details,
          last_working_day: exitForm.last_working_day,
        } as EmployeeExitData,
        effective_month: exitDate.getMonth() + 1,
        effective_year: exitDate.getFullYear(),
        requested_by: user!.id,
        hr_required: true, // Exit requires both Director and HR approval
      });

      toast.success('Request Submitted', 'Exit request sent for director and HR approval');
      setIsExitModalOpen(false);
      setExitForm({
        exit_reason: 'resignation',
        exit_details: '',
        last_working_day: '',
      });
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Error', 'Failed to submit request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Get pending approval requests
  const pendingApprovals = approvalRequests.filter(r => r.status === 'pending' || r.status === 'pending_hr');

  // Month names for display
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Loading..." />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading consultant...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="min-h-screen">
        <Header title="Consultant Not Found" />
        <div className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Consultant not found"
            description="The consultant you're looking for doesn't exist or has been removed."
            action={{ label: 'Back to Consultants', onClick: () => navigate('/consultants') }}
          />
        </div>
      </div>
    );
  }

  const status = statusConfig[consultant.status] || statusConfig.bench;
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen">
      <Header
        title="Consultant Profile"
        actions={
          <div className="flex items-center gap-2">
            {canEditDates && (
              <Button
                variant="secondary"
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={openEditConsultantModal}
              >
                Edit
              </Button>
            )}
            {permissions.isAdmin && (
              <Button
                variant="danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/consultants')}
            >
              Back
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="xl" />
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-brand-slate-900">
                  {consultant.first_name} {consultant.last_name}
                </h1>
                <Badge variant={status.colour}>{status.label}</Badge>
              </div>
              <p className="text-brand-grey-500 mb-1">{consultant.job_title || 'Consultant'}</p>
              {consultant.reference_id && (
                <p className="text-xs text-brand-grey-400">ID: {consultant.reference_id}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:border-l md:border-brand-grey-200 md:pl-6">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-brand-grey-400" />
                <a href={`mailto:${consultant.email}`} className="text-brand-cyan hover:underline">
                  {consultant.email}
                </a>
              </div>
              {consultant.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-brand-grey-400" />
                  <span className="text-brand-slate-700">{consultant.phone}</span>
                </div>
              )}
              {consultant.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-brand-grey-400" />
                  <span className="text-brand-slate-700">{consultant.location}</span>
                </div>
              )}
              {consultant.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin className="h-4 w-4 text-brand-grey-400" />
                  <a href={consultant.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Career Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Career Management Section */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Career Management</CardTitle>
              </CardHeader>

              {/* Quick Action - Schedule Meeting */}
              {consultant.status !== 'terminated' && (
                <div 
                  className="mb-6 p-4 bg-gradient-to-r from-brand-cyan/10 to-brand-cyan/5 border border-brand-cyan/20 rounded-xl cursor-pointer hover:from-brand-cyan/20 hover:to-brand-cyan/10 transition-all group"
                  onClick={() => setIsBookMeetingModalOpen(true)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-cyan rounded-xl text-white group-hover:scale-110 transition-transform">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-brand-slate-900">Schedule Meeting</h4>
                      <p className="text-sm text-brand-grey-500">Book an induction, quarterly review, or annual appraisal</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-brand-cyan" />
                  </div>
                </div>
              )}

              {/* Scheduled Meetings */}
              {scheduledMeetings.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-brand-slate-700 mb-3">Scheduled Meetings</h4>
                  <div className="space-y-2">
                    {scheduledMeetings.map(meeting => {
                      const typeConfig = meetingTypeConfig[meeting.meeting_type];
                      return (
                        <div 
                          key={meeting.id} 
                          className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${typeConfig.colour}`} />
                            <div>
                              <p className="font-medium text-brand-slate-900">{typeConfig.label}</p>
                              <p className="text-sm text-brand-grey-500">{formatDate(meeting.scheduled_date)}</p>
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle className="h-4 w-4" />}
                            onClick={() => openCompleteMeetingModal(meeting)}
                          >
                            Complete
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Meetings */}
              {completedMeetings.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-brand-slate-700 mb-3">Meeting History</h4>
                  <div className="space-y-2">
                    {completedMeetings.map(meeting => {
                      const typeConfig = meetingTypeConfig[meeting.meeting_type];
                      return (
                        <div 
                          key={meeting.id} 
                          className="flex items-center justify-between p-3 bg-brand-grey-50 rounded-lg cursor-pointer hover:bg-brand-grey-100 transition-colors"
                          onClick={() => openCompleteMeetingModal(meeting)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${typeConfig.colour}`} />
                            <div>
                              <p className="font-medium text-brand-slate-900">{typeConfig.label}</p>
                              <p className="text-sm text-brand-grey-500">
                                {formatDate(meeting.scheduled_date)} - Completed {meeting.completed_at ? formatDate(meeting.completed_at) : ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant="green">Completed</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : scheduledMeetings.length === 0 && (
                <p className="text-center text-brand-grey-400 py-4">No meetings recorded yet</p>
              )}
            </Card>

            {/* Skills */}
            {consultant.skills && consultant.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <div className="flex flex-wrap gap-2">
                  {consultant.skills.map((skill, idx) => (
                    <Badge key={idx} variant="grey">{skill}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Mission History */}
            <Card>
              <CardHeader>
                <CardTitle>Mission History</CardTitle>
              </CardHeader>
              {missions.length > 0 ? (
                <div className="space-y-3">
                  {missions.map(mission => (
                    <div key={mission.id} className="p-3 border border-brand-grey-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-brand-slate-900">{mission.name}</h4>
                        <Badge variant={mission.status === 'active' ? 'green' : 'grey'}>{mission.status}</Badge>
                      </div>
                      <p className="text-sm text-brand-grey-500">
                        {formatDate(mission.start_date)} - {mission.end_date ? formatDate(mission.end_date) : 'Ongoing'}
                      </p>
                      <p className="text-sm text-brand-grey-500">£{mission.sold_daily_rate}/day</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-brand-grey-400 py-4">No missions yet</p>
              )}
            </Card>

            {/* Financial History */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {consultant.contract_type === 'contract' ? 'Rate & Bonus History' : 'Salary & Bonus History'}
                </CardTitle>
              </CardHeader>

              {/* Quick Actions - Request Changes (hidden from HR who can edit directly) */}
              {consultant.status !== 'terminated' && !canEditDates && (
                <div className="mb-6 grid grid-cols-2 gap-3">
                  <div 
                    className="p-4 bg-gradient-to-r from-green-50 to-green-50/50 border border-green-200 rounded-xl cursor-pointer hover:from-green-100 hover:to-green-50 transition-all group"
                    onClick={() => setIsSalaryIncreaseModalOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-green-800 text-sm">
                          {consultant.contract_type === 'contract' ? 'Request Rate Increase' : 'Request Salary Increase'}
                        </h4>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="p-4 bg-gradient-to-r from-purple-50 to-purple-50/50 border border-purple-200 rounded-xl cursor-pointer hover:from-purple-100 hover:to-purple-50 transition-all group"
                    onClick={() => setIsBonusModalOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-800 text-sm">Request Bonus</h4>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Financial Approvals */}
              {pendingApprovals.filter(r => r.request_type !== 'employee_exit').length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Pending Approvals
                  </h4>
                  {pendingApprovals.filter(r => r.request_type !== 'employee_exit').map(req => (
                    <div key={req.id} className="text-sm text-amber-700 flex items-center justify-between py-1">
                      <span>
                        {req.request_type === 'salary_increase' && `${consultant.contract_type === 'contract' ? 'Rate' : 'Salary'} increase to £${(req.request_data as SalaryIncreaseData).new_salary.toLocaleString()}`}
                        {req.request_type === 'bonus_payment' && `Bonus £${(req.request_data as BonusPaymentData).amount.toLocaleString()}`}
                      </span>
                      <Badge variant="amber">{req.status === 'pending' ? 'Awaiting Director' : 'Awaiting HR'}</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <h4 className="text-sm font-medium text-brand-slate-700 mb-2">
                  {consultant.contract_type === 'contract' ? 'Rate History' : 'Salary History'}
                </h4>
                {salaryHistory.length > 0 ? (
                  <div className="space-y-2">
                    {salaryHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-brand-grey-50 rounded">
                        <div>
                          <p className="text-sm font-medium text-brand-slate-900">
                            £{entry.amount.toLocaleString()}
                            {consultant.contract_type === 'contract' && <span className="text-brand-grey-400 text-xs ml-1">/day</span>}
                            {consultant.contract_type !== 'contract' && <span className="text-brand-grey-400 text-xs ml-1">/year</span>}
                          </p>
                          {entry.change_reason && <p className="text-xs text-brand-grey-500">{entry.change_reason}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-brand-grey-500">{monthNames[entry.effective_month - 1]} {entry.effective_year}</p>
                          <Badge variant={entry.change_type === 'initial' ? 'grey' : 'green'} className="text-xs">{entry.change_type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-grey-400">No {consultant.contract_type === 'contract' ? 'rate' : 'salary'} history recorded</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-brand-slate-700 mb-2">Bonus Payments</h4>
                {bonusPayments.length > 0 ? (
                  <div className="space-y-2">
                    {bonusPayments.map(bonus => (
                      <div key={bonus.id} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                        <div>
                          <p className="text-sm font-medium text-brand-slate-900">£{bonus.amount.toLocaleString()}</p>
                          <p className="text-xs text-brand-grey-500">{bonus.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-brand-grey-500">{monthNames[bonus.payment_month - 1]} {bonus.payment_year}</p>
                          <Badge variant="cyan" className="text-xs capitalize">{bonus.bonus_type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-grey-400">No bonus payments recorded</p>
                )}
              </div>
            </Card>

            {/* Exit Employee Section */}
            <Card className={exitRecord ? 'border-red-200 bg-red-50' : ''}>
              <CardHeader>
                <CardTitle className={exitRecord ? 'text-red-700' : ''}>
                  {exitRecord ? 'Exit Completed' : 'Employee Exit'}
                </CardTitle>
              </CardHeader>

              {/* Quick Action - Initiate Exit (hidden from HR who can manage directly) */}
              {!exitRecord && consultant.status !== 'terminated' && pendingApprovals.filter(r => r.request_type === 'employee_exit').length === 0 && !canEditDates && (
                <div 
                  className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-xl cursor-pointer hover:from-red-100 hover:to-red-50 transition-all group"
                  onClick={() => setIsExitModalOpen(true)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                      <LogOut className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-800">Initiate Exit Process</h4>
                      <p className="text-sm text-red-600">Start the employee exit workflow (requires Director and HR approval)</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-red-400" />
                  </div>
                </div>
              )}

              {/* Pending Exit Request */}
              {pendingApprovals.filter(r => r.request_type === 'employee_exit').length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-brand-grey-600">Exit process in progress:</p>
                  {pendingApprovals.filter(r => r.request_type === 'employee_exit').map(req => {
                    const exitData = req.request_data as EmployeeExitData;
                    return (
                      <div key={req.id}>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                          <p className="font-medium text-amber-800">Exit Request: {exitData.exit_reason.replace('_', ' ')}</p>
                          <p className="text-sm text-amber-700">Last working day: {formatDate(exitData.last_working_day)}</p>
                        </div>
                        
                        {/* Approval Workflow Steps */}
                        <div className="flex items-center gap-2">
                          {/* Step 1: Manager Request */}
                          <div className="flex-1">
                            <div className={`p-3 rounded-lg border-2 ${true ? 'border-green-500 bg-green-50' : 'border-brand-grey-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">1. Request Submitted</span>
                              </div>
                              <p className="text-xs text-brand-grey-500">By {req.requester?.full_name || 'Manager'}</p>
                            </div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-brand-grey-300" />
                          
                          {/* Step 2: Director Approval */}
                          <div className="flex-1">
                            <div className={`p-3 rounded-lg border-2 ${
                              req.director_status === 'approved' ? 'border-green-500 bg-green-50' : 
                              req.director_status === 'pending' ? 'border-amber-500 bg-amber-50' : 'border-brand-grey-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {req.director_status === 'approved' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : req.director_status === 'pending' ? (
                                  <Clock className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-brand-grey-300" />
                                )}
                                <span className="text-sm font-medium">2. Director Approval</span>
                              </div>
                              <p className="text-xs text-brand-grey-500">
                                {req.director_status === 'approved' ? 'Approved' : 
                                 req.director_status === 'pending' ? 'Awaiting approval' : 'Pending'}
                              </p>
                            </div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-brand-grey-300" />
                          
                          {/* Step 3: HR Approval */}
                          <div className="flex-1">
                            <div className={`p-3 rounded-lg border-2 ${
                              req.hr_status === 'approved' ? 'border-green-500 bg-green-50' : 
                              req.hr_status === 'pending' && req.director_status === 'approved' ? 'border-amber-500 bg-amber-50' : 'border-brand-grey-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {req.hr_status === 'approved' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : req.hr_status === 'pending' && req.director_status === 'approved' ? (
                                  <Clock className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-brand-grey-300" />
                                )}
                                <span className="text-sm font-medium">3. HR Approval</span>
                              </div>
                              <p className="text-xs text-brand-grey-500">
                                {req.hr_status === 'approved' ? 'Approved' : 
                                 req.hr_status === 'pending' && req.director_status === 'approved' ? 'Awaiting approval' : 'Pending'}
                              </p>
                            </div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-brand-grey-300" />
                          
                          {/* Step 4: HR Processing */}
                          <div className="flex-1">
                            <div className={`p-3 rounded-lg border-2 border-brand-grey-200`}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 w-4 rounded-full border-2 border-brand-grey-300" />
                                <span className="text-sm font-medium">4. HR Processing</span>
                              </div>
                              <p className="text-xs text-brand-grey-500">Exit letter, interview</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Completed Exit Record */}
              {exitRecord && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-600">Exit Reason</span>
                    <span className="text-red-700 capitalize">{exitRecord.exit_reason.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Last Working Day</span>
                    <span className="text-red-700">{formatDate(exitRecord.last_working_day)}</span>
                  </div>
                  {exitRecord.exit_details && (
                    <div className="pt-2 border-t border-red-200">
                      <p className="text-red-600 text-xs mb-1">Details</p>
                      <p className="text-red-700">{exitRecord.exit_details}</p>
                    </div>
                  )}
                </div>
              )}

              {/* No exit in progress - shows when the action card is visible */}
              {!exitRecord && pendingApprovals.filter(r => r.request_type === 'employee_exit').length === 0 && consultant.status === 'terminated' && (
                <p className="text-sm text-brand-grey-400">
                  This consultant has been terminated.
                </p>
              )}
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Contract Type</span>
                  <Badge variant={consultant.contract_type === 'contract' ? 'cyan' : 'green'}>
                    {consultant.contract_type === 'contract' ? 'Contractor' : 'Permanent'}
                  </Badge>
                </div>
                {consultant.salary_amount && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Annual Salary</span>
                    <span className="text-brand-slate-700">£{consultant.salary_amount.toLocaleString()}</span>
                  </div>
                )}
                {consultant.day_rate && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Day Rate</span>
                    <span className="text-brand-slate-700">£{consultant.day_rate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Start Date</span>
                  <span className="text-brand-slate-700">{formatDate(consultant.start_date)}</span>
                </div>
                {consultant.end_date && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">End Date</span>
                    <span className="text-brand-slate-700">{formatDate(consultant.end_date)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-sm">
                {consultant.security_vetting && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Security Clearance</span>
                    <span className="text-brand-slate-700 uppercase">{consultant.security_vetting}</span>
                  </div>
                )}
                {consultant.nationalities && consultant.nationalities.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Nationalities</span>
                    <span className="text-brand-slate-700">{consultant.nationalities.join(', ')}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Record Info */}
            <Card>
              <CardHeader>
                <CardTitle>Record Info</CardTitle>
              </CardHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Created</span>
                  <span className="text-brand-slate-700">{formatDate(consultant.created_at)}</span>
                </div>
                {consultant.candidate_id && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Original Candidate</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/candidates/${consultant.candidate_id}`)}
                    >
                      View
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Book Meeting Modal */}
      <Modal
        isOpen={isBookMeetingModalOpen}
        onClose={() => setIsBookMeetingModalOpen(false)}
        title="Schedule Meeting"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Meeting Type"
            options={[
              { value: 'induction', label: 'Induction Meeting' },
              { value: 'quarterly_review', label: 'Quarterly Review' },
              { value: 'annual_appraisal', label: 'Annual Appraisal' },
            ]}
            value={bookMeetingForm.meeting_type}
            onChange={(e) => setBookMeetingForm(prev => ({ 
              ...prev, 
              meeting_type: e.target.value as 'induction' | 'quarterly_review' | 'annual_appraisal' 
            }))}
          />
          
          <Input
            label="Scheduled Date"
            type="date"
            value={bookMeetingForm.scheduled_date}
            onChange={(e) => setBookMeetingForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsBookMeetingModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleBookMeeting}
              isLoading={isBookingMeeting}
            >
              Schedule Meeting
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Meeting Modal */}
      <Modal
        isOpen={isCompleteMeetingModalOpen}
        onClose={() => {
          setIsCompleteMeetingModalOpen(false);
          setSelectedMeetingToComplete(null);
        }}
        title={selectedMeetingToComplete ? `${meetingTypeConfig[selectedMeetingToComplete.meeting_type]?.label} - ${selectedMeetingToComplete.status === 'completed' ? 'View' : 'Complete'}` : 'Meeting'}
        size="xl"
      >
        {selectedMeetingToComplete && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Meeting Info */}
            <div className="p-4 bg-brand-grey-50 rounded-lg">
              <p className="text-sm text-brand-grey-500">
                Scheduled: {formatDate(selectedMeetingToComplete.scheduled_date)}
                {selectedMeetingToComplete.completed_at && ` | Completed: ${formatDate(selectedMeetingToComplete.completed_at)}`}
              </p>
            </div>

            {/* Induction Checklist */}
            {selectedMeetingToComplete.meeting_type === 'induction' && (
              <div className="space-y-4">
                <h4 className="font-medium text-brand-slate-900">Induction Checklist</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'induction_pack_presented', label: 'Induction pack presented' },
                    { key: 'risk_assessment_presented', label: 'Risk assessment presented' },
                    { key: 'health_safety_briefing', label: 'Health & safety briefing' },
                    { key: 'it_systems_access', label: 'IT systems access set up' },
                    { key: 'company_policies_reviewed', label: 'Company policies reviewed' },
                    { key: 'emergency_procedures', label: 'Emergency procedures explained' },
                    { key: 'team_introductions', label: 'Team introductions done' },
                    { key: 'mission_briefing', label: 'Mission briefing completed' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(completeMeetingForm.induction_checklist as any)[item.key]}
                        onChange={(e) => setCompleteMeetingForm(prev => ({
                          ...prev,
                          induction_checklist: {
                            ...prev.induction_checklist,
                            [item.key]: e.target.checked,
                          },
                        }))}
                        className="rounded border-brand-grey-300 text-brand-cyan focus:ring-brand-cyan"
                        disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                      />
                      <span className="text-sm text-brand-slate-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quarterly Review Feedback */}
            {selectedMeetingToComplete.meeting_type === 'quarterly_review' && (
              <div className="space-y-4">
                <h4 className="font-medium text-brand-slate-900">Satisfaction Survey (1-5)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'customer_satisfaction', label: 'Customer Satisfaction' },
                    { key: 'mission_satisfaction', label: 'Mission Satisfaction' },
                    { key: 'company_satisfaction', label: 'Company Satisfaction' },
                    { key: 'work_life_balance', label: 'Work-Life Balance' },
                    { key: 'career_development', label: 'Career Development' },
                    { key: 'communication_rating', label: 'Communication' },
                  ].map(item => (
                    <div key={item.key}>
                      <label className="block text-sm text-brand-slate-700 mb-1">{item.label}</label>
                      <select
                        value={(completeMeetingForm.quarterly_feedback as any)[item.key]}
                        onChange={(e) => setCompleteMeetingForm(prev => ({
                          ...prev,
                          quarterly_feedback: {
                            ...prev.quarterly_feedback,
                            [item.key]: parseInt(e.target.value),
                          },
                        }))}
                        className="w-full rounded-md border border-brand-grey-300 px-3 py-2 text-sm"
                        disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Annual Appraisal */}
            {selectedMeetingToComplete.meeting_type === 'annual_appraisal' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-brand-slate-900">Performance Ratings (1-5)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'overall_performance', label: 'Overall' },
                      { key: 'technical_skills', label: 'Technical' },
                      { key: 'communication_skills', label: 'Communication' },
                      { key: 'teamwork', label: 'Teamwork' },
                      { key: 'initiative', label: 'Initiative' },
                      { key: 'reliability', label: 'Reliability' },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="block text-sm text-brand-slate-700 mb-1">{item.label}</label>
                        <select
                          value={(completeMeetingForm.appraisal_data as any)[item.key]}
                          onChange={(e) => setCompleteMeetingForm(prev => ({
                            ...prev,
                            appraisal_data: {
                              ...prev.appraisal_data,
                              [item.key]: parseInt(e.target.value),
                            },
                          }))}
                          className="w-full rounded-md border border-brand-grey-300 px-3 py-2 text-sm"
                          disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                        >
                          {[1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Textarea
                    label="Goals Achieved"
                    value={completeMeetingForm.appraisal_data.goals_achieved}
                    onChange={(e) => setCompleteMeetingForm(prev => ({
                      ...prev,
                      appraisal_data: { ...prev.appraisal_data, goals_achieved: e.target.value },
                    }))}
                    rows={3}
                    disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                  />
                  <Textarea
                    label="Areas of Strength"
                    value={completeMeetingForm.appraisal_data.areas_of_strength}
                    onChange={(e) => setCompleteMeetingForm(prev => ({
                      ...prev,
                      appraisal_data: { ...prev.appraisal_data, areas_of_strength: e.target.value },
                    }))}
                    rows={3}
                    disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                  />
                  <Textarea
                    label="Development Areas"
                    value={completeMeetingForm.appraisal_data.development_areas}
                    onChange={(e) => setCompleteMeetingForm(prev => ({
                      ...prev,
                      appraisal_data: { ...prev.appraisal_data, development_areas: e.target.value },
                    }))}
                    rows={3}
                    disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                  />
                  <Textarea
                    label="Training Needs"
                    value={completeMeetingForm.appraisal_data.training_needs}
                    onChange={(e) => setCompleteMeetingForm(prev => ({
                      ...prev,
                      appraisal_data: { ...prev.appraisal_data, training_needs: e.target.value },
                    }))}
                    rows={3}
                    disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                  />
                  <Textarea
                    label="Career Aspirations"
                    value={completeMeetingForm.appraisal_data.career_aspirations}
                    onChange={(e) => setCompleteMeetingForm(prev => ({
                      ...prev,
                      appraisal_data: { ...prev.appraisal_data, career_aspirations: e.target.value },
                    }))}
                    rows={3}
                    disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                  />
                  <Textarea
                    label="Salary Discussion Notes"
                    value={completeMeetingForm.appraisal_data.salary_discussion_notes}
                    onChange={(e) => setCompleteMeetingForm(prev => ({
                      ...prev,
                      appraisal_data: { ...prev.appraisal_data, salary_discussion_notes: e.target.value },
                    }))}
                    rows={3}
                    disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                  />
                </div>

                <Textarea
                  label="Next Year Objectives"
                  value={completeMeetingForm.appraisal_data.next_year_objectives}
                  onChange={(e) => setCompleteMeetingForm(prev => ({
                    ...prev,
                    appraisal_data: { ...prev.appraisal_data, next_year_objectives: e.target.value },
                  }))}
                  rows={3}
                  disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
                />
              </div>
            )}

            {/* Common Fields */}
            <div className="space-y-4 pt-4 border-t border-brand-grey-200">
              <Textarea
                label="Risks Identified"
                value={completeMeetingForm.risks_identified}
                onChange={(e) => setCompleteMeetingForm(prev => ({ ...prev, risks_identified: e.target.value }))}
                placeholder="Have you identified any risks with this consultant regarding satisfaction, performance, or retention?"
                rows={2}
                disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
              />
              
              <Textarea
                label="Consultant Requests"
                value={completeMeetingForm.consultant_requests}
                onChange={(e) => setCompleteMeetingForm(prev => ({ ...prev, consultant_requests: e.target.value }))}
                placeholder="Any requests or feedback from the consultant..."
                rows={2}
                disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
              />
              
              <Textarea
                label="General Comments"
                value={completeMeetingForm.general_comments}
                onChange={(e) => setCompleteMeetingForm(prev => ({ ...prev, general_comments: e.target.value }))}
                placeholder="Overall notes from the meeting..."
                rows={3}
                disabled={selectedMeetingToComplete.status === 'completed' && !permissions.isAdmin}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsCompleteMeetingModalOpen(false);
                  setSelectedMeetingToComplete(null);
                }}
              >
                {selectedMeetingToComplete.status === 'completed' ? 'Close' : 'Cancel'}
              </Button>
              {(selectedMeetingToComplete.status !== 'completed' || permissions.isAdmin) && (
                <Button 
                  variant="primary" 
                  onClick={handleCompleteMeeting}
                  isLoading={isCompletingMeeting}
                >
                  {selectedMeetingToComplete.status === 'completed' ? 'Update' : 'Complete Meeting'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Consultant"
        message={`Are you sure you want to delete ${consultant.first_name} ${consultant.last_name} (${consultant.reference_id})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Salary/Rate Increase Modal */}
      <Modal
        isOpen={isSalaryIncreaseModalOpen}
        onClose={() => setIsSalaryIncreaseModalOpen(false)}
        title={consultant.contract_type === 'contract' ? 'Request Rate Increase' : 'Request Salary Increase'}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-grey-50 rounded-lg">
            <p className="text-sm text-brand-grey-500">
              Current {consultant.contract_type === 'contract' ? 'Day Rate' : 'Annual Salary'}
            </p>
            <p className="font-medium text-brand-slate-900">
              {consultant.contract_type === 'contract'
                ? `£${consultant.day_rate?.toLocaleString() || 0}/day`
                : `£${consultant.salary_amount?.toLocaleString() || 0}/year`}
            </p>
          </div>

          <Input
            label={consultant.contract_type === 'contract' ? 'New Day Rate (£)' : 'New Annual Salary (£)'}
            type="number"
            value={salaryIncreaseForm.new_salary}
            onChange={(e) => setSalaryIncreaseForm(prev => ({ ...prev, new_salary: e.target.value }))}
            placeholder={consultant.contract_type === 'contract' ? 'e.g. 550' : 'e.g. 65000'}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Effective Month"
              options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
              value={String(salaryIncreaseForm.effective_month)}
              onChange={(e) => setSalaryIncreaseForm(prev => ({ ...prev, effective_month: parseInt(e.target.value) }))}
            />
            <Input
              label="Effective Year"
              type="number"
              value={salaryIncreaseForm.effective_year}
              onChange={(e) => setSalaryIncreaseForm(prev => ({ ...prev, effective_year: parseInt(e.target.value) }))}
            />
          </div>

          <Textarea
            label="Reason for Increase"
            value={salaryIncreaseForm.reason}
            onChange={(e) => setSalaryIncreaseForm(prev => ({ ...prev, reason: e.target.value }))}
            placeholder={consultant.contract_type === 'contract' 
              ? 'Explain the justification for this rate increase...'
              : 'Explain the justification for this salary increase...'}
            rows={3}
          />

          <p className="text-sm text-brand-grey-500">This request will be sent to the Director for approval.</p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsSalaryIncreaseModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitSalaryIncrease} isLoading={isSubmittingRequest}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bonus Payment Modal */}
      <Modal
        isOpen={isBonusModalOpen}
        onClose={() => setIsBonusModalOpen(false)}
        title="Request Bonus Payment"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Bonus Type"
            options={[
              { value: 'performance', label: 'Performance Bonus' },
              { value: 'retention', label: 'Retention Bonus' },
              { value: 'project', label: 'Project Bonus' },
              { value: 'referral', label: 'Referral Bonus' },
              { value: 'other', label: 'Other' },
            ]}
            value={bonusForm.bonus_type}
            onChange={(e) => setBonusForm(prev => ({ ...prev, bonus_type: e.target.value as any }))}
          />

          <Input
            label="Bonus Amount (£)"
            type="number"
            value={bonusForm.amount}
            onChange={(e) => setBonusForm(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="e.g. 2000"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Month"
              options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
              value={String(bonusForm.payment_month)}
              onChange={(e) => setBonusForm(prev => ({ ...prev, payment_month: parseInt(e.target.value) }))}
            />
            <Input
              label="Payment Year"
              type="number"
              value={bonusForm.payment_year}
              onChange={(e) => setBonusForm(prev => ({ ...prev, payment_year: parseInt(e.target.value) }))}
            />
          </div>

          <Textarea
            label="Reason for Bonus"
            value={bonusForm.reason}
            onChange={(e) => setBonusForm(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Explain why this bonus is being requested..."
            rows={3}
          />

          <p className="text-sm text-brand-grey-500">This request will be sent to the Director for approval.</p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsBonusModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitBonus} isLoading={isSubmittingRequest}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Exit Employee Modal */}
      <Modal
        isOpen={isExitModalOpen}
        onClose={() => { setIsExitModalOpen(false); setExitValidationErrors([]); }}
        title="Exit Employee"
        size="md"
        shake={isExitShaking}
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              This will initiate the exit process for {consultant.first_name} {consultant.last_name}. 
              Both Director and HR approval will be required.
            </p>
          </div>

          <Select
            label="Exit Reason"
            options={[
              { value: 'resignation', label: 'Resignation' },
              { value: 'redundancy', label: 'Redundancy' },
              { value: 'end_of_contract', label: 'End of Contract' },
              { value: 'dismissal', label: 'Dismissal' },
              { value: 'mutual_agreement', label: 'Mutual Agreement' },
              { value: 'retirement', label: 'Retirement' },
            ]}
            value={exitForm.exit_reason}
            onChange={(e) => setExitForm(prev => ({ ...prev, exit_reason: e.target.value as any }))}
          />

          <Input
            label="Last Working Day *"
            type="date"
            value={exitForm.last_working_day}
            onChange={(e) => {
              setExitForm(prev => ({ ...prev, last_working_day: e.target.value }));
              setExitValidationErrors(prev => prev.filter(e => e !== 'last_working_day'));
            }}
            error={exitValidationErrors.includes('last_working_day') ? 'Last working day is required' : undefined}
          />

          <Textarea
            label="Exit Details / Justification *"
            value={exitForm.exit_details}
            onChange={(e) => {
              setExitForm(prev => ({ ...prev, exit_details: e.target.value }));
              setExitValidationErrors(prev => prev.filter(e => e !== 'exit_details'));
            }}
            placeholder="Provide details about the exit (notice period, handover, reason, etc.)..."
            rows={4}
            error={exitValidationErrors.includes('exit_details') ? 'Exit details are required' : undefined}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setIsExitModalOpen(false); setExitValidationErrors([]); }}>Cancel</Button>
            <Button variant="danger" onClick={handleSubmitExit} isLoading={isSubmittingRequest}>
              Submit Exit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* HR Edit Consultant Modal */}
      <Modal
        isOpen={isEditConsultantModalOpen}
        onClose={() => setIsEditConsultantModalOpen(false)}
        title="Edit Consultant"
        size="lg"
      >
        <div className="space-y-4">
          {editConsultantErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <ul className="text-sm text-red-700 space-y-1">
                {editConsultantErrors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">First Name *</label>
              <Input
                value={editConsultantForm.first_name}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Last Name *</label>
              <Input
                value={editConsultantForm.last_name}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Personal Email *</label>
              <Input
                type="email"
                value={editConsultantForm.email}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Company Email</label>
              <Input
                type="email"
                value={editConsultantForm.company_email}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, company_email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Phone</label>
              <Input
                value={editConsultantForm.phone}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Location</label>
              <Input
                value={editConsultantForm.location}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Job Title</label>
              <Input
                value={editConsultantForm.job_title}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, job_title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">Security Clearance</label>
              <Input
                value={editConsultantForm.security_vetting}
                onChange={(e) => setEditConsultantForm({ ...editConsultantForm, security_vetting: e.target.value })}
                placeholder="e.g. SC, DV, BPSS"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-brand-slate-900 mb-3">Contract Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1">Contract Type</label>
                <select
                  value={editConsultantForm.contract_type}
                  onChange={(e) => setEditConsultantForm({ ...editConsultantForm, contract_type: e.target.value as 'permanent' | 'contract' })}
                  className="w-full px-3 py-2 border border-brand-grey-300 rounded-lg"
                >
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1">Annual Leave Allowance</label>
                <Input
                  type="number"
                  value={editConsultantForm.annual_leave_allowance}
                  onChange={(e) => setEditConsultantForm({ ...editConsultantForm, annual_leave_allowance: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1">Annual Salary (£)</label>
                <Input
                  type="number"
                  value={editConsultantForm.salary_amount}
                  onChange={(e) => setEditConsultantForm({ ...editConsultantForm, salary_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1">Day Rate (£)</label>
                <Input
                  type="number"
                  value={editConsultantForm.day_rate}
                  onChange={(e) => setEditConsultantForm({ ...editConsultantForm, day_rate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-brand-slate-900 mb-3">Employment Dates</h4>
            {consultantTimesheetEntries.length > 0 && (
              <p className="text-sm text-amber-600 mb-3">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                This consultant has timesheet entries. Date changes will be validated against existing entries.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1">Start Date *</label>
                <Input
                  type="date"
                  value={editConsultantForm.start_date}
                  onChange={(e) => setEditConsultantForm({ ...editConsultantForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={editConsultantForm.end_date}
                  onChange={(e) => setEditConsultantForm({ ...editConsultantForm, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsEditConsultantModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveConsultant} isLoading={isSavingConsultant}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
