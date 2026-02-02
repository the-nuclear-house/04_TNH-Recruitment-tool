import { useState, useEffect } from 'react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  Button, 
  Avatar, 
  Badge, 
  Modal,
  Input,
  ConfirmDialog,
  Select,
  EmptyState,
} from '@/components/ui';
import { Plus, Users, Edit, Trash2, Mail, Shield, Building2, UserCog } from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions, roleHierarchy, requiresManager } from '@/hooks/usePermissions';
import { usersService, consultantsService, type DbConsultant, type DbUser } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

// Base roles - mutually exclusive (pick one)
const baseRoles = [
  // Recruitment Department
  { value: 'recruiter', label: 'Recruiter', description: 'Source candidates and conduct phone interviews', colour: 'cyan', department: 'Recruitment' },
  { value: 'recruiter_manager', label: 'Recruiter Manager', description: 'Manage recruitment team and approve requests', colour: 'cyan', department: 'Recruitment' },
  // Technical Department
  { value: 'technical', label: 'Technical', description: 'Conduct technical interviews (read-only access)', colour: 'blue', department: 'Technical' },
  { value: 'technical_director', label: 'Technical Director', description: 'Oversee technical team and approve requests', colour: 'blue', department: 'Technical' },
  // Business Department
  { value: 'business_manager', label: 'Business Manager', description: 'Manage requirements and client relationships', colour: 'green', department: 'Business' },
  { value: 'business_director', label: 'Business Director', description: 'Oversee business managers and approve contracts', colour: 'green', department: 'Business' },
  // HR Department
  { value: 'hr', label: 'HR', description: 'Handle employee matters and contracts', colour: 'purple', department: 'HR' },
  { value: 'hr_manager', label: 'HR Manager', description: 'Manage HR team and approve HR requests', colour: 'purple', department: 'HR' },
];

// Add-on roles - can be combined with base role
const addonRoles = [
  { value: 'admin', label: 'Admin', description: 'Full system access and user management' },
];

const roleBadgeVariant: Record<string, 'cyan' | 'green' | 'gold' | 'orange' | 'purple' | 'red' | 'blue'> = {
  recruiter: 'cyan',
  recruiter_manager: 'cyan',
  technical: 'blue',
  technical_director: 'blue',
  business_manager: 'green',
  business_director: 'green',
  hr: 'purple',
  hr_manager: 'purple',
  admin: 'orange',
  superadmin: 'red',
};

const roleLabels: Record<string, string> = {
  recruiter: 'Recruiter',
  recruiter_manager: 'Recruiter Manager',
  technical: 'Technical',
  technical_director: 'Technical Director',
  business_manager: 'Business Manager',
  business_director: 'Business Director',
  hr: 'HR',
  hr_manager: 'HR Manager',
  admin: 'Admin',
  superadmin: 'Super Admin',
};

export function OrganisationPage() {
  const { user: currentUser } = useAuthStore();
  const permissions = usePermissions();
  const toast = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'corporate' | 'consultants'>('corporate');
  
  const [users, setUsers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<DbConsultant[]>([]);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add/Edit user modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    roles: [] as string[],
    password: '',
    reports_to: '' as string,
  });
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get potential managers based on selected role
  const getPotentialManagers = () => {
    const selectedRole = formData.roles[0] as UserRole;
    if (!selectedRole || !requiresManager(selectedRole)) return [];
    
    const managerRole = roleHierarchy[selectedRole];
    if (!managerRole) return [];
    
    return users.filter(u => 
      u.roles?.includes(managerRole) && 
      u.id !== editingUserId
    );
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const [usersData, consultantsData] = await Promise.all([
        usersService.getAll(),
        consultantsService.getAll(),
      ]);
      setUsers(usersData);
      setAllUsers(usersData);
      setConsultants(consultantsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error', 'Failed to load organisation data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({
      email: '',
      full_name: '',
      roles: ['recruiter'],
      password: '',
      reports_to: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: any) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      roles: user.roles || [],
      password: '',
      reports_to: user.reports_to || '',
    });
    setIsModalOpen(true);
  };

  const handleBaseRoleChange = (role: string) => {
    setFormData(prev => {
      // Remove any existing base roles and add the new one
      const baseRoleValues = baseRoles.map(r => r.value);
      const currentAddons = prev.roles.filter(r => !baseRoleValues.includes(r));
      // Reset reports_to when role changes
      return { ...prev, roles: [role, ...currentAddons], reports_to: '' };
    });
  };

  const handleAddonToggle = (role: string) => {
    // Check if user can assign admin role
    if (role === 'admin' && !permissions.canCreateAdmins) {
      toast.error('Permission Denied', 'Only Super Admins can assign Admin roles');
      return;
    }
    
    setFormData(prev => {
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: newRoles };
    });
  };

  // Get the current base role from formData
  const currentBaseRole = formData.roles.find(r => baseRoles.map(br => br.value).includes(r));

  const handleSubmit = async () => {
    if (!formData.email || !formData.full_name || formData.roles.length === 0) {
      toast.error('Validation Error', 'Please fill in all required fields and select at least one role');
      return;
    }
    
    if (!isEditing && !formData.password) {
      toast.error('Validation Error', 'Password is required for new users');
      return;
    }

    // Validate reports_to if role requires a manager
    const selectedRole = formData.roles[0] as UserRole;
    if (requiresManager(selectedRole) && !formData.reports_to) {
      toast.error('Validation Error', `Please select a manager for this ${roleLabels[selectedRole] || selectedRole}`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingUserId) {
        const { error } = await supabase
          .from('users')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            roles: formData.roles,
            reports_to: formData.reports_to || null,
          })
          .eq('id', editingUserId);
        
        if (error) throw error;
        toast.success('User Updated', `${formData.full_name}'s profile has been updated`);
      } else {
        // Use edge function to create user (works even with signups disabled)
        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            roles: formData.roles,
            reports_to: formData.reports_to || null,
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user');
        }
        
        // Update reports_to if set (edge function creates user, we update reports_to separately)
        if (formData.reports_to && result.user?.id) {
          await supabase
            .from('users')
            .update({ reports_to: formData.reports_to })
            .eq('id', result.user.id);
        }
        
        toast.success('User Created', `${formData.full_name} has been added and can log in immediately.`);
      }
      
      setIsModalOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error('Error', error.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      // Use edge function to delete user (handles both auth and users table)
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }
      
      toast.success('User Removed', `${userToDelete.full_name} has been removed`);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Error', error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Organisation"
        subtitle="Manage team members and consultants"
        actions={
          permissions.isAdmin && activeTab === 'corporate' ? (
            <Button 
              variant="success"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenAddModal}
            >
              Add Team Member
            </Button>
          ) : null
        }
      />
      
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-brand-grey-200">
          <button
            onClick={() => setActiveTab('corporate')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'corporate'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-brand-grey-500 hover:text-brand-slate-700'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Corporate ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('consultants')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'consultants'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-brand-grey-500 hover:text-brand-slate-700'
            }`}
          >
            <UserCog className="h-4 w-4" />
            Consultants ({consultants.filter(c => c.status !== 'terminated').length})
          </button>
        </div>

        {activeTab === 'corporate' ? (
          <>
            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-cyan/10 rounded-lg">
                    <Users className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">{users.length}</p>
                    <p className="text-sm text-brand-grey-400">Total Members</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Users className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {users.filter(u => u.roles?.some((r: string) => ['recruiter', 'recruiter_manager'].includes(r))).length}
                    </p>
                    <p className="text-sm text-brand-grey-400">Recruitment</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {users.filter(u => u.roles?.some((r: string) => ['business_manager', 'business_director'].includes(r))).length}
                    </p>
                    <p className="text-sm text-brand-grey-400">Business</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {users.filter(u => u.roles?.some((r: string) => ['admin', 'superadmin'].includes(r))).length}
                    </p>
                    <p className="text-sm text-brand-grey-400">Admins</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Team Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              
              {isLoading ? (
                <div className="text-center py-8 text-brand-grey-400">Loading team members...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-brand-grey-300 mb-3" />
                  <p className="text-brand-grey-400">No team members yet</p>
                </div>
              ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-brand-grey-50 hover:bg-brand-grey-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={user.full_name} size="md" />
                    <div>
                      <p className="font-medium text-brand-slate-900">
                        {user.full_name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-brand-grey-400">(You)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-brand-grey-400">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {(user.roles || []).map((role: string) => (
                        <Badge key={role} variant={roleBadgeVariant[role] || 'grey'}>
                          {roleLabels[role] || role}
                        </Badge>
                      ))}
                    </div>
                    
                    {permissions.isAdmin && user.id !== currentUser?.id && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions & Hierarchy
            </CardTitle>
          </CardHeader>
          
          {/* Recruitment Department */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-brand-grey-500 mb-3 uppercase tracking-wider">Recruitment Department</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-cyan-50 rounded-lg">
                <h4 className="font-medium text-cyan-800 mb-2">Recruiter</h4>
                <ul className="text-sm text-cyan-700 space-y-1">
                  <li>• View and add candidates</li>
                  <li>• Conduct phone interviews</li>
                  <li>• View requirements (read-only)</li>
                </ul>
                <p className="text-xs text-cyan-600 mt-2 italic">Reports to: Recruiter Manager</p>
              </div>
              <div className="p-4 bg-cyan-100 rounded-lg border-2 border-cyan-300">
                <h4 className="font-medium text-cyan-800 mb-2">Recruiter Manager</h4>
                <ul className="text-sm text-cyan-700 space-y-1">
                  <li>• All Recruiter permissions</li>
                  <li>• View team performance</li>
                  <li>• Approve team requests</li>
                </ul>
                <p className="text-xs text-cyan-600 mt-2 italic">Department Head</p>
              </div>
            </div>
          </div>

          {/* Technical Department */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-brand-grey-500 mb-3 uppercase tracking-wider">Technical Department</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Technical</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• View candidates (read-only)</li>
                  <li>• View requirements (read-only)</li>
                  <li>• Conduct technical interviews</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2 italic">Reports to: Technical Director</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
                <h4 className="font-medium text-blue-800 mb-2">Technical Director</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• All Technical permissions</li>
                  <li>• View team performance</li>
                  <li>• Approve technical decisions</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2 italic">Department Head</p>
              </div>
            </div>
          </div>

          {/* Business Department */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-brand-grey-500 mb-3 uppercase tracking-wider">Business Department</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Business Manager</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Create and manage requirements</li>
                  <li>• Manage client relationships</li>
                  <li>• Schedule client assessments</li>
                </ul>
                <p className="text-xs text-green-600 mt-2 italic">Reports to: Business Director</p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg border-2 border-green-300">
                <h4 className="font-medium text-green-800 mb-2">Business Director</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• All Manager permissions</li>
                  <li>• Approve contracts</li>
                  <li>• Approve salary requests</li>
                </ul>
                <p className="text-xs text-green-600 mt-2 italic">Department Head</p>
              </div>
            </div>
          </div>

          {/* HR Department */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-brand-grey-500 mb-3 uppercase tracking-wider">HR Department</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">HR</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• View contracts</li>
                  <li>• Handle employee matters</li>
                  <li>• Process documentation</li>
                </ul>
                <p className="text-xs text-purple-600 mt-2 italic">Reports to: HR Manager</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-lg border-2 border-purple-300">
                <h4 className="font-medium text-purple-800 mb-2">HR Manager</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• All HR permissions</li>
                  <li>• Approve HR requests</li>
                  <li>• View team performance</li>
                </ul>
                <p className="text-xs text-purple-600 mt-2 italic">Department Head</p>
              </div>
            </div>
          </div>

          {/* Admin Roles */}
          <div>
            <h4 className="text-sm font-semibold text-brand-grey-500 mb-3 uppercase tracking-wider">System Administration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Admin</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Full system access</li>
                  <li>• Manage team members</li>
                  <li>• Soft delete records</li>
                </ul>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
                <h4 className="font-medium text-red-800 mb-2">Super Admin</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• All Admin permissions</li>
                  <li>• Create other Admins</li>
                  <li>• Hard delete records permanently</li>
                </ul>
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-brand-grey-400">
            Users with subordinate roles must be assigned to a manager. Department heads are independent.
          </p>
        </Card>
          </>
        ) : (
          /* Consultants Tab */
          <>
            {/* Consultants Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-cyan/10 rounded-lg">
                    <UserCog className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {consultants.filter(c => c.status !== 'terminated').length}
                    </p>
                    <p className="text-sm text-brand-grey-400">Active Consultants</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserCog className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {consultants.filter(c => c.status === 'in_mission').length}
                    </p>
                    <p className="text-sm text-brand-grey-400">In Mission</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <UserCog className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {consultants.filter(c => c.status === 'bench').length}
                    </p>
                    <p className="text-sm text-brand-grey-400">On Bench</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserCog className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-slate-900">
                      {consultants.filter(c => c.status === 'on_leave').length}
                    </p>
                    <p className="text-sm text-brand-grey-400">On Leave</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Consultants grouped by Account Manager */}
            {(() => {
              const activeConsultants = consultants.filter(c => c.status !== 'terminated');
              const groupedByManager: Record<string, DbConsultant[]> = {};
              const unassigned: DbConsultant[] = [];
              
              activeConsultants.forEach(consultant => {
                if (consultant.account_manager_id) {
                  if (!groupedByManager[consultant.account_manager_id]) {
                    groupedByManager[consultant.account_manager_id] = [];
                  }
                  groupedByManager[consultant.account_manager_id].push(consultant);
                } else {
                  unassigned.push(consultant);
                }
              });

              return (
                <div className="space-y-6">
                  {Object.entries(groupedByManager).map(([managerId, managerConsultants]) => {
                    const manager = allUsers.find(u => u.id === managerId);
                    return (
                      <Card key={managerId}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <Avatar name={manager?.full_name || 'Unknown'} size="sm" />
                            <div>
                              <span>{manager?.full_name || 'Unknown Manager'}</span>
                              <span className="text-sm font-normal text-brand-grey-400 ml-2">
                                ({managerConsultants.length} consultant{managerConsultants.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <div className="divide-y divide-brand-grey-100">
                          {managerConsultants.map(consultant => (
                            <div key={consultant.id} className="p-4 flex items-center justify-between hover:bg-brand-grey-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="md" />
                                <div>
                                  <p className="font-medium text-brand-slate-900">
                                    {consultant.first_name} {consultant.last_name}
                                    {consultant.reference_id && (
                                      <span className="text-xs text-brand-grey-400 ml-2">[{consultant.reference_id}]</span>
                                    )}
                                  </p>
                                  <p className="text-sm text-brand-grey-500">{consultant.job_title || consultant.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={
                                    consultant.status === 'in_mission' ? 'green' :
                                    consultant.status === 'bench' ? 'amber' :
                                    consultant.status === 'on_leave' ? 'purple' : 'grey'
                                  }
                                >
                                  {consultant.status === 'in_mission' ? 'In Mission' :
                                   consultant.status === 'bench' ? 'On Bench' :
                                   consultant.status === 'on_leave' ? 'On Leave' : consultant.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}

                  {unassigned.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-amber-600">
                          <Users className="h-5 w-5" />
                          <div>
                            <span>Unassigned</span>
                            <span className="text-sm font-normal text-brand-grey-400 ml-2">
                              ({unassigned.length} consultant{unassigned.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <div className="divide-y divide-brand-grey-100">
                        {unassigned.map(consultant => (
                          <div key={consultant.id} className="p-4 flex items-center justify-between hover:bg-brand-grey-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="md" />
                              <div>
                                <p className="font-medium text-brand-slate-900">
                                  {consultant.first_name} {consultant.last_name}
                                </p>
                                <p className="text-sm text-brand-grey-500">{consultant.job_title || consultant.email}</p>
                              </div>
                            </div>
                            <Badge 
                              variant={
                                consultant.status === 'in_mission' ? 'green' :
                                consultant.status === 'bench' ? 'amber' : 'grey'
                              }
                            >
                              {consultant.status === 'in_mission' ? 'In Mission' :
                               consultant.status === 'bench' ? 'On Bench' : consultant.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {activeConsultants.length === 0 && (
                    <Card>
                      <EmptyState
                        icon={<UserCog className="h-12 w-12" />}
                        title="No Consultants Yet"
                        description="Consultants will appear here once candidates are converted through the contracts pipeline."
                      />
                    </Card>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Team Member' : 'Add Team Member'}
        description={isEditing ? 'Update details and roles' : 'Add a new member to your team'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Full Name *"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="John Smith"
          />
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@company.com"
          />
          
          {/* Role Selection */}
          <div className="space-y-4">
            {/* Base Role - Radio buttons (pick one) */}
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">
                Role * <span className="text-brand-grey-400 font-normal">(select one)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {baseRoles.map(role => (
                  <label 
                    key={role.value}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${currentBaseRole === role.value 
                        ? 'border-brand-cyan bg-brand-cyan/5' 
                        : 'border-brand-grey-200 hover:border-brand-grey-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="baseRole"
                      checked={currentBaseRole === role.value}
                      onChange={() => handleBaseRoleChange(role.value)}
                      className="mt-0.5 h-4 w-4 text-brand-cyan border-brand-grey-300 focus:ring-brand-cyan"
                    />
                    <div>
                      <span className="text-sm font-medium text-brand-slate-700">{role.label}</span>
                      <p className="text-xs text-brand-grey-400">{role.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Admin Add-on - Checkbox (only visible to superadmin) */}
            {permissions.canCreateAdmins && (
              <div>
                <label className="block text-sm font-medium text-brand-slate-700 mb-2">
                  Additional Permissions
                </label>
                <label 
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.roles.includes('admin') 
                      ? 'border-orange-400 bg-orange-50' 
                      : 'border-brand-grey-200 hover:border-brand-grey-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formData.roles.includes('admin')}
                    onChange={() => handleAddonToggle('admin')}
                    className="mt-0.5 h-4 w-4 text-orange-500 rounded border-brand-grey-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-orange-700">Admin Access</span>
                    <p className="text-xs text-orange-600">Full system access, user management, and soft delete capability</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Reports To - only show if role requires a manager */}
          {requiresManager(formData.roles[0] as UserRole) && (
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-2">
                Reports To * <span className="text-brand-grey-400 font-normal">(select manager)</span>
              </label>
              {getPotentialManagers().length > 0 ? (
                <select
                  value={formData.reports_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, reports_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-grey-300 rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
                >
                  <option value="">Select a manager...</option>
                  {getPotentialManagers().map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({roleLabels[manager.roles?.[0]] || manager.roles?.[0]})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    No {roleLabels[roleHierarchy[formData.roles[0] as UserRole] || ''] || 'manager'} exists yet. 
                    Create a {roleLabels[roleHierarchy[formData.roles[0] as UserRole] || ''] || 'manager'} first.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {!isEditing && (
            <Input
              label="Temporary Password *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 6 characters"
            />
          )}
          
          {isEditing && (
            <p className="text-sm text-brand-grey-400">
              Password changes require the user to use the forgot password flow.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSubmit} isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Remove Team Member"
        message={`Remove ${userToDelete?.full_name} from the team?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
