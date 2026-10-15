import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'xs' | 'sm';
  dot?: boolean;
}

export function Badge({
  children,
  className = '',
  variant = 'neutral',
  size = 'sm',
  dot = false,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
  }[size];

  const variantStyles = {
    neutral: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    success: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
    warning: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
    error: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
    info: 'bg-blue-950/40 text-blue-300 border-blue-800/50',
    outline: 'bg-transparent text-zinc-400 border-zinc-800',
  }[variant];

  const dotStyles = {
    neutral: 'bg-zinc-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-rose-400',
    info: 'bg-blue-400',
    outline: 'bg-zinc-500',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded border select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles}`} />}
      {children}
    </span>
  );
}
