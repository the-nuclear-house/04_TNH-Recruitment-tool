import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '@/lib/stores/ui-store';

export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
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
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-medium
        min-w-[320px] max-w-[420px] animate-slide-up
        ${backgrounds[type]}
      `}
    >
      {icons[type]}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand-slate-900">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-brand-slate-700">{message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-0.5 text-brand-grey-400 hover:text-brand-slate-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
