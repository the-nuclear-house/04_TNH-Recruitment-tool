import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Users, Shield, Briefcase, UserCheck, ClipboardList } from 'lucide-react';
import type { User, UserRole } from '@/types';

// Test users for different roles
const testUsers: Record<string, User> = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@company.com',
    full_name: 'Alex Admin',
    role: 'admin',
    business_unit_id: null,
    reports_to: null,
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  director: {
    id: 'user-director-001',
    email: 'sarah.director@company.com',
    full_name: 'Sarah Thompson',
    role: 'director',
    business_unit_id: 'bu-engineering-001',
    reports_to: null,
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  manager: {
    id: 'user-manager-001',
    email: 'james.manager@company.com',
    full_name: 'James Wilson',
    role: 'manager',
    business_unit_id: 'bu-engineering-001',
    reports_to: 'user-director-001',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  recruiter: {
    id: 'user-recruiter-001',
    email: 'emma.recruiter@company.com',
    full_name: 'Emma Clarke',
    role: 'recruiter',
    business_unit_id: 'bu-engineering-001',
    reports_to: 'user-manager-001',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  interviewer: {
    id: 'user-interviewer-001',
    email: 'michael.tech@company.com',
    full_name: 'Michael Chen',
    role: 'interviewer',
    business_unit_id: 'bu-engineering-001',
    reports_to: 'user-manager-001',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const roleDescriptions: Record<UserRole, { icon: React.ReactNode; description: string; colour: string }> = {
  admin: {
    icon: <Shield className="h-5 w-5" />,
    description: 'Full system access. Manage users, settings, and all data.',
    colour: 'bg-red-500',
  },
  director: {
    icon: <UserCheck className="h-5 w-5" />,
    description: 'Final interview stage. Approve contracts and offers.',
    colour: 'bg-purple-500',
  },
  manager: {
    icon: <Briefcase className="h-5 w-5" />,
    description: 'Manage requirements. Review candidates and initiate contracts.',
    colour: 'bg-brand-cyan',
  },
  recruiter: {
    icon: <Users className="h-5 w-5" />,
    description: 'Add candidates. Conduct phone screenings. Manage pipeline.',
    colour: 'bg-brand-green',
  },
  interviewer: {
    icon: <ClipboardList className="h-5 w-5" />,
    description: 'Conduct technical interviews. Provide feedback and scores.',
    colour: 'bg-brand-gold',
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (role: string) => {
    setSelectedRole(role);
    setIsLoading(true);

    // Simulate brief loading
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = testUsers[role];
    
    // Store in localStorage for persistence
    localStorage.setItem('test-user', JSON.stringify(user));
    
    // Update auth store
    useAuthStore.setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-cyan/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-green/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-cyan mb-4">
            <span className="text-white font-bold text-2xl">RH</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">RecruitHub</h1>
          <p className="text-brand-grey-400">
            Engineering Recruitment Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-strong p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-brand-slate-900 mb-2">
              Test Environment
            </h2>
            <p className="text-brand-grey-400">
              Select a role to log in and test the system
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            {Object.entries(testUsers).map(([role, user]) => {
              const roleInfo = roleDescriptions[role as UserRole];
              const isSelected = selectedRole === role;
              
              return (
                <button
                  key={role}
                  onClick={() => handleLogin(role)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                    text-left
                    ${isSelected 
                      ? 'border-brand-cyan bg-brand-cyan/5' 
                      : 'border-brand-grey-200 hover:border-brand-grey-400 hover:bg-brand-grey-100/50'
                    }
                    ${isLoading && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* Role Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center text-white
                    ${roleInfo.colour}
                  `}>
                    {roleInfo.icon}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-slate-900">
                        {user.full_name}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-grey-100 text-brand-slate-700 capitalize">
                        {role}
                      </span>
                    </div>
                    <p className="text-sm text-brand-grey-400 truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-brand-grey-400 mt-1">
                      {roleInfo.description}
                    </p>
                  </div>

                  {/* Loading indicator */}
                  {isSelected && isLoading && (
                    <div className="w-5 h-5 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-brand-grey-100 rounded-lg">
            <p className="text-sm text-brand-slate-700">
              <strong>Note:</strong> This is a test login for development purposes. 
              Each role has different permissions and sees different features. 
              Microsoft 365 SSO will be enabled for production.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-brand-grey-400">
          © 2025 Your Company. All rights reserved.
        </p>
      </div>
    </div>
  );
}
