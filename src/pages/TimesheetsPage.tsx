import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, EmptyState, Modal, Avatar } from '@/components/ui';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Send,
  User,
  AlertCircle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  timesheetEntriesService, 
  timesheetWeeksService, 
  missionsService, 
  consultantsService,
  type DbTimesheetEntry, 
  type DbTimesheetWeek,
  type DbMission,
  type DbConsultant,
} from '@/lib/services';

type TimesheetEntryType = 'mission' | 'bench' | 'leave' | 'bank_holiday';
type WeekStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
type Period = 'AM' | 'PM';

interface DayEntry {
  date: string;
  dayName: string;
  dayNumber: number;
  isWeekend: boolean;
  isToday: boolean;
  am: DbTimesheetEntry | null;
  pm: DbTimesheetEntry | null;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekDays(weekStart: Date): DayEntry[] {
  const days: DayEntry[] = [];
  const today = formatDateKey(new Date());
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateKey = formatDateKey(date);
    
    days.push({
      date: dateKey,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      isWeekend: i >= 5,
      isToday: dateKey === today,
      am: null,
      pm: null,
    });
  }
  
  return days;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startMonth = weekStart.toLocaleString('en-GB', { month: 'short' });
  const endMonth = weekEnd.toLocaleString('en-GB', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${weekStart.getDate()} - ${weekEnd.getDate()} ${startMonth} ${weekStart.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${weekStart.getFullYear()}`;
}

const entryTypeConfig: Record<TimesheetEntryType, { label: string; bgClass: string; textClass: string }> = {
  mission: { label: 'Project', bgClass: 'bg-emerald-500', textClass: 'text-white' },
  bench: { label: 'Bench', bgClass: 'bg-amber-400', textClass: 'text-amber-900' },
  leave: { label: 'Leave', bgClass: 'bg-blue-400', textClass: 'text-white' },
  bank_holiday: { label: 'Bank Holiday', bgClass: 'bg-purple-400', textClass: 'text-white' },
};

const weekStatusConfig: Record<WeekStatus, { label: string; variant: 'grey' | 'amber' | 'green' | 'red' }> = {
  draft: { label: 'Draft', variant: 'grey' },
  submitted: { label: 'Pending Approval', variant: 'amber' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
};

export function TimesheetsPage() {
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [entries, setEntries] = useState<DbTimesheetEntry[]>([]);
  const [weekStatus, setWeekStatus] = useState<DbTimesheetWeek | null>(null);
  const [missions, setMissions] = useState<DbMission[]>([]);
  const [consultants, setConsultants] = useState<DbConsultant[]>([]);
  const [pendingWeeks, setPendingWeeks] = useState<(DbTimesheetWeek & { consultant?: DbConsultant })[]>([]);
  const [myConsultant, setMyConsultant] = useState<DbConsultant | null>(null);
  
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [entryForm, setEntryForm] = useState({
    entry_type: 'mission' as TimesheetEntryType,
    mission_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const [viewingConsultant, setViewingConsultant] = useState<DbConsultant | null>(null);
  const [viewingWeek, setViewingWeek] = useState<DbTimesheetWeek | null>(null);
  const [viewingEntries, setViewingEntries] = useState<DbTimesheetEntry[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const isConsultant = permissions.isConsultant;
  const canApprove = permissions.canApproveTimesheets;

  useEffect(() => {
    loadData();
  }, [currentWeekStart, user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const weekStartKey = formatDateKey(currentWeekStart);
      
      if (isConsultant) {
        // Consultant view: find their consultant record via user_id
        const allConsultants = await consultantsService.getAll();
        const myRecord = allConsultants.find(c => c.user_id === user.id);
        setMyConsultant(myRecord || null);
        
        if (myRecord) {
          const weekEntries = await timesheetEntriesService.getByConsultantAndWeek(myRecord.id, weekStartKey);
          setEntries(weekEntries);
          
          const weekData = await timesheetWeeksService.getByConsultantAndWeek(myRecord.id, weekStartKey);
          setWeekStatus(weekData);
          
          const allMissions = await missionsService.getAll();
          const myMissions = allMissions.filter(m => 
            m.consultant_id === myRecord.id && m.status === 'active'
          );
          setMissions(myMissions);
        }
      } else if (canApprove) {
        // Manager view: load pending approvals
        const [allConsultants, allPendingWeeks, allMissions] = await Promise.all([
          consultantsService.getAll(),
          timesheetWeeksService.getPendingApprovals(),
          missionsService.getAll(),
        ]);
        
        // Filter consultants that report to this manager
        const myConsultants = allConsultants.filter(c => 
          c.account_manager_id === user.id || 
          permissions.isAdmin || 
          permissions.isBusinessDirector
        );
        
        // Add consultant info to pending weeks
        const weeksWithConsultants = allPendingWeeks.map(w => ({
          ...w,
          consultant: allConsultants.find(c => c.id === w.consultant_id)
        }));
        
        setConsultants(myConsultants);
        setPendingWeeks(weeksWithConsultants);
        setMissions(allMissions);
      }
    } catch (error) {
      console.error('Error loading timesheet data:', error);
      toast.error('Error', 'Failed to load timesheet data');
    } finally {
      setIsLoading(false);
    }
  };

  const weekDays = useMemo(() => {
    const days = getWeekDays(currentWeekStart);
    
    entries.forEach(entry => {
      const dayIndex = days.findIndex(d => d.date === entry.date);
      if (dayIndex !== -1) {
        if (entry.period === 'AM') {
          days[dayIndex].am = entry;
        } else {
          days[dayIndex].pm = entry;
        }
      }
    });
    
    return days;
  }, [currentWeekStart, entries]);

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const handleDayClick = (date: string, period: Period) => {
    if (!myConsultant) return;
    if (weekStatus?.status === 'submitted' || weekStatus?.status === 'approved') return;
    
    const day = weekDays.find(d => d.date === date);
    if (day?.isWeekend) return;
    
    const existingEntry = period === 'AM' ? day?.am : day?.pm;
    
    setSelectedDate(date);
    setSelectedPeriod(period);
    setEntryForm({
      entry_type: existingEntry?.entry_type || 'mission',
      mission_id: existingEntry?.mission_id || missions[0]?.id || '',
    });
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!myConsultant || !selectedDate || !selectedPeriod) return;
    
    try {
      setIsSaving(true);
      
      const weekStartKey = formatDateKey(currentWeekStart);
      
      const existingEntry = entries.find(e => 
        e.date === selectedDate && e.period === selectedPeriod
      );
      
      if (existingEntry) {
        await timesheetEntriesService.update(existingEntry.id, {
          entry_type: entryForm.entry_type,
          mission_id: entryForm.entry_type === 'mission' ? entryForm.mission_id : null,
        });
      } else {
        await timesheetEntriesService.create({
          consultant_id: myConsultant.id,
          week_start_date: weekStartKey,
          date: selectedDate,
          period: selectedPeriod,
          entry_type: entryForm.entry_type,
          mission_id: entryForm.entry_type === 'mission' ? entryForm.mission_id : null,
        });
      }
      
      toast.success('Saved', 'Timesheet entry saved');
      setIsEntryModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Error', 'Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedDate || !selectedPeriod) return;
    
    const existingEntry = entries.find(e => 
      e.date === selectedDate && e.period === selectedPeriod
    );
    
    if (!existingEntry) return;
    
    try {
      setIsSaving(true);
      await timesheetEntriesService.delete(existingEntry.id);
      toast.success('Deleted', 'Entry removed');
      setIsEntryModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Error', 'Failed to delete entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!myConsultant) return;
    
    const weekdaysMissing = weekDays
      .filter(d => !d.isWeekend)
      .some(d => !d.am || !d.pm);
    
    if (weekdaysMissing) {
      toast.error('Incomplete', 'Please fill in all weekday entries before submitting');
      return;
    }
    
    try {
      setIsSaving(true);
      const weekStartKey = formatDateKey(currentWeekStart);
      
      if (weekStatus) {
        await timesheetWeeksService.update(weekStatus.id, { status: 'submitted' });
      } else {
        await timesheetWeeksService.create({
          consultant_id: myConsultant.id,
          week_start_date: weekStartKey,
          status: 'submitted',
        });
      }
      
      toast.success('Submitted', 'Timesheet submitted for approval');
      loadData();
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Error', 'Failed to submit timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveTimesheet = async (week: DbTimesheetWeek) => {
    try {
      await timesheetWeeksService.update(week.id, { 
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });
      toast.success('Approved', 'Timesheet approved');
      loadData();
    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast.error('Error', 'Failed to approve timesheet');
    }
  };

  const handleRejectTimesheet = async (week: DbTimesheetWeek) => {
    try {
      await timesheetWeeksService.update(week.id, { status: 'rejected' });
      toast.success('Rejected', 'Timesheet sent back for revision');
      loadData();
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast.error('Error', 'Failed to reject timesheet');
    }
  };

  const handleViewTimesheet = async (week: DbTimesheetWeek & { consultant?: DbConsultant }) => {
    try {
      const weekEntries = await timesheetEntriesService.getByConsultantAndWeek(
        week.consultant_id, 
        week.week_start_date
      );
      
      setViewingConsultant(week.consultant || null);
      setViewingWeek(week);
      setViewingEntries(weekEntries);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading timesheet details:', error);
      toast.error('Error', 'Failed to load timesheet details');
    }
  };

  const renderEntryCell = (entry: DbTimesheetEntry | null, date: string, period: Period, isWeekend: boolean) => {
    const isLocked = weekStatus?.status === 'submitted' || weekStatus?.status === 'approved';
    
    if (isWeekend) {
      return (
        <div className="h-16 bg-slate-100 rounded-lg flex items-center justify-center">
          <span className="text-xs text-slate-400">Weekend</span>
        </div>
      );
    }
    
    if (entry) {
      const config = entryTypeConfig[entry.entry_type];
      const mission = missions.find(m => m.id === entry.mission_id);
      
      return (
        <button
          onClick={() => !isLocked && handleDayClick(date, period)}
          disabled={isLocked}
          className={`h-16 w-full rounded-lg ${config.bgClass} ${config.textClass} p-2 text-left transition-all ${
            isLocked ? 'cursor-not-allowed opacity-75' : 'hover:opacity-90 hover:shadow-md'
          }`}
        >
          <p className="text-xs font-medium truncate">
            {entry.entry_type === 'mission' && mission ? mission.name : config.label}
          </p>
          <p className="text-[10px] opacity-75">{period}</p>
        </button>
      );
    }
    
    return (
      <button
        onClick={() => !isLocked && handleDayClick(date, period)}
        disabled={isLocked}
        className={`h-16 w-full rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center transition-all ${
          isLocked ? 'cursor-not-allowed bg-slate-50' : 'hover:border-brand-cyan hover:bg-brand-cyan/5 cursor-pointer'
        }`}
      >
        <span className="text-xs text-slate-400">{period}</span>
      </button>
    );
  };

  // Consultant View
  if (isConsultant) {
    if (!myConsultant) {
      return (
        <div className="min-h-screen">
          <Header 
            title="Timesheets" 
            subtitle="Submit your weekly timesheets"
          />
          <div className="p-6">
            <Card>
              <EmptyState
                icon={<AlertCircle className="h-12 w-12" />}
                title="No Consultant Profile"
                description="Your user account is not linked to a consultant profile. Please contact your manager."
              />
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen">
        <Header 
          title="Timesheets" 
          subtitle="Submit your weekly timesheets"
        />
        <div className="p-6 space-y-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToCurrentWeek}>
                Today
              </Button>
              <Button variant="secondary" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-brand-slate-900 ml-2">
                {formatWeekRange(currentWeekStart)}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {weekStatus && (
                <Badge variant={weekStatusConfig[weekStatus.status].variant}>
                  {weekStatusConfig[weekStatus.status].label}
                </Badge>
              )}
              
              {(!weekStatus || weekStatus.status === 'draft' || weekStatus.status === 'rejected') && (
                <Button 
                  variant="success" 
                  onClick={handleSubmitTimesheet}
                  leftIcon={<Send className="h-4 w-4" />}
                  isLoading={isSaving}
                >
                  Submit Timesheet
                </Button>
              )}
            </div>
          </div>

          {/* Week Calendar */}
          <Card className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-3">
                {weekDays.map(day => (
                  <div key={day.date} className="space-y-2">
                    <div className={`text-center p-2 rounded-lg ${
                      day.isToday ? 'bg-brand-cyan text-white' : 
                      day.isWeekend ? 'bg-slate-100 text-slate-400' : 
                      'bg-brand-grey-100 text-brand-slate-700'
                    }`}>
                      <p className="text-xs font-medium">{day.dayName}</p>
                      <p className="text-lg font-bold">{day.dayNumber}</p>
                    </div>
                    
                    {renderEntryCell(day.am, day.date, 'AM', day.isWeekend)}
                    {renderEntryCell(day.pm, day.date, 'PM', day.isWeekend)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-brand-slate-700">Legend:</span>
            {Object.entries(entryTypeConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${config.bgClass}`} />
                <span className="text-brand-grey-600">{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Entry Modal */}
        <Modal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          title="Edit Entry"
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">
                Entry Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['mission', 'bench', 'leave', 'bank_holiday'] as TimesheetEntryType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setEntryForm(prev => ({ ...prev, entry_type: type }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      entryForm.entry_type === type
                        ? 'border-brand-cyan bg-brand-cyan/5'
                        : 'border-brand-grey-200 hover:border-brand-grey-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${entryTypeConfig[type].bgClass}`} />
                      <span className="text-sm font-medium">{entryTypeConfig[type].label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {entryForm.entry_type === 'mission' && (
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-2">
                  Project
                </label>
                {missions.length > 0 ? (
                  <select
                    value={entryForm.mission_id}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, mission_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-brand-grey-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
                  >
                    {missions.map(mission => (
                      <option key={mission.id} value={mission.id}>
                        {mission.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-600 p-3 bg-amber-50 rounded-lg">
                    No active missions assigned. Contact your manager.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-brand-grey-200">
              <Button
                variant="secondary"
                onClick={handleDeleteEntry}
                disabled={!entries.find(e => e.date === selectedDate && e.period === selectedPeriod)}
              >
                Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsEntryModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSaveEntry}
                  isLoading={isSaving}
                  disabled={entryForm.entry_type === 'mission' && !entryForm.mission_id}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Manager View
  return (
    <div className="min-h-screen">
      <Header 
        title="Timesheets" 
        subtitle="Review and approve consultant timesheets"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">
                  {pendingWeeks.filter(w => w.status === 'submitted').length}
                </p>
                <p className="text-sm text-brand-grey-400">Pending Approval</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">
                  {pendingWeeks.filter(w => w.status === 'approved').length}
                </p>
                <p className="text-sm text-brand-grey-400">Approved This Month</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{consultants.length}</p>
                <p className="text-sm text-brand-grey-400">My Consultants</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card>
          <div className="p-4 border-b border-brand-grey-200">
            <h3 className="text-lg font-semibold text-brand-slate-900">Pending Approvals</h3>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
            </div>
          ) : pendingWeeks.filter(w => w.status === 'submitted').length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="h-12 w-12" />}
              title="All Caught Up"
              description="No timesheets pending approval"
            />
          ) : (
            <div className="divide-y divide-brand-grey-100">
              {pendingWeeks
                .filter(w => w.status === 'submitted')
                .map(week => {
                  const weekStart = new Date(week.week_start_date);
                  
                  return (
                    <div key={week.id} className="p-4 flex items-center justify-between hover:bg-brand-grey-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar name={week.consultant ? `${week.consultant.first_name} ${week.consultant.last_name}` : 'Unknown'} size="md" />
                        <div>
                          <p className="font-medium text-brand-slate-900">
                            {week.consultant ? `${week.consultant.first_name} ${week.consultant.last_name}` : 'Unknown Consultant'}
                          </p>
                          <p className="text-sm text-brand-grey-500">
                            Week of {formatWeekRange(weekStart)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewTimesheet(week)}
                          leftIcon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRejectTimesheet(week)}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApproveTimesheet(week)}
                          leftIcon={<Check className="h-4 w-4" />}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* All Consultants */}
        <Card>
          <div className="p-4 border-b border-brand-grey-200">
            <h3 className="text-lg font-semibold text-brand-slate-900">My Consultants</h3>
          </div>
          
          {consultants.length === 0 ? (
            <EmptyState
              icon={<User className="h-12 w-12" />}
              title="No Consultants"
              description="No consultants are assigned to you"
            />
          ) : (
            <div className="divide-y divide-brand-grey-100">
              {consultants.map(consultant => {
                const consultantWeeks = pendingWeeks.filter(w => w.consultant_id === consultant.id);
                const latestWeek = consultantWeeks.sort((a, b) => 
                  new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
                )[0];
                
                return (
                  <div key={consultant.id} className="p-4 flex items-center justify-between hover:bg-brand-grey-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="md" />
                      <div>
                        <p className="font-medium text-brand-slate-900">
                          {consultant.first_name} {consultant.last_name}
                        </p>
                        <p className="text-sm text-brand-grey-500">
                          {consultant.job_title || 'Consultant'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {latestWeek ? (
                        <Badge variant={weekStatusConfig[latestWeek.status].variant}>
                          {weekStatusConfig[latestWeek.status].label}
                        </Badge>
                      ) : (
                        <Badge variant="grey">No Submissions</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* View Timesheet Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={viewingConsultant ? `${viewingConsultant.first_name} ${viewingConsultant.last_name}'s Timesheet` : 'Timesheet'}
        size="xl"
      >
        {viewingWeek && (
          <div className="space-y-4">
            <p className="text-sm text-brand-grey-500">
              Week of {formatWeekRange(new Date(viewingWeek.week_start_date))}
            </p>
            
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays(new Date(viewingWeek.week_start_date)).map(day => {
                const am = viewingEntries.find(e => e.date === day.date && e.period === 'AM');
                const pm = viewingEntries.find(e => e.date === day.date && e.period === 'PM');
                
                return (
                  <div key={day.date} className="space-y-1">
                    <div className={`text-center p-1 rounded ${day.isWeekend ? 'bg-slate-100' : 'bg-brand-grey-100'}`}>
                      <p className="text-xs font-medium">{day.dayName}</p>
                      <p className="text-sm font-bold">{day.dayNumber}</p>
                    </div>
                    
                    {day.isWeekend ? (
                      <div className="h-16 bg-slate-50 rounded text-center text-xs text-slate-400 flex items-center justify-center">
                        Weekend
                      </div>
                    ) : (
                      <>
                        <div className={`h-8 rounded text-xs flex items-center justify-center ${
                          am ? `${entryTypeConfig[am.entry_type].bgClass} ${entryTypeConfig[am.entry_type].textClass}` : 'bg-red-100 text-red-600'
                        }`}>
                          {am ? (am.entry_type === 'mission' ? 'Project' : entryTypeConfig[am.entry_type].label) : 'Missing'}
                        </div>
                        <div className={`h-8 rounded text-xs flex items-center justify-center ${
                          pm ? `${entryTypeConfig[pm.entry_type].bgClass} ${entryTypeConfig[pm.entry_type].textClass}` : 'bg-red-100 text-red-600'
                        }`}>
                          {pm ? (pm.entry_type === 'mission' ? 'Project' : entryTypeConfig[pm.entry_type].label) : 'Missing'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-brand-grey-200">
              <Button variant="secondary" onClick={() => handleRejectTimesheet(viewingWeek)}>
                Reject
              </Button>
              <Button 
                variant="success" 
                onClick={() => {
                  handleApproveTimesheet(viewingWeek);
                  setIsViewModalOpen(false);
                }}
                leftIcon={<Check className="h-4 w-4" />}
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
