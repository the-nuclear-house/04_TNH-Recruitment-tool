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
  
  // Role checks
  isAdmin: boolean;
  isDirector: boolean;
  isManager: boolean;
  isRecruiter: boolean;
}

const rolePermissions: Record<UserRole, Permissions> = {
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
    
    isAdmin: true,
    isDirector: false,
    isManager: false,
    isRecruiter: false,
  },
  
  director: {
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
    
    canViewOrganisation: true,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    
    isAdmin: false,
    isDirector: true,
    isManager: false,
    isRecruiter: false,
  },
  
  manager: {
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
    
    canViewOrganisation: true,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    
    isAdmin: false,
    isDirector: false,
    isManager: true,
    isRecruiter: false,
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
    
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    
    isAdmin: false,
    isDirector: false,
    isManager: false,
    isRecruiter: true,
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
    
    canViewContracts: true,
    canCreateContracts: false,
    canApproveContracts: false,
    
    canViewOrganisation: true,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    
    isAdmin: false,
    isDirector: false,
    isManager: false,
    isRecruiter: false,
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
  
  isAdmin: false,
  isDirector: false,
  isManager: false,
  isRecruiter: false,
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
  merged.isAdmin = roles.includes('admin');
  merged.isDirector = roles.includes('director');
  merged.isManager = roles.includes('manager');
  merged.isRecruiter = roles.includes('recruiter');
  
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
