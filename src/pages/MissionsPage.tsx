import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  MapPin,
  PoundSterling,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, EmptyState, Modal, Input, Select, Textarea, DeleteDialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { missionsService, companiesService, consultantsService, type DbMission, type DbCompany } from '@/lib/services';

const workModeLabels: Record<string, string> = {
  full_onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

const statusConfig: Record<string, { label: string; colour: string }> = {
  active: { label: 'Active', colour: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', colour: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelled', colour: 'bg-red-100 text-red-700' },
  on_hold: { label: 'On Hold', colour: 'bg-amber-100 text-amber-700' },
};

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
  return `${day} ${month}`;
}

function getMissionBarStyle(mission: DbMission, weeks: Date[]): { left: string; width: string } | null {
  if (weeks.length === 0) return null;
  
  const timelineStart = weeks[0];
  const timelineEnd = new Date(weeks[weeks.length - 1]);
  timelineEnd.setDate(timelineEnd.getDate() + 6);
  
  const missionStart = new Date(mission.start_date);
  const missionEnd = new Date(mission.end_date);
  
  const visibleStart = missionStart < timelineStart ? timelineStart : missionStart;
  const visibleEnd = missionEnd > timelineEnd ? timelineEnd : missionEnd;
  
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

export function MissionsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  
  const [missions, setMissions] = useState<DbMission[]>([]);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 14);
    return today;
  });
  const numWeeks = 12;

  // Mission detail/edit modal
  const [selectedMission, setSelectedMission] = useState<DbMission | null>(null);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    sold_daily_rate: '',
    location: '',
    work_mode: 'hybrid' as 'full_onsite' | 'hybrid' | 'remote',
    status: 'active' as 'active' | 'completed' | 'cancelled' | 'on_hold',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Close mission modal
  const [isCloseMissionModalOpen, setIsCloseMissionModalOpen] = useState(false);
  const [closeMissionEndDate, setCloseMissionEndDate] = useState('');
  
  // Delete mission
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [missionsData, companiesData] = await Promise.all([
        missionsService.getAll(),
        companiesService.getAll(),
      ]);
      setMissions(missionsData);
      setCompanies(companiesData);
      
      const customerIds = new Set(missionsData.map(m => m.company_id));
      setExpandedCustomers(customerIds);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load missions');
    } finally {
      setIsLoading(false);
    }
  };

  const weeks = useMemo(() => getWeeksInRange(timelineStart, numWeeks), [timelineStart, numWeeks]);

  const missionsByCustomer = useMemo(() => {
    const grouped: Record<string, DbMission[]> = {};
    missions.forEach(mission => {
      if (!grouped[mission.company_id]) {
        grouped[mission.company_id] = [];
      }
      grouped[mission.company_id].push(mission);
    });
    return grouped;
  }, [missions]);

  const companiesWithMissions = useMemo(() => {
    return companies.filter(c => missionsByCustomer[c.id]?.length > 0);
  }, [companies, missionsByCustomer]);

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

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  // Open mission detail
  const openMissionDetail = (mission: DbMission) => {
    setSelectedMission(mission);
    setEditForm({
      name: mission.name,
      start_date: mission.start_date,
      end_date: mission.end_date,
      sold_daily_rate: mission.sold_daily_rate.toString(),
      location: mission.location || '',
      work_mode: mission.work_mode,
      status: mission.status,
      notes: mission.notes || '',
    });
    setIsEditing(false);
    setIsMissionModalOpen(true);
  };

  // Save mission changes
  const handleSaveMission = async () => {
    if (!selectedMission) return;

    // Managers can only change end_date and close (complete) the mission
    // Admins can change everything
    const isManager = !permissions.isAdmin;
    
    if (isManager) {
      // Check if they're trying to change restricted fields
      if (editForm.start_date !== selectedMission.start_date) {
        toast.error('Permission Denied', 'Only admins can change the start date');
        return;
      }
      if (selectedMission.status === 'completed' && editForm.status !== 'completed') {
        toast.error('Permission Denied', 'Only admins can reopen a completed mission');
        return;
      }
    }

    setIsSaving(true);
    try {
      await missionsService.update(selectedMission.id, {
        name: editForm.name,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        sold_daily_rate: parseFloat(editForm.sold_daily_rate),
        location: editForm.location || undefined,
        work_mode: editForm.work_mode,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });

      // If mission completed, update consultant status
      if (editForm.status === 'completed' && selectedMission.status !== 'completed') {
        // Check if consultant has other active missions
        const otherMissions = await missionsService.getByConsultant(selectedMission.consultant_id);
        const activeMissions = otherMissions.filter(m => m.id !== selectedMission.id && m.status === 'active');
        if (activeMissions.length === 0) {
          await consultantsService.update(selectedMission.consultant_id, { status: 'bench' });
        }
      }

      toast.success('Mission Updated', 'Changes have been saved');
      setIsMissionModalOpen(false);
      setSelectedMission(null);
      loadData();
    } catch (error) {
      console.error('Error saving mission:', error);
      toast.error('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMission = async (hardDelete: boolean) => {
    if (!selectedMission) return;
    
    setIsDeleting(true);
    try {
      if (hardDelete) {
        await missionsService.hardDelete(selectedMission.id);
        toast.success('Mission Deleted', 'The mission has been permanently deleted');
      } else {
        await missionsService.delete(selectedMission.id, user?.id);
        toast.success('Mission Archived', 'The mission has been archived');
      }
      setIsDeleteDialogOpen(false);
      setIsMissionModalOpen(false);
      setSelectedMission(null);
      loadData();
    } catch (error) {
      console.error('Error deleting mission:', error);
      toast.error('Error', 'Failed to delete mission');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick close mission
  const handleCloseMission = async () => {
    if (!selectedMission) return;
    
    setEditForm(prev => ({ ...prev, status: 'completed' }));
    // The actual save will happen when they click Save
  };

  const stats = {
    active: missions.filter(m => m.status === 'active').length,
    total: missions.length,
    consultants: new Set(missions.filter(m => m.status === 'active').map(m => m.consultant_id)).size,
    companies: companiesWithMissions.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Missions" />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading missions...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Missions" 
        subtitle={`${stats.active} active missions across ${stats.companies} customers`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.active}</p>
                <p className="text-sm text-brand-grey-400">Active Missions</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.total}</p>
                <p className="text-sm text-brand-grey-400">Total Missions</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.consultants}</p>
                <p className="text-sm text-brand-grey-400">Consultants in Mission</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.companies}</p>
                <p className="text-sm text-brand-grey-400">Active Customers</p>
              </div>
            </div>
          </Card>
        </div>

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

        {/* Timeline View */}
        {missions.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="No missions yet"
            description="Missions will appear here once you create them from won requirements"
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              {/* Timeline Header */}
              <div className="flex border-b border-brand-grey-200 min-w-[900px]">
                <div className="w-64 flex-shrink-0 p-3 bg-brand-grey-50 font-medium text-brand-slate-700 border-r border-brand-grey-200">
                  Customer / Consultant
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

              {/* Timeline Body */}
              {companiesWithMissions.map(customer => {
                const customerMissions = missionsByCustomer[customer.id] || [];
                const isExpanded = expandedCustomers.has(customer.id);
                
                return (
                  <div key={customer.id} className="min-w-[900px]">
                    {/* Customer Header */}
                    <div 
                      className="flex items-center border-b border-brand-grey-200 bg-brand-grey-50 cursor-pointer hover:bg-brand-grey-100 transition-colors"
                      onClick={() => toggleCustomer(customer.id)}
                    >
                      <div className="w-64 flex-shrink-0 p-3 flex items-center gap-2 border-r border-brand-grey-200">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-brand-grey-400" />
                        ) : (
                          <ChevronUp className="h-4 w-4 text-brand-grey-400" />
                        )}
                        <Building2 className="h-4 w-4 text-brand-grey-400" />
                        <span className="font-medium text-brand-slate-900">{customer.name}</span>
                        <Badge variant="grey">{customerMissions.length}</Badge>
                      </div>
                      <div className="flex-1" />
                    </div>

                    {/* Missions */}
                    {isExpanded && customerMissions.map(mission => {
                      const barStyle = getMissionBarStyle(mission, weeks);
                      const statusInfo = statusConfig[mission.status] || statusConfig.active;
                      
                      return (
                        <div 
                          key={mission.id} 
                          className="flex border-b border-brand-grey-100 hover:bg-brand-grey-50/50 transition-colors cursor-pointer"
                          onClick={() => openMissionDetail(mission)}
                        >
                          {/* Mission Info */}
                          <div className="w-64 flex-shrink-0 p-3 border-r border-brand-grey-200">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-brand-slate-900 text-sm truncate">
                                  {mission.consultant?.first_name} {mission.consultant?.last_name}
                                </p>
                                <p className="text-xs text-brand-grey-400 truncate">
                                  {mission.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${statusInfo.colour}`}>
                                    {statusInfo.label}
                                  </span>
                                  <span className="text-xs text-brand-grey-400">
                                    £{mission.sold_daily_rate}/day
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Timeline Bar */}
                          <div className="flex-1 relative py-3">
                            {barStyle && (
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full transition-all hover:h-8 ${
                                  mission.status === 'active' ? 'bg-green-500' :
                                  mission.status === 'completed' ? 'bg-blue-400' :
                                  mission.status === 'on_hold' ? 'bg-amber-400' :
                                  'bg-red-400'
                                }`}
                                style={{ left: barStyle.left, width: barStyle.width, minWidth: '8px' }}
                                title={`${mission.name}\n${formatDate(mission.start_date)} - ${formatDate(mission.end_date)}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm text-brand-grey-500">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-400" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-400" />
            <span>On Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-400" />
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      {/* Mission Detail/Edit Modal */}
      <Modal
        isOpen={isMissionModalOpen}
        onClose={() => {
          setIsMissionModalOpen(false);
          setSelectedMission(null);
          setIsEditing(false);
        }}
        title={isEditing ? 'Edit Mission' : 'Mission Details'}
        size="lg"
      >
        {selectedMission && (
          <div className="space-y-6">
            {!isEditing ? (
              <>
                {/* View Mode */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
                  <div>
                    <p className="text-xs text-brand-grey-400">Mission Name</p>
                    <p className="font-medium text-brand-slate-900">{selectedMission.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm ${statusConfig[selectedMission.status]?.colour}`}>
                      {statusConfig[selectedMission.status]?.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">Consultant</p>
                    <p 
                      className="font-medium text-brand-cyan cursor-pointer hover:underline"
                      onClick={() => {
                        setIsMissionModalOpen(false);
                        navigate(`/consultants/${selectedMission.consultant_id}`);
                      }}
                    >
                      {selectedMission.consultant?.first_name} {selectedMission.consultant?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">Customer</p>
                    <p className="font-medium text-brand-slate-900">{selectedMission.company?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">Start Date</p>
                    <p className="font-medium text-brand-slate-900">{formatDate(selectedMission.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">End Date</p>
                    <p className="font-medium text-brand-slate-900">{formatDate(selectedMission.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">Daily Rate</p>
                    <p className="font-medium text-brand-slate-900">£{selectedMission.sold_daily_rate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-grey-400">Work Mode</p>
                    <p className="font-medium text-brand-slate-900">{workModeLabels[selectedMission.work_mode]}</p>
                  </div>
                  {selectedMission.location && (
                    <div className="col-span-2">
                      <p className="text-xs text-brand-grey-400">Location</p>
                      <p className="font-medium text-brand-slate-900">{selectedMission.location}</p>
                    </div>
                  )}
                  {selectedMission.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-brand-grey-400">Notes</p>
                      <p className="text-brand-slate-700">{selectedMission.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setIsMissionModalOpen(false)}>
                    Close
                  </Button>
                  {selectedMission.status === 'active' && (
                    <Button 
                      variant="success" 
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                      onClick={() => {
                        setCloseMissionEndDate(selectedMission.end_date);
                        setIsCloseMissionModalOpen(true);
                      }}
                    >
                      Close Mission
                    </Button>
                  )}
                  <Button 
                    variant="primary" 
                    leftIcon={<Edit className="h-4 w-4" />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                  {(permissions.isAdmin || permissions.isSuperAdmin) && (
                    <Button 
                      variant="danger" 
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Edit Mode */}
                <Input
                  label="Mission Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!permissions.isAdmin}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                    disabled={!permissions.isAdmin}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Sold Daily Rate (£)"
                    type="number"
                    value={editForm.sold_daily_rate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sold_daily_rate: e.target.value }))}
                    disabled={!permissions.isAdmin}
                  />
                  <Select
                    label="Status"
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'on_hold', label: 'On Hold' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    disabled={!permissions.isAdmin && selectedMission.status === 'completed'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Location"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!permissions.isAdmin}
                  />
                  <Select
                    label="Work Mode"
                    options={[
                      { value: 'full_onsite', label: 'Full On-site' },
                      { value: 'hybrid', label: 'Hybrid' },
                      { value: 'remote', label: 'Remote' },
                    ]}
                    value={editForm.work_mode}
                    onChange={(e) => setEditForm(prev => ({ ...prev, work_mode: e.target.value as any }))}
                    disabled={!permissions.isAdmin}
                  />
                </div>

                <Textarea
                  label="Notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />

                {!permissions.isAdmin && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    As a manager, you can only change the end date and close the mission. Contact an admin to modify other fields.
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSaveMission}
                    isLoading={isSaving}
                  >
                    Save Changes
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Close Mission Modal */}
      <Modal
        isOpen={isCloseMissionModalOpen}
        onClose={() => setIsCloseMissionModalOpen(false)}
        title="Close Mission"
        description={`Mark ${selectedMission?.name} as completed`}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="End Date"
            type="date"
            value={closeMissionEndDate}
            onChange={(e) => setCloseMissionEndDate(e.target.value)}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsCloseMissionModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="success" 
              leftIcon={<CheckCircle className="h-4 w-4" />}
              onClick={async () => {
                if (!selectedMission) return;
                setIsSaving(true);
                try {
                  await missionsService.update(selectedMission.id, {
                    end_date: closeMissionEndDate,
                    status: 'completed',
                  });
                  toast.success('Mission Closed', `${selectedMission.name} has been marked as completed`);
                  setIsCloseMissionModalOpen(false);
                  setIsMissionModalOpen(false);
                  loadData();
                } catch (error) {
                  console.error('Error closing mission:', error);
                  toast.error('Error', 'Failed to close mission');
                } finally {
                  setIsSaving(false);
                }
              }}
              isLoading={isSaving}
            >
              Close Mission
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Mission Dialog */}
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDeleteMission}
        itemType="Mission"
        itemName={selectedMission?.name || 'this mission'}
        canHardDelete={permissions.isSuperAdmin}
        isLoading={isDeleting}
      />
    </div>
  );
}
