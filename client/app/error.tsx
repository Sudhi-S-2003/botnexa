'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-app,#090a0f)] text-[var(--text-primary,#ededed)] flex flex-col items-center justify-center px-4 relative">
      <div className="w-full max-w-md bg-[var(--bg-surface,#10121a)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] rounded-xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
            Application Error
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary,#ededed)]">
            Something went wrong
          </h1>
          <p className="text-xs text-[var(--text-muted,#71717a)]">
            An unexpected error occurred while executing this operation.
          </p>
        </div>

        {error.message && (
          <div className="text-left bg-[var(--bg-app,#090a0f)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] rounded-lg p-3 text-xs font-mono text-red-300 break-words max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => reset()}
            className="w-full justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <Link href="/dashboard" className="w-full">
            <Button variant="primary" className="w-full justify-center">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
