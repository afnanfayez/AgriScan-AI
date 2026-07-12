'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Table, type TableColumn } from '@/components/ui/table';
import { BarChartCard } from '@/components/ui/charts';
import type { InventoryBatch } from '@/types/domain';

type Grade = NonNullable<InventoryBatch['grade']>;
const GRADES: Grade[] = ['A', 'B', 'C'];

export default function NurseryGradingSection() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

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

  const updateBatch = async (id: string, fields: Partial<Pick<InventoryBatch, 'grade' | 'unitPrice'>>) => {
    setSavingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch('/api/inventory-batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      });
      const data = await res.json();
      if (data.success) {
        setBatches((prev) => prev.map((b) => (b.id === id ? data.batch : b)));
      }
    } catch (err) {
      console.error('Failed to update batch:', err);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleGradeChange = (batch: InventoryBatch, grade: string) => {
    updateBatch(batch.id, { grade: (grade || undefined) as Grade | undefined });
  };

  const handlePriceBlur = (batch: InventoryBatch) => {
    const draft = priceDrafts[batch.id];
    if (draft === undefined) return;
    const numeric = draft === '' ? undefined : Number(draft);
    if (numeric === batch.unitPrice) return;
    updateBatch(batch.id, { unitPrice: numeric });
  };

  const filteredBatches = useMemo(
    () => (gradeFilter ? batches.filter((b) => b.grade === gradeFilter) : batches),
    [batches, gradeFilter]
  );

  const gradeDistribution = useMemo(
    () =>
      GRADES.map((grade) => ({
        grade,
        count: batches.filter((b) => b.grade === grade).length,
      })),
    [batches]
  );

  const columns: TableColumn<InventoryBatch>[] = [
    { key: 'batchName', header: 'Batch', render: (row) => row.batchName || row.plantType },
    { key: 'plantType', header: 'Species', render: (row) => row.plantType },
    { key: 'quantity', header: 'Quantity', render: (row) => row.quantity.toLocaleString() },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => (
        <select
          value={row.grade || ''}
          onChange={(e) => handleGradeChange(row, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          disabled={savingIds.has(row.id)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Ungraded</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Suggested Price ($)',
      render: (row) => (
        <input
          type="number"
          step="0.01"
          min="0"
          value={priceDrafts[row.id] ?? (row.unitPrice ?? '')}
          onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
          onBlur={() => handlePriceBlur(row)}
          onClick={(e) => e.stopPropagation()}
          disabled={savingIds.has(row.id)}
          className="w-28 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Quality Grading</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Grade batches and set suggested pricing based on quality.</p>
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
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
          <BarChartCard
            title="Batch Count by Grade"
            subtitle="Distribution of graded batches across A/B/C."
            data={gradeDistribution}
            xKey="grade"
            series={[{ key: 'count', label: 'Batches' }]}
          />

          <Card>
            <CardBody className="p-0">
              <div className="p-5">
                <Table<InventoryBatch>
                  columns={columns}
                  rows={filteredBatches}
                  emptyMessage="No batches match this filter."
                />
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </motion.div>
  );
}
