import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '@/lib/supabase';

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

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  shake = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

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

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        // Prevent any click on the overlay from doing anything
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-slate-900/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full ${sizes[size]} bg-white rounded-2xl shadow-strong
          animate-slide-up overflow-hidden
          ${shake ? 'animate-shake' : ''}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-brand-grey-200/50">
            <div>
              {title && (
                <h2 className="text-xl font-semibold text-brand-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-brand-grey-400">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-brand-grey-400 hover:text-brand-slate-700 hover:bg-brand-grey-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Confirmation dialog
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

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  requirePassword = false,
}: ConfirmDialogProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleConfirm = async () => {
    if (requirePassword) {
      if (!password) {
        setPasswordError('Please enter your password');
        return;
      }
      // Verify password with Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setPasswordError('Unable to verify user');
          return;
        }
        
        const { error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password,
        });
        
        if (error) {
          setPasswordError('Incorrect password');
          return;
        }
      } catch (err) {
        setPasswordError('Failed to verify password');
        return;
      }
    }
    setPassword('');
    setPasswordError('');
    onConfirm();
  };

  const handleClose = () => {
    setPassword('');
    setPasswordError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-brand-slate-900 mb-2">
          {title}
        </h3>
        <p className="text-brand-grey-400 mb-6">
          {message}
        </p>
        
        {requirePassword && (
          <div className="mb-6 text-left">
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              className={`w-full px-3 py-2 rounded-lg border ${
                passwordError ? 'border-red-500' : 'border-brand-grey-200'
              } focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan`}
              placeholder="Your password"
            />
            {passwordError && (
              <p className="mt-1 text-sm text-red-500">{passwordError}</p>
            )}
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Delete Dialog with soft/hard delete options (Superadmin only for hard delete)
interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (hardDelete: boolean) => void;
  itemName: string;
  itemType: string;
  canHardDelete: boolean; // Only superadmin
  isLoading?: boolean;
}

export function DeleteDialog({
  isOpen,
  onClose,
  onDelete,
  itemName,
  itemType,
  canHardDelete,
  isLoading = false,
}: DeleteDialogProps) {
  const [step, setStep] = useState<'choose' | 'confirm_hard'>('choose');

  const handleClose = () => {
    setStep('choose');
    onClose();
  };

  const handleSoftDelete = () => {
    onDelete(false);
    handleClose();
  };

  const handleHardDeleteClick = () => {
    setStep('confirm_hard');
  };

  const handleConfirmHardDelete = () => {
    onDelete(true);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" showCloseButton={false}>
      {step === 'choose' ? (
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-brand-slate-900 mb-2">
            Delete {itemType}
          </h3>
          <p className="text-brand-grey-500 mb-6">
            <span className="font-medium text-brand-slate-700">{itemName}</span>
          </p>
          
          {canHardDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-brand-grey-400 mb-4">How would you like to delete this {itemType.toLowerCase()}?</p>
              
              <button
                onClick={handleSoftDelete}
                disabled={isLoading}
                className="w-full p-4 border-2 border-amber-200 bg-amber-50 rounded-xl text-left hover:border-amber-400 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">Archive (Keep in database)</p>
                    <p className="text-sm text-amber-600">Hidden from view but can be recovered later</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={handleHardDeleteClick}
                disabled={isLoading}
                className="w-full p-4 border-2 border-red-200 bg-red-50 rounded-xl text-left hover:border-red-400 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-red-800">Delete Permanently</p>
                    <p className="text-sm text-red-600">Remove completely, cannot be recovered</p>
                  </div>
                </div>
              </button>
              
              <Button variant="secondary" onClick={handleClose} className="w-full mt-4">
                Cancel
              </Button>
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
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Are you absolutely sure?
          </h3>
          <p className="text-brand-grey-500 mb-2">
            This will permanently delete <span className="font-medium text-brand-slate-700">{itemName}</span>
          </p>
          <p className="text-sm text-red-600 mb-6">
            This action cannot be undone. All associated data will be lost forever.
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setStep('choose')}>Go Back</Button>
            <Button variant="danger" onClick={handleConfirmHardDelete} isLoading={isLoading}>
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
