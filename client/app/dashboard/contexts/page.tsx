'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { api, ContextSummary, ContextChunk } from '../../../lib/api';
import {
  Layers,
  Plus,
  FileText,
  Trash2,
  Eye,
  Database,
  Search,
  Edit2,
  Check,
  X,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { EmptyState } from '../../../components/ui/EmptyState';

const SAMPLE_KNOWLEDGE = `BotNexa Enterprise Support & SLA Policy

Refund Policy:
Customers may request a full refund of unreserved prepaid wallet balances within 14 days of account top-up. Funds consumed by AI inference generations or dense pgvector embedding computations cannot be refunded.

Support SLA Guidelines:
- Standard Tier: Email support with guaranteed responses within 24 business hours.
- Enterprise Tier: 99.9% uptime SLA, dedicated communication channel, and responses within 1 hour for critical incidents.

Technical Architecture:
BotNexa utilizes PostgreSQL 16 with the pgvector extension for dense vector storage and cosine similarity retrieval. Vector embeddings are generated using Google Gemini. All wallet balance operations use atomic two-phase reservations with pessimistic row locking.`;

export default function ContextsPage() {
  const { activeWorkspace } = useAuth();
  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteChunkConfirmId, setDeleteChunkConfirmId] = useState<string | null>(null);

  // Ingestion Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chunk Inspector State
  const [inspectingContext, setInspectingContext] = useState<ContextSummary | null>(null);
  const [chunks, setChunks] = useState<ContextChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [newChunkContent, setNewChunkContent] = useState('');
  const [showAddChunk, setShowAddChunk] = useState(false);
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editChunkContent, setEditChunkContent] = useState('');
  const [chunkActionLoading, setChunkActionLoading] = useState(false);

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const data = await api.listContexts();
      setContexts(data);
    } catch (err) {
      console.error('Failed to load contexts:', err);
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
      setError('Please provide a knowledge source name.');
      return;
    }
    if (!rawText.trim()) {
      setError('Please provide document text content to vectorize.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await api.createContext({
        name: name.trim(),
        description: description.trim(),
        rawText: rawText.trim(),
        sourceType: 'text',
      });
      setModalOpen(false);
      setName('');
      setDescription('');
      setRawText('');
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to ingest knowledge');
      } else {
        setError('Failed to ingest knowledge');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenInspector = async (context: ContextSummary) => {
    setInspectingContext(context);
    setChunksLoading(true);
    setShowAddChunk(false);
    setEditingChunkId(null);
    try {
      const data = await api.getContextChunks(context.id);
      setChunks(data);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setChunksLoading(false);
    }
  };

  const handleAddChunk = async () => {
    if (!inspectingContext || !newChunkContent.trim()) return;
    setChunkActionLoading(true);
    try {
      await api.createChunk(inspectingContext.id, newChunkContent.trim());
      setNewChunkContent('');
      setShowAddChunk(false);
      const data = await api.getContextChunks(inspectingContext.id);
      setChunks(data);
      await loadData();
    } catch (err) {
      console.error('Failed to add chunk:', err);
    } finally {
      setChunkActionLoading(false);
    }
  };

  const handleSaveEditChunk = async (chunkId: string) => {
    if (!inspectingContext || !editChunkContent.trim()) return;
    setChunkActionLoading(true);
    try {
      await api.updateChunk(inspectingContext.id, chunkId, editChunkContent.trim());
      setEditingChunkId(null);
      const data = await api.getContextChunks(inspectingContext.id);
      setChunks(data);
    } catch (err) {
      console.error('Failed to update chunk:', err);
    } finally {
      setChunkActionLoading(false);
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    if (!inspectingContext) return;
    setChunkActionLoading(true);
    try {
      await api.deleteChunk(inspectingContext.id, chunkId);
      const data = await api.getContextChunks(inspectingContext.id);
      setChunks(data);
      await loadData();
    } catch (err) {
      console.error('Failed to delete chunk:', err);
    } finally {
      setChunkActionLoading(false);
    }
  };

  const handleDeleteContext = async (id: string) => {
    try {
      await api.deleteContext(id);
      setDeleteConfirmId(null);
      if (inspectingContext?.id === id) {
        setInspectingContext(null);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to delete context:', err);
    }
  };

  const filteredChunks = React.useMemo(() => {
    if (!chunkSearch.trim()) return chunks;
    const term = chunkSearch.toLowerCase();
    return chunks.filter((c) => c.content.toLowerCase().includes(term));
  }, [chunks, chunkSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Knowledge Base</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Vectorized business documents, policies, and semantic context used by AI assistants for RAG.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
        >
          Add Knowledge Source
        </Button>
      </div>

      {/* Main Table or Empty State */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-blue-500 rounded-full animate-spin" />
            Loading knowledge base...
          </div>
        </div>
      ) : contexts.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-5 h-5" />}
          title="No documents indexed"
          description="Ingest company policies, FAQs, or manuals into dense pgvector chunks to ground your AI assistants."
          action={
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setError(null);
                setModalOpen(true);
              }}
            >
              Add First Knowledge Source
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/70 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Document / Source</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {contexts.map((ctx) => (
                  <tr key={ctx.id} className="hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div>
                          <p className="font-medium text-zinc-100">{ctx.name}</p>
                          {ctx.description && (
                            <p className="text-[11px] text-zinc-400 truncate max-w-sm">
                              {ctx.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {ctx.sourceType.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {ctx.totalChunks || 0}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          ctx.status === 'ready'
                            ? 'success'
                            : ctx.status === 'processing'
                            ? 'warning'
                            : ctx.status === 'failed'
                            ? 'error'
                            : 'neutral'
                        }
                        size="xs"
                        dot
                      >
                        {ctx.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                      {new Date(ctx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => handleOpenInspector(ctx)}
                        >
                          Inspect Chunks
                        </Button>
                        <button
                          onClick={() => setDeleteConfirmId(ctx.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Delete context"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingest Knowledge Modal Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ingest Business Knowledge Source"
        description="Text will be segmented into semantic chunks and dense pgvector embeddings will be calculated via Gemini."
        maxWidth="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setName('BotNexa Master Support & SLA Policy');
                setDescription('Contains refund policies, support SLAs, and technical architecture specs.');
                setRawText(SAMPLE_KNOWLEDGE);
              }}
            >
              Fill Sample Knowledge
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={submitting}
                onClick={handleCreate}
              >
                Vectorize & Ingest
              </Button>
            </div>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Knowledge Source Name"
              placeholder="e.g. Terms of Service & Refund Guidelines"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Description (Optional)"
              placeholder="e.g. Grounding context for billing and SLA questions"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Textarea
              label="Document Content (Raw Text)"
              rows={8}
              placeholder="Paste product specifications, manuals, FAQs, or support policies here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              hint="Text will be split into dense vector chunks with overlapping sliding windows."
              required
            />
          </div>
        </form>
      </Dialog>

      {/* Granular Chunk Inspector Modal */}
      <Dialog
        open={!!inspectingContext}
        onClose={() => setInspectingContext(null)}
        title={`Knowledge Chunks: ${inspectingContext?.name || ''}`}
        description={`${chunks.length} vectorized chunks stored in PostgreSQL pgvector.`}
        maxWidth="xl"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setInspectingContext(null)}>
            Close Inspector
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Input
                placeholder="Search chunks..."
                value={chunkSearch}
                onChange={(e) => setChunkSearch(e.target.value)}
                prefixIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
            <Button
              size="xs"
              variant="outline"
              icon={<Plus className="w-3 h-3" />}
              onClick={() => setShowAddChunk(!showAddChunk)}
            >
              {showAddChunk ? 'Cancel New Chunk' : 'Add Manual Chunk'}
            </Button>
          </div>

          {/* Inline Add Manual Chunk Form */}
          {showAddChunk && (
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-200">Add Manual Knowledge Chunk</h4>
              <Textarea
                rows={3}
                placeholder="Enter specific factual chunk text to index directly..."
                value={newChunkContent}
                onChange={(e) => setNewChunkContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button size="xs" variant="ghost" onClick={() => setShowAddChunk(false)}>
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="primary"
                  loading={chunkActionLoading}
                  onClick={handleAddChunk}
                >
                  Generate Embedding & Save
                </Button>
              </div>
            </div>
          )}

          {/* Chunk Cards Stream */}
          {chunksLoading ? (
            <div className="py-8 text-center text-xs text-zinc-400 font-mono">
              Loading vector chunks...
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No matching chunks found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {filteredChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-950 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-400 font-semibold">
                        Chunk #{chunk.chunkIndex}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{chunk.content.length} characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingChunkId(chunk.id);
                          setEditChunkContent(chunk.content);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Edit chunk text"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeleteChunkConfirmId(chunk.id)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete chunk"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {editingChunkId === chunk.id ? (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        rows={3}
                        value={editChunkContent}
                        onChange={(e) => setEditChunkContent(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditingChunkId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          variant="primary"
                          loading={chunkActionLoading}
                          onClick={() => handleSaveEditChunk(chunk.id)}
                        >
                          Save & Recalculate Vector
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Delete Document Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteContext(deleteConfirmId);
        }}
        title="Delete Knowledge Document"
        description="Are you sure you want to delete this document? All associated vector embeddings will be pruned from PostgreSQL. Assistants connected to this document will no longer be able to retrieve information from it."
        itemName={contexts.find((c) => c.id === deleteConfirmId)?.name}
        confirmText="Permanently Delete"
      />

      {/* Delete Chunk Confirmation Modal */}
      <ConfirmModal
        open={!!deleteChunkConfirmId}
        onClose={() => setDeleteChunkConfirmId(null)}
        onConfirm={async () => {
          if (deleteChunkConfirmId) {
            await handleDeleteChunk(deleteChunkConfirmId);
            setDeleteChunkConfirmId(null);
          }
        }}
        title="Delete Knowledge Chunk"
        description="Are you sure you want to delete this specific chunk? Its embedding will be removed from vector similarity searches immediately."
        confirmText="Delete Chunk"
      />
    </div>
  );
}
