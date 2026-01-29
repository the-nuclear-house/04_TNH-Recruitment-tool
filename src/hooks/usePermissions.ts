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
  
  // Admin permissions
  isAdmin: boolean;
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
    canConductInterviews: true, // Phone qualification
    canViewAllInterviewFeedback: false,
    
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    
    isAdmin: false,
  },
  
  interviewer: {
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
    canViewAllInterviewFeedback: false, // Only their own
    
    canViewContracts: false,
    canCreateContracts: false,
    canApproveContracts: false,
    
    canViewOrganisation: false,
    canManageUsers: false,
    canManageBusinessUnits: false,
    canManageApprovalChains: false,
    
    isAdmin: false,
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
};

export function usePermissions(): Permissions {
  const { user } = useAuthStore();
  
  if (!user?.role) {
    return defaultPermissions;
  }
  
  return rolePermissions[user.role] || defaultPermissions;
}

// Helper hook to check a single permission
export function useHasPermission(permission: keyof Permissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}
