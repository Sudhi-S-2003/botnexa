'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Bot, RotateCcw } from 'lucide-react';

interface EmbedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function EmbedChatContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [assistantInfo, setAssistantInfo] = useState<{
    name: string;
    description: string;
    welcomeMessage?: string;
  } | null>(null);
  const [messages, setMessages] = useState<EmbedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    async function loadInfo() {
      if (!token) {
        setError('Missing or invalid embed authorization token.');
        setInitialLoading(false);
        return;
      }

      try {
        setInitialLoading(true);
        const res = await fetch(`/botnexa-api/developer/v1/embed/info?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || 'Failed to load assistant configuration');
        }

        const data = json.data;
        setAssistantInfo(data);

        if (data.welcomeMessage) {
          setMessages([
            {
              id: 'welcome-msg',
              role: 'assistant',
              content: data.welcomeMessage,
            },
          ]);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Could not connect to assistant.');
        }
      } finally {
        setInitialLoading(false);
      }
    }

    loadInfo();
  }, [token]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loading || !token) return;

    setError(null);
    setInputText('');

    const userMsg: EmbedMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/botnexa-api/developer/v1/embed/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token,
          message: text,
          conversationId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Inference error');
      }

      const reply = json.data?.reply || json.reply || json.data?.message?.content || json.message || 'Response received.';
      const convId = json.data?.conversationId || json.conversationId;
      if (convId) {
        setConversationId(convId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: reply,
        },
      ]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to send message.');
      } else {
        setError('Failed to send message.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleReset = () => {
    setMessages(
      assistantInfo?.welcomeMessage
        ? [
            {
              id: 'welcome-msg',
              role: 'assistant',
              content: assistantInfo.welcomeMessage,
            },
          ]
        : []
    );
    setConversationId(undefined);
    setError(null);
  };

  if (initialLoading) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[11px] text-zinc-400 font-mono">Initializing assistant...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden antialiased font-sans">
      {/* Compact Iframe Header */}
      <header className="px-3.5 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xs font-semibold text-zinc-100 truncate leading-tight">
              {assistantInfo?.name || 'Support Assistant'}
            </h1>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reset conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Messages Thread */}
      <main className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-xs'
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Composer */}
      <footer className="p-2.5 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default function EmbedChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-400 font-mono">
          Loading widget...
        </div>
      }
    >
      <EmbedChatContent />
    </Suspense>
  );
}
