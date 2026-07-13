'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, Copy, KeyRound, Loader2, Plus, Trash } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Table, type TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import type { ApiKey, ApiUsageLog } from '@/types/domain';

const statusTone: Record<ApiKey['status'], BadgeTone> = {
  Active: 'success',
  Revoked: 'danger',
};

export default function AgribusinessApikeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [label, setLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchKeys = () => {
    fetch('/api/api-keys')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setKeys(data.keys);
      });
  };

  const fetchLogs = () => {
    fetch('/api/api-usage-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLogs(data.logs);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    setError('');
    Promise.all([
      fetch('/api/api-keys').then((res) => res.json()),
      fetch('/api/api-usage-logs').then((res) => res.json()),
    ])
      .then(([keysData, logsData]) => {
        if (keysData.success) {
          setKeys(keysData.keys);
        } else {
          setError(keysData.error || 'Failed to load API keys.');
        }
        if (logsData.success) setLogs(logsData.logs);
      })
      .catch(() => setError('Failed to load API keys.'))
      .finally(() => setIsLoading(false));
  }, []);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setLabel('');
    setRevealedSecret(null);
    setCopied(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRevealedSecret(data.secret);
        fetchKeys();
      }
    } catch (err) {
      console.error('Failed to generate API key:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const copySecret = async () => {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy secret:', err);
    }
  };

  const revokeKey = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchKeys();
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const keyColumns: TableColumn<ApiKey>[] = [
    { key: 'label', header: 'Label' },
    { key: 'keyPrefix', header: 'Key', render: (row) => <span className="font-mono text-xs">{row.keyPrefix}...</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
    { key: 'createdAt', header: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status === 'Active' ? (
          <button
            onClick={() => revokeKey(row.id)}
            disabled={revokingId === row.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-55 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {revokingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
            Revoke
          </button>
        ) : (
          <span className="text-xs text-stone-400 dark:text-slate-500">-</span>
        ),
    },
  ];

  const logColumns: TableColumn<ApiUsageLog>[] = [
    { key: 'endpoint', header: 'Endpoint', render: (row) => <span className="font-mono text-xs">{row.endpoint}</span> },
    {
      key: 'statusCode',
      header: 'Status Code',
      render: (row) => (
        <Badge tone={row.statusCode >= 200 && row.statusCode < 300 ? 'success' : row.statusCode >= 500 ? 'danger' : 'warning'}>
          {row.statusCode}
        </Badge>
      ),
    },
    { key: 'requestedAt', header: 'Requested', render: (row) => new Date(row.requestedAt).toLocaleString() },
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">API & Integrations</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Manage programmatic access keys and monitor recent API usage.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Generate New Key
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
        <>
          <Card>
            <CardHeader
              title="API Keys"
              subtitle="Keys used to authenticate programmatic access to your organization's data."
              action={<div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"><KeyRound className="h-5 w-5" /></div>}
            />
            <CardBody className="p-0">
              <div className="p-5">
                <Table<ApiKey> columns={keyColumns} rows={keys} emptyMessage="No API keys generated yet." />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent API Usage" subtitle="The latest requests made with your organization's keys." />
            <CardBody className="p-0">
              <div className="p-5">
                <Table<ApiUsageLog> columns={logColumns} rows={logs} emptyMessage="No API usage recorded yet." />
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <Modal open={showCreateModal} onClose={closeCreateModal} title={revealedSecret ? 'API Key Generated' : 'Generate New Key'}>
        {revealedSecret ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This is the only time you'll see this secret. Copy it now and store it somewhere safe — it will not be shown again.</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-stone-900 dark:text-slate-100">
                {revealedSecret}
              </code>
              <button
                onClick={copySecret}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={closeCreateModal}
                className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Label</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Reporting Integration"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeCreateModal}
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
                Generate Key
              </button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
}
