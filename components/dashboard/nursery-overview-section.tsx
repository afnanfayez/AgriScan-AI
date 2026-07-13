'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Boxes, CheckCircle, Loader2, Sprout } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { Table, type TableColumn } from '@/components/ui/table';
import { DonutChartCard } from '@/components/ui/charts';
import type { InventoryBatch } from '@/types/domain';

const statusTone: Record<InventoryBatch['status'], BadgeTone> = {
  Propagating: 'info',
  Growing: 'neutral',
  Ready: 'success',
  'Sold Out': 'neutral',
  'Needs Treatment': 'danger',
};

export default function NurseryOverviewSection() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, []);

  const totalBatches = batches.length;
  const totalPlants = useMemo(() => batches.reduce((sum, b) => sum + (b.quantity || 0), 0), [batches]);
  const readyCount = useMemo(() => batches.filter((b) => b.status === 'Ready').length, [batches]);
  const needsTreatmentCount = useMemo(() => batches.filter((b) => b.status === 'Needs Treatment').length, [batches]);

  const stockByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    batches.forEach((b) => {
      totals.set(b.plantType, (totals.get(b.plantType) || 0) + (b.quantity || 0));
    });
    return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
  }, [batches]);

  const attentionBatches = useMemo(
    () => batches.filter((b) => b.status === 'Needs Treatment' || b.quantity < b.lowStockThreshold),
    [batches]
  );

  const columns: TableColumn<InventoryBatch>[] = [
    { key: 'batchName', header: 'Batch', render: (row) => row.batchName || row.plantType },
    { key: 'plantType', header: 'Species', render: (row) => row.plantType },
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Inventory Overview</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Current stock health across your growing sites.</p>
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
          <StatCardGrid>
            <StatCard label="Total Batches" value={totalBatches} icon={Boxes} />
            <StatCard label="Total Plants in Stock" value={totalPlants.toLocaleString()} icon={Sprout} />
            <StatCard label="Ready to Sell" value={readyCount} icon={CheckCircle} tone="success" />
            <StatCard
              label="Needs Treatment"
              value={needsTreatmentCount}
              icon={AlertTriangle}
              tone={needsTreatmentCount > 0 ? 'danger' : 'neutral'}
            />
          </StatCardGrid>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
            <DonutChartCard
              title="Stock by Category"
              subtitle="Total quantity on hand grouped by plant type."
              data={stockByCategory}
            />

            <Card>
              <CardHeader
                title="Batches Needing Attention"
                subtitle="Batches flagged for treatment or running below their low-stock threshold."
              />
              <CardBody className="p-0">
                <div className="p-3 sm:p-5">
                  <Table<InventoryBatch>
                    columns={columns}
                    rows={attentionBatches}
                    emptyMessage="No batches need attention right now."
                    tableClassName="min-w-full"
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </motion.div>
  );
}
