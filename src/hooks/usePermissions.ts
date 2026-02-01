import { useAuthStore } from '@/lib/stores/auth-store';
import type { UserRole } from '@/types';

interface Permissions {
  // Candidate permissions
  canViewCandidates: boolean;
  canAddCandidates: boolean;
  canEditCandidates: boolean;
  canDeleteCandidates: boolean;
  
  // Requirement permissions
  canViewRequirements: boolean;
  canCreateRequirements: boolean;
  canEditRequirements: boolean;
  canDeleteRequirements: boolean;
  
  // Interview permissions
  canViewInterviews: boolean;
  canScheduleInterviews: boolean;
  canConductInterviews: boolean;
  canViewAllInterviewFeedback: boolean;
  
  // Contract permissions
  canViewContracts: boolean;
  canCreateContracts: boolean;
  canApproveContracts: boolean;
  
  // Organisation permissions
  canViewOrganisation: boolean;
  canManageUsers: boolean;
  canManageBusinessUnits: boolean;
  canManageApprovalChains: boolean;
  canCreateAdmins: boolean;
  canHardDelete: boolean;
  
  // Department management
  canViewDepartmentStats: boolean;
  canApproveRequests: boolean;
  
  // Role checks
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isBusinessDirector: boolean;
  isBusinessManager: boolean;
  isTechnicalDirector: boolean;
  isTechnical: boolean;
  isRecruiterManager: boolean;
  isRecruiter: boolean;
  isHRManager: boolean;
  isHR: boolean;
}

const rolePermissions: Record<UserRole, Permissions> = {
  superadmin: {
    canViewCandidates: true,
    canAddCandidates: true,
    canEditCandidates: true,
    canDeleteCandidates: true,
    canViewRequirements: true,
    canCreateRequirements: true,
    canEditRequirements: true,
    canDeleteRequirements: true,
    canViewInterviews: true,
    canScheduleInterviews: true,
    canConductInterviews: true,
    canViewAllInterviewFeedback: true,
    canViewContracts: true,
    canCreateContracts: true,
    canApproveContracts: true,
    canViewOrganisation: true,
    canManageUsers: true,
    canManageBusinessUnits: true,
    canManageApprovalChains: true,
    canCreateAdmins: true,
    canHardDelete: true,
    canViewDepartmentStats: true,
    canApproveRequests: true,
    isSuperAdmin: true,
    isAdmin: true,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },

  admin: {
    canViewCandidates: true,
    canAddCandidates: true,
    canEditCandidates: true,
    canDeleteCandidates: true,
    canViewRequirements: true,
    canCreateRequirements: true,
    canEditRequirements: true,
    canDeleteRequirements: true,
    canViewInterviews: true,
    canScheduleInterviews: true,
    canConductInterviews: true,
    canViewAllInterviewFeedback: true,
    canViewContracts: true,
    canCreateContracts: true,
    canApproveContracts: true,
    canViewOrganisation: true,
    canManageUsers: true,
    canManageBusinessUnits: true,
    canManageApprovalChains: true,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: true,
    canApproveRequests: true,
    isSuperAdmin: false,
    isAdmin: true,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },
  
  business_director: {
    canViewCandidates: true,
    canAddCandidates: false,
    canEditCandidates: false,
    canDeleteCandidates: false,
    canViewRequirements: true,
    canCreateRequirements: true,
    canEditRequirements: true,
    canDeleteRequirements: false,
    canViewInterviews: true,
    canScheduleInterviews: true,
    canConductInterviews: true,
    canViewAllInterviewFeedback: true,
    canViewContracts: true,
    canCreateContracts: true,
    canApproveContracts: true,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: true,
    canApproveRequests: true,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: true,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },
  
  business_manager: {
    canViewCandidates: true,
    canAddCandidates: true,
    canEditCandidates: true,
    canDeleteCandidates: false,
    canViewRequirements: true,
    canCreateRequirements: true,
    canEditRequirements: true,
    canDeleteRequirements: false,
    canViewInterviews: true,
    canScheduleInterviews: true,
    canConductInterviews: true,
    canViewAllInterviewFeedback: true,
    canViewContracts: true,
    canCreateContracts: true,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: false,
    canApproveRequests: false,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: true,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },

  technical_director: {
    canViewCandidates: true,
    canAddCandidates: false,
    canEditCandidates: false,
    canDeleteCandidates: false,
    canViewRequirements: true,
    canCreateRequirements: false,
    canEditRequirements: false,
    canDeleteRequirements: false,
    canViewInterviews: true,
    canScheduleInterviews: false,
    canConductInterviews: true,
    canViewAllInterviewFeedback: true,
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: true,
    canApproveRequests: true,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: true,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },
  
  technical: {
    canViewCandidates: true,
    canAddCandidates: false,
    canEditCandidates: false,
    canDeleteCandidates: false,
    canViewRequirements: true,
    canCreateRequirements: false,
    canEditRequirements: false,
    canDeleteRequirements: false,
    canViewInterviews: true,
    canScheduleInterviews: false,
    canConductInterviews: true,
    canViewAllInterviewFeedback: false,
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: false,
    canApproveRequests: false,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: true,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },

  recruiter_manager: {
    canViewCandidates: true,
    canAddCandidates: true,
    canEditCandidates: true,
    canDeleteCandidates: false,
    canViewRequirements: true,
    canCreateRequirements: false,
    canEditRequirements: false,
    canDeleteRequirements: false,
    canViewInterviews: true,
    canScheduleInterviews: true,
    canConductInterviews: true,
    canViewAllInterviewFeedback: true,
    canViewContracts: true,
    canCreateContracts: false,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: true,
    canApproveRequests: true,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: true,
    isRecruiter: false,
    isHRManager: false,
    isHR: false,
  },
  
  recruiter: {
    canViewCandidates: true,
    canAddCandidates: true,
    canEditCandidates: true,
    canDeleteCandidates: false,
    canViewRequirements: true,
    canCreateRequirements: false,
    canEditRequirements: false,
    canDeleteRequirements: false,
    canViewInterviews: true,
    canScheduleInterviews: true,
    canConductInterviews: true,
    canViewAllInterviewFeedback: false,
    canViewContracts: true,
    canCreateContracts: false,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: false,
    canApproveRequests: false,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: true,
    isHRManager: false,
    isHR: false,
  },

  hr_manager: {
    canViewCandidates: false,
    canAddCandidates: false,
    canEditCandidates: false,
    canDeleteCandidates: false,
    canViewRequirements: false,
    canCreateRequirements: false,
    canEditRequirements: false,
    canDeleteRequirements: false,
    canViewInterviews: false,
    canScheduleInterviews: false,
    canConductInterviews: false,
    canViewAllInterviewFeedback: false,
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: true,
    canApproveRequests: true,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: true,
    isHR: false,
  },
  
  hr: {
    canViewCandidates: false,
    canAddCandidates: false,
    canEditCandidates: false,
    canDeleteCandidates: false,
    canViewRequirements: false,
    canCreateRequirements: false,
    canEditRequirements: false,
    canDeleteRequirements: false,
    canViewInterviews: false,
    canScheduleInterviews: false,
    canConductInterviews: false,
    canViewAllInterviewFeedback: false,
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    canCreateAdmins: false,
    canHardDelete: false,
    canViewDepartmentStats: false,
    canApproveRequests: false,
    isSuperAdmin: false,
    isAdmin: false,
    isBusinessDirector: false,
    isBusinessManager: false,
    isTechnicalDirector: false,
    isTechnical: false,
    isRecruiterManager: false,
    isRecruiter: false,
    isHRManager: false,
    isHR: true,
  },
};

// Default permissions for unknown roles
const defaultPermissions: Permissions = {
  canViewCandidates: false,
  canAddCandidates: false,
  canEditCandidates: false,
  canDeleteCandidates: false,
  canViewRequirements: false,
  canCreateRequirements: false,
  canEditRequirements: false,
  canDeleteRequirements: false,
  canViewInterviews: false,
  canScheduleInterviews: false,
  canConductInterviews: false,
  canViewAllInterviewFeedback: false,
  canViewContracts: false,
  canCreateContracts: false,
  canApproveContracts: false,
  canViewOrganisation: false,
  canManageUsers: false,
  canManageBusinessUnits: false,
  canManageApprovalChains: false,
  canCreateAdmins: false,
  canHardDelete: false,
  canViewDepartmentStats: false,
  canApproveRequests: false,
  isSuperAdmin: false,
  isAdmin: false,
  isBusinessDirector: false,
  isBusinessManager: false,
  isTechnicalDirector: false,
  isTechnical: false,
  isRecruiterManager: false,
  isRecruiter: false,
  isHRManager: false,
  isHR: false,
};

// Merge permissions from multiple roles (user gets highest permission from any role)
function mergePermissions(roles: UserRole[]): Permissions {
  if (!roles || roles.length === 0) {
    return defaultPermissions;
  }
  
  const merged = { ...defaultPermissions };
  
  for (const role of roles) {
    const perms = rolePermissions[role];
    if (!perms) continue;
    
    // For boolean permissions, use OR (true if any role grants it)
    for (const key of Object.keys(merged) as (keyof Permissions)[]) {
      if (perms[key] === true) {
        (merged as any)[key] = true;
      }
    }
  }
  
  // Set role flags based on actual roles
  merged.isSuperAdmin = roles.includes('superadmin');
  merged.isAdmin = roles.includes('admin') || roles.includes('superadmin');
  merged.isBusinessDirector = roles.includes('business_director');
  merged.isBusinessManager = roles.includes('business_manager');
  merged.isTechnicalDirector = roles.includes('technical_director');
  merged.isTechnical = roles.includes('technical');
  merged.isRecruiterManager = roles.includes('recruiter_manager');
  merged.isRecruiter = roles.includes('recruiter');
  merged.isHRManager = roles.includes('hr_manager');
  merged.isHR = roles.includes('hr');
  
  return merged;
}

export function usePermissions(): Permissions {
  const { user } = useAuthStore();
  
  if (!user?.roles || user.roles.length === 0) {
    return defaultPermissions;
  }
  
  return mergePermissions(user.roles as UserRole[]);
}

// Helper hook to check a single permission
export function useHasPermission(permission: keyof Permissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}

// Helper to check if user has a specific role
export function useHasRole(role: UserRole): boolean {
  const { user } = useAuthStore();
  return user?.roles?.includes(role) ?? false;
}

// Role hierarchy - who reports to whom
export const roleHierarchy: Record<UserRole, UserRole | null> = {
  superadmin: null,
  admin: null,
  business_director: null,
  business_manager: 'business_director',
  technical_director: null,
  technical: 'technical_director',
  recruiter_manager: null,
  recruiter: 'recruiter_manager',
  hr_manager: null,
  hr: 'hr_manager',
};

// Get roles that can be a manager for a given role
export function getManagerRolesFor(role: UserRole): UserRole[] {
  const managerRole = roleHierarchy[role];
  return managerRole ? [managerRole] : [];
}

// Check if a role requires a reports_to relationship
export function requiresManager(role: UserRole): boolean {
  return roleHierarchy[role] !== null;
}
