'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarClock, Loader2, TrendingDown } from 'lucide-react';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { BarChartCard, LineChartCard } from '@/components/ui/charts';
import type { BatchScan, InventoryBatch, Order, OrderItem } from '@/types/domain';

type OrderWithItems = Order & { items: OrderItem[] };

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function NurseryReportsSection() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [allScans, setAllScans] = useState<BatchScan[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');

    const load = async () => {
      try {
        const [batchesRes, ordersRes] = await Promise.all([
          fetch('/api/inventory-batches'),
          fetch('/api/orders'),
        ]);
        const [batchesData, ordersData] = await Promise.all([batchesRes.json(), ordersRes.json()]);

        if (!batchesData.success) {
          setError(batchesData.error || 'Failed to load inventory batches.');
          return;
        }
        const loadedBatches: InventoryBatch[] = batchesData.batches;
        setBatches(loadedBatches);
        if (ordersData.success) setOrders(ordersData.orders);

        const scanResults = await Promise.all(
          loadedBatches.map((batch) =>
            fetch(`/api/nursery/batch-scans?batchId=${encodeURIComponent(batch.id)}`)
              .then((res) => res.json())
              .then((data) => (data.success ? (data.batchScans as BatchScan[]) : []))
              .catch(() => [])
          )
        );
        setAllScans(scanResults.flat());
      } catch (err) {
        console.error('Failed to load reports data:', err);
        setError('Failed to load loss & turnover reports.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const totalLossPct = useMemo(() => {
    if (allScans.length === 0) return 0;
    const sum = allScans.reduce((acc, s) => acc + (s.infectionPercentage || 0), 0);
    return Math.round((sum / allScans.length) * 10) / 10;
  }, [allScans]);

  const monthlyLoss = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    allScans.forEach((scan) => {
      const month = monthLabel(scan.createdAt);
      const bucket = buckets.get(month) || { sum: 0, count: 0 };
      bucket.sum += scan.infectionPercentage || 0;
      bucket.count += 1;
      buckets.set(month, bucket);
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, count }]) => ({ month, lossPct: Math.round((sum / count) * 10) / 10 }));
  }, [allScans]);

  const turnoverSamples = useMemo(() => {
    const batchById = new Map(batches.map((b) => [b.id, b]));
    const samples: { month: string; days: number }[] = [];
    orders.forEach((order) => {
      if (!order.dispatchDate) return;
      order.items.forEach((item) => {
        const batch = item.batchId ? batchById.get(item.batchId) : undefined;
        if (!batch?.propagationDate) return;
        const dispatch = new Date(order.dispatchDate!).getTime();
        const planted = new Date(batch.propagationDate).getTime();
        if (Number.isNaN(dispatch) || Number.isNaN(planted) || dispatch < planted) return;
        const days = Math.round((dispatch - planted) / (1000 * 60 * 60 * 24));
        samples.push({ month: monthLabel(order.dispatchDate!), days });
      });
    });
    return samples;
  }, [batches, orders]);

  const avgDaysToSell = useMemo(() => {
    if (turnoverSamples.length === 0) return 0;
    const sum = turnoverSamples.reduce((acc, s) => acc + s.days, 0);
    return Math.round(sum / turnoverSamples.length);
  }, [turnoverSamples]);

  const turnoverTrend = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    turnoverSamples.forEach(({ month, days }) => {
      const bucket = buckets.get(month) || { sum: 0, count: 0 };
      bucket.sum += days;
      bucket.count += 1;
      buckets.set(month, bucket);
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, count }]) => ({ month, avgDays: Math.round(sum / count) }));
  }, [turnoverSamples]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Loss & Turnover Reports</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Infection-driven loss trends and inventory turnover speed.</p>
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
          <StatCardGrid className="xl:grid-cols-2">
            <StatCard
              label="Total Loss %"
              value={`${totalLossPct}%`}
              icon={TrendingDown}
              tone={totalLossPct > 25 ? 'danger' : totalLossPct > 10 ? 'warning' : 'success'}
            />
            <StatCard
              label="Avg. Days to Sell"
              value={turnoverSamples.length > 0 ? avgDaysToSell : '-'}
              icon={CalendarClock}
            />
          </StatCardGrid>

          <BarChartCard
            title="Monthly Loss %"
            subtitle="Average infection rate from health screenings, grouped by month."
            data={monthlyLoss}
            xKey="month"
            series={[{ key: 'lossPct', label: 'Loss %' }]}
          />

          <LineChartCard
            title="Inventory Turnover"
            subtitle="Approximate days from propagation to dispatch, grouped by dispatch month."
            data={turnoverTrend}
            xKey="month"
            series={[{ key: 'avgDays', label: 'Avg. Days to Sell' }]}
          />
        </>
      )}
    </motion.div>
  );
}
