'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { api, Assistant, ChatResponse, Wallet } from '../../../lib/api';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Coins,
  Download,
  Sparkles,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    chunkId: string;
    snippet: string;
    similarity: number;
    contextId: string;
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    estimatedCostMinor?: number;
    customerChargeMinorUnits?: number;
  };
}

const PlaygroundMessageItem = React.memo(function PlaygroundMessageItem({
  msg,
  index,
  isCitationsOpen,
  onToggleCitations,
}: {
  msg: DisplayMessage;
  index: number;
  isCitationsOpen: boolean;
  onToggleCitations: (index: number) => void;
}) {
  const isUser = msg.role === 'user';
  const totalTokens = Number(msg.usage?.totalTokens || 0);
  const costMinor = Number(msg.usage?.estimatedCostMinor ?? msg.usage?.customerChargeMinorUnits ?? 0);
  const costFormatted =
    !isNaN(costMinor) && costMinor > 0
      ? (costMinor / 100).toFixed(3)
      : totalTokens > 0
        ? (Math.max(1, Math.ceil(totalTokens * 0.0001)) / 100).toFixed(3)
        : '0.001';

  return (
    <div
      key={msg.id || index}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className={`space-y-1.5 ${isUser ? 'max-w-2xl' : 'max-w-3xl w-full'}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-xs shadow-sm ml-auto'
              : 'bg-zinc-900/90 border border-zinc-800/90 text-zinc-100 rounded-bl-xs'
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>

        {/* Assistant Telemetry & Grounding Citations */}
        {!isUser && (
          <div className="space-y-1.5 pt-0.5">
            {/* Token Accounting & Citation Toggle */}
            <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
              <span>
                {totalTokens > 0 ? `${totalTokens} tokens` : 'Standard completion'} • ₹{costFormatted}
              </span>

              {msg.citations && msg.citations.length > 0 && (
                <button
                  onClick={() => onToggleCitations(index)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-sans cursor-pointer"
                >
                  <span>{msg.citations.length} sources retrieved</span>
                  {isCitationsOpen ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            {/* Expandable Citation Drawer */}
            {isCitationsOpen && msg.citations && (
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 mt-1.5 animate-in fade-in duration-150">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Grounding Knowledge Sources (pgvector cosine match)
                </span>
                <div className="space-y-2">
                  {msg.citations.map((cite, cIdx) => (
                    <div
                      key={cite.chunkId || cIdx}
                      className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono">
                        <span>Chunk #{cIdx + 1}</span>
                        <span className="text-emerald-400">
                          {(cite.similarity * 100).toFixed(1)}% similarity
                        </span>
                      </div>
                      <p className="text-zinc-300 font-mono leading-relaxed">
                        {cite.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
});

function LivePlaygroundContent() {
  const searchParams = useSearchParams();
  const initialAssistantId = searchParams.get('assistantId');
  const { activeWorkspace } = useAuth();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCitationsIndex, setOpenCitationsIndex] = useState<number | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Synchronize wallet updates
  useEffect(() => {
    const handleWalletUpdated = (e: any) => {
      if (e.detail?.wallet) {
        setWallet((prev) => ({
          ...(prev || {}),
          ...e.detail.wallet,
        } as Wallet));
      } else {
        api.getWallet().then(setWallet).catch(() => {});
      }
    };

    window.addEventListener('botnexa:wallet-updated', handleWalletUpdated as EventListener);
    return () => {
      window.removeEventListener('botnexa:wallet-updated', handleWalletUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    async function init() {
      if (!activeWorkspace) return;
      try {
        setPageLoading(true);
        const assts = await api.listAssistants();
        setAssistants(assts);

        if (initialAssistantId && assts.some((a) => a.id === initialAssistantId)) {
          setSelectedAssistantId(initialAssistantId);
        } else if (assts.length > 0) {
          setSelectedAssistantId(assts[0].id);
        } else {
          setSelectedAssistantId('');
        }

        const wlt = await api.getWallet();
        setWallet(wlt);
      } catch (err) {
        console.error('Failed to initialize playground:', err);
      } finally {
        setPageLoading(false);
      }
    }
    init();
  }, [activeWorkspace, initialAssistantId]);

  const activeAssistant = assistants.find((a) => a.id === selectedAssistantId);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedAssistantId || loading) return;

    setError(null);
    setInputText('');

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: ChatResponse = await api.sendChatMessage({
        assistantId: selectedAssistantId,
        conversationId,
        message: text,
      });

      if (res.conversationId) {
        setConversationId(res.conversationId);
      }

      const assistantMsg: DisplayMessage = {
        id: res.message.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.message.content,
        citations: res.citations || [],
        usage: res.usage,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh wallet balance
      api.getWallet().then(setWallet).catch(() => {});
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error processing response');
      } else {
        setError('Error processing response');
      }
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
    setOpenCitationsIndex(null);
  };

  const handleExportTranscript = async () => {
    if (messages.length === 0) return;
    const transcriptText = messages
      .map((m) => {
        const costMinor = Number(m.usage?.estimatedCostMinor ?? 0);
        const costStr = !isNaN(costMinor) && costMinor > 0 ? `₹${(costMinor / 100).toFixed(3)}` : '₹0.001';
        return `[${m.role.toUpperCase()}]: ${m.content}${
          m.usage ? `\n(Tokens: ${m.usage.totalTokens || 0} | Cost: ${costStr})` : ''
        }`;
      })
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(transcriptText);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  const handleToggleCitations = React.useCallback((index: number) => {
    setOpenCitationsIndex((curr) => (curr === index ? null : index));
  }, []);

  const formattedBalance = React.useMemo(() => {
    if (!wallet) return '₹0.00';
    const bal = Number(wallet.balance ?? 0);
    const res = Number(wallet.reservedAmount ?? 0);
    const diff = bal - res;
    return isNaN(diff) ? '₹0.00' : `₹${(Math.max(0, diff) / 100).toFixed(2)}`;
  }, [wallet]);

  if (pageLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
        Loading assistant playground...
      </div>
    );
  }

  if (assistants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <EmptyState
          icon={<Bot className="w-6 h-6" />}
          title="No Assistants Found"
          description="Create your first conversational AI assistant to begin testing knowledge grounding and prompt completions."
          action={
            <Link href="/dashboard/assistants">
              <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                Create Assistant
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/60 shrink-0 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-56 sm:w-64 shrink-0">
            <Select
              value={selectedAssistantId}
              onChange={(e) => {
                setSelectedAssistantId(e.target.value);
                handleResetConversation();
              }}
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          {activeAssistant && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 truncate max-w-[140px]">
                {activeAssistant.model}
              </span>
              <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono shrink-0">
                <Layers className="w-3 h-3" />
                {activeAssistant.contexts?.length || 0} ctx
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            <Coins className="w-3 h-3 text-zinc-400" />
            <span className="hidden sm:inline">Balance:</span>
            <span className="text-emerald-400 font-semibold">{formattedBalance}</span>
          </div>

          <Button
            size="xs"
            variant="ghost"
            icon={<RotateCcw className="w-3 h-3" />}
            onClick={() => (messages.length > 0 ? setClearConfirmOpen(true) : handleResetConversation())}
            title="Clear conversation"
          >
            Clear
          </Button>

          <Button
            size="xs"
            variant="ghost"
            icon={<Download className="w-3 h-3" />}
            onClick={handleExportTranscript}
            disabled={messages.length === 0}
            title="Copy conversation transcript"
          >
            {copiedExport ? 'Copied' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto w-full space-y-5">
          {messages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-semibold text-zinc-100">
                  {activeAssistant?.name || 'Prompt Playground'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {activeAssistant?.description ||
                    'Test grounding knowledge citations, system instructions, and real-time token metering in your sandbox.'}
                </p>
              </div>

              {/* Starter Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 w-full max-w-lg">
                {[
                  'What services or products do you offer?',
                  'Summarize your primary policies and SLA.',
                  'Can you explain your pricing and billing structure?',
                  'How does knowledge grounding work?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-3 text-left rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 text-xs text-zinc-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <PlaygroundMessageItem
                key={msg.id || index}
                msg={msg}
                index={index}
                isCitationsOpen={openCitationsIndex === index}
                onToggleCitations={handleToggleCitations}
              />
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-3 rounded-2xl rounded-bl-xs bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Pinned Composer */}
      <div className="border-t border-zinc-800/80 bg-zinc-900/60 px-4 sm:px-6 py-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto w-full flex items-end gap-2.5"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeAssistant?.name || 'Assistant'}... (Press Enter to send, Shift+Enter for new line)`}
              rows={1}
              className="w-full resize-none rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:outline-none px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors leading-relaxed"
              style={{ minHeight: '42px', maxHeight: '140px' }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!inputText.trim() || loading || !selectedAssistantId}
            icon={<Send className="w-3.5 h-3.5" />}
            className="h-[42px] px-4 shrink-0"
          >
            Send
          </Button>
        </form>
      </div>

      {/* Clear Conversation Confirmation Modal */}
      <ConfirmModal
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          handleResetConversation();
          setClearConfirmOpen(false);
        }}
        title="Clear Playground Conversation"
        description="Are you sure you want to clear this active playground conversation? Current responses, token accounting telemetry, and retrieved citations will be reset."
        variant="warning"
        confirmText="Clear Conversation"
        itemName={activeAssistant ? `Assistant: ${activeAssistant.name} (${messages.length} messages)` : undefined}
      />
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
          Loading playground...
        </div>
      }
    >
      <LivePlaygroundContent />
    </Suspense>
  );
}
