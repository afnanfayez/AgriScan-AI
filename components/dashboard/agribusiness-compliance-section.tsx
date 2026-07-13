'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, FileDown, Loader2, Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Table, type TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import type { AuditReport, FarmField } from '@/types/domain';

const statusTone: Record<AuditReport['status'], BadgeTone> = {
  Draft: 'warning',
  Final: 'success',
};

const emptyForm = {
  title: '',
  farmId: '',
  summary: '',
};

interface AgribusinessComplianceSectionProps {
  farms: FarmField[];
}

export default function AgribusinessComplianceSection({ farms }: AgribusinessComplianceSectionProps) {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  const farmName = (farmId?: string) => {
    if (!farmId) return 'Organization-wide';
    return farms.find((f) => f.id === farmId)?.name || 'Organization-wide';
  };

  const fetchReports = () => {
    setIsLoading(true);
    setError('');
    fetch('/api/audit-reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReports(data.reports);
        } else {
          setError(data.error || 'Failed to load audit reports.');
        }
      })
      .catch(() => setError('Failed to load audit reports.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/audit-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          summary: form.summary || undefined,
          farmId: form.farmId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setForm(emptyForm);
        fetchReports();
      }
    } catch (err) {
      console.error('Failed to create audit report:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeReport = async (report: AuditReport) => {
    setFinalizingId(report.id);
    try {
      const res = await fetch('/api/audit-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: report.id, status: 'Final' }),
      });
      const data = await res.json();
      if (data.success) fetchReports();
    } catch (err) {
      console.error('Failed to finalize audit report:', err);
    } finally {
      setFinalizingId(null);
    }
  };

  const columns: TableColumn<AuditReport>[] = [
    { key: 'title', header: 'Title' },
    { key: 'farmId', header: 'Farm', render: (row) => farmName(row.farmId) },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
    { key: 'createdAt', header: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status === 'Draft' ? (
          <button
            onClick={() => finalizeReport(row)}
            disabled={finalizingId === row.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-55"
          >
            {finalizingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Mark Final
          </button>
        ) : (
          <span className="text-xs text-stone-400 dark:text-slate-500">-</span>
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Compliance & Audit Reports</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Generate, track, and export audit-ready reports across your organization.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Generate New Report
        </button>
      </div>

      <Card>
        <CardHeader title="Consolidated Export" subtitle="Download your organization's farms, plants, scans, and expenses in a single file." />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1.5 dark:border-slate-700 dark:bg-slate-950/70">
            {[
              { label: 'CSV', format: 'csv', color: 'text-stone-500' },
              { label: 'PDF', format: 'pdf', color: 'text-emerald-600' },
              { label: 'Excel', format: 'excel', color: 'text-blue-600' },
            ].map((item) => (
              <button
                key={item.format}
                onClick={() => window.open(`/api/export?format=${item.format}`, '_blank')}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-xs ring-1 ring-stone-200 hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-sm dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                <FileDown className={`h-3.5 w-3.5 ${item.color}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

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
          <CardHeader title="Audit Reports" subtitle="All reports generated for your organization." />
          <CardBody className="p-0">
            <div className="p-5">
              <Table<AuditReport> columns={columns} rows={reports} emptyMessage="No audit reports yet." />
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Generate New Report">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Farm (optional)</label>
            <select
              value={form.farmId}
              onChange={(e) => setForm((f) => ({ ...f, farmId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Organization-wide</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Summary (optional)</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
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
              Generate Report
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
