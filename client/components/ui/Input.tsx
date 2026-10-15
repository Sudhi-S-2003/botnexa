import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      hint,
      prefixIcon,
      suffixIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3 text-zinc-400 pointer-events-none flex items-center">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`w-full text-xs rounded-lg bg-zinc-900 border text-zinc-100 placeholder:text-zinc-500 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:bg-zinc-950 ${
              prefixIcon ? 'pl-9' : 'pl-3'
            } ${suffixIcon ? 'pr-9' : 'pr-3'} py-2 h-9 ${
              error ? 'border-rose-700/80 focus-visible:outline-rose-500' : 'border-zinc-800 hover:border-zinc-700'
            } ${className}`}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3 text-zinc-400 flex items-center">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
        {hint && !error && <p className="text-[11px] text-zinc-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
