// Consolidated UI Components
// All reusable UI components in a single file

import { useState, useRef, useEffect, forwardRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type HTMLAttributes } from 'react';
import { Loader2, Search, X, ChevronDown, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { supabase } from '@/lib/supabase';

// ============================================
// AVATAR
// ============================================

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = getInitials(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow-soft ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-brand-slate-700 to-brand-slate-900 flex items-center justify-center text-white font-semibold border-2 border-white shadow-soft ${className}`}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  users: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;
  const overlapSizes = { sm: '-ml-2', md: '-ml-3', lg: '-ml-4' };
  const counterSizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };

  return (
    <div className="flex items-center">
      {displayUsers.map((user, index) => (
        <div key={index} className={index > 0 ? overlapSizes[size] : ''}>
          <Avatar name={user.name} src={user.src} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div className={`${overlapSizes[size]} ${counterSizes[size]} rounded-full bg-brand-grey-200 flex items-center justify-center text-brand-slate-700 font-medium border-2 border-white shadow-soft`}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

// ============================================
// BADGE
// ============================================

export type BadgeVariant = 'green' | 'cyan' | 'orange' | 'gold' | 'grey' | 'red' | 'purple' | 'amber' | 'blue';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'grey', size = 'md', className = '' }: BadgeProps) {
  const variants = {
    green: 'bg-brand-green/15 text-green-800',
    cyan: 'bg-brand-cyan/15 text-cyan-800',
    orange: 'bg-brand-orange/15 text-orange-900',
    gold: 'bg-brand-gold/15 text-amber-800',
    grey: 'bg-brand-grey-200 text-brand-slate-700',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-0.5 text-xs' };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

export function getStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    hired: 'green', approved: 'green', signed: 'green', pass: 'green', filled: 'green',
    new: 'cyan', open: 'cyan', sent: 'cyan', accepted: 'cyan',
    screening: 'gold', phone_qualification: 'gold', technical_interview: 'gold', director_interview: 'gold', pending: 'gold', pending_approval: 'gold',
    offer: 'orange', offer_pending: 'orange', offer_sent: 'orange', reschedule: 'orange', high: 'orange', urgent: 'red',
    draft: 'grey', rejected: 'grey', withdrawn: 'grey', on_hold: 'grey', cancelled: 'grey', fail: 'grey', low: 'grey', medium: 'grey',
  };
  return statusMap[status] || 'grey';
}

// ============================================
// BUTTON
// ============================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, disabled, className = '', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-brand-slate-900 text-white hover:bg-brand-slate-800 focus:ring-brand-slate-900',
      secondary: 'bg-white text-brand-slate-900 border border-brand-grey-200 hover:bg-brand-grey-100 hover:border-brand-grey-400 focus:ring-brand-slate-700',
      accent: 'bg-brand-cyan text-white hover:bg-cyan-600 focus:ring-brand-cyan',
      ghost: 'bg-transparent text-brand-slate-700 hover:bg-brand-grey-100 focus:ring-brand-slate-700',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-600',
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

    return (
      <button ref={ref} disabled={disabled || isLoading} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ============================================
// CARD
// ============================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, hover = false, padding = 'md', className = '', ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div className={`bg-white rounded-xl border border-brand-grey-200/50 ${hover ? 'shadow-soft transition-all duration-200 hover:shadow-medium hover:border-brand-grey-200 cursor-pointer' : 'shadow-soft'} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-brand-slate-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-brand-grey-400 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-3 mt-4 pt-4 border-t border-brand-grey-200/50 ${className}`}>{children}</div>;
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 p-4 rounded-full bg-brand-grey-100 text-brand-grey-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-brand-slate-900 mb-1">{title}</h3>
      {description && <p className="text-brand-grey-400 max-w-sm mb-6">{description}</p>}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

// ============================================
// INPUT
// ============================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  isSearch?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, isSearch = false, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasLeftIcon = leftIcon || isSearch;

    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-brand-slate-700 mb-1.5">{label}</label>}
        <div className="relative">
          {hasLeftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-grey-400">{isSearch ? <Search className="h-4 w-4" /> : leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-4 py-2.5 rounded-lg border bg-white text-brand-slate-900 placeholder:text-brand-grey-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all duration-200 disabled:bg-brand-grey-100 disabled:cursor-not-allowed ${hasLeftIcon ? 'pl-11' : ''} ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-brand-grey-200'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-brand-grey-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================
// SELECT
// ============================================

interface SelectOption { value: string; label: string }

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder = 'Select an option', className = '', id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasEmptyOption = options.some(opt => opt.value === '');

    return (
      <div className="w-full">
        {label && <label htmlFor={selectId} className="block text-sm font-medium text-brand-slate-700 mb-1.5">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full px-4 py-2.5 pr-10 rounded-lg border bg-white text-brand-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all duration-200 disabled:bg-brand-grey-100 disabled:cursor-not-allowed ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-brand-grey-200'} ${className}`}
            {...props}
          >
            {!hasEmptyOption && <option value="" disabled>{placeholder}</option>}
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-grey-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-brand-grey-400">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ============================================
// TEXTAREA
// ============================================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && <label htmlFor={textareaId} className="block text-sm font-medium text-brand-slate-700 mb-1.5">{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full px-4 py-2.5 rounded-lg border bg-white text-brand-slate-900 placeholder:text-brand-grey-400 resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all duration-200 disabled:bg-brand-grey-100 disabled:cursor-not-allowed ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : 'border-brand-grey-200'} ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-brand-grey-400">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ============================================
// LOADING
// ============================================

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return <Loader2 className={`animate-spin text-brand-cyan ${sizes[size]} ${className}`} />;
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner size="lg" />
      <p className="mt-4 text-brand-grey-400">{message}</p>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <Spinner size="lg" />
        <p className="mt-4 text-brand-slate-700 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-brand-grey-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-white rounded-xl border border-brand-grey-200/50 shadow-soft">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

// ============================================
// TOAST
// ============================================

export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose: () => void;
}

function Toast({ type, title, message, onClose }: ToastProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-brand-cyan" />,
  };
  const backgrounds = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-cyan-50 border-cyan-200',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-medium min-w-[320px] max-w-[420px] animate-slide-up ${backgrounds[type]}`}>
      {icons[type]}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand-slate-900">{title}</p>
        {message && <p className="mt-1 text-sm text-brand-slate-700">{message}</p>}
      </div>
      <button onClick={onClose} className="p-0.5 text-brand-grey-400 hover:text-brand-slate-700 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================
// MODAL
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  shake?: boolean;
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md', showCloseButton = true, shake = false }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]' };

  return (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${sizes[size]} bg-white rounded-2xl shadow-strong animate-slide-up overflow-hidden ${shake ? 'animate-shake' : ''}`}>
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-brand-grey-200/50">
            <div>
              {title && <h2 className="text-xl font-semibold text-brand-slate-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-brand-grey-400">{description}</p>}
            </div>
            {showCloseButton && (
              <button onClick={onClose} className="p-1 text-brand-grey-400 hover:text-brand-slate-700 hover:bg-brand-grey-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// CONFIRM DIALOG
// ============================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  requirePassword?: boolean;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary', isLoading = false, requirePassword = false }: ConfirmDialogProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleConfirm = async () => {
    if (requirePassword) {
      if (!password) { setPasswordError('Please enter your password'); return; }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) { setPasswordError('Unable to verify user'); return; }
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (error) { setPasswordError('Incorrect password'); return; }
      } catch { setPasswordError('Failed to verify password'); return; }
    }
    setPassword(''); setPasswordError(''); onConfirm();
  };

  const handleClose = () => { setPassword(''); setPasswordError(''); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-brand-slate-900 mb-2">{title}</h3>
        <p className="text-brand-grey-400 mb-6">{message}</p>
        {requirePassword && (
          <div className="mb-6 text-left">
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">Enter your password to confirm</label>
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }} className={`w-full px-3 py-2 rounded-lg border ${passwordError ? 'border-red-500' : 'border-brand-grey-200'} focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan`} placeholder="Your password" />
            {passwordError && <p className="mt-1 text-sm text-red-500">{passwordError}</p>}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>{cancelText}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} isLoading={isLoading}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// DELETE DIALOG
// ============================================

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (hardDelete: boolean) => void;
  itemName: string;
  itemType: string;
  canHardDelete: boolean;
  isLoading?: boolean;
}

export function DeleteDialog({ isOpen, onClose, onDelete, itemName, itemType, canHardDelete, isLoading = false }: DeleteDialogProps) {
  const [step, setStep] = useState<'choose' | 'confirm_hard'>('choose');
  const handleClose = () => { setStep('choose'); onClose(); };
  const handleSoftDelete = () => { onDelete(false); handleClose(); };
  const handleConfirmHardDelete = () => { onDelete(true); handleClose(); };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" showCloseButton={false}>
      {step === 'choose' ? (
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-brand-slate-900 mb-2">Delete {itemType}</h3>
          <p className="text-brand-grey-500 mb-6"><span className="font-medium text-brand-slate-700">{itemName}</span></p>
          {canHardDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-brand-grey-400 mb-4">How would you like to delete this {itemType.toLowerCase()}?</p>
              <button onClick={handleSoftDelete} disabled={isLoading} className="w-full p-4 border-2 border-amber-200 bg-amber-50 rounded-xl text-left hover:border-amber-400 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg"><svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></div>
                  <div><p className="font-medium text-amber-800">Archive (Keep in database)</p><p className="text-sm text-amber-600">Hidden from view but can be recovered later</p></div>
                </div>
              </button>
              <button onClick={() => setStep('confirm_hard')} disabled={isLoading} className="w-full p-4 border-2 border-red-200 bg-red-50 rounded-xl text-left hover:border-red-400 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg"><svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                  <div><p className="font-medium text-red-800">Delete Permanently</p><p className="text-sm text-red-600">Remove completely, cannot be recovered</p></div>
                </div>
              </button>
              <Button variant="secondary" onClick={handleClose} className="w-full mt-4">Cancel</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-brand-grey-400 mb-4">This will archive the {itemType.toLowerCase()}. It can be recovered by an admin.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button variant="danger" onClick={handleSoftDelete} isLoading={isLoading}>Archive</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Are you absolutely sure?</h3>
          <p className="text-brand-grey-500 mb-2">This will permanently delete <span className="font-medium text-brand-slate-700">{itemName}</span></p>
          <p className="text-sm text-red-600 mb-6">This action cannot be undone. All associated data will be lost forever.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setStep('choose')}>Go Back</Button>
            <Button variant="danger" onClick={handleConfirmHardDelete} isLoading={isLoading}>Yes, Delete Permanently</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================================
// SEARCHABLE SELECT
// ============================================

export interface SearchableOption { value: string; label: string; sublabel?: string }

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (query: string) => void;
  minChars?: number;
  maxResults?: number;
}

export function SearchableSelect({ label, placeholder = 'Type to search...', options, value, onChange, error, disabled = false, loading = false, onSearch, minChars = 1, maxResults = 10 }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = searchQuery.length >= minChars
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()) || opt.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, maxResults)
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) { setIsOpen(false); setSearchQuery(''); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) { if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true); return; }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); break;
      case 'ArrowUp': e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); break;
      case 'Enter': e.preventDefault(); if (filteredOptions[highlightedIndex]) handleSelect(filteredOptions[highlightedIndex].value); break;
      case 'Escape': setIsOpen(false); setSearchQuery(''); break;
    }
  };

  const handleSelect = (selectedValue: string) => { onChange(selectedValue); setIsOpen(false); setSearchQuery(''); setHighlightedIndex(0); };
  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(''); setSearchQuery(''); inputRef.current?.focus(); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const query = e.target.value; setSearchQuery(query); setHighlightedIndex(0); setIsOpen(true); if (onSearch) onSearch(query); };

  return (
    <div className="w-full" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        <div className={`w-full px-4 py-2.5 pr-10 rounded-lg border bg-white flex items-center gap-2 cursor-text transition-all duration-200 ${disabled ? 'bg-brand-grey-100 cursor-not-allowed' : ''} ${error ? 'border-red-500' : isOpen ? 'border-brand-cyan ring-2 ring-brand-cyan/30' : 'border-brand-grey-200'}`} onClick={() => { if (!disabled) { setIsOpen(true); inputRef.current?.focus(); } }}>
          <Search className="h-4 w-4 text-brand-grey-400 flex-shrink-0" />
          {isOpen ? (
            <input ref={inputRef} type="text" value={searchQuery} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={selectedOption ? selectedOption.label : placeholder} className="flex-1 outline-none bg-transparent text-brand-slate-900 placeholder:text-brand-grey-400" autoFocus disabled={disabled} />
          ) : (
            <span className={`flex-1 ${selectedOption ? 'text-brand-slate-900' : 'text-brand-grey-400'}`}>
              {selectedOption ? <span className="flex items-center gap-2"><span>{selectedOption.label}</span>{selectedOption.sublabel && <span className="text-sm text-brand-grey-400">({selectedOption.sublabel})</span>}</span> : placeholder}
            </span>
          )}
          {value && !disabled ? <button type="button" onClick={handleClear} className="p-0.5 hover:bg-brand-grey-100 rounded"><X className="h-4 w-4 text-brand-grey-400" /></button> : <ChevronDown className={`h-4 w-4 text-brand-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-brand-grey-200 shadow-lg max-h-60 overflow-auto">
            {loading ? <div className="px-4 py-3 text-sm text-brand-grey-400 text-center">Searching...</div>
              : searchQuery.length < minChars ? <div className="px-4 py-3 text-sm text-brand-grey-400 text-center">Type at least {minChars} character{minChars > 1 ? 's' : ''} to search</div>
              : filteredOptions.length === 0 ? <div className="px-4 py-3 text-sm text-brand-grey-400 text-center">No results found</div>
              : <ul className="py-1">{filteredOptions.map((option, index) => (
                  <li key={option.value} onClick={() => handleSelect(option.value)} onMouseEnter={() => setHighlightedIndex(index)} className={`px-4 py-2.5 cursor-pointer flex items-center justify-between ${index === highlightedIndex ? 'bg-brand-cyan/10' : 'hover:bg-brand-grey-50'} ${option.value === value ? 'bg-brand-cyan/5' : ''}`}>
                    <div><div className="text-sm font-medium text-brand-slate-900">{option.label}</div>{option.sublabel && <div className="text-xs text-brand-grey-400">{option.sublabel}</div>}</div>
                    {option.value === value && <div className="w-2 h-2 rounded-full bg-brand-cyan" />}
                  </li>
                ))}</ul>}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ============================================
// SCORE COMPONENTS
// ============================================

interface ScoreProps { score: number | null; maxScore?: number; size?: 'sm' | 'md' | 'lg'; showLabel?: boolean }

export function Score({ score, maxScore = 5, size = 'md', showLabel = false }: ScoreProps) {
  if (score === null) return <span className="text-brand-grey-400 text-sm">Not rated</span>;
  const percentage = (score / maxScore) * 100;
  const getColour = () => { if (percentage >= 80) return 'bg-brand-green text-green-800'; if (percentage >= 60) return 'bg-brand-cyan text-cyan-800'; if (percentage >= 40) return 'bg-brand-gold text-amber-800'; return 'bg-red-200 text-red-800'; };
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizes[size]} ${getColour()} rounded-full flex items-center justify-center font-semibold`}>{score}</div>
      {showLabel && <span className="text-sm text-brand-grey-400">/ {maxScore}</span>}
    </div>
  );
}

interface StarRatingDisplayProps { rating: number | null; maxRating?: number; size?: 'sm' | 'md'; label?: string }

export function StarRatingDisplay({ rating, maxRating = 5, size = 'md', label }: StarRatingDisplayProps) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' };
  return (
    <div className="flex items-center gap-2 text-sm">
      {label && <span className="text-brand-grey-400">{label}:</span>}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, i) => (
          <svg key={i} className={`${sizes[size]} ${rating !== null && i < rating ? 'text-amber-400' : 'text-brand-grey-200'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
}

interface StarRatingProps { value: number; onChange: (value: number) => void; maxRating?: number; label?: string }

export function StarRating({ value, onChange, maxRating = 5, label }: StarRatingProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }).map((_, i) => {
          const starValue = i + 1;
          return (
            <button key={i} type="button" onClick={() => onChange(starValue === value ? 0 : starValue)} className="p-0.5 transition-transform hover:scale-110 focus:outline-none">
              <svg className={`w-6 h-6 transition-colors ${starValue <= value ? 'text-amber-400' : 'text-brand-grey-200 hover:text-amber-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ScoreBarProps { label: string; score: number | null; maxScore?: number }

export function ScoreBar({ label, score, maxScore = 5 }: ScoreBarProps) {
  const percentage = score !== null ? (score / maxScore) * 100 : 0;
  const getColour = () => { if (score === null) return 'bg-brand-grey-200'; if (percentage >= 80) return 'bg-brand-green'; if (percentage >= 60) return 'bg-brand-cyan'; if (percentage >= 40) return 'bg-brand-gold'; return 'bg-red-400'; };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-brand-slate-700">{label}</span>
        <span className="font-medium text-brand-slate-900">{score !== null ? `${score}/${maxScore}` : 'N/A'}</span>
      </div>
      <div className="h-2 bg-brand-grey-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${getColour()}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
