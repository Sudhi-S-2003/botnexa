'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ChatResponse } from '../../../lib/api';
import {
  Bot,
  Send,
  User,
  ChevronDown,
  ChevronUp,
  Lock,
  Key,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface PublicMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    chunkId: string;
    snippet: string;
    similarity: number;
  }>;
  createdAt: string;
}

interface AssistantLinkInfo {
  name: string;
  description: string;
  avatarUrl?: string;
  welcomeMessage?: string;
  mode?: string;
  isPublic?: boolean;
  isProtected?: boolean;
  isPrivate?: boolean;
  requiresAuth?: boolean;
  requiresToken?: boolean;
  userPermission?: 'chat' | 'view' | 'none';
  authenticatedUser?: { userId: string; email: string; role?: string } | null;
}

const PublicMessageBubble = React.memo(function PublicMessageBubble({
  message,
  index,
  isCitationsOpen,
  onToggleCitations,
}: {
  message: PublicMessage;
  index: number;
  isCitationsOpen: boolean;
  onToggleCitations: (index: number) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      key={message.id}
      className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-md bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0 text-xs font-bold mt-0.5">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}

      <div className="space-y-1.5 max-w-xl">
        <div
          className={`rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-xs'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="pt-0.5">
            <button
              onClick={() => onToggleCitations(index)}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
            >
              <span>{message.citations.length} verified citation{message.citations.length > 1 ? 's' : ''}</span>
              {isCitationsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isCitationsOpen && (
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5 mt-1 text-[11px] font-mono text-zinc-300">
                {message.citations.map((c, cIdx) => (
                  <div key={cIdx} className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
                    <p className="text-zinc-300 leading-relaxed">{c.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function PublicChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawSlug = (params?.slug as string) || '';
  const slug = decodeURIComponent(rawSlug).trim().replace(/\s+/g, '-');

  const [currentToken, setCurrentToken] = useState<string>(searchParams.get('token') || '');
  const [assistantInfo, setAssistantInfo] = useState<AssistantLinkInfo | null>(null);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCitationsIndex, setOpenCitationsIndex] = useState<number | null>(null);

  // Authentication State for Private Link Gate
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Protected Gate Token Input State
  const [tokenInput, setTokenInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadLinkMetadata = async (tokenOverride?: string) => {
    if (!slug) return;
    try {
      setInitialLoading(true);
      setError(null);
      const activeToken = tokenOverride !== undefined ? tokenOverride : currentToken;
      const info = await api.getPublicAssistantInfo(slug, activeToken);
      setAssistantInfo(info);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load assistant.');
      } else {
        setError('Failed to load assistant.');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadLinkMetadata();
  }, [slug]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword || authLoading) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      await api.login({ email: authEmail.trim(), password: authPassword });
      // Re-fetch assistant info with the newly stored session JWT
      await loadLinkMetadata();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message || 'Invalid email or password.');
      } else {
        setAuthError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;
    setCurrentToken(token);
    await loadLinkMetadata(token);
  };

  const handleSignOut = () => {
    api.clearToken();
    setAssistantInfo((prev) =>
      prev
        ? {
            ...prev,
            authenticatedUser: null,
            userPermission: 'none',
            requiresAuth: true,
          }
        : null
    );
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loading || !slug) return;

    // Check if user has permission to chat
    if (assistantInfo?.userPermission !== 'chat') {
      setError('You do not have permission to send messages on this link.');
      return;
    }

    setError(null);
    setInputText('');

    const userMsg: PublicMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: ChatResponse = await api.sendPublicChatMessage(slug, {
        message: text,
        conversationId,
        token: currentToken || undefined,
      });

      if (res.conversationId) {
        setConversationId(res.conversationId);
      }

      const replyContent = res.message?.content || (res as any)?.reply || 'Response received.';
      const asstMsg: PublicMessage = {
        id: res.message?.id || (res as any)?.messageId || `asst-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        citations: res.citations || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while formulating the response.');
      } else {
        setError('An error occurred while formulating the response.');
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

  const handleToggleCitations = React.useCallback((idx: number) => {
    setOpenCitationsIndex((curr) => (curr === idx ? null : idx));
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-mono">Connecting to assistant...</p>
        </div>
      </div>
    );
  }

  // Error State: Assistant link not found or disabled
  if (!assistantInfo && error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-zinc-100">Unable to Connect to Assistant</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {error}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              variant="secondary"
              size="md"
              onClick={() => loadLinkMetadata()}
            >
              Try Again
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => { window.location.href = '/dashboard/assistants'; }}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 1. GATE 1: PRIVATE LINK AUTHENTICATION GATE
  // If the link is strictly Private and visitor is not authenticated yet
  if (assistantInfo?.requiresAuth && !assistantInfo.authenticatedUser) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-100">Private Assistant Gate</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This assistant is restricted to authenticated workspace members. Sign in with your BotNexa credentials to access this chat.
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-300">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-300">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={authLoading || !authEmail.trim() || !authPassword}
            >
              {authLoading ? 'Authenticating...' : 'Sign In & Access Assistant'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // 2. GATE 2: PROTECTED LINK TOKEN GATE
  // If the link is Protected by pre-shared token and token is missing or invalid
  if (assistantInfo?.requiresToken) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Key className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-zinc-100">Protected Assistant Security Gate</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This assistant is token-protected. Please enter your pre-shared secret access token to continue.
            </p>
          </div>
          <form onSubmit={handleTokenSubmit} className="space-y-3">
            <input
              type="text"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste security token here..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-100 font-mono text-center placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={!tokenInput.trim()}
            >
              Unlock Assistant
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // 3. GATE 3: ACCESS DENIED (Authenticated but Non-member / No Permission)
  if (assistantInfo?.userPermission === 'none') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-zinc-100">Private Assistant — Access Denied</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {assistantInfo.authenticatedUser ? (
                <>
                  You are signed in as <span className="text-zinc-200 font-mono">{assistantInfo.authenticatedUser.email}</span>, but your account is not a member of the workspace owning this assistant.
                </>
              ) : (
                'You do not have permission to access this private assistant.'
              )}
            </p>
          </div>
          {assistantInfo.authenticatedUser && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleSignOut}
              className="w-full justify-center"
              icon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign In with Different Account
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isViewOnly = assistantInfo?.userPermission === 'view';

  // 4. MAIN CHAT INTERFACE (For 'chat' and 'view' permissions)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Standalone Brand & Assistant Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 text-xs font-semibold shrink-0">
            {assistantInfo?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold text-zinc-100 leading-tight">
                {assistantInfo?.name || 'AI Assistant'}
              </h1>
              {assistantInfo?.isPrivate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800/80 text-blue-400 font-mono">
                  Private
                </span>
              )}
              {assistantInfo?.isProtected && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800/80 text-amber-400 font-mono">
                  Protected
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
              {assistantInfo?.description || 'Grounded support assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isViewOnly ? (
            <span className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
              <Lock className="w-3 h-3" />
              View-Only
            </span>
          ) : assistantInfo?.isPrivate ? (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authorized
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          )}

          {assistantInfo?.authenticatedUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <span className="text-[10px] text-zinc-400 font-mono hidden md:inline truncate max-w-[120px]">
                {assistantInfo.authenticatedUser.email}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out of private assistant"
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="text-[11px] text-zinc-500 hidden sm:inline">•</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider hidden sm:inline">
            Powered by BotNexa
          </span>
        </div>
      </header>

      {/* Message History Stream */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-200">
                {assistantInfo?.welcomeMessage || 'How can I assist you today?'}
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {isViewOnly
                  ? 'You have view-only access to this conversation. You can inspect previous responses and citations.'
                  : 'Send a question below to receive an instant answer grounded in verified knowledge documents.'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <PublicMessageBubble
              key={m.id || idx}
              message={m}
              index={idx}
              isCitationsOpen={openCitationsIndex === idx}
              onToggleCitations={handleToggleCitations}
            />
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
              Formulating grounded answer...
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Composer Input Area */}
      <footer className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md p-4 sticky bottom-0 z-20">
        {isViewOnly ? (
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                You have view-only access to this private assistant. Message sending is disabled for your role.
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
              <textarea
                disabled
                rows={1}
                placeholder="Message sending disabled (View-only role)"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-500 cursor-not-allowed resize-none"
              />
              <Button size="md" variant="primary" disabled icon={<Send className="w-3.5 h-3.5" />}>
                Send
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSend}
            className="max-w-3xl mx-auto flex items-end gap-2.5"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send)"
              disabled={loading}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
            />
            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={!inputText.trim() || loading}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </form>
        )}
      </footer>
    </div>
  );
}

export default function PublicChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-400 font-mono">
          Loading assistant...
        </div>
      }
    >
      <PublicChatContent />
    </Suspense>
  );
}
