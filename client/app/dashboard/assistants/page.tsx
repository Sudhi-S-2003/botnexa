'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { api, Assistant, ContextSummary } from '../../../lib/api';
import {
  Bot,
  Plus,
  MessageSquare,
  Share2,
  Trash2,
  Layers,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function AssistantsPage() {
  const { activeWorkspace } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
    'You are a precise, professional AI customer support specialist for our company. Answer inquiries strictly using the connected business context. If the answer is not present in the sources, politely clarify that you do not have that information.'
  );
  const [model, setModel] = useState('gemini-2.5-flash-lite');
  const [temperature, setTemperature] = useState(0.5);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const [assts, ctxs] = await Promise.all([
        api.listAssistants(),
        api.listContexts(),
      ]);
      setAssistants(assts);
      setContexts(ctxs);
    } catch (err) {
      console.error('Failed to load assistants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please provide an assistant name.');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      await api.createAssistant({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        model,
        temperature,
        maxTokens,
        contextIds: selectedContextIds,
        isPublic,
      });
      setModalOpen(false);
      resetForm();
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message || 'Failed to create assistant');
      } else {
        setFormError('Failed to create assistant');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAssistant(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete assistant:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setInstructions(
      'You are a precise, professional AI customer support specialist for our company. Answer inquiries strictly using the connected business context.'
    );
    setModel('gemini-2.5-flash-lite');
    setTemperature(0.5);
    setMaxTokens(2048);
    setSelectedContextIds([]);
    setIsPublic(true);
    setShowAdvanced(false);
    setFormError(null);
  };

  const handleCopyLink = async (assistant: Assistant) => {
    try {
      let publicUrl = `${window.location.origin}/chat/${assistant.id}`;
      try {
        const linkData = await api.getChatLinkForAssistant(assistant.id);
        if (linkData?.slug) {
          publicUrl = `${window.location.origin}/chat/${linkData.slug}`;
        }
      } catch {
        // Fallback to assistant ID which is also dynamically resolved by backend
      }
      await navigator.clipboard.writeText(publicUrl);
      setCopiedId(assistant.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">AI Assistants</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage conversational agents, prompt directives, and knowledge base associations.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
        >
          Create Assistant
        </Button>
      </div>

      {/* Assistants Content */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-blue-500 rounded-full animate-spin" />
            Loading assistants...
          </div>
        </div>
      ) : assistants.length === 0 ? (
        <EmptyState
          icon={<Bot className="w-5 h-5" />}
          title="No assistants configured"
          description="Create your first conversational assistant to start interacting with your indexed documents."
          action={
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              Create Assistant
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assistants.map((asst) => (
            <Card key={asst.id} className="flex flex-col justify-between">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center font-medium text-xs text-zinc-200">
                      {asst.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-100 leading-tight">
                        {asst.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={asst.isPublic ? 'success' : 'neutral'} size="xs" dot>
                          {asst.isPublic ? 'Public Link' : 'Internal'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    {asst.model || 'gemini-2.5-flash-lite'}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {asst.description || asst.instructions}
                </p>

                {/* Knowledge Binding Chips */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-zinc-400" />
                    Knowledge:
                  </span>
                  <span className="text-zinc-300 font-mono text-[10px]">
                    {asst.contexts && asst.contexts.length > 0
                      ? `${asst.contexts.length} document${asst.contexts.length > 1 ? 's' : ''}`
                      : 'None attached'}
                  </span>
                </div>
              </CardContent>

              {/* Card Footer Actions */}
              <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Link href={`/dashboard/chat?assistantId=${asst.id}`}>
                    <Button size="xs" variant="primary" icon={<MessageSquare className="w-3 h-3" />}>
                      Test
                    </Button>
                  </Link>

                  {asst.isPublic && (
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={copiedId === asst.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      onClick={() => handleCopyLink(asst)}
                      title="Copy public URL"
                    >
                      {copiedId === asst.id ? 'Copied' : 'Share'}
                    </Button>
                  )}
                </div>

                <button
                  onClick={() => setDeleteConfirmId(asst.id)}
                  className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Delete assistant"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Assistant Modal Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New AI Assistant"
        description="Configure instructions, foundation model, and connected business knowledge."
        maxWidth="lg"
        footer={
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
              Deploy Assistant
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Assistant Name"
              placeholder="e.g. BotNexa Support Specialist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Short Description"
              placeholder="e.g. Answers technical questions and refund inquiries"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Textarea
            label="System Instructions (Prompt Directive)"
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            hint="Defines the persona, bounds, and behavioral rules for this assistant."
            required
          />

          {/* Connected Contexts */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              Connect Business Knowledge Sources
            </label>
            {contexts.length === 0 ? (
              <p className="text-[11px] text-zinc-400">
                No knowledge documents indexed yet. You can bind them later in Knowledge Base.
              </p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                {contexts.map((ctx) => (
                  <label
                    key={ctx.id}
                    className="flex items-center gap-2.5 p-1.5 rounded hover:bg-zinc-900 cursor-pointer text-xs select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContextIds.includes(ctx.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContextIds([...selectedContextIds, ctx.id]);
                        } else {
                          setSelectedContextIds(selectedContextIds.filter((id) => id !== ctx.id));
                        }
                      }}
                      className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-900"
                    />
                    <div className="flex items-center justify-between w-full">
                      <span className="text-zinc-200">{ctx.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {ctx.totalChunks || 0} chunks
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Access Policy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <div>
              <p className="text-xs font-medium text-zinc-200">Public Access Link</p>
              <p className="text-[11px] text-zinc-400">
                Allow visitors to chat without signing in using a direct URL or embed widget.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Advanced Model Parameters Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
            >
              <span>{showAdvanced ? 'Hide advanced settings' : 'Show advanced model tuning'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
                <Select
                  label="Foundation Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="gemini-2.5-flash-lite">Google Gemini 2.5 Flash Lite (High Speed, Low Cost)</option>
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Balanced Reasoning)</option>
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Complex Reasoning)</option>
                </Select>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Temperature</span>
                    <span className="text-zinc-400 font-mono">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Precise (0.0)</span>
                    <span>Balanced (0.5)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                <Input
                  label="Max Tokens"
                  type="number"
                  min="256"
                  max="8192"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                />
              </div>
            )}
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId);
        }}
        title="Delete AI Assistant"
        description="Are you sure you want to delete this assistant? Any associated public links and widgets will cease functioning immediately. This operation cannot be undone."
        itemName={assistants.find((a) => a.id === deleteConfirmId)?.name}
        confirmText="Permanently Delete"
      />
    </div>
  );
}
