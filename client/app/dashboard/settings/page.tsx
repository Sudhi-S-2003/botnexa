'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { api, WorkspaceMember } from '../../../lib/api';
import {
  Settings,
  Building2,
  Users,
  Copy,
  Check,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

export default function WorkspaceSettingsPage() {
  const { activeWorkspace, workspaces, refreshProfile, user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Workspace Name State
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || '');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (activeWorkspace?.name) {
      setWorkspaceName(activeWorkspace.name);
    }
  }, [activeWorkspace?.name]);

  // New Workspace State
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false);

  // Member Modal State
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadMembers = async () => {
    try {
      setMembersLoading(true);
      const data = await api.getWorkspaceMembers();
      setMembers(data);
    } catch {
      // fallback if member endpoint returns error
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace) {
      loadMembers();
    }
  }, [activeWorkspace]);

  const handleCopyTenantId = async () => {
    if (!activeWorkspace?.id) return;
    try {
      await navigator.clipboard.writeText(activeWorkspace.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const handleUpdateWorkspaceName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || workspaceName.trim() === activeWorkspace?.name) return;

    try {
      setSavingName(true);
      await api.updateWorkspace({ name: workspaceName.trim() });
      showToast('success', 'Workspace name updated successfully.');
      await refreshProfile();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update workspace name');
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      setCreatingWs(true);
      await api.createWorkspace({ name: newWorkspaceName.trim() });
      setNewWorkspaceName('');
      setCreateWsModalOpen(false);
      showToast('success', 'New workspace provisioned successfully.');
      await refreshProfile();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreatingWs(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      setMemberSubmitting(true);
      setMemberError(null);
      await api.addWorkspaceMember({ email: memberEmail.trim(), role: memberRole });
      setMemberEmail('');
      setAddMemberModalOpen(false);
      showToast('success', 'Team member invited successfully.');
      await loadMembers();
    } catch (err: unknown) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: string) => {
    try {
      await api.updateMemberRole(memberUserId, newRole);
      showToast('success', 'Member role updated.');
      await loadMembers();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update member role');
    }
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await api.removeMember(memberToRemove.userId);
      showToast('success', 'Member removed from workspace.');
      setMemberToRemove(null);
      await loadMembers();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Workspace Settings</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure tenant boundaries, manage team access roles, and provision workspaces.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setCreateWsModalOpen(true)}
        >
          New Workspace
        </Button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : null}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Workspace Profile Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Workspace Identity</CardTitle>
            <CardDescription>
              Primary organizational name, URL slug, and unique tenant UUID.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleUpdateWorkspaceName} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Workspace Name
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Workspace Name"
                    required
                  />
                  <Button
                    type="submit"
                    size="md"
                    variant="primary"
                    loading={savingName}
                    disabled={!workspaceName.trim() || workspaceName.trim() === activeWorkspace?.name}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Workspace Slug
                </label>
                <div className="px-3 py-2 h-9 flex items-center rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                  {activeWorkspace?.slug || 'workspace-slug'}
                </div>
              </div>
            </div>
          </form>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tenant UUID
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 truncate select-all">
                {activeWorkspace?.id || '—'}
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={handleCopyTenantId}
              >
                {copiedId ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Required for developer API header <code className="font-mono text-zinc-300">X-Workspace-Id</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Team & Role-Based Access Control</CardTitle>
            <CardDescription>
              Users with access to assistants, documents, and API keys in this workspace.
            </CardDescription>
          </div>
          <Button
            size="xs"
            variant="secondary"
            icon={<Plus className="w-3 h-3" />}
            onClick={() => {
              setMemberError(null);
              setMemberEmail('');
              setAddMemberModalOpen(true);
            }}
          >
            Add Member
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          {membersLoading ? (
            <div className="py-8 text-center text-xs text-zinc-400 font-mono">
              Loading workspace members...
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No additional team members joined yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {members.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isOwner = m.role === 'OWNER';

                  return (
                    <tr key={m.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-medium text-xs text-zinc-300">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-100">{m.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] ml-1.5 text-zinc-400">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px] font-mono">
                        {m.email}
                      </td>
                      <td className="py-3 px-4">
                        {isOwner ? (
                          <Badge variant="neutral" size="xs">
                            OWNER
                          </Badge>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                            className="text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isOwner && !isCurrent && (
                          <button
                            onClick={() => setMemberToRemove(m)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Member Modal */}
      <Dialog
        open={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        title="Invite Workspace Member"
        description="Add a registered BotNexa user to collaborate in this workspace."
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAddMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={memberSubmitting}
              onClick={handleAddMember}
            >
              Add Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddMember} className="space-y-3">
          {memberError && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {memberError}
            </div>
          )}
          <Input
            label="User Email Address"
            type="email"
            placeholder="colleague@company.com"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            required
          />
          <Select
            label="Assigned Role"
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as any)}
          >
            <option value="ADMIN">ADMIN (Full workspace permissions except ownership)</option>
            <option value="EDITOR">EDITOR (Create and edit assistants & documents)</option>
            <option value="VIEWER">VIEWER (Read-only access to assistants & playground)</option>
          </Select>
        </form>
      </Dialog>

      {/* Create Workspace Modal */}
      <Dialog
        open={createWsModalOpen}
        onClose={() => setCreateWsModalOpen(false)}
        title="Provision New Workspace"
        description="Create an isolated tenant boundary with its own assistants, documents, and wallet ledger."
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateWsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={creatingWs}
              onClick={handleCreateWorkspace}
            >
              Create Workspace
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-3">
          <Input
            label="New Workspace Name"
            placeholder="e.g. Acme Marketing Production"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            required
          />
        </form>
      </Dialog>

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemoveMember}
        title="Remove Team Member"
        description="Are you sure you want to remove this member? They will lose access to all assistants, API keys, and workspace documents immediately."
        itemName={memberToRemove ? `${memberToRemove.name} (${memberToRemove.email})` : undefined}
        confirmText="Remove Member"
      />
    </div>
  );
}
