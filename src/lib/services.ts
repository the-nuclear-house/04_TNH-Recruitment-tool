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
  skills: string[];
  previous_companies: string[];
  minimum_salary_expected: number | null;
  right_to_work: string;
  security_vetting: string;
  notice_period: string | null;
  contract_preference: string | null;
  open_to_relocate: string | null;
  relocation_preferences: string | null;
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
  years_experience?: number;
  degree?: string;
  summary?: string;
  skills?: string[];
  previous_companies?: string[];
  minimum_salary_expected?: number;
  right_to_work?: string;
  security_vetting?: string;
  notice_period?: string;
  contract_preference?: string;
  open_to_relocate?: string;
  relocation_preferences?: string;
  expected_day_rate?: number;
  nationalities?: string[];
  source?: string;
  cv_url?: string;
  assigned_recruiter_id?: string;
}

export interface UpdateCandidateInput extends Partial<CreateCandidateInput> {
  status?: string;
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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;  // Soft delete timestamp
  // Joined
  company?: DbCompany;
  contact?: DbContact;
}

export interface CreateRequirementInput {
  title?: string;
  customer: string;
  industry?: string;
  location?: string;
  fte_count?: number;
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
}

export const requirementsService = {
  // Get all requirements
  async getAll(): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select(`
        *,
        company:company_id(*),
        contact:contact_id(*)
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
        contact:contact_id(*)
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
  contract_preference?: string;
  salary_proposed?: number;
  warnings?: string;
  general_comments?: string;
  recommendation?: string;
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
  candidate_id: string;
  requirement_id: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  candidate?: DbCandidate;
  requirement?: DbRequirement;
}

export interface CreateApplicationInput {
  candidate_id: string;
  requirement_id: string;
  status?: string;
  notes?: string;
  created_by: string;
}

export const applicationsService = {
  // Get all applications for a requirement
  async getByRequirement(requirementId: string): Promise<DbApplication[]> {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        candidate:candidates(*)
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

  // Create a new application (link candidate to requirement)
  async create(input: CreateApplicationInput): Promise<DbApplication> {
    const { data, error } = await supabase
      .from('applications')
      .insert(input)
      .select(`
        *,
        candidate:candidates(*)
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
  contact?: DbContact;
  candidate?: DbCandidate;
}

export interface CreateCustomerAssessmentInput {
  application_id?: string;
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
        )
      `)
      .eq('application_id', applicationId)
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
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update assessment outcome
  async updateOutcome(id: string, outcome: 'go' | 'nogo', outcomeNotes?: string): Promise<DbCustomerAssessment> {
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
        )
      `)
      .single();

    if (error) throw error;
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
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateCustomerMeetingInput & { 
    completed_at?: string; 
    outcome?: string;
    follow_up_date?: string;
    follow_up_notes?: string;
  }>): Promise<DbCustomerMeeting> {
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
