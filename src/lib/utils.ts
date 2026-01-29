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
export const statusLabels = {
  // Candidate status
  new: 'New',
  screening: 'Screening',
  phone_qualification: 'Phone Qualification',
  technical_interview: 'Technical Interview',
  director_interview: 'Director Interview',
  offer: 'Offer Stage',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  on_hold: 'On Hold',
  
  // Application status
  applied: 'Applied',
  offer_pending: 'Offer Pending',
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
