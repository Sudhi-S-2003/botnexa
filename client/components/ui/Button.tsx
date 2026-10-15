import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500';

    const sizeStyles = {
      xs: 'text-[11px] px-2 py-1 gap-1.5 h-6',
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-xs px-3.5 py-2 gap-2 h-9',
      lg: 'text-sm px-4 py-2.5 gap-2.5 h-10',
    }[size];

    const variantStyles = {
      primary:
        'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm border border-blue-500/20',
      secondary:
        'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-zinc-100 border border-zinc-700/60',
      outline:
        'bg-transparent hover:bg-zinc-800/60 active:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80',
      ghost:
        'bg-transparent hover:bg-zinc-800/60 active:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent',
      destructive:
        'bg-rose-950/40 hover:bg-rose-900/60 active:bg-rose-900 text-rose-300 hover:text-rose-200 border border-rose-800/50',
      subtle:
        'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
