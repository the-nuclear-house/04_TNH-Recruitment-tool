import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  isSearch?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      isSearch = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasLeftIcon = leftIcon || isSearch;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-brand-slate-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {hasLeftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-grey-400">
              {isSearch ? <Search className="h-4 w-4" /> : leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5 rounded-lg border bg-white text-brand-slate-900 
              placeholder:text-brand-grey-400 
              focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan 
              transition-all duration-200
              disabled:bg-brand-grey-100 disabled:cursor-not-allowed
              ${hasLeftIcon ? 'pl-11' : ''}
              ${error 
                ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' 
                : 'border-brand-grey-200'
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-brand-grey-400">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
