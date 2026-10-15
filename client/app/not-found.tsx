import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, LayoutDashboard, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-app,#090a0f)] text-[var(--text-primary,#ededed)] flex flex-col items-center justify-center px-4 relative">
      <div className="w-full max-w-md bg-[var(--bg-surface,#10121a)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] rounded-xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[var(--border-subtle,rgba(255,255,255,0.12))]">
            <Image
              src="/botnexa-icon.jpg"
              alt="BotNexa"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* 404 Header */}
        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--bg-surface-hover,rgba(255,255,255,0.05))] text-[var(--text-muted,#71717a)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] uppercase tracking-wider">
            Status 404
          </span>
          <h1 className="text-2xl font-semibold text-[var(--text-primary,#ededed)]">
            Page Not Found
          </h1>
          <p className="text-xs text-[var(--text-muted,#71717a)] max-w-sm mx-auto leading-relaxed">
            The page you are looking for does not exist, has been moved, or belongs to another workspace.
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full justify-center">
              <Home className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              Return Home
            </Button>
          </Link>

          <Link href="/dashboard" className="w-full">
            <Button variant="primary" className="w-full justify-center">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="pt-4 border-t border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center gap-5 text-xs text-[var(--text-muted,#71717a)]">
          <Link
            href="/botnexa-api/api-docs"
            target="_blank"
            className="hover:text-[var(--text-primary,#ededed)] flex items-center gap-1.5 transition-colors font-mono"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>API Docs</span>
          </Link>
          <span className="text-[var(--border-subtle,rgba(255,255,255,0.1))]">•</span>
          <Link
            href="/auth/login"
            className="hover:text-[var(--text-primary,#ededed)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
