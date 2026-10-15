'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, Info, X, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmModalProps {
  /** Controls modal visibility */
  open: boolean;
  /** Callback fired when user closes or cancels */
  onClose: () => void;
  /** Callback fired when user confirms the action (can return a Promise for auto-loading) */
  onConfirm: () => any;
  /** Modal headline title (e.g. "Delete Assistant", "Revoke API Key") */
  title: string;
  /** Detailed consequence or explanation */
  description?: React.ReactNode;
  /** Semantic variant affecting icons, colors, and confirm button style */
  variant?: 'destructive' | 'warning' | 'info';
  /** Text for the confirm button (defaults to "Delete" for destructive, "Confirm" for others) */
  confirmText?: string;
  /** Text for the cancel button (defaults to "Cancel") */
  cancelText?: string;
  /** Optional name or label of the item being affected, shown in a highlighted chip */
  itemName?: string;
  /** Custom icon override */
  icon?: React.ReactNode;
  /** If provided, user must type this exact text before confirm is enabled */
  requireConfirmationText?: string;
  /** Explicit loading state if parent handles async operation */
  loading?: boolean;
  /** Dialog maximum width */
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'destructive',
  confirmText,
  cancelText = 'Cancel',
  itemName,
  icon,
  requireConfirmationText,
  loading: externalLoading = false,
  maxWidth = 'sm',
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [userInputText, setUserInputText] = useState('');

  const isLoading = externalLoading || internalLoading;

  // Reset challenge text input when modal opens or closes
  useEffect(() => {
    if (open) {
      setUserInputText('');
      setInternalLoading(false);
    }
  }, [open]);

  // Handle Escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isLoading]);

  if (!open) return null;

  const handleConfirmClick = async () => {
    if (isLoading) return;
    if (requireConfirmationText && userInputText !== requireConfirmationText) return;

    try {
      setInternalLoading(true);
      const result = onConfirm();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const isConfirmDisabled =
    isLoading || (!!requireConfirmationText && userInputText !== requireConfirmationText);

  const defaultConfirmText =
    confirmText || (variant === 'destructive' ? 'Permanently Delete' : 'Confirm Action');

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
  }[maxWidth];

  const variantConfig = {
    destructive: {
      badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      defaultIcon: <Trash2 className="w-5 h-5" />,
      buttonVariant: 'destructive' as const,
      borderAccent: 'border-zinc-800',
    },
    warning: {
      badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      defaultIcon: <AlertTriangle className="w-5 h-5" />,
      buttonVariant: 'secondary' as const,
      borderAccent: 'border-zinc-800',
    },
    info: {
      badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      defaultIcon: <Info className="w-5 h-5" />,
      buttonVariant: 'primary' as const,
      borderAccent: 'border-zinc-800',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Surface */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className={`relative w-full ${maxWidthClasses} bg-zinc-900 border ${variantConfig.borderAccent} rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${variantConfig.badgeClass}`}
            >
              {icon || variantConfig.defaultIcon}
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <h2 id="confirm-modal-title" className="text-sm font-semibold text-zinc-100 leading-snug">
                {title}
              </h2>
              {description && (
                <div id="confirm-modal-description" className="text-xs text-zinc-400 leading-relaxed">
                  {description}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              title="Close modal"
              className="p-1 -mr-1 -mt-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Item Identifier Highlight (e.g. assistant name, context doc name) */}
          {itemName && (
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-300">
              <span className="text-zinc-500 text-[11px]">Selected Item:</span>
              <span className="text-zinc-200 font-semibold truncate max-w-[240px] sm:max-w-[300px]">
                {itemName}
              </span>
            </div>
          )}

          {/* Strict Type-to-Confirm Challenge */}
          {requireConfirmationText && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] text-zinc-400">
                To confirm this critical action, please type{' '}
                <span className="text-zinc-100 font-mono font-semibold select-all">
                  {requireConfirmationText}
                </span>{' '}
                below:
              </label>
              <input
                type="text"
                value={userInputText}
                onChange={(e) => setUserInputText(e.target.value)}
                placeholder={requireConfirmationText}
                disabled={isLoading}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={variantConfig.buttonVariant}
            size="sm"
            onClick={handleConfirmClick}
            disabled={isConfirmDisabled}
            loading={isLoading}
          >
            {defaultConfirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export both ConfirmModal and ConfirmDialog for developer convenience
export const ConfirmDialog = ConfirmModal;
