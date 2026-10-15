import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className = '', label, error, hint, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-zinc-300">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={`w-full appearance-none text-xs rounded-lg bg-zinc-900 border text-zinc-100 pl-3 pr-8 py-2 h-9 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:bg-zinc-950 ${
              error ? 'border-rose-700/80' : 'border-zinc-800 hover:border-zinc-700'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
        {hint && !error && <p className="text-[11px] text-zinc-500">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
