'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Table, type TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { BarChartCard } from '@/components/ui/charts';
import type { FarmField, IrrigationLog, PlantCrop } from '@/types/domain';

type FieldStatus = 'Healthy' | 'Warning' | 'Critical';

function getFieldStatus(farmId: string, plants: PlantCrop[]): FieldStatus {
  const farmPlants = plants.filter((p) => p.farmId === farmId);
  if (farmPlants.some((p) => p.healthStatus === 'Critical')) return 'Critical';
  if (farmPlants.some((p) => p.healthStatus === 'Warning')) return 'Warning';
  return 'Healthy';
}

const logTypeTone: Record<IrrigationLog['logType'], BadgeTone> = {
  Irrigation: 'info',
  Fertilizer: 'success',
  Pesticide: 'warning',
  Other: 'neutral',
};

function isoWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

interface FarmerIrrigationSectionProps {
  farms: FarmField[];
  plants: PlantCrop[];
}

const emptyForm = {
  farmId: '',
  logType: 'Irrigation' as IrrigationLog['logType'],
  amount: '',
  unit: '',
  notes: '',
  loggedOn: new Date().toISOString().split('T')[0],
};

export default function FarmerIrrigationSection({ farms, plants }: FarmerIrrigationSectionProps) {
  const [farmFilter, setFarmFilter] = useState('');
  const [logs, setLogs] = useState<IrrigationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const farmName = (farmId?: string) => farms.find((f) => f.id === farmId)?.name || 'Unassigned';

  const fetchLogs = () => {
    setIsLoading(true);
    setError('');
    const url = farmFilter ? `/api/irrigation-logs?farmId=${encodeURIComponent(farmFilter)}` : '/api/irrigation-logs';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.logs);
        } else {
          setError(data.error || 'Failed to load irrigation logs.');
        }
      })
      .catch(() => setError('Failed to load irrigation logs.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmFilter]);

  const weeklyIrrigation = useMemo(() => {
    const totals = new Map<string, number>();
    logs
      .filter((l) => l.logType === 'Irrigation')
      .forEach((l) => {
        const week = isoWeekLabel(l.loggedOn);
        totals.set(week, (totals.get(week) || 0) + (l.amount || 0));
      });
    return Array.from(totals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, amount]) => ({ week, amount }));
  }, [logs]);

  const fieldsNeedingAttention = useMemo(
    () => farms.filter((f) => {
      const status = getFieldStatus(f.id, plants);
      return status === 'Warning' || status === 'Critical';
    }),
    [farms, plants]
  );

  const columns: TableColumn<IrrigationLog>[] = [
    { key: 'loggedOn', header: 'Date', render: (row) => new Date(row.loggedOn).toLocaleDateString() },
    { key: 'field', header: 'Field', render: (row) => farmName(row.farmId) },
    { key: 'logType', header: 'Type', render: (row) => <Badge tone={logTypeTone[row.logType]}>{row.logType}</Badge> },
    { key: 'amount', header: 'Amount', render: (row) => (row.amount != null ? `${row.amount} ${row.unit || ''}`.trim() : '-') },
    { key: 'notes', header: 'Notes', render: (row) => row.notes || '-' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/irrigation-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: form.farmId || undefined,
          logType: form.logType,
          amount: form.amount ? Number(form.amount) : undefined,
          unit: form.unit || undefined,
          notes: form.notes || undefined,
          loggedOn: form.loggedOn,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm(emptyForm);
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to save irrigation log:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Irrigation & Inputs</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Track water, fertilizer, and pesticide application across your fields.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={farmFilter}
            onChange={(e) => setFarmFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Fields</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Log Entry
          </button>
        </div>
      </div>

      {fieldsNeedingAttention.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/10">
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Recommended Input</span>
                {fieldsNeedingAttention.map((f) => (
                  <p key={f.id} className="text-sm text-amber-900 dark:text-amber-100">
                    {f.name} shows elevated risk - consider a fungicide application this week and a follow-up scan.
                  </p>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <BarChartCard
        title="Weekly Irrigation Volume"
        subtitle="Amount logged per week for Irrigation entries."
        data={weeklyIrrigation}
        xKey="week"
        series={[{ key: 'amount', label: 'Amount' }]}
      />

      <Card>
        <CardHeader title="Log History" />
        <CardBody className="p-0">
          <div className="p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : (
              <Table<IrrigationLog> columns={columns} rows={logs} emptyMessage="No irrigation or input logs recorded yet." />
            )}
          </div>
        </CardBody>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Field</label>
            <select
              value={form.farmId}
              onChange={(e) => setForm((f) => ({ ...f, farmId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Unassigned</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Type</label>
              <select
                value={form.logType}
                onChange={(e) => setForm((f) => ({ ...f, logType: e.target.value as IrrigationLog['logType'] }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Irrigation">Irrigation</option>
                <option value="Fertilizer">Fertilizer</option>
                <option value="Pesticide">Pesticide</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Date</label>
              <input
                type="date"
                required
                value={form.loggedOn}
                onChange={(e) => setForm((f) => ({ ...f, loggedOn: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Amount</label>
              <input
                type="number"
                step="any"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Unit</label>
              <input
                type="text"
                placeholder="e.g. gallons, lbs"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
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
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
