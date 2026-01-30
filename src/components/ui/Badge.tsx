import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'cyan' | 'orange' | 'gold' | 'grey' | 'red' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'grey', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  const variants = {
    green: 'bg-brand-green/15 text-green-800',
    cyan: 'bg-brand-cyan/15 text-cyan-800',
    orange: 'bg-brand-orange/15 text-orange-900',
    gold: 'bg-brand-gold/15 text-amber-800',
    grey: 'bg-brand-grey-200 text-brand-slate-700',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span 
      className={`
        inline-flex items-center rounded-full font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Helper to get badge variant from status
export function getStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    // Success states
    hired: 'green',
    approved: 'green',
    signed: 'green',
    pass: 'green',
    filled: 'green',
    
    // Active/Info states
    new: 'cyan',
    open: 'cyan',
    sent: 'cyan',
    accepted: 'cyan',
    
    // Warning/In-progress states
    screening: 'gold',
    phone_qualification: 'gold',
    technical_interview: 'gold',
    director_interview: 'gold',
    pending: 'gold',
    pending_approval: 'gold',
    
    // Attention states
    offer: 'orange',
    offer_pending: 'orange',
    offer_sent: 'orange',
    reschedule: 'orange',
    high: 'orange',
    urgent: 'red',
    
    // Neutral/Inactive states
    draft: 'grey',
    rejected: 'grey',
    withdrawn: 'grey',
    on_hold: 'grey',
    cancelled: 'grey',
    fail: 'grey',
    low: 'grey',
    medium: 'grey',
  };

  return statusMap[status] || 'grey';
}
