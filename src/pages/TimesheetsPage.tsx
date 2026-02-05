import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, EmptyState, Modal, Avatar, Input } from '@/components/ui';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Send,
  User,
  AlertCircle,
  CheckCircle,
  CheckSquare,
  X,
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

interface SelectedSlot {
  date: string;
  period: Period;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
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

function formatMonthYear(date: Date): string {
  return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

const entryTypeConfig: Record<TimesheetEntryType, { label: string; bgClass: string; textClass: string; shortLabel: string }> = {
  mission: { label: 'Project', shortLabel: 'P', bgClass: 'bg-emerald-500', textClass: 'text-white' },
  bench: { label: 'Bench', shortLabel: 'B', bgClass: 'bg-amber-400', textClass: 'text-amber-900' },
  leave: { label: 'Leave', shortLabel: 'L', bgClass: 'bg-blue-400', textClass: 'text-white' },
  bank_holiday: { label: 'Bank Holiday', shortLabel: 'H', bgClass: 'bg-purple-400', textClass: 'text-white' },
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
  const [currentMonth, setCurrentMonth] = useState<Date>(() => getMonthStart(new Date()));
  const [entries, setEntries] = useState<DbTimesheetEntry[]>([]);
  const [weekStatus, setWeekStatus] = useState<DbTimesheetWeek | null>(null);
  const [missions, setMissions] = useState<DbMission[]>([]);
  const [myConsultant, setMyConsultant] = useState<DbConsultant | null>(null);
  
  // Manager view state
  const [myConsultants, setMyConsultants] = useState<DbConsultant[]>([]);
  const [allWeeks, setAllWeeks] = useState<DbTimesheetWeek[]>([]);
  const [allEntries, setAllEntries] = useState<DbTimesheetEntry[]>([]);
  
  // Consultant monthly overview
  const [myMonthWeeks, setMyMonthWeeks] = useState<DbTimesheetWeek[]>([]);
  const [myMonthEntries, setMyMonthEntries] = useState<DbTimesheetEntry[]>([]);
  
  // Single entry modal (for editing existing)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [entryForm, setEntryForm] = useState({
    entry_type: 'mission' as TimesheetEntryType,
    mission_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Multi-select state
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkEntryType, setBulkEntryType] = useState<TimesheetEntryType>('bench');
  const [bulkMissionId, setBulkMissionId] = useState('');
  
  // Week approval modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalWeek, setApprovalWeek] = useState<DbTimesheetWeek | null>(null);
  const [approvalConsultant, setApprovalConsultant] = useState<DbConsultant | null>(null);
  const [approvalEntries, setApprovalEntries] = useState<DbTimesheetEntry[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');

  const isConsultant = permissions.isConsultant;
  const canApprove = permissions.canApproveTimesheets;
  const isLocked = weekStatus?.status === 'submitted' || weekStatus?.status === 'approved';

  useEffect(() => {
    if (isConsultant) {
      loadConsultantData();
    } else if (canApprove) {
      loadManagerData();
    }
  }, [currentWeekStart, currentMonth, user?.id, isConsultant, canApprove]);

  useEffect(() => {
    setSelectedSlots([]);
  }, [currentWeekStart]);

  const loadConsultantData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const weekStartKey = formatDateKey(currentWeekStart);
      
      const allConsultants = await consultantsService.getAll();
      const myRecord = allConsultants.find(c => c.user_id === user.id);
      setMyConsultant(myRecord || null);
      
      if (myRecord) {
        const [weekEntries, weekData, allMissions, monthWeeks, monthEntries] = await Promise.all([
          timesheetEntriesService.getByConsultantAndWeek(myRecord.id, weekStartKey),
          timesheetWeeksService.getByConsultantAndWeek(myRecord.id, weekStartKey),
          missionsService.getAll(),
          timesheetWeeksService.getByConsultant(myRecord.id),
          timesheetEntriesService.getByConsultant(myRecord.id),
        ]);
        
        setEntries(weekEntries);
        setWeekStatus(weekData);
        setMyMonthWeeks(monthWeeks);
        setMyMonthEntries(monthEntries);
        
        const myMissions = allMissions.filter(m => 
          m.consultant_id === myRecord.id && m.status === 'active'
        );
        setMissions(myMissions);
      }
    } catch (error) {
      console.error('Error loading timesheet data:', error);
      toast.error('Error', 'Failed to load timesheet data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadManagerData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const [allConsultants, weeks, entriesData, allMissions] = await Promise.all([
        consultantsService.getAll(),
        timesheetWeeksService.getPendingApprovals(),
        timesheetEntriesService.getAll(),
        missionsService.getAll(),
      ]);
      
      // Filter consultants that report to this manager
      const consultantsForManager = allConsultants.filter(c => 
        c.account_manager_id === user.id || 
        permissions.isAdmin || 
        permissions.isBusinessDirector
      );
      
      setMyConsultants(consultantsForManager);
      setAllWeeks(weeks);
      setAllEntries(entriesData);
      setMissions(allMissions);
    } catch (error) {
      console.error('Error loading manager data:', error);
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

  const monthDays = useMemo(() => {
    return getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  // Consultant monthly overview: compute the month containing the current week
  const consultantMonthData = useMemo(() => {
    const monthOfWeek = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1);
    const year = monthOfWeek.getFullYear();
    const month = monthOfWeek.getMonth();
    const days = getMonthDays(year, month);
    
    // Build a calendar grid (weeks as rows, 7 cols Mon-Sun)
    const firstDay = days[0].getDay(); // 0=Sun
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // offset to Monday start
    
    const calendarWeeks: (Date | null)[][] = [];
    let currentRow: (Date | null)[] = [];
    
    // Pad start
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
    
    // Pad end
    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push(null);
      }
      calendarWeeks.push(currentRow);
    }
    
    return { year, month, calendarWeeks, monthLabel: monthOfWeek.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) };
  }, [currentWeekStart]);

  // Get status for a day in the consultant's month overview
  const getConsultantDayStatus = (date: Date): 'empty' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'has_entries' => {
    const dateKey = formatDateKey(date);
    const weekStart = getWeekStart(date);
    const weekStartKey = formatDateKey(weekStart);
    
    const week = myMonthWeeks.find(w => w.week_start_date === weekStartKey);
    const hasEntries = myMonthEntries.some(e => e.date === dateKey);
    
    if (week) {
      return week.status as 'draft' | 'submitted' | 'approved' | 'rejected';
    }
    
    if (hasEntries) return 'has_entries';
    return 'empty';
  };

  // Navigation
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

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(getMonthStart(new Date()));
  };

  // Slot selection helpers
  const isSlotSelected = (date: string, period: Period) => {
    return selectedSlots.some(s => s.date === date && s.period === period);
  };

  const toggleSlotSelection = (date: string, period: Period) => {
    if (isLocked) return;
    
    const day = weekDays.find(d => d.date === date);
    if (day?.isWeekend) return;
    
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.date === date && s.period === period);
      if (exists) {
        return prev.filter(s => !(s.date === date && s.period === period));
      } else {
        return [...prev, { date, period }];
      }
    });
  };

  const handleSlotClick = (date: string, period: Period, hasEntry: boolean) => {
    if (isLocked) return;
    
    const day = weekDays.find(d => d.date === date);
    if (day?.isWeekend) return;
    
    if (hasEntry) {
      const existingEntry = period === 'AM' ? day?.am : day?.pm;
      setSelectedDate(date);
      setSelectedPeriod(period);
      setEntryForm({
        entry_type: existingEntry?.entry_type || 'mission',
        mission_id: existingEntry?.mission_id || missions[0]?.id || '',
      });
      setIsEntryModalOpen(true);
    } else {
      toggleSlotSelection(date, period);
    }
  };

  const selectAllEmpty = () => {
    const emptySlots: SelectedSlot[] = [];
    weekDays.forEach(day => {
      if (!day.isWeekend) {
        if (!day.am) emptySlots.push({ date: day.date, period: 'AM' });
        if (!day.pm) emptySlots.push({ date: day.date, period: 'PM' });
      }
    });
    setSelectedSlots(emptySlots);
  };

  const clearSelection = () => {
    setSelectedSlots([]);
  };

  const openBulkEdit = () => {
    setBulkEntryType('bench');
    setBulkMissionId(missions[0]?.id || '');
    setIsBulkModalOpen(true);
  };

  // Save handlers
  const handleBulkSave = async () => {
    if (!myConsultant || selectedSlots.length === 0) return;
    
    try {
      setIsSaving(true);
      const weekStartKey = formatDateKey(currentWeekStart);
      
      for (const slot of selectedSlots) {
        const existingEntry = entries.find(e => e.date === slot.date && e.period === slot.period);
        
        if (existingEntry) {
          await timesheetEntriesService.update(existingEntry.id, {
            entry_type: bulkEntryType,
            mission_id: bulkEntryType === 'mission' ? bulkMissionId : null,
          });
        } else {
          await timesheetEntriesService.create({
            consultant_id: myConsultant.id,
            week_start_date: weekStartKey,
            date: slot.date,
            period: slot.period,
            entry_type: bulkEntryType,
            mission_id: bulkEntryType === 'mission' ? bulkMissionId : null,
          });
        }
      }
      
      toast.success('Saved', `${selectedSlots.length} entries saved`);
      setIsBulkModalOpen(false);
      setSelectedSlots([]);
      loadConsultantData();
    } catch (error) {
      console.error('Error saving entries:', error);
      toast.error('Error', 'Failed to save entries');
    } finally {
      setIsSaving(false);
    }
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
      loadConsultantData();
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
      loadConsultantData();
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
      loadConsultantData();
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Error', 'Failed to submit timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  // Manager approval handlers
  const openWeekApproval = (consultant: DbConsultant, weekStartDate: string) => {
    const week = allWeeks.find(w => 
      w.consultant_id === consultant.id && w.week_start_date === weekStartDate
    );
    
    if (!week || week.status !== 'submitted') {
      toast.error('Error', 'This week has not been submitted for approval');
      return;
    }
    
    const weekEntries = allEntries.filter(e => 
      e.consultant_id === consultant.id && e.week_start_date === weekStartDate
    );
    
    setApprovalConsultant(consultant);
    setApprovalWeek(week);
    setApprovalEntries(weekEntries);
    setRejectionReason('');
    setIsApprovalModalOpen(true);
  };

  const handleApproveWeek = async () => {
    if (!approvalWeek) return;
    
    try {
      setIsSaving(true);
      await timesheetWeeksService.update(approvalWeek.id, { 
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });
      toast.success('Approved', 'Timesheet approved');
      setIsApprovalModalOpen(false);
      loadManagerData();
    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast.error('Error', 'Failed to approve timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectWeek = async () => {
    if (!approvalWeek) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Required', 'Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsSaving(true);
      await timesheetWeeksService.update(approvalWeek.id, { 
        status: 'rejected',
        rejection_reason: rejectionReason,
      });
      toast.success('Rejected', 'Timesheet sent back for revision');
      setIsApprovalModalOpen(false);
      loadManagerData();
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast.error('Error', 'Failed to reject timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  // Get week status for a consultant and date
  const getWeekStatusForDate = (consultantId: string, date: Date): WeekStatus | null => {
    const weekStart = getWeekStart(date);
    const weekStartKey = formatDateKey(weekStart);
    const week = allWeeks.find(w => 
      w.consultant_id === consultantId && w.week_start_date === weekStartKey
    );
    return week?.status as WeekStatus || null;
  };

  // Get entry for a consultant and date
  const getEntryForDate = (consultantId: string, date: Date, period: Period): DbTimesheetEntry | null => {
    const dateKey = formatDateKey(date);
    return allEntries.find(e => 
      e.consultant_id === consultantId && e.date === dateKey && e.period === period
    ) || null;
  };

  // Render cell for consultant calendar
  const renderConsultantDayCell = (consultant: DbConsultant, date: Date) => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateKey = formatDateKey(date);
    const weekStart = getWeekStart(date);
    const weekStartKey = formatDateKey(weekStart);
    
    // Check if this date falls outside the consultant's tenure
    const consultantStart = consultant.start_date ? new Date(consultant.start_date) : null;
    const consultantEnd = consultant.terminated_at 
      ? new Date(consultant.terminated_at) 
      : consultant.end_date 
        ? new Date(consultant.end_date) 
        : null;
    
    if (consultantStart) consultantStart.setHours(0, 0, 0, 0);
    if (consultantEnd) consultantEnd.setHours(23, 59, 59, 999);
    
    const dateNorm = new Date(date);
    dateNorm.setHours(12, 0, 0, 0);
    
    const isOutOfTenure = (consultantStart && dateNorm < consultantStart) || (consultantEnd && dateNorm > consultantEnd);
    
    if (isWeekend) {
      return (
        <div className={`h-10 w-full rounded ${isOutOfTenure ? 'bg-slate-200' : 'bg-slate-50'}`} />
      );
    }
    
    // Render a distinct cell for dates outside the consultant's time at the company
    if (isOutOfTenure) {
      return (
        <div className="h-10 w-full rounded bg-slate-200 flex items-center justify-center" title="Not in company">
          <X className="h-3 w-3 text-slate-400" />
        </div>
      );
    }
    
    const am = getEntryForDate(consultant.id, date, 'AM');
    const pm = getEntryForDate(consultant.id, date, 'PM');
    const weekStatus = getWeekStatusForDate(consultant.id, date);
    
    const hasEntries = am || pm;
    const isApproved = weekStatus === 'approved';
    const isSubmitted = weekStatus === 'submitted';
    const isRejected = weekStatus === 'rejected';
    
    return (
      <button
        onClick={() => isSubmitted ? openWeekApproval(consultant, weekStartKey) : null}
        className={`h-10 w-full rounded text-xs flex flex-col items-center justify-center relative transition-all ${
          isSubmitted ? 'cursor-pointer hover:ring-2 hover:ring-brand-cyan' : 'cursor-default'
        } ${
          !hasEntries ? 'bg-slate-100 text-slate-400' :
          isApproved ? 'bg-green-100 border border-green-300' :
          isSubmitted ? 'bg-amber-100 border border-amber-300' :
          isRejected ? 'bg-red-50 border border-red-200' :
          'bg-slate-200'
        }`}
      >
        {hasEntries ? (
          <div className="flex gap-0.5">
            {am && (
              <div className={`w-3.5 h-3.5 rounded-sm ${entryTypeConfig[am.entry_type].bgClass}`} 
                   title={`AM: ${entryTypeConfig[am.entry_type].label}`} />
            )}
            {pm && (
              <div className={`w-3.5 h-3.5 rounded-sm ${entryTypeConfig[pm.entry_type].bgClass}`}
                   title={`PM: ${entryTypeConfig[pm.entry_type].label}`} />
            )}
          </div>
        ) : (
          <span className="text-slate-300">-</span>
        )}
        {isApproved && (
          <Check className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-white rounded-full" />
        )}
        {isRejected && (
          <X className="absolute -top-1 -right-1 h-3 w-3 text-red-500 bg-white rounded-full" />
        )}
      </button>
    );
  };

  const renderEntryCell = (entry: DbTimesheetEntry | null, date: string, period: Period, isWeekend: boolean) => {
    const isSelected = isSlotSelected(date, period);
    
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
          onClick={() => handleSlotClick(date, period, true)}
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
        onClick={() => handleSlotClick(date, period, false)}
        disabled={isLocked}
        className={`h-16 w-full rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
          isLocked 
            ? 'cursor-not-allowed bg-slate-50 border-slate-200' 
            : isSelected
              ? 'border-brand-cyan bg-brand-cyan/20 border-solid'
              : 'border-slate-300 hover:border-brand-cyan hover:bg-brand-cyan/5 cursor-pointer'
        }`}
      >
        {isSelected ? (
          <Check className="h-5 w-5 text-brand-cyan" />
        ) : (
          <span className="text-xs text-slate-400">{period}</span>
        )}
      </button>
    );
  };

  // Consultant View
  if (isConsultant) {
    if (!myConsultant) {
      return (
        <div className="min-h-screen">
          <Header title="Timesheets" subtitle="Submit your weekly timesheets" />
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
        <Header title="Timesheets" subtitle="Submit your weekly timesheets" />
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

          {/* Quick Actions */}
          {!isLocked && (
            <div className="flex items-center gap-3 p-3 bg-brand-grey-50 rounded-lg">
              <span className="text-sm text-brand-grey-600">Quick fill:</span>
              <Button variant="secondary" size="sm" onClick={selectAllEmpty}>
                Select All Empty
              </Button>
              {selectedSlots.length > 0 && (
                <>
                  <Button variant="secondary" size="sm" onClick={clearSelection}>
                    Clear ({selectedSlots.length})
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={openBulkEdit}
                    leftIcon={<CheckSquare className="h-4 w-4" />}
                  >
                    Fill Selected ({selectedSlots.length})
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Rejection Reason Banner */}
          {weekStatus?.status === 'rejected' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">Timesheet Rejected</p>
              {weekStatus.rejection_reason && (
                <p className="text-sm text-red-700 mt-1">{weekStatus.rejection_reason}</p>
              )}
              <p className="text-xs text-red-600 mt-2">Please update the entries and resubmit.</p>
            </div>
          )}

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
            {(['mission', 'bench'] as const).map(key => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${entryTypeConfig[key].bgClass}`} />
                <span className="text-brand-grey-600">{entryTypeConfig[key].label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${entryTypeConfig.leave.bgClass}`} />
              <span className="text-brand-grey-600">Leave (auto)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${entryTypeConfig.bank_holiday.bgClass}`} />
              <span className="text-brand-grey-600">Bank Holiday (auto)</span>
            </div>
          </div>

          {/* Monthly Overview */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-brand-slate-700">{consultantMonthData.monthLabel}</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-slate-200" />
                  <span className="text-brand-grey-500">Draft</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-300" />
                  <span className="text-brand-grey-500">Submitted</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-400" />
                  <span className="text-brand-grey-500">Approved</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-300" />
                  <span className="text-brand-grey-500">Rejected</span>
                </div>
              </div>
            </div>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px bg-brand-grey-200 rounded-t-lg overflow-hidden">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-brand-grey-500 py-2 bg-brand-grey-50">{d}</div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="bg-brand-grey-200 rounded-b-lg overflow-hidden" style={{ display: 'grid', gap: '1px' }}>
              {consultantMonthData.calendarWeeks.map((week, wi) => {
                const isCurrentWeekRow = week.some(d => {
                  if (!d) return false;
                  const ws = getWeekStart(d);
                  return formatDateKey(ws) === formatDateKey(currentWeekStart);
                });
                
                return (
                  <div 
                    key={wi} 
                    className="grid grid-cols-7"
                    style={{ gap: '1px' }}
                  >
                    {week.map((date, di) => {
                      if (!date) {
                        return <div key={`empty-${di}`} className="h-16 bg-white" />;
                      }
                      
                      const dayOfWeek = date.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isToday = formatDateKey(date) === formatDateKey(new Date());
                      const status = isWeekend ? 'weekend' : getConsultantDayStatus(date);
                      const weekStartOfDay = getWeekStart(date);
                      
                      return (
                        <button
                          key={formatDateKey(date)}
                          onClick={() => {
                            if (!isWeekend) {
                              setCurrentWeekStart(weekStartOfDay);
                            }
                          }}
                          className={`h-16 p-1.5 text-left transition-all relative ${
                            isWeekend ? 'bg-slate-50 cursor-default' :
                            status === 'approved' ? 'bg-green-100 cursor-pointer hover:bg-green-200' :
                            status === 'submitted' ? 'bg-amber-100 cursor-pointer hover:bg-amber-200' :
                            status === 'rejected' ? 'bg-red-50 cursor-pointer hover:bg-red-100' :
                            status === 'has_entries' || status === 'draft' ? 'bg-slate-100 cursor-pointer hover:bg-slate-200' :
                            'bg-white cursor-pointer hover:bg-slate-50'
                          } ${isCurrentWeekRow && !isWeekend ? 'ring-2 ring-inset ring-brand-cyan' : ''}`}
                        >
                          <span className={`text-sm font-medium ${
                            isToday ? 'bg-brand-cyan text-white w-6 h-6 rounded-full flex items-center justify-center' :
                            isWeekend ? 'text-slate-300' :
                            status === 'approved' ? 'text-green-700' :
                            status === 'submitted' ? 'text-amber-700' :
                            status === 'rejected' ? 'text-red-600' :
                            'text-brand-slate-600'
                          }`}>
                            {date.getDate()}
                          </span>
                          {!isWeekend && status !== 'empty' && status !== 'weekend' && (
                            <div className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ${
                              status === 'approved' ? 'bg-green-500' :
                              status === 'submitted' ? 'bg-amber-400' :
                              status === 'rejected' ? 'bg-red-400' :
                              'bg-slate-300'
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Single Entry Modal */}
        <Modal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} title="Edit Entry" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">Entry Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['mission', 'bench'] as TimesheetEntryType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setEntryForm(prev => ({ ...prev, entry_type: type }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      entryForm.entry_type === type ? 'border-brand-cyan bg-brand-cyan/5' : 'border-brand-grey-200 hover:border-brand-grey-300'
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
                <label className="block text-sm font-medium text-brand-slate-700 mb-2">Project</label>
                {missions.length > 0 ? (
                  <select
                    value={entryForm.mission_id}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, mission_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-brand-grey-300 rounded-lg"
                  >
                    {missions.map(mission => (
                      <option key={mission.id} value={mission.id}>{mission.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-600 p-3 bg-amber-50 rounded-lg">No active missions assigned.</p>
                )}
              </div>
            )}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="secondary" onClick={handleDeleteEntry} disabled={!entries.find(e => e.date === selectedDate && e.period === selectedPeriod)}>Clear</Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsEntryModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveEntry} isLoading={isSaving} disabled={entryForm.entry_type === 'mission' && !entryForm.mission_id}>Save</Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Bulk Edit Modal */}
        <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title={`Fill ${selectedSlots.length} Slots`} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-brand-grey-600">Apply the same entry type to all {selectedSlots.length} selected slots.</p>
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">Entry Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['mission', 'bench'] as TimesheetEntryType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setBulkEntryType(type)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      bulkEntryType === type ? 'border-brand-cyan bg-brand-cyan/5' : 'border-brand-grey-200 hover:border-brand-grey-300'
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
            {bulkEntryType === 'mission' && missions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-2">Project</label>
                <select value={bulkMissionId} onChange={(e) => setBulkMissionId(e.target.value)} className="w-full px-3 py-2 border border-brand-grey-300 rounded-lg">
                  {missions.map(mission => (<option key={mission.id} value={mission.id}>{mission.name}</option>))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkSave} isLoading={isSaving} disabled={bulkEntryType === 'mission' && !bulkMissionId}>Apply to All</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Compute consultants with missing timesheet entries.
  // For each active consultant, check every completed weekday from their start_date
  // up to (not including) the current week. If any weekday is missing an AM or PM
  // entry, that consultant is behind. This checks actual entries, not week records.
  const missingTimesheetData = useMemo(() => {
    if (myConsultants.length === 0) return { missing: 0, total: 0, consultants: [] as DbConsultant[] };
    
    const today = new Date();
    const currentWeekMonday = getWeekStart(today);
    const activeConsultants = myConsultants.filter(c => c.status !== 'terminated');
    const total = activeConsultants.length;
    
    const consultantsWithGaps: DbConsultant[] = [];
    
    // Build a lookup: consultantId -> Set of "date|period" keys
    const entryLookup = new Map<string, Set<string>>();
    for (const entry of allEntries) {
      if (!entryLookup.has(entry.consultant_id)) {
        entryLookup.set(entry.consultant_id, new Set());
      }
      entryLookup.get(entry.consultant_id)!.add(`${entry.date}|${entry.period}`);
    }
    
    for (const consultant of activeConsultants) {
      if (!consultant.start_date) {
        consultantsWithGaps.push(consultant);
        continue;
      }
      
      const consultantStart = new Date(consultant.start_date);
      consultantStart.setHours(0, 0, 0, 0);
      
      // End boundary: start of current week, or end_date/terminated_at if earlier
      let endBoundary = new Date(currentWeekMonday);
      const consultantEnd = consultant.terminated_at 
        ? new Date(consultant.terminated_at)
        : consultant.end_date 
          ? new Date(consultant.end_date) 
          : null;
      if (consultantEnd) {
        consultantEnd.setHours(0, 0, 0, 0);
        if (consultantEnd < endBoundary) {
          endBoundary = new Date(consultantEnd);
          endBoundary.setDate(endBoundary.getDate() + 1);
        }
      }
      
      const entries = entryLookup.get(consultant.id) || new Set();
      let hasMissing = false;
      
      // Walk day by day from start_date to endBoundary
      const day = new Date(consultantStart);
      while (day < endBoundary) {
        const dayOfWeek = day.getDay();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateKey = formatDateKey(day);
          if (!entries.has(`${dateKey}|AM`) || !entries.has(`${dateKey}|PM`)) {
            hasMissing = true;
            break;
          }
        }
        day.setDate(day.getDate() + 1);
      }
      
      if (hasMissing) {
        consultantsWithGaps.push(consultant);
      }
    }
    
    return { missing: consultantsWithGaps.length, total, consultants: consultantsWithGaps };
  }, [myConsultants, allEntries]);

  // Manager View - Monthly Calendar
  return (
    <div className="min-h-screen">
      <Header title="Timesheets" subtitle="Review and approve consultant timesheets" />
      <div className="p-6 space-y-6">
        {/* Missing Timesheets KPI */}
        {!isLoading && myConsultants.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-6">
              {/* Donut Chart - two colours: green (up to date) + red (missing) */}
              {(() => {
                const total = missingTimesheetData.total;
                const missing = missingTimesheetData.missing;
                const upToDate = total - missing;
                const circumference = 2 * Math.PI * 14; // ~87.96
                const redPortion = total > 0 ? (missing / total) * circumference : 0;
                const greenPortion = total > 0 ? (upToDate / total) * circumference : circumference;
                
                return (
                  <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
                    <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Green arc (up to date) - drawn first, sits behind */}
                      <circle
                        cx="18" cy="18" r="14"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="4"
                        strokeDasharray={`${greenPortion} ${circumference}`}
                        strokeDashoffset="0"
                      />
                      {/* Red arc (missing) - drawn second, starts where green ends */}
                      {missing > 0 && (
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="4"
                          strokeDasharray={`${redPortion} ${circumference}`}
                          strokeDashoffset={`${-greenPortion}`}
                        />
                      )}
                    </svg>
                    {/* Centre number */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl font-bold leading-none ${missing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {missing}
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              {/* Label and names */}
              <div>
                <p className="font-semibold text-brand-slate-900">
                  {missingTimesheetData.missing === 0
                    ? 'All timesheets up to date'
                    : `Consultants with missing entries`
                  }
                </p>
                <p className="text-sm text-brand-grey-400 mt-0.5">
                  {missingTimesheetData.total - missingTimesheetData.missing} of {missingTimesheetData.total} consultants up to date
                </p>
                {missingTimesheetData.missing > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {missingTimesheetData.consultants.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-xs font-medium text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {c.first_name} {c.last_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Month Navigation */}
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
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            {(['mission', 'bench', 'leave', 'bank_holiday'] as const).map(key => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${entryTypeConfig[key].bgClass}`} />
                <span className="text-brand-grey-600">{entryTypeConfig[key].label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
              <span className="text-brand-grey-600">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              <Check className="h-2 w-2 text-green-600" />
              <span className="text-brand-grey-600">Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
              <X className="h-2 w-2 text-red-500" />
              <span className="text-brand-grey-600">Rejected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-200 flex items-center justify-center" />
              <X className="h-2 w-2 text-slate-400" />
              <span className="text-brand-grey-600">Not in company</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
            </div>
          </Card>
        ) : myConsultants.length === 0 ? (
          <Card>
            <EmptyState
              icon={<User className="h-12 w-12" />}
              title="No Consultants"
              description="No consultants are assigned to you"
            />
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-brand-grey-200">
                  <th className="text-left p-3 font-medium text-brand-slate-700 sticky left-0 bg-white z-10 border-r border-brand-grey-200" style={{ width: '180px', minWidth: '180px' }}>
                    Consultant
                  </th>
                  {monthDays.map(date => {
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isToday = formatDateKey(date) === formatDateKey(new Date());
                    return (
                      <th 
                        key={formatDateKey(date)} 
                        style={{ width: '44px', minWidth: '44px' }}
                        className={`p-0 text-center ${
                          isToday ? 'bg-brand-cyan text-white rounded' :
                          isWeekend ? 'text-slate-300' : 'text-brand-slate-600'
                        }`}
                      >
                        <div className="text-[10px] font-normal">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}</div>
                        <div className="text-sm font-semibold">{date.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {myConsultants.map(consultant => (
                  <tr key={consultant.id} className="border-b border-brand-grey-100 hover:bg-brand-grey-50">
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-brand-grey-200" style={{ width: '180px', minWidth: '180px' }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="sm" />
                        <div>
                          <p className="font-medium text-brand-slate-900 text-sm">
                            {consultant.first_name} {consultant.last_name}
                          </p>
                          <p className="text-xs text-brand-grey-400">{consultant.job_title || 'Consultant'}</p>
                        </div>
                      </div>
                    </td>
                    {monthDays.map(date => (
                      <td key={formatDateKey(date)} className="p-0.5" style={{ width: '44px', minWidth: '44px' }}>
                        {renderConsultantDayCell(consultant, date)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Week Approval Modal */}
      <Modal 
        isOpen={isApprovalModalOpen} 
        onClose={() => setIsApprovalModalOpen(false)} 
        title={approvalConsultant ? `${approvalConsultant.first_name} ${approvalConsultant.last_name}'s Timesheet` : 'Timesheet'} 
        size="lg"
      >
        {approvalWeek && (
          <div className="space-y-4">
            <p className="text-sm text-brand-grey-500">
              Week of {formatWeekRange(new Date(approvalWeek.week_start_date))}
            </p>
            
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays(new Date(approvalWeek.week_start_date)).map(day => {
                const am = approvalEntries.find(e => e.date === day.date && e.period === 'AM');
                const pm = approvalEntries.find(e => e.date === day.date && e.period === 'PM');
                
                return (
                  <div key={day.date} className="space-y-1">
                    <div className={`text-center p-1 rounded ${day.isWeekend ? 'bg-slate-100' : 'bg-brand-grey-100'}`}>
                      <p className="text-xs font-medium">{day.dayName}</p>
                      <p className="text-sm font-bold">{day.dayNumber}</p>
                    </div>
                    {day.isWeekend ? (
                      <div className="h-16 bg-slate-50 rounded text-center text-xs text-slate-400 flex items-center justify-center">Weekend</div>
                    ) : (
                      <>
                        <div className={`h-8 rounded text-xs flex items-center justify-center ${
                          am ? `${entryTypeConfig[am.entry_type].bgClass} ${entryTypeConfig[am.entry_type].textClass}` : 'bg-red-100 text-red-600'
                        }`}>
                          {am ? entryTypeConfig[am.entry_type].label : 'Missing'}
                        </div>
                        <div className={`h-8 rounded text-xs flex items-center justify-center ${
                          pm ? `${entryTypeConfig[pm.entry_type].bgClass} ${entryTypeConfig[pm.entry_type].textClass}` : 'bg-red-100 text-red-600'
                        }`}>
                          {pm ? entryTypeConfig[pm.entry_type].label : 'Missing'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">
                Rejection Reason (required if rejecting)
              </label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsApprovalModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleRejectWeek} isLoading={isSaving}>Reject</Button>
              <Button variant="success" onClick={handleApproveWeek} leftIcon={<Check className="h-4 w-4" />} isLoading={isSaving}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
