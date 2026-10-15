'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { api, Assistant } from '../../../lib/api';
import {
  Code2,
  Copy,
  Check,
  Bot,
  Globe,
  Sliders,
  Play,
  Monitor,
  Send,
  X,
  MessageSquare,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { CodeBlock } from '../../../components/ui/CodeBlock';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function WebsiteEmbedPage() {
  const { activeWorkspace } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(86400); // 24 hours
  const [allowedDomain, setAllowedDomain] = useState<string>('');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'script' | 'iframe' | 'react'>('script');

  // Generated Embed Result
  const [generatedData, setGeneratedData] = useState<{
    token: string;
    expiresAt: string;
    embedUrl: string;
    iframeHtml: string;
    widgetScript: string;
  } | null>(null);

  // Simulation State
  const [simChatOpen, setSimChatOpen] = useState(false);
  const [simMessages, setSimMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Hello! How can I assist you today?',
    },
  ]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!activeWorkspace) return;
      try {
        setLoading(true);
        const assts = await api.listAssistants();
        setAssistants(assts);
        if (assts.length > 0) {
          setSelectedAssistantId(assts[0].id);
        }
      } catch (err) {
        console.error('Failed to load assistants for embed page:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeWorkspace]);

  const handleGenerate = async () => {
    if (!selectedAssistantId) return;

    try {
      setGenerating(true);
      setGenerateError(null);
      const data = await api.generateEmbedToken({
        assistantId: selectedAssistantId,
        expiresInSeconds,
        allowedOrigins: allowedDomain.trim() ? [allowedDomain.trim()] : [],
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://botnexa.onrender.com';
      const embedUrl = `${origin}/embed/chat?token=${encodeURIComponent(data.token)}`;

      const iframeHtml = `<iframe\n  src="${embedUrl}"\n  width="400"\n  height="600"\n  style="border:none;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.3);"\n  allow="clipboard-write"\n></iframe>`;

      const widgetScript = `<!-- BotNexa Floating Chat Widget -->\n<script\n  src="${origin}/embed-widget.js"\n  data-token="${data.token}"\n  data-position="${position}"\n  defer\n></script>`;

      setGeneratedData({
        token: data.token,
        expiresAt: data.expiresAt,
        embedUrl,
        iframeHtml,
        widgetScript,
      });
    } catch (err: unknown) {
      console.error('Error generating embed token:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate signed token';
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSimSend = async () => {
    const text = simInput.trim();
    if (!text || simLoading || !selectedAssistantId) return;

    setSimInput('');
    setSimMessages((prev) => [...prev, { role: 'user', text }]);
    setSimLoading(true);

    try {
      const res = await api.sendChatMessage({
        assistantId: selectedAssistantId,
        message: text,
      });

      setSimMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.message.content },
      ]);
    } catch {
      setSimMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I encountered an issue processing your query.' },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const selectedAssistant = assistants.find((a) => a.id === selectedAssistantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Website Embed & Widget</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure signed client tokens, domain origin limits, and embed codes for customer websites.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-xs text-zinc-400 font-mono">
          Loading embed configuration...
        </div>
      ) : assistants.length === 0 ? (
        <EmptyState
          icon={<Code2 className="w-5 h-5" />}
          title="No assistants available to embed"
          description="Create at least one AI assistant in your workspace before generating embed codes."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration & Output Snippets (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Config Card */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>1. Widget Configuration</CardTitle>
                  <CardDescription>
                    Select the target assistant and security boundaries for client-side embedding.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Target Assistant"
                  value={selectedAssistantId}
                  onChange={(e) => setSelectedAssistantId(e.target.value)}
                >
                  {assistants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.isPublic ? 'Public' : 'Internal'})
                    </option>
                  ))}
                </Select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Token Expiry"
                    value={expiresInSeconds}
                    onChange={(e) => setExpiresInSeconds(parseInt(e.target.value))}
                  >
                    <option value={3600}>1 Hour (Ephemeral testing)</option>
                    <option value={86400}>24 Hours (Daily renewal)</option>
                    <option value={604800}>7 Days (Weekly production)</option>
                    <option value={2592000}>30 Days (Extended production)</option>
                  </Select>

                  <Select
                    label="Widget Position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value as 'bottom-right' | 'bottom-left')}
                  >
                    <option value="bottom-right">Bottom Right Corner</option>
                    <option value="bottom-left">Bottom Left Corner</option>
                  </Select>
                </div>

                <Input
                  label="Allowed Domain (Origin Binding)"
                  placeholder="e.g. https://yourcompany.com"
                  value={allowedDomain}
                  onChange={(e) => setAllowedDomain(e.target.value)}
                  hint="Optional CORS restriction. If left empty, token functions from any origin."
                  prefixIcon={<Globe className="w-3.5 h-3.5" />}
                />

                {generateError && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{generateError}</span>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="primary"
                  loading={generating}
                  onClick={handleGenerate}
                  icon={<Lock className="w-3.5 h-3.5" />}
                >
                  Generate Signed Token & Embed Code
                </Button>
              </CardContent>
            </Card>

            {/* Generated Snippets */}
            {generatedData && (
              <Card className="animate-in fade-in duration-200">
                <CardHeader>
                  <div>
                    <CardTitle>2. Deployment Code</CardTitle>
                    <CardDescription>
                      Copy the snippet below directly into your website template or codebase.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Snippet Format Tabs */}
                  <div className="flex border-b border-zinc-800 text-xs">
                    {[
                      { key: 'script', label: 'HTML Script Tag (Recommended)' },
                      { key: 'iframe', label: 'Iframe Tag' },
                      { key: 'react', label: 'React / Next.js' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveSnippetTab(tab.key as any)}
                        className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                          activeSnippetTab === tab.key
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeSnippetTab === 'script' && (
                    <CodeBlock
                      code={generatedData.widgetScript}
                      language="html"
                      filename="index.html"
                    />
                  )}

                  {activeSnippetTab === 'iframe' && (
                    <CodeBlock
                      code={generatedData.iframeHtml}
                      language="html"
                      filename="iframe-embed.html"
                    />
                  )}

                  {activeSnippetTab === 'react' && (
                    <CodeBlock
                      code={`// BotNexa Chat Widget Integration\nimport Script from 'next/script';\n\nexport default function ChatWidget() {\n  return (\n    <Script\n      src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed-widget.js"\n      data-botnexa-token="${generatedData.token}"\n      data-position="${position}"\n      strategy="lazyOnload"\n    />\n  );\n}`}
                      language="typescript"
                      filename="ChatWidget.tsx"
                    />
                  )}

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                    Token expires: {new Date(generatedData.expiresAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Realistic Live Customer Website Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                Live Host Site Preview
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Interactive</span>
            </div>

            {/* Browser Frame Simulation */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl flex flex-col h-[520px] relative select-none">
              {/* Browser Window Chrome */}
              <div className="px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
                </div>
                <div className="flex-1 max-w-xs mx-auto px-2 py-0.5 rounded bg-zinc-950 text-[10px] font-mono text-zinc-400 border border-zinc-800 truncate text-center">
                  https://acme-store.com
                </div>
              </div>

              {/* Simulated Customer Site Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-zinc-400 bg-zinc-950/60">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <span className="font-bold text-zinc-100 text-sm">ACME Cloud Services</span>
                  <div className="flex gap-2 text-[10px] text-zinc-400">
                    <span>Products</span>
                    <span>Pricing</span>
                    <span>Documentation</span>
                  </div>
                </div>

                <div className="py-4 space-y-2 max-w-sm">
                  <h3 className="text-base font-semibold text-zinc-100">
                    Enterprise Cloud Infrastructure for Developers
                  </h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Deploy performant microservices and serverless workflows in seconds. Need help? Click the assistant icon in the bottom corner.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-[11px]">
                    <span className="font-semibold text-zinc-200">Zero Configuration</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Instant cluster spin-up</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-[11px]">
                    <span className="font-semibold text-zinc-200">Global Anycast</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Sub-20ms edge latency</p>
                  </div>
                </div>
              </div>

              {/* Floating Widget Trigger Button in Preview */}
              <div
                className={`absolute bottom-4 ${
                  position === 'bottom-left' ? 'left-4' : 'right-4'
                } z-20`}
              >
                <button
                  onClick={() => setSimChatOpen(!simChatOpen)}
                  className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
                  title="Open live chat widget"
                >
                  {simChatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </button>
              </div>

              {/* Simulated Floating Chat Window */}
              {simChatOpen && (
                <div
                  className={`absolute bottom-16 ${
                    position === 'bottom-left' ? 'left-4' : 'right-4'
                  } w-80 h-96 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150`}
                >
                  {/* Chat Window Header */}
                  <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-100">
                          {selectedAssistant?.name || 'Support Assistant'}
                        </p>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Online
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSimChatOpen(false)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Chat Messages Stream */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                    {simMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-200 border border-zinc-700/50'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {simLoading && (
                      <div className="text-[10px] text-zinc-500 font-mono italic">
                        Thinking...
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-2 border-t border-zinc-800 bg-zinc-950 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={simInput}
                      onChange={(e) => setSimInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSimSend()}
                      className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSimSend}
                      disabled={!simInput.trim() || simLoading}
                      className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
