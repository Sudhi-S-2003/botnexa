import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, hint, id, disabled, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-zinc-300">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={`w-full text-xs rounded-lg bg-zinc-900 border text-zinc-100 placeholder:text-zinc-500 p-3 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:bg-zinc-950 resize-y ${
            error ? 'border-rose-700/80 focus-visible:outline-rose-500' : 'border-zinc-800 hover:border-zinc-700'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
        {hint && !error && <p className="text-[11px] text-zinc-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
