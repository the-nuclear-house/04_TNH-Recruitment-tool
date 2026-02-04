import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combine class names with Tailwind merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(
  amount: number,
  currency: string = 'GBP',
  locale: string = 'en-GB'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
): string {
  return new Intl.DateTimeFormat('en-GB', options).format(
    typeof date === 'string' ? new Date(date) : date
  );
}

// Format relative time (e.g., "2 days ago")
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(then);
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Debounce function for search
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

// Generate a slug from text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Parse skills from comma-separated string
export function parseSkills(skillsString: string): string[] {
  return skillsString
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Format skills as comma-separated string
export function formatSkills(skills: string[]): string {
  return skills.join(', ');
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate UK phone number
export function isValidUKPhone(phone: string): boolean {
  const phoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('+44')) {
    return cleaned.replace(/(\+44)(\d{4})(\d{3})(\d{3,4})/, '$1 $2 $3 $4');
  }
  if (cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{5})(\d{3})(\d{3,4})/, '$1 $2 $3');
  }
  return phone;
}

// Status colour mapping
export const statusColours = {
  // Candidate status
  new: 'badge-cyan',
  screening: 'badge-gold',
  phone_qualification: 'badge-gold',
  technical_interview: 'badge-gold',
  director_interview: 'badge-gold',
  offer: 'badge-orange',
  hired: 'badge-green',
  rejected: 'badge-grey',
  withdrawn: 'badge-grey',
  on_hold: 'badge-grey',
  
  // Requirement status
  draft: 'badge-grey',
  open: 'badge-green',
  filled: 'badge-cyan',
  cancelled: 'badge-grey',
  
  // Interview outcome
  pending: 'badge-gold',
  pass: 'badge-green',
  fail: 'badge-grey',
  reschedule: 'badge-orange',
  
  // Contract status
  pending_approval: 'badge-gold',
  approved: 'badge-green',
  sent: 'badge-cyan',
  signed: 'badge-green',
} as const;

// Human-readable status labels
export const statusLabels: Record<string, string> = {
  // Candidate pipeline status (based on interview progress)
  sourced: 'Sourced',
  phone_planned: 'Phone Interview Planned',
  phone_done: 'Phone Interview Done',
  technical_planned: 'Technical Interview Planned',
  technical_done: 'Technical Interview Done',
  director_planned: 'Director Interview Planned',
  director_done: 'Director Interview Done',
  offer_pending: 'Offer Pending Approval',
  offer_approved: 'Offer Approved',
  contract_sent: 'Contract Sent',
  contract_signed: 'Contract Signed',
  active_consultant: 'Active Consultant',
  
  // Legacy/fallback status
  new: 'Sourced',
  screening: 'Screening',
  phone_qualification: 'Phone Interview',
  technical_interview: 'Technical Interview',
  director_interview: 'Director Interview',
  offer: 'Offer Stage',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  on_hold: 'On Hold',
  
  // Application status
  applied: 'Applied',
  offer_sent: 'Offer Sent',
  accepted: 'Accepted',
  
  // Requirement status
  draft: 'Draft',
  open: 'Open',
  filled: 'Filled',
  cancelled: 'Cancelled',
  
  // Priority
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
  
  // Right to work
  british_citizen: 'British Citizen',
  settled_status: 'Settled Status',
  pre_settled_status: 'Pre-settled Status',
  skilled_worker_visa: 'Skilled Worker Visa',
  graduate_visa: 'Graduate Visa',
  other_visa: 'Other Visa',
  requires_sponsorship: 'Requires Sponsorship',
  unknown: 'Unknown',
  
  // Security vetting
  none: 'None',
  bpss: 'BPSS',
  ctc: 'CTC',
  sc: 'SC',
  esc: 'eSC',
  dv: 'DV',
  edv: 'eDV',
} as const;

// Interview stage labels
export const interviewStageLabels = {
  phone_qualification: 'Phone Qualification',
  technical_interview: 'Technical Interview',
  director_interview: 'Director Interview',
} as const;

// Generate time options with 30-minute intervals
export function getTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (const minute of ['00', '30']) {
      const value = `${hour.toString().padStart(2, '0')}:${minute}`;
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const label = `${hour12}:${minute} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
}

// Time options constant for Select components
export const timeOptions = getTimeOptions();

// Compute candidate pipeline status based on their interviews
export interface InterviewForStatus {
  stage: string;
  outcome: string;
  scheduled_at?: string | null;
}

export function computeCandidatePipelineStatus(
  interviews: InterviewForStatus[],
  candidateStatus?: string
): { status: string; label: string; colour: string } {
  // Check if candidate has contract-related status
  if (candidateStatus === 'converted_to_consultant') {
    return { status: 'converted_to_consultant', label: 'Converted to Consultant', colour: 'bg-purple-100 text-purple-700' };
  }
  if (candidateStatus === 'contract_signed') {
    return { status: 'contract_signed', label: 'Contract Signed', colour: 'bg-green-100 text-green-700' };
  }
  if (candidateStatus === 'contract_sent') {
    return { status: 'contract_sent', label: 'Contract Sent', colour: 'bg-blue-100 text-blue-700' };
  }
  if (candidateStatus === 'offer_approved') {
    return { status: 'offer_approved', label: 'Offer Approved', colour: 'bg-green-100 text-green-700' };
  }
  if (candidateStatus === 'offer_pending') {
    return { status: 'offer_pending', label: 'Offer Pending', colour: 'bg-amber-100 text-amber-700' };
  }
  if (candidateStatus === 'offer_rejected') {
    return { status: 'offer_rejected', label: 'Offer Rejected', colour: 'bg-red-100 text-red-700' };
  }
  if (candidateStatus === 'rejected') {
    return { status: 'rejected', label: 'Rejected', colour: 'bg-red-100 text-red-700' };
  }
  if (candidateStatus === 'withdrawn') {
    return { status: 'withdrawn', label: 'Withdrawn', colour: 'bg-slate-100 text-slate-600' };
  }

  // Check interview progress
  const phoneInterview = interviews.find(i => i.stage === 'phone_qualification');
  const techInterview = interviews.find(i => i.stage === 'technical_interview');
  const directorInterview = interviews.find(i => i.stage === 'director_interview');

  // Director Interview stage
  if (directorInterview) {
    if (directorInterview.outcome === 'pass') {
      return { status: 'director_done', label: 'Director Interview Done', colour: 'bg-green-100 text-green-700' };
    }
    if (directorInterview.outcome === 'fail') {
      return { status: 'rejected', label: 'Rejected', colour: 'bg-red-100 text-red-700' };
    }
    if (directorInterview.scheduled_at) {
      return { status: 'director_planned', label: 'Director Interview Planned', colour: 'bg-amber-100 text-amber-700' };
    }
  }

  // Technical Interview stage
  if (techInterview) {
    if (techInterview.outcome === 'pass') {
      return { status: 'technical_done', label: 'Technical Interview Done', colour: 'bg-purple-100 text-purple-700' };
    }
    if (techInterview.outcome === 'fail') {
      return { status: 'rejected', label: 'Rejected', colour: 'bg-red-100 text-red-700' };
    }
    if (techInterview.scheduled_at) {
      return { status: 'technical_planned', label: 'Technical Interview Planned', colour: 'bg-purple-100 text-purple-700' };
    }
  }

  // Phone Interview stage
  if (phoneInterview) {
    if (phoneInterview.outcome === 'pass') {
      return { status: 'phone_done', label: 'Phone Interview Done', colour: 'bg-blue-100 text-blue-700' };
    }
    if (phoneInterview.outcome === 'fail') {
      return { status: 'rejected', label: 'Rejected', colour: 'bg-red-100 text-red-700' };
    }
    if (phoneInterview.scheduled_at) {
      return { status: 'phone_planned', label: 'Phone Interview Planned', colour: 'bg-blue-100 text-blue-700' };
    }
  }

  // Default - just sourced/new
  return { status: 'sourced', label: 'Sourced', colour: 'bg-cyan-100 text-cyan-700' };
}
