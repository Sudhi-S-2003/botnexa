'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { api, Assistant, ContextSummary, Wallet, AuditLogItem, UsageChartDataPoint } from '../../lib/api';
import {
  Bot,
  Layers,
  Wallet as WalletIcon,
  Plus,
  ArrowRight,
  MessageSquare,
  Activity,
  Code2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { UsageTelemetryChart } from '../../components/dashboard/UsageTelemetryChart';

export default function DashboardOverviewPage() {
  const { user, activeWorkspace } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [telemetryChart, setTelemetryChart] = useState<UsageChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!activeWorkspace) return;
      try {
        setLoading(true);
        const [assts, ctxs, wlt, logs, chart] = await Promise.allSettled([
          api.listAssistants(),
          api.listContexts(),
          api.getWallet(),
          api.getAuditLogs({ limit: 6 }),
          api.getAnalyticsChart(14),
        ]);

        if (assts.status === 'fulfilled') setAssistants(assts.value);
        if (ctxs.status === 'fulfilled') setContexts(ctxs.value);
        if (wlt.status === 'fulfilled') setWallet(wlt.value);
        if (logs.status === 'fulfilled') setAuditLogs(logs.value?.items || []);
        if (chart.status === 'fulfilled') setTelemetryChart(chart.value || []);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();

    const handleWalletUpdated = (e: any) => {
      if (e.detail?.wallet) {
        setWallet((prev) => ({
          ...(prev || {}),
          ...e.detail.wallet,
        } as Wallet));
      }
    };

    window.addEventListener('botnexa:wallet-updated', handleWalletUpdated as EventListener);
    return () => {
      window.removeEventListener('botnexa:wallet-updated', handleWalletUpdated as EventListener);
    };
  }, [activeWorkspace]);

  const totalChunks = React.useMemo(() => {
    return contexts.reduce((acc, c) => acc + (c.totalChunks || 0), 0);
  }, [contexts]);

  const formattedBalance = React.useMemo(() => {
    if (!wallet) return '₹0.00';
    const bal = Number(wallet.balance ?? 0);
    const res = Number(wallet.reservedAmount ?? 0);
    const diff = bal - res;
    return isNaN(diff) ? '₹0.00' : `₹${(Math.max(0, diff) / 100).toFixed(2)}`;
  }, [wallet]);

  const reservedBalance = React.useMemo(() => {
    if (!wallet) return '₹0.00';
    const res = Number(wallet.reservedAmount ?? 0);
    return isNaN(res) ? '₹0.00' : `₹${(res / 100).toFixed(2)}`;
  }, [wallet]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Workspace Overview
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Operational status and telemetry for <span className="text-zinc-200 font-medium">{activeWorkspace?.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/assistants">
            <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}>
              New Assistant
            </Button>
          </Link>
          <Link href="/dashboard/contexts">
            <Button size="sm" variant="secondary" icon={<Layers className="w-3.5 h-3.5" />}>
              Add Knowledge
            </Button>
          </Link>
          <Link href="/dashboard/chat">
            <Button size="sm" variant="primary" icon={<MessageSquare className="w-3.5 h-3.5" />}>
              Open Playground
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational State Cards (3 distinct focus metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assistants */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">AI Assistants</span>
              <Bot className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-100 font-mono">
                {assistants.length}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {assistants.filter((a) => a.isPublic).length} public endpoints active
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between">
              <Link
                href="/dashboard/assistants"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>Manage assistants</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Chunks */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Knowledge Index</span>
              <Layers className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-100 font-mono">
                {totalChunks}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Vectorized chunks across {contexts.length} data sources
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between">
              <Link
                href="/dashboard/contexts"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>Inspect knowledge base</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Available Wallet Balance */}
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Available Credits</span>
              <WalletIcon className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {formattedBalance}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {reservedBalance} currently reserved for inference
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between">
              <Link
                href="/dashboard/wallet"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>View ledger & top up</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inference & Token Telemetry Chart */}
      <UsageTelemetryChart
        chartData={telemetryChart}
        loading={loading}
      />

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Assistants & Deployment (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Active Assistants
            </h2>
            <Link
              href="/dashboard/assistants"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View all ({assistants.length})
            </Link>
          </div>

          {assistants.length === 0 ? (
            <EmptyState
              icon={<Bot className="w-5 h-5" />}
              title="No assistants created yet"
              description="Deploy a conversational assistant connected to Google Gemini and your enterprise documents."
              action={
                <Link href="/dashboard/assistants">
                  <Button size="sm">Create First Assistant</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {assistants.slice(0, 4).map((asst) => (
                <div
                  key={asst.id}
                  className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 font-medium text-xs">
                      {asst.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-100">{asst.name}</span>
                        <Badge variant={asst.isPublic ? 'success' : 'neutral'} size="xs" dot>
                          {asst.isPublic ? 'Public Link' : 'Internal'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">
                        {asst.description || asst.instructions.slice(0, 80) + '...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                      {asst.model || 'gemini-2.5-flash-lite'}
                    </span>
                    <Link href={`/dashboard/chat?assistantId=${asst.id}`}>
                      <Button size="xs" variant="outline">
                        Test in Chat
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Integration Banner */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span>Embed widget on any web page</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Generate signed client tokens with domain origin restriction and copy a 2-line HTML script tag.
              </p>
            </div>
            <Link href="/dashboard/embed" className="shrink-0">
              <Button size="xs" variant="secondary">
                Configure Embed
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: Real Audit Log & Operations Stream (Span 1) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
              <span>Audit Trail</span>
            </h2>
            <span className="text-[10px] text-zinc-400 font-mono">Live</span>
          </div>

          <Card>
            <CardContent className="p-3.5 space-y-3">
              {auditLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">
                  No activity recorded yet
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 pb-2.5 border-b border-zinc-800/60 last:border-b-0 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        Resource: {log.resource}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Platform Spec Card */}
          <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-950 text-xs space-y-2">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              System Architecture
            </div>
            <div className="space-y-1.5 text-[11px] text-zinc-400">
              <div className="flex justify-between">
                <span>LLM Engine</span>
                <span className="text-zinc-200 font-mono">Google Gemini</span>
              </div>
              <div className="flex justify-between">
                <span>Vector Retrieval</span>
                <span className="text-zinc-200 font-mono">pgvector dense</span>
              </div>
              <div className="flex justify-between">
                <span>Tenant Isolation</span>
                <span className="text-zinc-200 font-mono">Workspace RLS</span>
              </div>
              <div className="flex justify-between">
                <span>Metering</span>
                <span className="text-emerald-400 font-mono">Prepaid Escrow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
