// ============================================
// USER & ORGANISATION TYPES
// ============================================

export type UserRole = 
  | 'superadmin' 
  | 'admin' 
  | 'business_director' 
  | 'business_manager' 
  | 'technical_director'
  | 'technical'
  | 'recruiter_manager'
  | 'recruiter' 
  | 'hr_manager'
  | 'hr'
  | 'consultant';

export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];  // Changed from role to roles array
  business_unit_id?: string | null;
  reports_to?: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  head_id: string | null;
  created_at: string;
}

// ============================================
// CANDIDATE TYPES
// ============================================

export type CandidateStatus = 
  | 'new'
  | 'screening'
  | 'phone_qualification'
  | 'technical_interview'
  | 'director_interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | 'on_hold';

export type RightToWork = 
  | 'british_citizen'
  | 'settled_status'
  | 'pre_settled_status'
  | 'skilled_worker_visa'
  | 'graduate_visa'
  | 'other_visa'
  | 'requires_sponsorship'
  | 'unknown';

export type SecurityVetting = 
  | 'none'
  | 'bpss'
  | 'ctc'
  | 'sc'
  | 'esc'
  | 'dv'
  | 'edv';

export interface Candidate {
  id: string;
  
  // Personal information
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  
  // Professional information
  current_role: string | null;
  current_company: string | null;
  years_experience: number | null;
  degree: string | null;
  summary: string | null;
  
  // Engineering skills (for search)
  skills: string[];
  
  // Admin information
  right_to_work: RightToWork;
  security_vetting: SecurityVetting;
  open_to_relocate: boolean;
  relocation_preferences: string | null;
  
  // Salary
  current_salary: number | null;
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_currency: string;
  
  // Flexibility
  sector_flexibility: string | null;
  scope_flexibility: string | null;
  
  // Status
  status: CandidateStatus;
  source: string | null;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // For AI search (added later)
  embedding?: number[];
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  document_type: 'cv' | 'cover_letter' | 'certificate' | 'other';
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface CandidateNote {
  id: string;
  candidate_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// REQUIREMENT (CUSTOMER NEED) TYPES
// ============================================

export type RequirementStatus = 'draft' | 'open' | 'on_hold' | 'filled' | 'cancelled';
export type RequirementPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Requirement {
  id: string;
  
  // Customer information
  customer_name: string;
  customer_contact: string | null;
  
  // Role information
  role_title: string;
  description: string | null;
  location: string | null;
  
  // Requirements
  skills_required: string[];
  experience_min: number | null;
  experience_max: number | null;
  security_required: SecurityVetting;
  
  // Budget
  salary_min: number | null;
  salary_max: number | null;
  day_rate_min: number | null;
  day_rate_max: number | null;
  
  // Status
  status: RequirementStatus;
  priority: RequirementPriority;
  
  // Ownership
  business_unit_id: string;
  owner_id: string;
  
  // Dates
  start_date: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// APPLICATION & INTERVIEW TYPES
// ============================================

export type ApplicationStatus = 
  | 'applied'
  | 'phone_qualification'
  | 'technical_interview'
  | 'director_interview'
  | 'offer_pending'
  | 'offer_sent'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  candidate_id: string;
  requirement_id: string;
  status: ApplicationStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined data (for display)
  candidate?: Candidate;
  requirement?: Requirement;
}

export type InterviewStage = 'phone_qualification' | 'technical_interview' | 'director_interview';
export type InterviewOutcome = 'pending' | 'pass' | 'fail' | 'reschedule';

export interface Interview {
  id: string;
  application_id: string;
  stage: InterviewStage;
  
  // Scheduling
  interviewer_id: string;
  scheduled_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  
  // Outcome
  outcome: InterviewOutcome;
  
  // Feedback - General
  general_comments: string | null;
  
  // Feedback - Admin elements (Phone Qualification)
  years_experience_confirmed: number | null;
  degree_confirmed: string | null;
  right_to_work_confirmed: RightToWork | null;
  security_vetting_confirmed: SecurityVetting | null;
  current_salary_confirmed: number | null;
  salary_expectation_confirmed: string | null;
  salary_proposed: string | null;
  open_to_relocate_confirmed: boolean | null;
  relocation_notes: string | null;
  
  // Feedback - Soft skills
  communication_score: number | null; // 1-5
  communication_notes: string | null;
  professionalism_score: number | null; // 1-5
  professionalism_notes: string | null;
  enthusiasm_score: number | null; // 1-5
  enthusiasm_notes: string | null;
  cultural_fit_score: number | null; // 1-5
  cultural_fit_notes: string | null;
  
  // Feedback - Technical (Technical Interview)
  technical_depth_score: number | null; // 1-5
  technical_depth_notes: string | null;
  problem_solving_score: number | null; // 1-5
  problem_solving_notes: string | null;
  technical_background: string | null;
  skills_summary: string | null;
  
  // Feedback - Flexibility
  sector_flexibility_notes: string | null;
  scope_flexibility_notes: string | null;
  
  // Recommendation
  recommendation: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Joined data
  interviewer?: User;
}

// ============================================
// CONTRACT & APPROVAL TYPES
// ============================================

export type ContractStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'signed';

export interface ContractDraft {
  id: string;
  application_id: string;
  
  // Contract terms
  job_title: string;
  salary: number;
  salary_currency: string;
  start_date: string;
  location: string;
  right_to_work_verified: boolean;
  
  // Additional terms
  notice_period: string | null;
  benefits: string | null;
  special_conditions: string | null;
  
  // Status
  status: ContractStatus;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  application?: Application;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  contract_id: string;
  approver_id: string;
  sequence: number;
  status: ApprovalStatus;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
  
  // Joined data
  approver?: User;
}

export interface ApprovalChain {
  id: string;
  name: string;
  business_unit_id: string | null;
  is_default: boolean;
  created_at: string;
}

export interface ApprovalChainStep {
  id: string;
  chain_id: string;
  approver_id: string;
  sequence: number;
  created_at: string;
  
  // Joined data
  approver?: User;
}

// ============================================
// SEARCH & FILTER TYPES
// ============================================

export interface CandidateFilters {
  search?: string;
  status?: CandidateStatus[];
  skills?: string[];
  experience_min?: number;
  experience_max?: number;
  right_to_work?: RightToWork[];
  security_vetting?: SecurityVetting[];
  open_to_relocate?: boolean;
  salary_min?: number;
  salary_max?: number;
  created_after?: string;
  created_before?: string;
}

export interface RequirementFilters {
  search?: string;
  status?: RequirementStatus[];
  priority?: RequirementPriority[];
  business_unit_id?: string;
  owner_id?: string;
  skills?: string[];
}

// ============================================
// DASHBOARD & STATS TYPES
// ============================================

export interface DashboardStats {
  total_candidates: number;
  candidates_this_month: number;
  active_requirements: number;
  interviews_scheduled: number;
  offers_pending: number;
  hires_this_month: number;
}

export interface PipelineStats {
  stage: ApplicationStatus;
  count: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
