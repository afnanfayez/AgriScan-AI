'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Building2, Loader2, Map, ShieldCheck, Sprout } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { LineChartCard } from '@/components/ui/charts';
import type { FarmField, PlantCrop } from '@/types/domain';

interface FarmRankingRow {
  farmId: string;
  farmName: string;
  healthScore: number;
  status: string;
}

interface AgribusinessAnalytics {
  totalFarms: number;
  totalManagedPlants: number;
  avgInfectionRate: number;
  criticalAlerts: number;
  farmRanking: FarmRankingRow[];
  healthTrend: { date: string; healthScore: number }[];
  farmComparison: { farmId: string; farmName: string; area: number; infectionRate: number; estimatedCostImpact: number }[];
  monthlyHeatmap: { farmId: string; farmName: string; month: string; healthScore: number }[];
}

const statusTone: Record<string, BadgeTone> = {
  Healthy: 'success',
  Warning: 'warning',
  Critical: 'danger',
};

interface AgribusinessOverviewSectionProps {
  farms: FarmField[];
  plants: PlantCrop[];
}

export default function AgribusinessOverviewSection({ farms, plants }: AgribusinessOverviewSectionProps) {
  const [analytics, setAnalytics] = useState<AgribusinessAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    fetch('/api/agribusiness/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError(data.error || 'Failed to load enterprise analytics.');
        }
      })
      .catch(() => setError('Failed to load enterprise analytics.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Enterprise Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Aggregated performance across every farm and site in your organization.</p>
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
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-50">No farms linked yet</h2>
            <p className="max-w-sm text-sm text-stone-500 dark:text-slate-400">
              Link a farm to your organization in the Multi-Farm Manager tab to start seeing org-wide performance figures here.
            </p>
          </CardBody>
        </Card>
      ) : analytics ? (
        <>
          <StatCardGrid>
            <StatCard label="Total Farms / Sites" value={analytics.totalFarms} icon={Map} tone="info" />
            <StatCard label="Total Managed Plants" value={analytics.totalManagedPlants.toLocaleString()} icon={Sprout} tone="neutral" />
            <StatCard
              label="Avg. Infection Rate"
              value={`${analytics.avgInfectionRate}%`}
              icon={ShieldCheck}
              tone={analytics.avgInfectionRate > 15 ? 'danger' : analytics.avgInfectionRate > 5 ? 'warning' : 'success'}
            />
            <StatCard
              label="Critical Alerts Across All Sites"
              value={analytics.criticalAlerts}
              icon={AlertTriangle}
              tone={analytics.criticalAlerts > 0 ? 'danger' : 'neutral'}
            />
          </StatCardGrid>

          <Card>
            <CardHeader title="Farm Performance Ranking" subtitle="All linked farms, best-to-worst by health score." />
            <CardBody className="space-y-2">
              {analytics.farmRanking.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400 dark:text-slate-500">No ranked farms yet.</p>
              ) : (
                analytics.farmRanking.map((row, index) => (
                  <div
                    key={row.farmId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-stone-500 ring-1 ring-stone-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-semibold text-stone-900 dark:text-slate-50">{row.farmName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-stone-700 dark:text-slate-300">{row.healthScore}%</span>
                      <Badge tone={statusTone[row.status] ?? 'neutral'}>{row.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <LineChartCard
            title="Org-wide Health Trend"
            subtitle="Aggregated health score across all linked farms over time."
            data={analytics.healthTrend}
            xKey="date"
            series={[{ key: 'healthScore', label: 'Health Score' }]}
          />
        </>
      ) : null}
    </motion.div>
  );
}
