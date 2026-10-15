import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-app,#090a0f)] flex flex-col items-center justify-center px-4 relative">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Brand Icon with subtle spinner ring */}
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-[var(--border-subtle,rgba(255,255,255,0.12))] bg-[var(--bg-surface,#10121a)] p-1">
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <Image
                src="/botnexa-icon.jpg"
                alt="BotNexa"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div className="absolute -inset-2 rounded-2xl border border-transparent border-t-blue-500 animate-spin" />
        </div>

        {/* Text indicators */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary,#ededed)] tracking-tight">
            BotNexa
          </h2>
          <p className="text-xs text-[var(--text-muted,#71717a)] font-mono">
            Loading workspace...
          </p>
        </div>
      </div>
    </div>
  );
}
