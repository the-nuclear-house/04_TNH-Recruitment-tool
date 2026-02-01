import { supabase } from './supabase';

// Types matching our database schema
export interface DbCandidate {
  id: string;
  reference_id: string | null;  // Human-readable ID like CAND-001
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  years_experience: number | null;
  degree: string | null;
  summary: string | null;
  skills: string[] | null;
  previous_companies: string[] | null;
  minimum_salary_expected: number | null;
  right_to_work: string;
  security_vetting: string;
  notice_period: string | null;
  contract_preference: string | null;
  open_to_relocate: string | null;
  expected_day_rate: number | null;
  nationalities: string[] | null;
  status: string;
  source: string | null;
  cv_url: string | null;
  created_by: string | null;
  assigned_recruiter_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;  // Soft delete timestamp
}

export interface CreateCandidateInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  current_title?: string;
  current_company?: string;
  reason_for_leaving?: string;
  five_year_plan?: string;
  years_experience?: number;
  degree?: string;
  summary?: string;
  skills?: string[];
  previous_companies?: string[];
  current_salary?: number;
  minimum_salary_expected?: number;
  right_to_work?: string;
  security_vetting?: string;
  notice_period?: string;
  contract_preference?: string;
  open_to_relocate?: string;
  expected_day_rate?: number;
  nationalities?: string[];
  source?: string;
  cv_url?: string;
  assigned_recruiter_id?: string;
  created_by?: string;
}

export interface UpdateCandidateInput extends Partial<CreateCandidateInput> {
  status?: string;
}

// ============================================
// CONSULTANT TYPES
// ============================================

export interface DbConsultant {
  id: string;
  reference_id: string | null;
  candidate_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  job_title: string | null;
  skills: string[];
  security_vetting: string | null;
  nationalities: string[] | null;
  contract_type: string | null;
  salary_amount: number | null;
  day_rate: number | null;
  start_date: string;
  end_date: string | null;
  status: 'bench' | 'in_mission' | 'on_leave' | 'terminated';
  id_document_url: string | null;
  right_to_work_document_url: string | null;
  assigned_manager_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  // Joined
  candidate?: DbCandidate;
  assigned_manager?: DbUser;
}

export interface CreateConsultantInput {
  candidate_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  job_title?: string;
  skills?: string[];
  security_vetting?: string;
  nationalities?: string[];
  contract_type?: string;
  salary_amount?: number;
  day_rate?: number;
  start_date: string;
  end_date?: string;
  id_document_url?: string;
  right_to_work_document_url?: string;
  assigned_manager_id?: string;
  created_by?: string;
}

export interface UpdateConsultantInput extends Partial<CreateConsultantInput> {
  status?: 'bench' | 'in_mission' | 'on_leave' | 'terminated';
  terminated_at?: string;
  termination_reason?: string;
}

// ============================================
// MISSION TYPES
// ============================================

export interface DbMission {
  id: string;
  reference_id: string | null;
  name: string;
  requirement_id: string | null;
  consultant_id: string;
  company_id: string;  // This matches the actual DB column
  contact_id: string | null;
  start_date: string;
  end_date: string;
  sold_daily_rate: number;
  location: string | null;
  work_mode: 'full_onsite' | 'hybrid' | 'remote';
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  // Joined
  requirement?: DbRequirement;
  consultant?: DbConsultant;
  company?: DbCompany;
  contact?: DbContact;
}

export interface CreateMissionInput {
  name: string;
  requirement_id?: string;
  consultant_id: string;
  company_id: string;  // This matches the actual DB column
  contact_id?: string;
  start_date: string;
  end_date: string;
  sold_daily_rate: number;
  location?: string;
  work_mode: 'full_onsite' | 'hybrid' | 'remote';
  notes?: string;
  created_by?: string;
}

export interface UpdateMissionInput extends Partial<CreateMissionInput> {
  status?: 'active' | 'completed' | 'cancelled' | 'on_hold';
}

// ============================================
// CONSULTANT MEETING TYPES
// ============================================

export interface InductionChecklist {
  induction_pack_presented: boolean;
  risk_assessment_presented: boolean;
  health_safety_briefing: boolean;
  it_systems_access: boolean;
  company_policies_reviewed: boolean;
  emergency_procedures: boolean;
  team_introductions: boolean;
  mission_briefing: boolean;
}

export interface QuarterlyFeedback {
  customer_satisfaction: number; // 1-5
  mission_satisfaction: number; // 1-5
  company_satisfaction: number; // 1-5
  work_life_balance: number; // 1-5
  career_development: number; // 1-5
  communication_rating: number; // 1-5
}

export interface AppraisalData {
  overall_performance: number; // 1-5
  technical_skills: number; // 1-5
  communication_skills: number; // 1-5
  teamwork: number; // 1-5
  initiative: number; // 1-5
  reliability: number; // 1-5
  goals_achieved: string;
  areas_of_strength: string;
  development_areas: string;
  training_needs: string;
  career_aspirations: string;
  salary_discussion_notes: string;
  next_year_objectives: string;
}

export interface DbConsultantMeeting {
  id: string;
  consultant_id: string;
  meeting_type: 'induction' | 'quarterly_review' | 'annual_appraisal';
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  completed_at: string | null;
  conducted_by: string | null;
  general_comments: string | null;
  risks_identified: string | null;
  consultant_requests: string | null;
  induction_checklist: InductionChecklist | null;
  quarterly_feedback: QuarterlyFeedback | null;
  appraisal_data: AppraisalData | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  // Joined
  consultant?: DbConsultant;
  conductor?: DbUser;
}

export interface CreateConsultantMeetingInput {
  consultant_id: string;
  meeting_type: 'induction' | 'quarterly_review' | 'annual_appraisal';
  scheduled_date: string;
  scheduled_time?: string;
  created_by?: string;
}

export interface UpdateConsultantMeetingInput {
  scheduled_date?: string;
  scheduled_time?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  completed_at?: string;
  conducted_by?: string;
  general_comments?: string;
  risks_identified?: string;
  consultant_requests?: string;
  induction_checklist?: InductionChecklist;
  quarterly_feedback?: QuarterlyFeedback;
  appraisal_data?: AppraisalData;
}

// ============================================
// APPROVAL SYSTEM TYPES
// ============================================

export type ApprovalRequestType = 'salary_increase' | 'bonus_payment' | 'employee_exit';
export type ApprovalStatus = 'pending' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'not_required';

export interface SalaryIncreaseData {
  current_salary: number;
  new_salary: number;
  salary_type: 'annual_salary' | 'day_rate';
  reason: string;
}

export interface BonusPaymentData {
  amount: number;
  bonus_type: 'performance' | 'retention' | 'project' | 'referral' | 'other';
  reason: string;
}

export interface EmployeeExitData {
  exit_reason: 'resignation' | 'redundancy' | 'end_of_contract' | 'dismissal' | 'mutual_agreement' | 'retirement';
  exit_details: string;
  last_working_day: string;
}

export interface DbApprovalRequest {
  id: string;
  reference_id: string | null;
  request_type: ApprovalRequestType;
  consultant_id: string;
  request_data: SalaryIncreaseData | BonusPaymentData | EmployeeExitData;
  effective_month: number;
  effective_year: number;
  status: ApprovalStatus;
  requested_by: string;
  requested_at: string;
  request_notes: string | null;
  director_status: ApprovalStepStatus;
  director_approved_by: string | null;
  director_approved_at: string | null;
  director_notes: string | null;
  hr_required: boolean;
  hr_status: ApprovalStepStatus;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  hr_notes: string | null;
  rejection_reason: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  consultant?: DbConsultant;
  requester?: DbUser;
  director_approver?: DbUser;
  hr_approver?: DbUser;
}

export interface CreateApprovalRequestInput {
  request_type: ApprovalRequestType;
  consultant_id: string;
  request_data: SalaryIncreaseData | BonusPaymentData | EmployeeExitData;
  effective_month: number;
  effective_year: number;
  request_notes?: string;
  requested_by: string;
  hr_required?: boolean;
}

export interface DbSalaryHistory {
  id: string;
  consultant_id: string;
  salary_type: 'annual_salary' | 'day_rate';
  amount: number;
  currency: string;
  effective_month: number;
  effective_year: number;
  change_type: 'initial' | 'increase' | 'decrease' | 'adjustment';
  change_reason: string | null;
  approval_request_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface DbBonusPayment {
  id: string;
  consultant_id: string;
  amount: number;
  currency: string;
  bonus_type: 'performance' | 'retention' | 'project' | 'referral' | 'other';
  reason: string;
  payment_month: number;
  payment_year: number;
  approval_request_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface DbConsultantExit {
  id: string;
  consultant_id: string;
  exit_reason: 'resignation' | 'redundancy' | 'end_of_contract' | 'dismissal' | 'mutual_agreement' | 'retirement';
  exit_details: string | null;
  last_working_day: string;
  approval_request_id: string | null;
  created_at: string;
  created_by: string | null;
}

// ============================================
// HR TICKET TYPES
// ============================================

export type HrTicketType = 'contract_send' | 'contract_signed' | 'salary_increase' | 'bonus_payment' | 'employee_exit';
export type HrTicketStatus = 'pending' | 'in_progress' | 'contract_sent' | 'contract_signed' | 'completed' | 'cancelled';
export type HrTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface DbHrTicket {
  id: string;
  reference_id: string | null;
  ticket_type: HrTicketType;
  consultant_id: string | null;
  candidate_id: string | null;
  offer_id: string | null;
  approval_request_id: string | null;
  ticket_data: Record<string, any> | null;
  status: HrTicketStatus;
  priority: HrTicketPriority;
  due_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  consultant?: DbConsultant;
  candidate?: DbCandidate;
  offer?: DbOffer;
  approval_request?: DbApprovalRequest;
  assignee?: DbUser;
}

export interface CreateHrTicketInput {
  ticket_type: HrTicketType;
  consultant_id?: string;
  candidate_id?: string;
  offer_id?: string;
  approval_request_id?: string;
  ticket_data?: Record<string, any>;
  priority?: HrTicketPriority;
  due_date?: string;
  assigned_to?: string;
  notes?: string;
  created_by?: string;
}

// ============================================
// CANDIDATES SERVICE
// ============================================

export const candidatesService = {
  // Get all candidates
  async getAll(): Promise<DbCandidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single candidate by ID
  async getById(id: string): Promise<DbCandidate | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new candidate
  async create(input: CreateCandidateInput): Promise<DbCandidate> {
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        ...input,
        status: 'new',
        skills: input.skills || [],
        previous_companies: input.previous_companies || [],
        right_to_work: input.right_to_work || 'unknown',
        security_vetting: input.security_vetting || 'none',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update candidate
  async update(id: string, input: UpdateCandidateInput): Promise<DbCandidate> {
    const { data, error } = await supabase
      .from('candidates')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete candidate (soft delete)
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Search candidates
  async search(query: string): Promise<DbCandidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .is('deleted_at', null)  // Exclude soft-deleted records
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Filter candidates by status
  async getByStatus(status: string): Promise<DbCandidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// REQUIREMENTS SERVICE
// ============================================

export interface DbRequirement {
  id: string;
  reference_id: string | null;  // Human-readable ID like REQ-001
  title: string | null;         // Descriptive name for the requirement
  customer: string;
  industry: string | null;
  location: string | null;
  fte_count: number;
  min_day_rate: number | null;
  max_day_rate: number | null;
  skills: string[];
  description: string | null;
  engineering_discipline: string;
  clearance_required: string;
  status: string;
  manager_id: string | null;
  created_by: string | null;
  // Customer module fields
  company_id: string | null;
  contact_id: string | null;
  // Winning candidate (set when assessment = GO)
  winning_candidate_id: string | null;
  won_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;  // Soft delete timestamp
  // Joined
  company?: DbCompany;
  contact?: DbContact;
  winning_candidate?: DbCandidate;
}

export interface CreateRequirementInput {
  title?: string;
  customer: string;
  industry?: string;
  location?: string;
  fte_count?: number;
  min_day_rate?: number;
  max_day_rate?: number;
  skills?: string[];
  description?: string;
  engineering_discipline?: string;
  clearance_required?: string;
  status?: string;
  manager_id?: string;
  created_by?: string;
  // Customer module fields
  company_id?: string;
  contact_id?: string;
  // Winning candidate
  winning_candidate_id?: string;
}

export const requirementsService = {
  // Get all requirements
  async getAll(): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select(`
        *,
        company:company_id(*),
        contact:contact_id(*),
        winning_candidate:winning_candidate_id(*)
      `)
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single requirement by ID
  async getById(id: string): Promise<DbRequirement | null> {
    const { data, error } = await supabase
      .from('requirements')
      .select(`
        *,
        company:company_id(*),
        contact:contact_id(*),
        winning_candidate:winning_candidate_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new requirement
  async create(input: CreateRequirementInput): Promise<DbRequirement> {
    const { data, error } = await supabase
      .from('requirements')
      .insert({
        ...input,
        status: input.status || 'opportunity',
        skills: input.skills || [],
        engineering_discipline: input.engineering_discipline || 'software',
        clearance_required: input.clearance_required || 'none',
        fte_count: input.fte_count || 1,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update requirement
  async update(id: string, input: Partial<CreateRequirementInput>): Promise<DbRequirement> {
    const { data, error } = await supabase
      .from('requirements')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete requirement (soft delete)
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get by status
  async getByStatus(status: string): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get by manager
  async getByManager(managerId: string): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get by company (single company)
  async getByCompany(companyId: string): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select(`
        *,
        contact:contact_id(id, first_name, last_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get by multiple companies (for parent + subsidiaries)
  async getByCompanies(companyIds: string[]): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select(`
        *,
        company:company_id(id, name),
        contact:contact_id(id, first_name, last_name)
      `)
      .in('company_id', companyIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Mark requirement as won with winning candidate
  async markAsWon(requirementId: string, candidateId: string): Promise<DbRequirement> {
    const { data, error } = await supabase
      .from('requirements')
      .update({
        status: 'won',
        winning_candidate_id: candidateId,
        won_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requirementId)
      .select(`
        *,
        company:company_id(*),
        contact:contact_id(*),
        winning_candidate:winning_candidate_id(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================
// INTERVIEWS SERVICE
// ============================================

export interface DbInterview {
  id: string;
  candidate_id: string;
  requirement_id: string | null;
  stage: string;
  interviewer_id: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  outcome: string;
  communication_score: number | null;
  professionalism_score: number | null;
  enthusiasm_score: number | null;
  cultural_fit_score: number | null;
  technical_depth_score: number | null;
  problem_solving_score: number | null;
  contract_preference: string | null;
  salary_proposed: number | null;
  warnings: string | null;
  general_comments: string | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateInterviewInput {
  candidate_id: string;
  requirement_id?: string;
  stage: string;
  interviewer_id?: string;
  scheduled_at?: string;
}

export interface UpdateInterviewInput {
  scheduled_at?: string;
  completed_at?: string;
  outcome?: string;
  communication_score?: number;
  professionalism_score?: number;
  enthusiasm_score?: number;
  cultural_fit_score?: number;
  technical_depth_score?: number;
  problem_solving_score?: number;
  general_comments?: string;
  recommendation?: string;
  skills_confirmed?: string[];
  warnings?: string | null;
  contract_preference?: string | null;
  salary_proposed?: number | null;
  interviewer_id?: string;
}

export const interviewsService = {
  // Get all interviews
  async getAll(): Promise<DbInterview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get interviews for a candidate
  async getByCandidate(candidateId: string): Promise<DbInterview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId)
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get interviews for an interviewer
  async getByInterviewer(interviewerId: string): Promise<DbInterview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('interviewer_id', interviewerId)
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create new interview
  async create(input: CreateInterviewInput): Promise<DbInterview> {
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        ...input,
        outcome: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update interview (for adding feedback)
  async update(id: string, input: UpdateInterviewInput): Promise<DbInterview> {
    const { data, error } = await supabase
      .from('interviews')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete interview (soft delete)
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('interviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get upcoming interviews
  async getUpcoming(): Promise<DbInterview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .gte('scheduled_at', new Date().toISOString())
      .eq('outcome', 'pending')
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get pending feedback
  async getPendingFeedback(): Promise<DbInterview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .not('completed_at', 'is', null)
      .eq('outcome', 'pending')
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// USERS SERVICE
// ============================================

export interface DbUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];  // Changed from role to roles array
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usersService = {
  // Get all users
  async getAll(): Promise<DbUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  // Get user by ID
  async getById(id: string): Promise<DbUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get users by role (checks if role is in roles array)
  async getByRole(role: string): Promise<DbUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .contains('roles', [role])
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },
  
  // Get users who have ANY of the specified roles
  async getByRoles(roles: string[]): Promise<DbUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .overlaps('roles', roles)
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },
};

// ============ COMMENTS SERVICE ============

export interface DbComment {
  id: string;
  candidate_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: DbUser;
}

export interface CreateCommentInput {
  candidate_id: string;
  user_id: string;
  content: string;
}

export const commentsService = {
  // Get all comments for a candidate
  async getByCandidate(candidateId: string): Promise<DbComment[]> {
    const { data, error } = await supabase
      .from('candidate_comments')
      .select(`
        *,
        user:users(id, full_name, email, role, avatar_url)
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new comment
  async create(input: CreateCommentInput): Promise<DbComment> {
    const { data, error } = await supabase
      .from('candidate_comments')
      .insert(input)
      .select(`
        *,
        user:users(id, full_name, email, role, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update a comment
  async update(id: string, content: string): Promise<DbComment> {
    const { data, error } = await supabase
      .from('candidate_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        user:users(id, full_name, email, role, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a comment
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidate_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ APPLICATIONS SERVICE ============
// Links candidates to requirements

export interface DbApplication {
  id: string;
  candidate_id: string | null;
  consultant_id: string | null;
  requirement_id: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  candidate?: DbCandidate;
  consultant?: DbConsultant;
  requirement?: DbRequirement;
}

export interface CreateApplicationInput {
  candidate_id?: string;
  consultant_id?: string;
  requirement_id: string;
  status?: string;
  notes?: string;
  created_by: string;
}

export const applicationsService = {
  // Get all applications for a requirement (includes both candidates and consultants)
  async getByRequirement(requirementId: string): Promise<DbApplication[]> {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        candidate:candidates(*),
        consultant:consultants(*)
      `)
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all applications for a candidate
  async getByCandidate(candidateId: string): Promise<DbApplication[]> {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        requirement:requirements(*)
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all applications for a consultant
  async getByConsultant(consultantId: string): Promise<DbApplication[]> {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        requirement:requirements(*)
      `)
      .eq('consultant_id', consultantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new application (link candidate or consultant to requirement)
  async create(input: CreateApplicationInput): Promise<DbApplication> {
    const { data, error } = await supabase
      .from('applications')
      .insert(input)
      .select(`
        *,
        candidate:candidates(*),
        consultant:consultants(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update application status
  async updateStatus(id: string, status: string, notes?: string): Promise<DbApplication> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        candidate:candidates(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Remove candidate from requirement
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ CUSTOMER ASSESSMENTS SERVICE ============

export interface DbCustomerAssessment {
  id: string;
  application_id: string | null;
  requirement_id: string | null;  // Direct link to requirement
  contact_id: string | null;
  candidate_id: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  customer_contact: string | null;
  location: string | null;
  notes: string | null;
  outcome: 'pending' | 'go' | 'nogo' | null;
  outcome_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  application?: DbApplication & {
    candidate?: DbCandidate;
    requirement?: DbRequirement;
  };
  requirement?: DbRequirement;
  contact?: DbContact;
  candidate?: DbCandidate;
}

export interface CreateCustomerAssessmentInput {
  application_id?: string;
  requirement_id?: string;  // Direct link to requirement
  contact_id?: string;
  candidate_id?: string;
  scheduled_date: string;
  scheduled_time?: string;
  customer_contact?: string;
  location?: string;
  notes?: string;
  created_by?: string;
}

export const customerAssessmentsService = {
  // Get all customer assessments
  async getAll(): Promise<DbCustomerAssessment[]> {
    const { data, error } = await supabase
      .from('customer_assessments')
      .select(`
        *,
        application:applications(
          *,
          candidate:candidates(*),
          requirement:requirements(*)
        ),
        requirement:requirement_id(*),
        contact:contacts(*),
        candidate:candidates(*)
      `)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get assessments for a specific application
  async getByApplication(applicationId: string): Promise<DbCustomerAssessment[]> {
    const { data, error } = await supabase
      .from('customer_assessments')
      .select(`
        *,
        application:applications(
          *,
          candidate:candidates(*),
          requirement:requirements(*)
        ),
        requirement:requirement_id(*)
      `)
      .eq('application_id', applicationId)
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get assessments for a specific requirement
  async getByRequirement(requirementId: string): Promise<DbCustomerAssessment[]> {
    const { data, error } = await supabase
      .from('customer_assessments')
      .select(`
        *,
        candidate:candidates(*),
        contact:contacts(*)
      `)
      .eq('requirement_id', requirementId)
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new customer assessment
  async create(input: CreateCustomerAssessmentInput): Promise<DbCustomerAssessment> {
    const { data, error } = await supabase
      .from('customer_assessments')
      .insert(input)
      .select(`
        *,
        application:applications(
          *,
          candidate:candidates(*),
          requirement:requirements(*)
        ),
        requirement:requirement_id(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update assessment outcome
  // If outcome is GO, this also marks the requirement as WON
  // If changing from GO to NOGO, revert the requirement status to active
  async updateOutcome(id: string, outcome: 'go' | 'nogo', outcomeNotes?: string): Promise<DbCustomerAssessment> {
    // First get the current assessment to check previous outcome
    const { data: currentAssessment } = await supabase
      .from('customer_assessments')
      .select('outcome, requirement_id, candidate_id, application:applications(requirement:requirements(id))')
      .eq('id', id)
      .single();
    
    const previousOutcome = currentAssessment?.outcome;
    
    // Update the assessment
    const { data, error } = await supabase
      .from('customer_assessments')
      .update({ 
        outcome, 
        outcome_notes: outcomeNotes,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select(`
        *,
        application:applications(
          *,
          candidate:candidates(*),
          requirement:requirements(*)
        ),
        requirement:requirement_id(*),
        candidate:candidates(*)
      `)
      .single();

    if (error) throw error;
    
    const requirementId = data?.requirement_id || data?.application?.requirement?.id;
    const candidateId = data?.candidate_id || data?.application?.candidate?.id;
    
    // If outcome is GO, mark the requirement as won
    if (outcome === 'go' && requirementId && candidateId) {
      await supabase
        .from('requirements')
        .update({
          status: 'won',
          winning_candidate_id: candidateId,
          won_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requirementId);
    }
    
    // If changing from GO to NOGO, revert the requirement status
    if (previousOutcome === 'go' && outcome === 'nogo' && requirementId) {
      await supabase
        .from('requirements')
        .update({
          status: 'active',
          winning_candidate_id: null,
          won_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requirementId);
    }
    
    return data;
  },

  // Delete assessment
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_assessments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ COMPANIES SERVICE ============

export interface DbCompany {
  id: string;
  reference_id: string | null;  // Human-readable ID like CUST-001
  name: string;
  trading_name: string | null;
  companies_house_number: string | null;
  industry: string | null;
  company_size: string | null;
  parent_company_id: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  main_phone: string | null;
  main_email: string | null;
  website: string | null;
  logo_url: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  assigned_manager_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;  // Soft delete timestamp
  // Joined data
  parent_company?: DbCompany;
  subsidiaries?: DbCompany[];
  contacts?: DbContact[];
  assigned_manager?: DbUser;
}

export interface CreateCompanyInput {
  name: string;
  trading_name?: string;
  companies_house_number?: string;
  industry?: string;
  company_size?: string;
  parent_company_id?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  main_phone?: string;
  main_email?: string;
  website?: string;
  logo_url?: string | null;
  status?: string;
  notes?: string;
  assigned_manager_id?: string;
}

export const companiesService = {
  async getAll(): Promise<DbCompany[]> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        parent_company:parent_company_id(*),
        assigned_manager:assigned_manager_id(*)
      `)
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbCompany | null> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        parent_company:parent_company_id(*),
        assigned_manager:assigned_manager_id(*),
        contacts(*),
        subsidiaries:companies!parent_company_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getParentCompanies(): Promise<DbCompany[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .is('parent_company_id', null)
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateCompanyInput): Promise<DbCompany> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Convert empty strings to null for UUID fields
    const cleanedInput = {
      ...input,
      parent_company_id: input.parent_company_id || null,
      created_by: user?.id,
    };
    
    const { data, error } = await supabase
      .from('companies')
      .insert(cleanedInput)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateCompanyInput>): Promise<DbCompany> {
    // Convert empty strings to null for UUID fields
    const cleanedInput = {
      ...input,
      parent_company_id: input.parent_company_id === '' ? null : input.parent_company_id,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('companies')
      .update(cleanedInput)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Soft delete - set deleted_at timestamp instead of removing
    const { error } = await supabase
      .from('companies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ CONTACTS SERVICE ============

export interface DbContact {
  id: string;
  reference_id: string | null;  // Human-readable ID like CON-001
  company_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedin_url: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
  notes: string | null;
  // Org chart fields
  role: string | null;
  reports_to_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;  // Soft delete timestamp
  // Joined
  company?: DbCompany;
  reports_to?: DbContact;
  direct_reports?: DbContact[];
}

export interface CreateContactInput {
  company_id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  linkedin_url?: string;
  is_primary_contact?: boolean;
  notes?: string;
  // Org chart fields
  role?: string;
  reports_to_id?: string | null;
}

export const contactsService = {
  async getAll(): Promise<DbContact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        company:company_id(id, name, parent_company_id)
      `)
      .eq('is_active', true)
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('last_name');

    if (error) throw error;
    return data || [];
  },

  async getByCompany(companyId: string): Promise<DbContact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        reports_to:reports_to_id(id, first_name, last_name, role, job_title)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)  // Exclude soft-deleted records
      .order('is_primary_contact', { ascending: false })
      .order('last_name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbContact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        company:company_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(input: CreateContactInput): Promise<DbContact> {
    // Convert empty strings to null for UUID fields
    const cleanedInput = {
      ...input,
      reports_to_id: input.reports_to_id || null,
    };
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(cleanedInput)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateContactInput>): Promise<DbContact> {
    // Convert empty strings to null for UUID fields
    const cleanedInput = {
      ...input,
      reports_to_id: input.reports_to_id === '' ? null : input.reports_to_id,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('contacts')
      .update(cleanedInput)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from('contacts')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ CUSTOMER MEETINGS SERVICE ============

export interface DbCustomerMeeting {
  id: string;
  company_id: string;
  contact_id: string | null;
  meeting_type: string;
  subject: string;
  scheduled_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
  status: 'planned' | 'completed' | 'cancelled';
  preparation_notes: string | null;
  outcome_notes: string | null;
  outcome: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  company?: DbCompany;
  contact?: DbContact;
  creator?: DbUser;
}

export interface CreateCustomerMeetingInput {
  company_id: string;
  contact_id?: string;
  meeting_type: string;
  subject: string;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
  preparation_notes?: string;
}

export interface UpdateCustomerMeetingInput {
  subject?: string;
  meeting_type?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
  status?: 'planned' | 'completed' | 'cancelled';
  preparation_notes?: string;
  outcome_notes?: string;
  completed_at?: string;
}

export const customerMeetingsService = {
  async getAll(): Promise<DbCustomerMeeting[]> {
    const { data, error } = await supabase
      .from('customer_meetings')
      .select(`
        *,
        contact:contact_id(id, first_name, last_name, role, company_id),
        creator:created_by(id, full_name)
      `)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByCompany(companyId: string): Promise<DbCustomerMeeting[]> {
    const { data, error } = await supabase
      .from('customer_meetings')
      .select(`
        *,
        contact:contact_id(id, first_name, last_name),
        creator:created_by(id, full_name)
      `)
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateCustomerMeetingInput): Promise<DbCustomerMeeting> {
    const { data, error } = await supabase
      .from('customer_meetings')
      .insert({
        ...input,
        status: 'planned', // Default status for new meetings
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateCustomerMeetingInput): Promise<DbCustomerMeeting> {
    const { data, error } = await supabase
      .from('customer_meetings')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: 'planned' | 'completed' | 'cancelled', outcomeNotes?: string): Promise<DbCustomerMeeting> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    if (outcomeNotes !== undefined) {
      updateData.outcome_notes = outcomeNotes;
    }
    
    const { data, error } = await supabase
      .from('customer_meetings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ CUSTOMERS SERVICE ============

export interface DbCustomer {
  id: string;
  name: string;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string;
  status: 'prospect' | 'active' | 'inactive';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  industry?: string;
  company_size?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: 'prospect' | 'active' | 'inactive';
  notes?: string;
}

export const customersService = {
  async getAll(): Promise<DbCustomer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbCustomer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByStatus(status: string): Promise<DbCustomer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('status', status)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateCustomerInput): Promise<DbCustomer> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...input,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateCustomerInput>): Promise<DbCustomer> {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============ CUSTOMER CONTACTS SERVICE ============

export interface DbCustomerContact {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerContactInput {
  customer_id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  notes?: string;
}

export const customerContactsService = {
  async getByCustomer(customerId: string): Promise<DbCustomerContact[]> {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('last_name');

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateCustomerContactInput): Promise<DbCustomerContact> {
    const { data, error } = await supabase
      .from('customer_contacts')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateCustomerContactInput>): Promise<DbCustomerContact> {
    const { data, error } = await supabase
      .from('customer_contacts')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setPrimary(id: string, customerId: string): Promise<void> {
    // First, unset all primary contacts for this customer
    await supabase
      .from('customer_contacts')
      .update({ is_primary: false })
      .eq('customer_id', customerId);
    
    // Then set the selected one as primary
    const { error } = await supabase
      .from('customer_contacts')
      .update({ is_primary: true })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// OFFERS SERVICE
// ============================================

export interface DbOffer {
  id: string;
  candidate_id: string;
  requirement_id: string | null;
  job_title: string;
  salary_amount: number | null;
  salary_currency: string;
  contract_type: string;
  day_rate: number | null;
  start_date: string;
  end_date: string | null;
  work_location: string | null;
  candidate_full_name: string;
  candidate_address: string | null;
  candidate_nationality: string | null;
  id_document_url: string | null;
  right_to_work_document_url: string | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'contract_sent' | 'contract_signed' | 'withdrawn';
  requested_by: string | null;
  approver_id: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  contract_sent_at: string | null;
  contract_sent_by: string | null;
  contract_signed_at: string | null;
  contract_signed_confirmed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined fields
  candidate?: DbCandidate;
  requirement?: DbRequirement;
  requester?: DbUser;
  approver?: DbUser;
}

export interface CreateOfferInput {
  candidate_id: string;
  requirement_id?: string;
  job_title: string;
  salary_amount?: number;
  salary_currency?: string;
  contract_type: string;
  day_rate?: number;
  start_date: string;
  end_date?: string;
  work_location?: string;
  candidate_full_name: string;
  candidate_address?: string;
  candidate_nationality?: string;
  id_document_url?: string;
  right_to_work_document_url?: string;
  approver_id: string;
  notes?: string;
  created_by?: string;
  requested_by?: string;
}

export const offersService = {
  async getAll(): Promise<DbOffer[]> {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        candidate:candidates(*),
        requirement:requirements(*),
        requester:users!offers_requested_by_fkey(*),
        approver:users!offers_approver_id_fkey(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbOffer | null> {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        candidate:candidates(*),
        requirement:requirements(*),
        requester:users!offers_requested_by_fkey(*),
        approver:users!offers_approver_id_fkey(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  },

  async getByCandidate(candidateId: string): Promise<DbOffer[]> {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        candidate:candidates(*),
        requirement:requirements(*)
      `)
      .eq('candidate_id', candidateId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPendingApprovals(approverId: string): Promise<DbOffer[]> {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        candidate:candidates(*),
        requirement:requirements(*),
        requester:users!offers_requested_by_fkey(*)
      `)
      .eq('approver_id', approverId)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateOfferInput): Promise<DbOffer> {
    const { data, error } = await supabase
      .from('offers')
      .insert({
        ...input,
        status: 'pending_approval',
      })
      .select(`
        *,
        candidate:candidates(*),
        requirement:requirements(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async approve(id: string, approverId: string, notes?: string): Promise<DbOffer> {
    // First get the offer details to create the ticket
    const { data: offerData, error: fetchError } = await supabase
      .from('offers')
      .select(`
        *,
        candidate:candidates(*)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update offer status
    const { data, error } = await supabase
      .from('offers')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approval_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Create HR ticket for contract processing
    const candidateName = offerData?.candidate 
      ? `${offerData.candidate.first_name} ${offerData.candidate.last_name}`
      : 'Unknown Candidate';
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days

    const { error: ticketError } = await supabase
      .from('hr_tickets')
      .insert({
        ticket_type: 'contract_send',
        priority: 'high',
        status: 'pending',
        candidate_id: offerData?.candidate_id,
        offer_id: id,
        due_date: dueDate.toISOString().split('T')[0],
        created_by: approverId,
        notes: `Offer approved for ${candidateName}. Please prepare and send contract.${notes ? `\n\nApproval notes: ${notes}` : ''}`,
        ticket_data: {
          candidate_name: candidateName,
          approval_notes: notes,
        },
      });

    if (ticketError) {
      console.error('Error creating HR ticket:', ticketError);
    }

    return data;
  },

  async reject(id: string, notes?: string): Promise<DbOffer> {
    const { data, error } = await supabase
      .from('offers')
      .update({
        status: 'rejected',
        approval_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markContractSent(id: string, sentBy: string): Promise<DbOffer> {
    const { data, error } = await supabase
      .from('offers')
      .update({
        status: 'contract_sent',
        contract_sent_at: new Date().toISOString(),
        contract_sent_by: sentBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markContractSigned(id: string, confirmedBy: string): Promise<DbOffer> {
    const { data, error } = await supabase
      .from('offers')
      .update({
        status: 'contract_signed',
        contract_signed_at: new Date().toISOString(),
        contract_signed_confirmed_by: confirmedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Also update candidate status to active_consultant
    if (data?.candidate_id) {
      await supabase
        .from('candidates')
        .update({ 
          status: 'active_consultant',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.candidate_id);
    }
    
    return data;
  },

  async update(id: string, input: Partial<CreateOfferInput>): Promise<DbOffer> {
    const { data, error } = await supabase
      .from('offers')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string, deletedBy?: string): Promise<void> {
    const { error } = await supabase
      .from('offers')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// CONSULTANTS SERVICE
// ============================================

export const consultantsService = {
  async getAll(): Promise<DbConsultant[]> {
    const { data, error } = await supabase
      .from('consultants')
      .select(`
        *,
        candidate:candidates(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbConsultant | null> {
    const { data, error } = await supabase
      .from('consultants')
      .select(`
        *,
        candidate:candidates(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  },

  async getByReferenceId(referenceId: string): Promise<DbConsultant | null> {
    const { data, error } = await supabase
      .from('consultants')
      .select(`
        *,
        candidate:candidates(*)
      `)
      .eq('reference_id', referenceId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  },

  async getByCandidateId(candidateId: string): Promise<DbConsultant | null> {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('candidate_id', candidateId)
      .is('deleted_at', null)
      .single();

    if (error) return null; // May not exist
    return data;
  },

  async create(input: CreateConsultantInput): Promise<DbConsultant> {
    const { data, error } = await supabase
      .from('consultants')
      .insert({
        ...input,
        status: 'bench',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateConsultantInput): Promise<DbConsultant> {
    const { data, error } = await supabase
      .from('consultants')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async terminate(id: string, reason?: string): Promise<DbConsultant> {
    const { data, error } = await supabase
      .from('consultants')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Convert a candidate to consultant using offer data
  async convertFromCandidate(candidateId: string, offer: DbOffer): Promise<DbConsultant> {
    // Get the candidate data
    const candidate = await candidatesService.getById(candidateId);
    if (!candidate) throw new Error('Candidate not found');

    // Create consultant record
    const consultant = await this.create({
      candidate_id: candidateId,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone || undefined,
      location: candidate.location || undefined,
      linkedin_url: candidate.linkedin_url || undefined,
      job_title: offer.job_title,
      skills: candidate.skills || [],
      security_vetting: candidate.security_vetting || undefined,
      nationalities: candidate.nationalities || undefined,
      contract_type: offer.contract_type,
      salary_amount: offer.salary_amount || undefined,
      day_rate: offer.day_rate || undefined,
      start_date: offer.start_date,
      end_date: offer.end_date || undefined,
      id_document_url: offer.id_document_url || undefined,
      right_to_work_document_url: offer.right_to_work_document_url || undefined,
    });

    // Update candidate status to archived
    await candidatesService.update(candidateId, { status: 'converted_to_consultant' });

    return consultant;
  },

  async delete(id: string, deletedBy?: string): Promise<void> {
    const { error } = await supabase
      .from('consultants')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// MISSIONS SERVICE
// ============================================

export const missionsService = {
  async getAll(): Promise<DbMission[]> {
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        requirement:requirements(*),
        consultant:consultants(*),
        company:company_id(*),
        contact:contacts(*)
      `)
      .is('deleted_at', null)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbMission | null> {
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        requirement:requirements(*),
        consultant:consultants(*),
        company:company_id(*),
        contact:contacts(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  },

  async getByConsultant(consultantId: string): Promise<DbMission[]> {
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        requirement:requirements(*),
        company:company_id(*),
        contact:contacts(*)
      `)
      .eq('consultant_id', consultantId)
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByCustomer(companyId: string): Promise<DbMission[]> {
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        requirement:requirements(*),
        consultant:consultants(*),
        contact:contacts(*)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getByRequirement(requirementId: string): Promise<DbMission | null> {
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        consultant:consultants(*),
        company:company_id(*)
      `)
      .eq('requirement_id', requirementId)
      .is('deleted_at', null)
      .single();

    if (error) return null; // May not exist
    return data;
  },

  async create(input: CreateMissionInput): Promise<DbMission> {
    const { data, error } = await supabase
      .from('missions')
      .insert({
        ...input,
        status: 'active',
      })
      .select(`
        *,
        requirement:requirements(*),
        consultant:consultants(*),
        company:company_id(*),
        contact:contacts(*)
      `)
      .single();

    if (error) throw error;
    
    // Update consultant status to in_mission
    await consultantsService.update(input.consultant_id, { status: 'in_mission' });
    
    return data;
  },

  async update(id: string, input: UpdateMissionInput): Promise<DbMission> {
    const { data, error } = await supabase
      .from('missions')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        requirement:requirements(*),
        consultant:consultants(*),
        company:company_id(*),
        contact:contacts(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string, deletedBy?: string): Promise<void> {
    // Get mission first to update consultant status
    const mission = await this.getById(id);
    
    const { error } = await supabase
      .from('missions')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) throw error;
    
    // Check if consultant has other active missions, if not set to bench
    if (mission?.consultant_id) {
      const otherMissions = await this.getByConsultant(mission.consultant_id);
      const activeMissions = otherMissions.filter(m => m.id !== id && m.status === 'active');
      if (activeMissions.length === 0) {
        await consultantsService.update(mission.consultant_id, { status: 'bench' });
      }
    }
  },
};

// ============================================
// CONSULTANT MEETINGS SERVICE
// ============================================

export const consultantMeetingsService = {
  async getAll(): Promise<DbConsultantMeeting[]> {
    const { data, error } = await supabase
      .from('consultant_meetings')
      .select(`
        *,
        consultant:consultants(*),
        conductor:users!consultant_meetings_conducted_by_fkey(*)
      `)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbConsultantMeeting | null> {
    const { data, error } = await supabase
      .from('consultant_meetings')
      .select(`
        *,
        consultant:consultants(*),
        conductor:users!consultant_meetings_conducted_by_fkey(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  },

  async getByConsultant(consultantId: string): Promise<DbConsultantMeeting[]> {
    const { data, error } = await supabase
      .from('consultant_meetings')
      .select(`
        *,
        conductor:users!consultant_meetings_conducted_by_fkey(*)
      `)
      .eq('consultant_id', consultantId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUpcoming(): Promise<DbConsultantMeeting[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('consultant_meetings')
      .select(`
        *,
        consultant:consultants(*),
        conductor:users!consultant_meetings_conducted_by_fkey(*)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_date', today)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateConsultantMeetingInput): Promise<DbConsultantMeeting> {
    const { data, error } = await supabase
      .from('consultant_meetings')
      .insert({
        ...input,
        status: 'scheduled',
      })
      .select(`
        *,
        consultant:consultants(*),
        conductor:users!consultant_meetings_conducted_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateConsultantMeetingInput): Promise<DbConsultantMeeting> {
    const { data, error } = await supabase
      .from('consultant_meetings')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        consultant:consultants(*),
        conductor:users!consultant_meetings_conducted_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async complete(id: string, input: UpdateConsultantMeetingInput): Promise<DbConsultantMeeting> {
    return this.update(id, {
      ...input,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  },

  async cancel(id: string): Promise<void> {
    const { error } = await supabase
      .from('consultant_meetings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string, deletedBy?: string): Promise<void> {
    const { error } = await supabase
      .from('consultant_meetings')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// APPROVAL REQUESTS SERVICE
// ============================================

export const approvalRequestsService = {
  async getAll(): Promise<DbApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*),
        director_approver:users!approval_requests_director_approved_by_fkey(*),
        hr_approver:users!approval_requests_hr_approved_by_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbApprovalRequest | null> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*),
        director_approver:users!approval_requests_director_approved_by_fkey(*),
        hr_approver:users!approval_requests_hr_approved_by_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByConsultant(consultantId: string): Promise<DbApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        requester:users!approval_requests_requested_by_fkey(*),
        director_approver:users!approval_requests_director_approved_by_fkey(*),
        hr_approver:users!approval_requests_hr_approved_by_fkey(*)
      `)
      .eq('consultant_id', consultantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPendingForDirector(): Promise<DbApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*)
      `)
      .eq('director_status', 'pending')
      .in('status', ['pending', 'pending_hr'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getPendingForHR(): Promise<DbApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*),
        director_approver:users!approval_requests_director_approved_by_fkey(*)
      `)
      .eq('hr_required', true)
      .eq('hr_status', 'pending')
      .eq('director_status', 'approved')
      .eq('status', 'pending_hr')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateApprovalRequestInput): Promise<DbApprovalRequest> {
    const { data, error } = await supabase
      .from('approval_requests')
      .insert({
        ...input,
        status: 'pending',
        director_status: 'pending',
        hr_status: input.hr_required ? 'pending' : 'not_required',
        requested_at: new Date().toISOString(),
      })
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async directorApprove(id: string, userId: string, notes?: string): Promise<DbApprovalRequest> {
    const request = await this.getById(id);
    if (!request) throw new Error('Request not found');

    const newStatus = request.hr_required ? 'pending_hr' : 'approved';
    
    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        director_status: 'approved',
        director_approved_by: userId,
        director_approved_at: new Date().toISOString(),
        director_notes: notes,
        status: newStatus,
        completed_at: newStatus === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*)
      `)
      .single();

    if (error) throw error;

    if (newStatus === 'approved') {
      await this.processApprovedRequest(data);
    }

    return data;
  },

  async hrApprove(id: string, userId: string, notes?: string): Promise<DbApprovalRequest> {
    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        hr_status: 'approved',
        hr_approved_by: userId,
        hr_approved_at: new Date().toISOString(),
        hr_notes: notes,
        status: 'approved',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    await this.processApprovedRequest(data);
    return data;
  },

  async reject(id: string, userId: string, reason: string, stage: 'business_director' | 'hr_manager' | 'hr'): Promise<DbApprovalRequest> {
    const updateData: any = {
      status: 'rejected',
      rejection_reason: reason,
      rejected_by: userId,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (stage === 'business_director') {
      updateData.director_status = 'rejected';
    } else {
      updateData.hr_status = 'rejected';
    }

    const { data, error } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        consultant:consultants(*),
        requester:users!approval_requests_requested_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async processApprovedRequest(request: DbApprovalRequest): Promise<void> {
    const { request_type, request_data, consultant_id, effective_month, effective_year, id } = request;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (request_type === 'salary_increase') {
      const data = request_data as SalaryIncreaseData;
      // Create HR ticket for implementation
      await hrTicketsService.create({
        ticket_type: 'salary_increase',
        consultant_id,
        approval_request_id: id,
        ticket_data: {
          current_salary: data.current_salary,
          new_salary: data.new_salary,
          salary_type: data.salary_type,
          effective_date: `${monthNames[effective_month - 1]} ${effective_year}`,
          reason: data.reason,
        },
        priority: 'normal',
      });
      // Also create the salary history record immediately (but HR needs to process payroll)
      await salaryHistoryService.create({
        consultant_id,
        salary_type: data.salary_type,
        amount: data.new_salary,
        effective_month,
        effective_year,
        change_type: 'increase',
        change_reason: data.reason,
        approval_request_id: id,
      });
      if (data.salary_type === 'annual_salary') {
        await consultantsService.update(consultant_id, { salary_amount: data.new_salary });
      } else {
        await consultantsService.update(consultant_id, { day_rate: data.new_salary });
      }
    } else if (request_type === 'bonus_payment') {
      const data = request_data as BonusPaymentData;
      // Create HR ticket for implementation
      await hrTicketsService.create({
        ticket_type: 'bonus_payment',
        consultant_id,
        approval_request_id: id,
        ticket_data: {
          amount: data.amount,
          bonus_type: data.bonus_type,
          payment_date: `${monthNames[effective_month - 1]} ${effective_year}`,
          reason: data.reason,
        },
        priority: 'normal',
      });
      await bonusPaymentsService.create({
        consultant_id,
        amount: data.amount,
        bonus_type: data.bonus_type,
        reason: data.reason,
        payment_month: effective_month,
        payment_year: effective_year,
        approval_request_id: id,
      });
    } else if (request_type === 'employee_exit') {
      const data = request_data as EmployeeExitData;
      // Create HR ticket for exit processing (exit interview, letter, etc.)
      await hrTicketsService.create({
        ticket_type: 'employee_exit',
        consultant_id,
        approval_request_id: id,
        ticket_data: {
          exit_reason: data.exit_reason,
          last_working_day: data.last_working_day,
          exit_details: data.exit_details,
        },
        priority: 'high',
      });
      // Create exit record but don't terminate until HR completes
      await consultantExitsService.create({
        consultant_id,
        exit_reason: data.exit_reason,
        exit_details: data.exit_details,
        last_working_day: data.last_working_day,
        approval_request_id: id,
      });
      // Note: Don't set status to terminated yet - HR ticket completion will do that
    }
  },
};

// ============================================
// SALARY HISTORY SERVICE
// ============================================

export const salaryHistoryService = {
  async getByConsultant(consultantId: string): Promise<DbSalaryHistory[]> {
    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('consultant_id', consultantId)
      .order('effective_year', { ascending: false })
      .order('effective_month', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(input: {
    consultant_id: string;
    salary_type: 'annual_salary' | 'day_rate';
    amount: number;
    effective_month: number;
    effective_year: number;
    change_type: 'initial' | 'increase' | 'decrease' | 'adjustment';
    change_reason?: string;
    approval_request_id?: string;
    created_by?: string;
  }): Promise<DbSalaryHistory> {
    const { data, error } = await supabase
      .from('salary_history')
      .insert({ ...input, currency: 'GBP' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================
// BONUS PAYMENTS SERVICE
// ============================================

export const bonusPaymentsService = {
  async getByConsultant(consultantId: string): Promise<DbBonusPayment[]> {
    const { data, error } = await supabase
      .from('bonus_payments')
      .select('*')
      .eq('consultant_id', consultantId)
      .order('payment_year', { ascending: false })
      .order('payment_month', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(input: {
    consultant_id: string;
    amount: number;
    bonus_type: 'performance' | 'retention' | 'project' | 'referral' | 'other';
    reason: string;
    payment_month: number;
    payment_year: number;
    approval_request_id?: string;
    created_by?: string;
  }): Promise<DbBonusPayment> {
    const { data, error } = await supabase
      .from('bonus_payments')
      .insert({ ...input, currency: 'GBP' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================
// CONSULTANT EXITS SERVICE
// ============================================

export const consultantExitsService = {
  async getByConsultant(consultantId: string): Promise<DbConsultantExit | null> {
    const { data, error } = await supabase
      .from('consultant_exits')
      .select('*')
      .eq('consultant_id', consultantId)
      .single();

    if (error) return null;
    return data;
  },

  async create(input: {
    consultant_id: string;
    exit_reason: string;
    exit_details?: string;
    last_working_day: string;
    approval_request_id?: string;
    created_by?: string;
  }): Promise<DbConsultantExit> {
    const { data, error } = await supabase
      .from('consultant_exits')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================
// HR TICKETS SERVICE
// ============================================

export const hrTicketsService = {
  async getAll(): Promise<DbHrTicket[]> {
    const { data, error } = await supabase
      .from('hr_tickets')
      .select(`
        *,
        consultant:consultants(*),
        candidate:candidates(*),
        assignee:users!hr_tickets_assigned_to_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DbHrTicket | null> {
    const { data, error } = await supabase
      .from('hr_tickets')
      .select(`
        *,
        consultant:consultants(*),
        candidate:candidates(*),
        assignee:users!hr_tickets_assigned_to_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getPending(): Promise<DbHrTicket[]> {
    const { data, error } = await supabase
      .from('hr_tickets')
      .select(`
        *,
        consultant:consultants(*),
        candidate:candidates(*),
        assignee:users!hr_tickets_assigned_to_fkey(*)
      `)
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getByAssignee(userId: string): Promise<DbHrTicket[]> {
    const { data, error } = await supabase
      .from('hr_tickets')
      .select(`
        *,
        consultant:consultants(*),
        candidate:candidates(*),
        assignee:users!hr_tickets_assigned_to_fkey(*)
      `)
      .eq('assigned_to', userId)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(input: CreateHrTicketInput): Promise<DbHrTicket> {
    const { data, error } = await supabase
      .from('hr_tickets')
      .insert({
        ...input,
        status: 'pending',
      })
      .select(`
        *,
        consultant:consultants(*),
        candidate:candidates(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<DbHrTicket>): Promise<DbHrTicket> {
    const { data, error } = await supabase
      .from('hr_tickets')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        consultant:consultants(*),
        candidate:candidates(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async startWork(id: string): Promise<DbHrTicket> {
    return this.update(id, { status: 'in_progress' });
  },

  // Contract workflow steps
  async markContractSent(id: string, userId: string): Promise<DbHrTicket> {
    const ticket = await this.getById(id);
    if (!ticket) throw new Error('Ticket not found');

    // Update ticket status
    const { data, error } = await supabase
      .from('hr_tickets')
      .update({
        status: 'contract_sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update offer status
    if (ticket.offer_id) {
      await offersService.markContractSent(ticket.offer_id, userId);
    }

    // Update candidate status
    if (ticket.candidate_id) {
      await candidatesService.update(ticket.candidate_id, { status: 'contract_sent' });
    }

    return data;
  },

  async markContractSigned(id: string, userId: string): Promise<DbHrTicket> {
    const ticket = await this.getById(id);
    if (!ticket) throw new Error('Ticket not found');

    // Update ticket status
    const { data, error } = await supabase
      .from('hr_tickets')
      .update({
        status: 'contract_signed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update offer status
    if (ticket.offer_id) {
      await offersService.markContractSigned(ticket.offer_id, userId);
    }

    // Update candidate status
    if (ticket.candidate_id) {
      await candidatesService.update(ticket.candidate_id, { status: 'contract_signed' });
    }

    return data;
  },

  async convertToConsultant(id: string, userId: string): Promise<DbHrTicket> {
    const ticket = await this.getById(id);
    if (!ticket) throw new Error('Ticket not found');
    if (!ticket.candidate_id) throw new Error('No candidate linked to this ticket');

    // Get candidate details
    const candidate = await candidatesService.getById(ticket.candidate_id);
    if (!candidate) throw new Error('Candidate not found');

    // Get offer details for salary/rate info
    let offerData = null;
    if (ticket.offer_id) {
      offerData = await offersService.getById(ticket.offer_id);
    }

    // Create consultant from candidate
    const candidateData = candidate as any; // Cast to allow access to all DB fields
    const { data: newConsultant, error: consultantError } = await supabase
      .from('consultants')
      .insert({
        candidate_id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        linkedin_url: candidate.linkedin_url,
        job_title: candidateData.current_title || offerData?.job_title,
        skills: candidate.skills || [],
        security_vetting: candidate.security_vetting,
        nationalities: candidate.nationalities,
        contract_type: offerData?.contract_type || 'permanent',
        salary_amount: offerData?.salary_amount,
        day_rate: offerData?.day_rate,
        start_date: offerData?.start_date || new Date().toISOString().split('T')[0],
        status: 'bench',
      })
      .select()
      .single();

    if (consultantError) throw consultantError;

    // Update candidate status
    await candidatesService.update(ticket.candidate_id, { status: 'converted_to_consultant' });

    // Complete the ticket and link to the new consultant
    const { data, error } = await supabase
      .from('hr_tickets')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
        completion_notes: `Converted to consultant: ${newConsultant.reference_id || newConsultant.id}`,
        consultant_id: newConsultant.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async complete(id: string, userId: string, notes?: string): Promise<DbHrTicket> {
    const ticket = await this.getById(id);
    if (!ticket) throw new Error('Ticket not found');

    const { data, error } = await supabase
      .from('hr_tickets')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
        completion_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Process completion based on ticket type
    await this.processCompletedTicket(ticket);

    return data;
  },

  async processCompletedTicket(ticket: DbHrTicket): Promise<void> {
    // When HR completes a ticket, update the related records
    if (ticket.ticket_type === 'salary_increase' && ticket.approval_request_id) {
      // Salary increase already processed when approved - just mark complete
    } else if (ticket.ticket_type === 'bonus_payment' && ticket.approval_request_id) {
      // Bonus already processed when approved
    } else if (ticket.ticket_type === 'employee_exit' && ticket.consultant_id) {
      // Mark exit as fully processed with termination date
      const exitData = ticket.ticket_data as { exit_reason?: string; last_working_day?: string; exit_details?: string } | null;
      await consultantsService.update(ticket.consultant_id, {
        status: 'terminated',
        terminated_at: exitData?.last_working_day || new Date().toISOString().split('T')[0],
        termination_reason: exitData?.exit_reason || 'Employee exit',
      });
    } else if (ticket.ticket_type === 'contract_send' && ticket.offer_id) {
      // Update offer status to contract_sent
      await offersService.markContractSent(ticket.offer_id, ticket.completed_by || '');
    }
  },

  async cancel(id: string): Promise<DbHrTicket> {
    return this.update(id, { status: 'cancelled' });
  },
};

// ============================================
// DASHBOARD STATS SERVICE
// ============================================

export const dashboardStatsService = {
  // Get manager stats
  async getManagerStats(managerId: string, dateFrom?: string, dateTo?: string): Promise<{
    interviews: { phone: number; technical: number; director: number; customer: number; };
    conversions: { phoneToTech: number; techToDirector: number; directorToCustomer: number; customerToSigned: number; };
    customerMeetings: number;
    newCustomers: number;
    consultantsActive: number;
    consultantsBench: number;
    weeklyInterviews: { week: string; count: number; }[];
    requirementsWon: number;
    requirementsLost: number;
  }> {
    // Get all interviews
    const { data: interviews } = await supabase
      .from('interviews')
      .select('*')
      .eq('interviewer_id', managerId);
    
    const allInterviews = interviews || [];
    
    // Filter by date if provided
    const filteredInterviews = dateFrom && dateTo 
      ? allInterviews.filter(i => i.scheduled_date >= dateFrom && i.scheduled_date <= dateTo)
      : allInterviews;

    // Count by stage
    const interviewCounts = {
      phone: filteredInterviews.filter(i => i.stage === 'phone_qualification').length,
      technical: filteredInterviews.filter(i => i.stage === 'technical_interview').length,
      director: filteredInterviews.filter(i => i.stage === 'director_interview').length,
      customer: 0, // Will get from customer assessments
    };

    // Get customer assessments (as "customer interviews")
    const { data: assessments } = await supabase
      .from('customer_assessments')
      .select('*, application:applications(requirement:requirements(manager_id))')
      .not('application', 'is', null);
    
    const managerAssessments = (assessments || []).filter(
      a => a.application?.requirement?.manager_id === managerId
    );
    interviewCounts.customer = dateFrom && dateTo
      ? managerAssessments.filter(a => a.scheduled_date >= dateFrom && a.scheduled_date <= dateTo).length
      : managerAssessments.length;

    // Calculate conversions (passed interviews)
    const passedPhone = filteredInterviews.filter(i => i.stage === 'phone_qualification' && i.outcome === 'pass').length;
    const passedTech = filteredInterviews.filter(i => i.stage === 'technical_interview' && i.outcome === 'pass').length;
    const passedDirector = filteredInterviews.filter(i => i.stage === 'director_interview' && i.outcome === 'pass').length;
    const passedCustomer = managerAssessments.filter(a => a.outcome === 'go').length;

    const conversions = {
      phoneToTech: interviewCounts.phone > 0 ? Math.round((passedPhone / interviewCounts.phone) * 100) : 0,
      techToDirector: interviewCounts.technical > 0 ? Math.round((passedTech / interviewCounts.technical) * 100) : 0,
      directorToCustomer: interviewCounts.director > 0 ? Math.round((passedDirector / interviewCounts.director) * 100) : 0,
      customerToSigned: interviewCounts.customer > 0 ? Math.round((passedCustomer / interviewCounts.customer) * 100) : 0,
    };

    // Get customer meetings
    const { data: meetings } = await supabase
      .from('customer_meetings')
      .select('*')
      .eq('created_by', managerId);
    
    const filteredMeetings = dateFrom && dateTo
      ? (meetings || []).filter(m => m.meeting_date >= dateFrom && m.meeting_date <= dateTo)
      : meetings || [];
    
    // Get new customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('created_by', managerId);
    
    const filteredCustomers = dateFrom && dateTo
      ? (customers || []).filter(c => c.created_at >= dateFrom && c.created_at <= dateTo)
      : customers || [];

    // Get consultant stats (from manager's requirements)
    const { data: requirements } = await supabase
      .from('requirements')
      .select('id, status')
      .eq('manager_id', managerId);
    
    const reqIds = (requirements || []).map(r => r.id);
    
    const { data: missions } = await supabase
      .from('missions')
      .select('*, consultant:consultants(*)')
      .in('requirement_id', reqIds.length > 0 ? reqIds : ['none']);
    
    const activeMissions = (missions || []).filter(m => m.status === 'active');
    const consultantsActive = new Set(activeMissions.map(m => m.consultant_id)).size;

    // Get consultants on bench (all consultants from missions that aren't active)
    const allConsultantIds = new Set((missions || []).map(m => m.consultant_id));
    const { data: allConsultants } = await supabase
      .from('consultants')
      .select('*')
      .eq('status', 'bench');
    
    const consultantsBench = (allConsultants || []).length;

    // Weekly interviews for chart
    const weeklyInterviews = getWeeklyData(filteredInterviews, 'scheduled_date', 8);

    // Requirements won/lost
    const wonRequirements = (requirements || []).filter(r => r.status === 'won' || r.status === 'filled').length;
    const lostRequirements = (requirements || []).filter(r => r.status === 'lost').length;

    return {
      interviews: interviewCounts,
      conversions,
      customerMeetings: filteredMeetings.length,
      newCustomers: filteredCustomers.length,
      consultantsActive,
      consultantsBench,
      weeklyInterviews,
      requirementsWon: wonRequirements,
      requirementsLost: lostRequirements,
    };
  },

  // Get recruiter stats
  async getRecruiterStats(recruiterId: string, dateFrom?: string, dateTo?: string): Promise<{
    candidatesAdded: number;
    candidatesThisWeek: number;
    averageQuality: number;
    interviews: { phone: number; technical: number; director: number; };
    conversions: { phoneToTech: number; techToDirector: number; directorToOffer: number; };
    weeklyCandidates: { week: string; count: number; }[];
    offersGenerated: number;
    offersSigned: number;
  }> {
    // Get candidates added by recruiter
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('assigned_recruiter', recruiterId)
      .is('deleted_at', null);
    
    const allCandidates = candidates || [];
    const filteredCandidates = dateFrom && dateTo
      ? allCandidates.filter(c => c.created_at >= dateFrom && c.created_at <= dateTo)
      : allCandidates;

    // Candidates this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const candidatesThisWeek = allCandidates.filter(c => new Date(c.created_at) >= oneWeekAgo).length;

    // Average quality (star ratings)
    const candidatesWithRating = allCandidates.filter(c => c.star_rating);
    const averageQuality = candidatesWithRating.length > 0
      ? candidatesWithRating.reduce((sum, c) => sum + (c.star_rating || 0), 0) / candidatesWithRating.length
      : 0;

    // Get interviews for their candidates
    const candidateIds = allCandidates.map(c => c.id);
    const { data: interviews } = await supabase
      .from('interviews')
      .select('*')
      .in('candidate_id', candidateIds.length > 0 ? candidateIds : ['none']);
    
    const filteredInterviews = dateFrom && dateTo
      ? (interviews || []).filter(i => i.scheduled_date >= dateFrom && i.scheduled_date <= dateTo)
      : interviews || [];

    const interviewCounts = {
      phone: filteredInterviews.filter(i => i.stage === 'phone_qualification').length,
      technical: filteredInterviews.filter(i => i.stage === 'technical_interview').length,
      director: filteredInterviews.filter(i => i.stage === 'director_interview').length,
    };

    // Conversions
    const passedPhone = filteredInterviews.filter(i => i.stage === 'phone_qualification' && i.outcome === 'pass').length;
    const passedTech = filteredInterviews.filter(i => i.stage === 'technical_interview' && i.outcome === 'pass').length;
    const passedDirector = filteredInterviews.filter(i => i.stage === 'director_interview' && i.outcome === 'pass').length;

    const conversions = {
      phoneToTech: interviewCounts.phone > 0 ? Math.round((passedPhone / interviewCounts.phone) * 100) : 0,
      techToDirector: interviewCounts.technical > 0 ? Math.round((passedTech / interviewCounts.technical) * 100) : 0,
      directorToOffer: interviewCounts.director > 0 ? Math.round((passedDirector / interviewCounts.director) * 100) : 0,
    };

    // Weekly candidates chart
    const weeklyCandidates = getWeeklyData(filteredCandidates, 'created_at', 8);

    // Offers
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .in('candidate_id', candidateIds.length > 0 ? candidateIds : ['none'])
      .is('deleted_at', null);
    
    const offersGenerated = (offers || []).length;
    const offersSigned = (offers || []).filter(o => o.status === 'contract_signed').length;

    return {
      candidatesAdded: filteredCandidates.length,
      candidatesThisWeek,
      averageQuality: Math.round(averageQuality * 10) / 10,
      interviews: interviewCounts,
      conversions,
      weeklyCandidates,
      offersGenerated,
      offersSigned,
    };
  },

  // Get director stats (aggregated across managers)
  async getDirectorStats(directorId: string): Promise<{
    managers: { id: string; name: string; interviews: number; conversions: number; consultantsActive: number; }[];
    totals: { interviews: number; customerMeetings: number; consultantsActive: number; consultantsBench: number; };
    pendingApprovals: number;
  }> {
    // Get all managers (users with business_manager role)
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .contains('roles', ['business_manager']);
    
    const managers = users || [];
    const managerStats = [];

    for (const manager of managers) {
      const stats = await this.getManagerStats(manager.id);
      managerStats.push({
        id: manager.id,
        name: manager.full_name || manager.email,
        interviews: stats.interviews.phone + stats.interviews.technical + stats.interviews.director + stats.interviews.customer,
        conversions: stats.conversions.customerToSigned,
        consultantsActive: stats.consultantsActive,
      });
    }

    // Totals
    const totals = {
      interviews: managerStats.reduce((sum, m) => sum + m.interviews, 0),
      customerMeetings: 0, // Would need to aggregate
      consultantsActive: managerStats.reduce((sum, m) => sum + m.consultantsActive, 0),
      consultantsBench: 0,
    };

    // Get total bench consultants
    const { data: benchConsultants } = await supabase
      .from('consultants')
      .select('id')
      .eq('status', 'bench');
    totals.consultantsBench = (benchConsultants || []).length;

    // Pending approvals count
    const { data: pendingApprovals } = await supabase
      .from('approval_requests')
      .select('id')
      .eq('director_status', 'pending');
    
    const { data: pendingOffers } = await supabase
      .from('offers')
      .select('id')
      .eq('status', 'pending_approval');

    return {
      managers: managerStats,
      totals,
      pendingApprovals: (pendingApprovals || []).length + (pendingOffers || []).length,
    };
  },
};

// Helper to group data by week
function getWeeklyData(items: any[], dateField: string, weeks: number): { week: string; count: number }[] {
  const result: { week: string; count: number }[] = [];
  const now = new Date();
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const count = items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= weekStart && itemDate <= weekEnd;
    }).length;
    
    const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    result.push({ week: weekLabel, count });
  }
  
  return result;
}

// ============================================
// CV UPLOAD SERVICE
// ============================================

export const cvUploadService = {
  async uploadCV(file: File, candidateId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}-${Date.now()}.${fileExt}`;
    const filePath = `cvs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('candidate-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Store the file path, not a public URL
    // We'll generate signed URLs on demand when viewing
    return filePath;
  },

  async getSignedUrl(filePath: string): Promise<string> {
    // Generate a signed URL valid for 1 hour
    const { data, error } = await supabase.storage
      .from('candidate-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  },

  async deleteCV(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('candidate-files')
      .remove([filePath]);

    if (error) throw error;
  }
};

// Document upload service for offer documents (ID, Right to Work, etc.)
export const documentUploadService = {
  async uploadDocument(file: File, type: 'id' | 'right_to_work', candidateId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `documents/${type}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('candidate-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;
    return filePath;
  },

  async getSignedUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('candidate-files')
      .createSignedUrl(filePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  },

  async deleteDocument(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('candidate-files')
      .remove([filePath]);

    if (error) throw error;
  }
};
