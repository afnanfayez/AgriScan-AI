'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Plus, Trash, UsersRound } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Table, type TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import type { OrgMember } from '@/types/domain';

const roleTone: Record<OrgMember['role'], BadgeTone> = {
  Owner: 'info',
  Admin: 'success',
  Analyst: 'neutral',
  Viewer: 'neutral',
};

const emptyForm = {
  email: '',
  role: 'Viewer' as OrgMember['role'],
};

export default function AgribusinessTeamSection() {
  const [orgId, setOrgId] = useState('');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = (id: string) => {
    fetch(`/api/org-members?orgId=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMembers(data.members);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    setError('');
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrgId(data.organization.id);
          return fetch(`/api/org-members?orgId=${encodeURIComponent(data.organization.id)}`)
            .then((res) => res.json())
            .then((membersData) => {
              if (membersData.success) setMembers(membersData.members);
            });
        } else {
          setError(data.error || 'Failed to load organization.');
        }
      })
      .catch(() => setError('Failed to load organization.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !form.email.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/org-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, email: form.email.trim(), role: form.role }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setForm(emptyForm);
        fetchMembers(orgId);
      }
    } catch (err) {
      console.error('Failed to invite member:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const removeMember = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/org-members?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && orgId) fetchMembers(orgId);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const columns: TableColumn<OrgMember>[] = [
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row) => <Badge tone={roleTone[row.role]}>{row.role}</Badge> },
    { key: 'createdAt', header: 'Joined', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.role === 'Owner' ? (
          <span className="text-xs text-stone-400 dark:text-slate-500">-</span>
        ) : (
          <button
            onClick={() => removeMember(row.id)}
            disabled={removingId === row.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-55 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {removingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
            Remove
          </button>
        ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Team & Roles Management</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Invite teammates and manage who can see and act on your organization's data.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={!orgId}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-55"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="p-5">
              <Table<OrgMember>
                columns={columns}
                rows={members}
                emptyMessage="No team members yet."
              />
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Member">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="teammate@example.com"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as OrgMember['role'] }))}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option>
              <option value="Analyst">Analyst</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-500 dark:bg-slate-950/40 dark:text-slate-400">
            <UsersRound className="h-4 w-4 shrink-0" />
            <span>Members gain access to this organization's linked farms, analytics, and reports based on their role.</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-55"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Invite
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
