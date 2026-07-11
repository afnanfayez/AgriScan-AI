'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, DollarSign, Loader2, TrendingDown } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { BarChartCard, DonutChartCard, LineChartCard } from '@/components/ui/charts';
import type { FarmField } from '@/types/domain';

interface FarmerAnalytics {
  infectionTrend: { date: string; infectionPercentage: number }[];
  seasonComparison: { period: string; expense: number; revenue: number }[];
  riskDistribution: { label: string; value: number }[];
  estimatedYieldLossPct: number;
  estimatedCostImpact: number;
  highestRiskField: { id: string; name: string; infectionPercentage: number } | null;
}

interface FarmerAnalyticsSectionProps {
  farms: FarmField[];
}

export default function FarmerAnalyticsSection({ farms }: FarmerAnalyticsSectionProps) {
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [analytics, setAnalytics] = useState<FarmerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    const url = selectedFarmId
      ? `/api/farmer/analytics?farmId=${encodeURIComponent(selectedFarmId)}`
      : '/api/farmer/analytics';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError(data.error || 'Failed to load analytics.');
        }
      })
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setIsLoading(false));
  }, [selectedFarmId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Yield & Risk Analytics</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Infection trends, seasonal performance, and projected risk exposure.</p>
        </div>
        <select
          value={selectedFarmId}
          onChange={(e) => setSelectedFarmId(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Fields</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>{farm.name}</option>
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
      ) : analytics ? (
        <>
          <StatCardGrid className="xl:grid-cols-3">
            <StatCard
              label="Estimated Yield Loss"
              value={`${analytics.estimatedYieldLossPct}%`}
              icon={TrendingDown}
              tone={analytics.estimatedYieldLossPct > 15 ? 'danger' : analytics.estimatedYieldLossPct > 5 ? 'warning' : 'success'}
            />
            <StatCard
              label="Estimated Cost Impact"
              value={`$${analytics.estimatedCostImpact.toLocaleString()}`}
              icon={DollarSign}
              tone={analytics.estimatedCostImpact > 0 ? 'warning' : 'neutral'}
            />
            <Card className={analytics.highestRiskField ? 'border-red-200 bg-red-50/60 dark:border-red-500/25 dark:bg-red-500/10' : ''}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2.5 ring-1 ${analytics.highestRiskField ? 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-500/30' : 'bg-stone-100 text-stone-500 ring-stone-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'}`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Highest Risk Field</span>
                    {analytics.highestRiskField ? (
                      <>
                        <span className="mt-1 block truncate text-lg font-semibold text-stone-950 dark:text-slate-50">{analytics.highestRiskField.name}</span>
                        <span className="mt-1 block text-sm font-semibold text-red-700 dark:text-red-300">{analytics.highestRiskField.infectionPercentage}% infection</span>
                      </>
                    ) : (
                      <span className="mt-1 block text-sm text-stone-500 dark:text-slate-400">No elevated-risk fields detected.</span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </StatCardGrid>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChartCard
              title="Infection Trend"
              subtitle="Field-wide infection percentage over time."
              data={analytics.infectionTrend}
              xKey="date"
              series={[{ key: 'infectionPercentage', label: 'Infection %' }]}
            />
            <BarChartCard
              title="Season Comparison"
              subtitle="Expense vs. revenue by period."
              data={analytics.seasonComparison}
              xKey="period"
              series={[
                { key: 'expense', label: 'Expense' },
                { key: 'revenue', label: 'Revenue' },
              ]}
            />
          </div>

          <DonutChartCard title="Risk Distribution" subtitle="Share of fields by risk category." data={analytics.riskDistribution} />
        </>
      ) : null}
    </motion.div>
  );
}
