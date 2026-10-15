'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { api, ApiKeyItem, Assistant } from '../../../lib/api';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Globe,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { CodeBlock } from '../../../components/ui/CodeBlock';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ApiKeysPage() {
  const { activeWorkspace } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'curl' | 'node' | 'python'>('curl');

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const [keys, assts] = await Promise.all([
        api.listApiKeys(),
        api.listAssistants(),
      ]);
      setApiKeys(keys);
      setAssistants(assts);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      setSubmitting(true);
      setCreateError(null);
      const res = await api.createApiKey({ name: keyName.trim() });
      const secret = res.secretKey || (res as any).rawSecret || (res as any).key;
      setGeneratedSecret(secret);
      setKeyName('');
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to create key:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create key';
      setCreateError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      setActionError(null);
      await api.revokeApiKey(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to revoke key:', err);
      const msg = err instanceof Error ? err.message : 'Failed to revoke key';
      setActionError(msg);
    }
  };

  const sampleKey = apiKeys[0]?.keyPrefix ? `${apiKeys[0].keyPrefix}...` : 'bnx_live_sk_example_key';
  const sampleAssistantId = assistants[0]?.id || 'your-assistant-uuid';

  const curlExample = `curl -X POST "https://botnexa.onrender.com/botnexa-api/developer/v1/chat/completions" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "assistantId": "${sampleAssistantId}",
    "message": "What is your refund policy?",
    "stream": false
  }'`;

  const nodeExample = `import fetch from 'node-fetch';

const response = await fetch('https://botnexa.onrender.com/botnexa-api/developer/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${sampleKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    assistantId: '${sampleAssistantId}',
    message: 'Explain your SLA guidelines.',
  }),
});

const data = await response.json();
console.log(data.reply);`;

  const pythonExample = `import requests

url = "https://botnexa.onrender.com/botnexa-api/developer/v1/chat/completions"
headers = {
    "Authorization": "Bearer ${sampleKey}",
    "Content-Type": "application/json"
}
payload = {
    "assistantId": "${sampleAssistantId}",
    "message": "How do you calculate token metering?"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json()["reply"])`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">API Keys & Developer Platform</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage server-side secret keys to query AI assistants programmatically via REST API.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            setGeneratedSecret(null);
            setKeyName('');
            setCreateError(null);
            setModalOpen(true);
          }}
        >
          Create API Key
        </Button>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-medium px-2 py-0.5 rounded hover:bg-rose-900/40"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Master API Keys vs. Client Embed Tokens</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed max-w-2xl">
            API keys shown here are <span className="text-zinc-200 font-medium">server-side credentials</span> that carry full billing authority for your workspace. Never expose them in frontend React code. For public browsers and mobile apps, use short-lived signed tokens generated via the Embed Studio.
          </p>
        </div>
        <a
          href="/botnexa-api/api-docs"
          target="_blank"
          className="shrink-0"
        >
          <Button size="xs" variant="secondary" icon={<ExternalLink className="w-3 h-3" />}>
            Swagger Docs
          </Button>
        </a>
      </div>

      {/* API Keys Table */}
      {loading ? (
        <div className="py-12 flex justify-center text-xs text-zinc-400 font-mono">
          Loading credentials...
        </div>
      ) : apiKeys.length === 0 ? (
        <EmptyState
          icon={<Key className="w-5 h-5" />}
          title="No API keys provisioned"
          description="Generate a secret API key to query your conversational assistants from your backend applications."
          action={
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setGeneratedSecret(null);
                setKeyName('');
                setCreateError(null);
                setModalOpen(true);
              }}
            >
              Create First API Key
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Key Mask</th>
                  <th className="py-3 px-4">Rate Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-zinc-100">
                      {k.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">
                      <span>{k.keyPrefix}</span>
                      <span className="text-zinc-600">••••••••••••••••</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {k.rateLimitPerMinute} req/min
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={k.status === 'active' ? 'success' : 'error'}
                        size="xs"
                        dot
                      >
                        {k.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {k.status === 'active' && (
                        <button
                          onClick={() => setDeleteConfirmId(k.id)}
                          className="px-2 py-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-[11px] font-medium transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Developer Integration Code Examples */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>REST API Implementation Examples</CardTitle>
            <CardDescription>
              Execute conversational inference with automated RAG context retrieval and token accounting.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Format Tabs */}
          <div className="flex border-b border-zinc-800 text-xs">
            {[
              { key: 'curl', label: 'cURL' },
              { key: 'node', label: 'Node.js (Fetch)' },
              { key: 'python', label: 'Python (Requests)' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3.5 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'curl' && (
            <CodeBlock code={curlExample} language="bash" filename="Terminal" />
          )}

          {activeTab === 'node' && (
            <CodeBlock code={nodeExample} language="javascript" filename="chatClient.js" />
          )}

          {activeTab === 'python' && (
            <CodeBlock code={pythonExample} language="python" filename="chat_client.py" />
          )}
        </CardContent>
      </Card>

      {/* Create Key Modal Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={generatedSecret ? 'API Key Created' : 'Create New API Key'}
        description={
          generatedSecret
            ? 'Make sure to copy your secret key now. You will not be able to see it again.'
            : 'Enter an identifier name for your API key to track programmatic usage.'
        }
        maxWidth="md"
        footer={
          generatedSecret ? (
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={submitting}
                onClick={handleCreate}
              >
                Generate Key
              </Button>
            </>
          )
        }
      >
        {generatedSecret ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>One-Time Secret Disclosure</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                For security reasons, this key will never be shown again. Store it securely in your environment variables or key vault.
              </p>
            </div>

            <CodeBlock
              code={generatedSecret}
              language="text"
              filename="API Secret Key"
            />
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            {createError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{createError}</span>
              </div>
            )}
            <Input
              label="Key Identifier Name"
              placeholder="e.g. Production Backend Service"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
            <p className="text-[11px] text-zinc-400">
              Keys are provisioned with default 120 req/min rate limits and linked directly to workspace billing.
            </p>
          </form>
        )}
      </Dialog>

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleRevoke(deleteConfirmId);
        }}
        title="Revoke API Key"
        description="Are you sure you want to revoke this API key? Applications using this credential will immediately be denied access. This operation is permanent and cannot be undone."
        itemName={apiKeys.find((k) => k.id === deleteConfirmId)?.keyPrefix ? `Key Prefix: ${apiKeys.find((k) => k.id === deleteConfirmId)?.keyPrefix}••••` : undefined}
        confirmText="Revoke Secret Key"
      />
    </div>
  );
}
