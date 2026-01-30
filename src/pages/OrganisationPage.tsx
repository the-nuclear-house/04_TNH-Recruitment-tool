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
} from '@/components/ui';
import { Plus, Users, Edit, Trash2, Mail, Shield } from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { usersService } from '@/lib/services';
import { supabase } from '@/lib/supabase';

const availableRoles = [
  { value: 'recruiter', label: 'Recruiter', colour: 'cyan' },
  { value: 'manager', label: 'Business Manager', colour: 'green' },
  { value: 'director', label: 'Director', colour: 'gold' },
  { value: 'hr', label: 'HR', colour: 'purple' },
  { value: 'admin', label: 'Admin', colour: 'orange' },
];

const roleBadgeVariant: Record<string, 'cyan' | 'green' | 'gold' | 'orange' | 'purple'> = {
  recruiter: 'cyan',
  manager: 'green',
  director: 'gold',
  hr: 'purple',
  admin: 'orange',
};

const roleLabels: Record<string, string> = {
  recruiter: 'Recruiter',
  manager: 'Manager',
  director: 'Director',
  hr: 'HR',
  admin: 'Admin',
};

export function OrganisationPage() {
  const { user: currentUser } = useAuthStore();
  const permissions = usePermissions();
  const toast = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
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
  });
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error', 'Failed to load users');
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
    });
    setIsModalOpen(true);
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: newRoles };
    });
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.full_name || formData.roles.length === 0) {
      toast.error('Validation Error', 'Please fill in all required fields and select at least one role');
      return;
    }
    
    if (!isEditing && !formData.password) {
      toast.error('Validation Error', 'Password is required for new users');
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
          })
          .eq('id', editingUserId);
        
        if (error) throw error;
        toast.success('User Updated', `${formData.full_name}'s profile has been updated`);
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.full_name }
          }
        });
        
        if (authError) {
          if (authError.message.includes('already registered')) {
            toast.error('Email In Use', 'This email is already registered');
          } else {
            throw authError;
          }
          return;
        }
        
        if (authData.user) {
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: formData.email,
              full_name: formData.full_name,
              roles: formData.roles,
            });
          
          if (userError) throw userError;
        }
        
        toast.success('User Created', `${formData.full_name} has been added to the team`);
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
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
      
      if (error) throw error;
      
      toast.success('User Removed', `${userToDelete.full_name} has been removed`);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Error', 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Organisation"
        subtitle="Manage team members and roles"
        actions={
          permissions.isAdmin ? (
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
                  {users.filter(u => u.roles?.includes('recruiter')).length}
                </p>
                <p className="text-sm text-brand-grey-400">Recruiters</p>
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
                  {users.filter(u => u.roles?.includes('manager')).length}
                </p>
                <p className="text-sm text-brand-grey-400">Managers</p>
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
                  {users.filter(u => u.roles?.includes('director') || u.roles?.includes('admin')).length}
                </p>
                <p className="text-sm text-brand-grey-400">Directors/Admins</p>
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
              Role Permissions
            </CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-cyan-50 rounded-lg">
              <h4 className="font-medium text-cyan-800 mb-2">Recruiter</h4>
              <ul className="text-sm text-cyan-700 space-y-1">
                <li>• View and add candidates</li>
                <li>• Conduct phone interviews</li>
                <li>• View requirements (read-only)</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Business Manager</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• All Recruiter permissions</li>
                <li>• Create and manage requirements</li>
                <li>• Conduct technical interviews</li>
                <li>• Schedule client assessments</li>
              </ul>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Director</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• All Manager permissions</li>
                <li>• Conduct final interviews</li>
                <li>• Schedule client assessments</li>
              </ul>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Admin</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Full system access</li>
                <li>• Manage team members</li>
                <li>• Delete any record</li>
              </ul>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-brand-grey-400">
            Users can have multiple roles. Permissions are combined from all assigned roles.
          </p>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Team Member' : 'Add Team Member'}
        description={isEditing ? 'Update details and roles' : 'Add a new member to your team'}
        size="md"
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
          
          {/* Role Selection - Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-2">
              Roles * <span className="text-brand-grey-400 font-normal">(select one or more)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map(role => (
                <label 
                  key={role.value}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.roles.includes(role.value) 
                      ? 'border-brand-cyan bg-brand-cyan/5' 
                      : 'border-brand-grey-200 hover:border-brand-grey-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.value)}
                    onChange={() => handleRoleToggle(role.value)}
                    className="h-4 w-4 text-brand-cyan rounded border-brand-grey-300 focus:ring-brand-cyan"
                  />
                  <span className="text-sm font-medium text-brand-slate-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
          
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
