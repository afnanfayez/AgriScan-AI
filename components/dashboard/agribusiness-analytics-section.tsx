'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownAZ, ArrowUpAZ, ChartBar, Loader2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, type TableColumn } from '@/components/ui/table';
import { BarChartCard } from '@/components/ui/charts';

interface FarmComparisonRow {
  farmId: string;
  farmName: string;
  area: number;
  infectionRate: number;
  estimatedCostImpact: number;
}

interface HeatmapCell {
  farmId: string;
  farmName: string;
  month: string;
  healthScore: number;
}

interface AgribusinessAnalytics {
  totalFarms: number;
  totalManagedPlants: number;
  avgInfectionRate: number;
  criticalAlerts: number;
  farmRanking: { farmId: string; farmName: string; healthScore: number; status: string }[];
  healthTrend: { date: string; healthScore: number }[];
  farmComparison: FarmComparisonRow[];
  monthlyHeatmap: HeatmapCell[];
}

type SortKey = 'farmName' | 'area' | 'infectionRate' | 'estimatedCostImpact';
type SortDirection = 'asc' | 'desc';

function heatColor(score: number): string {
  // Same warning-scale convention as Badge tones: red (low) -> amber -> green (high).
  if (score >= 80) return 'bg-emerald-500/80 dark:bg-emerald-500/60';
  if (score >= 60) return 'bg-emerald-300/70 dark:bg-emerald-500/30';
  if (score >= 40) return 'bg-amber-300/80 dark:bg-amber-500/40';
  if (score >= 20) return 'bg-red-300/80 dark:bg-red-500/40';
  return 'bg-red-500/80 dark:bg-red-500/70';
}

export default function AgribusinessAnalyticsSection() {
  const [analytics, setAnalytics] = useState<AgribusinessAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('infectionRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    fetch('/api/agribusiness/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError(data.error || 'Failed to load cross-farm analytics.');
        }
      })
      .catch(() => setError('Failed to load cross-farm analytics.'))
      .finally(() => setIsLoading(false));
  }, []);

  const sortedComparison = useMemo(() => {
    if (!analytics) return [];
    const rows = [...analytics.farmComparison];
    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [analytics, sortKey, sortDirection]);

  const months = useMemo(() => {
    if (!analytics) return [];
    return Array.from(new Set(analytics.monthlyHeatmap.map((c) => c.month))).sort();
  }, [analytics]);

  const heatmapFarms = useMemo(() => {
    if (!analytics) return [];
    const seen = new Map<string, string>();
    analytics.monthlyHeatmap.forEach((c) => seen.set(c.farmId, c.farmName));
    return Array.from(seen.entries()).map(([farmId, farmName]) => ({ farmId, farmName }));
  }, [analytics]);

  const cellLookup = useMemo(() => {
    const map = new Map<string, number>();
    analytics?.monthlyHeatmap.forEach((c) => map.set(`${c.farmId}::${c.month}`, c.healthScore));
    return map;
  }, [analytics]);

  const columns: TableColumn<FarmComparisonRow & { id: string }>[] = [
    { key: 'farmName', header: 'Farm' },
    { key: 'area', header: 'Area', render: (row) => `${row.area.toLocaleString()} acres` },
    { key: 'infectionRate', header: 'Infection Rate', render: (row) => `${row.infectionRate}%` },
    { key: 'estimatedCostImpact', header: 'Est. Cost Impact', render: (row) => `$${row.estimatedCostImpact.toLocaleString()}` },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'farmName', label: 'Farm Name' },
    { key: 'area', label: 'Area' },
    { key: 'infectionRate', label: 'Infection Rate' },
    { key: 'estimatedCostImpact', label: 'Est. Cost Impact' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Cross-Farm Analytics</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Compare infection rates, health trends, and cost impact across every linked farm.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : analytics && analytics.totalFarms === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              <ChartBar className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-50">No farms to analyze yet</h2>
            <p className="max-w-sm text-sm text-stone-500 dark:text-slate-400">
              Link a farm to your organization in the Multi-Farm Manager tab to unlock cross-farm comparisons.
            </p>
          </CardBody>
        </Card>
      ) : analytics ? (
        <>
          <BarChartCard
            title="Infection Rate by Farm"
            subtitle="Current infection percentage across all linked farms."
            data={analytics.farmComparison as unknown as Record<string, string | number>[]}
            xKey="farmName"
            series={[{ key: 'infectionRate', label: 'Infection Rate %' }]}
          />

          <Card>
            <CardHeader title="Monthly Health Heatmap" subtitle="Health score by farm and month. Darker green is healthier, red is at risk." />
            <CardBody className="overflow-x-auto">
              {heatmapFarms.length === 0 || months.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400 dark:text-slate-500">No heatmap data available yet.</p>
              ) : (
                <div className="min-w-[36rem]">
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `10rem repeat(${months.length}, minmax(3.5rem, 1fr))` }}
                  >
                    <div />
                    {months.map((month) => (
                      <div key={month} className="px-1 pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                        {month}
                      </div>
                    ))}
                    {heatmapFarms.map((farm) => (
                      <div key={farm.farmId} className="contents">
                        <div className="flex items-center truncate pr-2 text-xs font-medium text-stone-700 dark:text-slate-300">
                          {farm.farmName}
                        </div>
                        {months.map((month) => {
                          const score = cellLookup.get(`${farm.farmId}::${month}`);
                          return (
                            <div
                              key={month}
                              title={score !== undefined ? `${farm.farmName} — ${month}: ${score}%` : 'No data'}
                              className={`flex h-9 items-center justify-center rounded-md text-[10px] font-semibold text-stone-900 dark:text-slate-50 ${
                                score !== undefined ? heatColor(score) : 'bg-stone-100 text-stone-300 dark:bg-slate-800 dark:text-slate-600'
                              }`}
                            >
                              {score !== undefined ? `${score}%` : '-'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Farm Comparison"
              subtitle="Area, infection rate, and estimated cost impact side by side."
              action={
                <div className="flex items-center gap-2">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        Sort: {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    aria-label="Toggle sort direction"
                  >
                    {sortDirection === 'asc' ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
                  </button>
                </div>
              }
            />
            <CardBody className="p-0">
              <div className="p-5">
                <Table
                  columns={columns}
                  rows={sortedComparison.map((row) => ({ ...row, id: row.farmId }))}
                  emptyMessage="No farm comparison data available yet."
                />
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}
    </motion.div>
  );
}
