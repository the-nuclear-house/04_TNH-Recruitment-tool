import { supabase } from './supabase';

// Types matching our database schema
export interface DbCandidate {
  id: string;
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
  status: string;
  source: string | null;
  cv_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  source?: string;
  cv_url?: string;
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

  // Delete candidate
  async delete(id: string): Promise<void> {
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
  created_at: string;
  updated_at: string;
}

export interface CreateRequirementInput {
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
}

export const requirementsService = {
  // Get all requirements
  async getAll(): Promise<DbRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single requirement by ID
  async getById(id: string): Promise<DbRequirement | null> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
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

  // Delete requirement
  async delete(id: string): Promise<void> {
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
  general_comments: string | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
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
}

export const interviewsService = {
  // Get all interviews
  async getAll(): Promise<DbInterview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
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

  // Delete interview
  async delete(id: string): Promise<void> {
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
  role: string;
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

  // Get users by role
  async getByRole(role: string): Promise<DbUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
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
  application_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  customer_contact: string | null;
  location: string | null;
  notes: string | null;
  outcome: 'pending' | 'go' | 'nogo' | null;
  outcome_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  application?: DbApplication & {
    candidate?: DbCandidate;
    requirement?: DbRequirement;
  };
}

export interface CreateCustomerAssessmentInput {
  application_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  customer_contact?: string;
  location?: string;
  notes?: string;
  created_by: string;
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
        )
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
