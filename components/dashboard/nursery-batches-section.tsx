'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Table, type TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import type { BatchScan, InventoryBatch } from '@/types/domain';

const statusTone: Record<InventoryBatch['status'], BadgeTone> = {
  Propagating: 'info',
  Growing: 'neutral',
  Ready: 'success',
  'Sold Out': 'neutral',
  'Needs Treatment': 'danger',
};

const gradeTone: Record<NonNullable<InventoryBatch['grade']>, BadgeTone> = {
  A: 'success',
  B: 'warning',
  C: 'danger',
};

const emptyForm = {
  plantType: '',
  batchName: '',
  quantity: '',
  unitPrice: '',
  propagationDate: '',
  readyDate: '',
  lowStockThreshold: '20',
};

export default function NurseryBatchesSection() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);
  const [batchScans, setBatchScans] = useState<BatchScan[]>([]);
  const [scansLoading, setScansLoading] = useState(false);

  const fetchBatches = () => {
    setIsLoading(true);
    setError('');
    fetch('/api/inventory-batches')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBatches(data.batches);
        } else {
          setError(data.error || 'Failed to load inventory batches.');
        }
      })
      .catch(() => setError('Failed to load inventory batches.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openDetail = (batch: InventoryBatch) => {
    setSelectedBatch(batch);
    setBatchScans([]);
    setScansLoading(true);
    fetch(`/api/nursery/batch-scans?batchId=${encodeURIComponent(batch.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBatchScans(data.batchScans);
      })
      .finally(() => setScansLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plantType.trim() || !form.quantity) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/inventory-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantType: form.plantType.trim(),
          batchName: form.batchName || undefined,
          quantity: Number(form.quantity),
          unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
          propagationDate: form.propagationDate || undefined,
          readyDate: form.readyDate || undefined,
          lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setForm(emptyForm);
        fetchBatches();
      }
    } catch (err) {
      console.error('Failed to create batch:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn<InventoryBatch>[] = [
    { key: 'batchName', header: 'Name', render: (row) => row.batchName || row.plantType },
    { key: 'plantType', header: 'Species', render: (row) => row.plantType },
    { key: 'propagationDate', header: 'Planted', render: (row) => (row.propagationDate ? new Date(row.propagationDate).toLocaleDateString() : '-') },
    { key: 'readyDate', header: 'Ready', render: (row) => (row.readyDate ? new Date(row.readyDate).toLocaleDateString() : '-') },
    { key: 'quantity', header: 'Quantity', render: (row) => row.quantity.toLocaleString() },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Batches</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Manage propagation and grow-out batches across your nursery.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          New Batch
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
              <Table<InventoryBatch>
                columns={columns}
                rows={batches}
                onRowClick={openDetail}
                emptyMessage="No batches yet. Create your first batch to get started."
              />
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Batch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Plant Type</label>
              <input
                type="text"
                required
                value={form.plantType}
                onChange={(e) => setForm((f) => ({ ...f, plantType: e.target.value }))}
                placeholder="e.g. Japanese Maple"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Batch Name</label>
              <input
                type="text"
                value={form.batchName}
                onChange={(e) => setForm((f) => ({ ...f, batchName: e.target.value }))}
                placeholder="Optional label"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Propagation Date</label>
              <input
                type="date"
                value={form.propagationDate}
                onChange={(e) => setForm((f) => ({ ...f, propagationDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Ready Date</label>
              <input
                type="date"
                value={form.readyDate}
                onChange={(e) => setForm((f) => ({ ...f, readyDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Low Stock Threshold</label>
            <input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              className="mt-1 w-full max-w-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              Create Batch
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        title={selectedBatch ? (selectedBatch.batchName || selectedBatch.plantType) : ''}
      >
        {selectedBatch && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Species</span>
                <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">{selectedBatch.plantType}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Quantity</span>
                <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">{selectedBatch.quantity.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Status</span>
                <Badge tone={statusTone[selectedBatch.status]} className="mt-1">{selectedBatch.status}</Badge>
              </div>
              <div>
                <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Grade</span>
                {selectedBatch.grade ? (
                  <Badge tone={gradeTone[selectedBatch.grade]} className="mt-1">{selectedBatch.grade}</Badge>
                ) : (
                  <span className="mt-1 block text-sm text-stone-500 dark:text-slate-400">Not graded</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-50">Scan History</h3>
              {scansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : batchScans.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">No health screenings recorded for this batch yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {batchScans.map((scan) => (
                    <div key={scan.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-stone-900 dark:text-slate-50">{new Date(scan.createdAt).toLocaleDateString()}</span>
                        <Badge tone={scan.infectionPercentage > 25 ? 'danger' : 'success'}>
                          {scan.infectionPercentage}% infection
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                        {scan.healthyCount} of {scan.totalSamples} samples healthy
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
