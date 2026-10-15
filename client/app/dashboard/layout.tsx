'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { api, Wallet } from '../../lib/api';
import {
  LayoutDashboard,
  Bot,
  Layers,
  MessageSquare,
  Code2,
  Wallet as WalletIcon,
  Key,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Plus,
  Coins,
  ExternalLink,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface NavSection {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Intelligence & Data',
    items: [
      { label: 'Assistants', href: '/dashboard/assistants', icon: Bot },
      { label: 'Knowledge Base', href: '/dashboard/contexts', icon: Layers },
    ],
  },
  {
    title: 'Channels & Testing',
    items: [
      { label: 'Playground', href: '/dashboard/chat', icon: MessageSquare },
      { label: 'Embed & Widget', href: '/dashboard/embed', icon: Code2 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Wallet & Billing', href: '/dashboard/wallet', icon: WalletIcon },
      { label: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Workspace Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeWorkspace, workspaces, setActiveWorkspace, logout, isLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [quickTopUpLoading, setQuickTopUpLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  const loadWallet = React.useCallback(async () => {
    try {
      const data = await api.getWallet();
      setWallet(data);
    } catch {
      // Wallet may be pending init
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      loadWallet();
    }
  }, [activeWorkspace, loadWallet]);

  useEffect(() => {
    const handleWalletUpdated = (e: any) => {
      if (e.detail?.wallet) {
        setWallet((prev) => ({
          ...(prev || {}),
          ...e.detail.wallet,
        } as Wallet));
      } else {
        loadWallet();
      }
    };

    window.addEventListener('botnexa:wallet-updated', handleWalletUpdated as EventListener);
    return () => {
      window.removeEventListener('botnexa:wallet-updated', handleWalletUpdated as EventListener);
    };
  }, [loadWallet]);

  const handleQuickTopUp = React.useCallback(async () => {
    try {
      setQuickTopUpLoading(true);
      await api.topUpWallet({ amountMinor: 5000 }); // ₹50 trial topup
      await loadWallet();
    } catch (err) {
      console.error('Failed to quick top up:', err);
    } finally {
      setQuickTopUpLoading(false);
    }
  }, [loadWallet]);

  const formattedBalance = React.useMemo(() => {
    if (!wallet) return '₹0.00';
    const bal = Number(wallet.balance ?? 0);
    const res = Number(wallet.reservedAmount ?? 0);
    const diff = bal - res;
    return isNaN(diff) ? '₹0.00' : `₹${(Math.max(0, diff) / 100).toFixed(2)}`;
  }, [wallet]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-zinc-500 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-mono">Authenticating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative w-6 h-6 rounded-md overflow-hidden border border-zinc-700">
            <Image src="/botnexa-icon.jpg" alt="BotNexa" fill className="object-cover" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">BotNexa</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 text-[11px] font-mono text-zinc-200 border border-zinc-700/60"
          >
            <span>{formattedBalance}</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Primary Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'block fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-4' : 'hidden'
        } md:flex flex-col w-full md:w-60 lg:w-64 bg-zinc-900/60 border-r border-zinc-800/80 md:sticky md:top-0 md:h-screen z-30 select-none`}
      >
        {mobileMenuOpen && (
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800 md:hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Navigation</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Brand & Workspace Header */}
        <div className="p-3.5 border-b border-zinc-800/80">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 mb-3 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="relative w-7 h-7 rounded-md overflow-hidden border border-zinc-700 shrink-0">
              <Image src="/botnexa-icon.jpg" alt="BotNexa Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-100 tracking-tight">BotNexa</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Enterprise AI Engine</p>
            </div>
          </Link>

          {/* Workspace Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
              className="w-full px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-300 font-semibold shrink-0">
                  {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {activeWorkspace?.name || 'Workspace'}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            </button>

            {wsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-1 z-50">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2 py-1">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setWsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      activeWorkspace?.id === ws.id
                        ? 'bg-blue-600/10 text-blue-400 font-medium'
                        : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {activeWorkspace?.id === ws.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grouped Navigation List */}
        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1">
                {section.title}
              </div>
              {section.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Operational Wallet Glance in Sidebar */}
        <div className="p-3 border-t border-zinc-800/80">
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                <Coins className="w-3.5 h-3.5 text-zinc-400" />
                Available Balance
              </span>
              <span className="text-xs font-semibold font-mono text-emerald-400">
                {formattedBalance}
              </span>
            </div>
            <button
              onClick={handleQuickTopUp}
              disabled={quickTopUpLoading}
              className="w-full py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              <span>{quickTopUpLoading ? 'Processing...' : 'Quick Top-Up (+₹50)'}</span>
            </button>
          </div>
        </div>

        {/* User Identity & Logout Footer */}
        <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out of account"
            className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Stage */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Compact Header Bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/40 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-400">Workspace</span>
            <span className="text-xs text-zinc-500">/</span>
            <span className="text-xs font-medium text-zinc-200">{activeWorkspace?.name || 'Workspace'}</span>
            <Badge variant="neutral" size="xs">
              {user?.role || 'OWNER'}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/botnexa-api/api-docs"
              target="_blank"
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
            >
              <FileText className="w-3 h-3 text-zinc-400" />
              <span>Swagger API</span>
              <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
            </Link>

            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <span className="text-[11px] text-zinc-400">Balance:</span>
              <span className="text-xs font-mono font-medium text-emerald-400">
                {formattedBalance}
              </span>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <div className={`flex-1 flex flex-col min-w-0 ${pathname === '/dashboard/chat' ? 'p-0 h-[calc(100vh-3.25rem)] overflow-hidden w-full' : 'p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
