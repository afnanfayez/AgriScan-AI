'use client';

import type React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight, CloudSun, Droplets, FileDown, Loader2, Map, ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { Table, type TableColumn } from '@/components/ui/table';
import { parseCropTypes } from '@/lib/crop-types';
import { getFieldCropHealth } from '@/lib/field-crop-health';
import type { FarmField, PlantCrop } from '@/types/domain';

type FieldStatus = 'Healthy' | 'Warning' | 'Critical';

function getFieldStatus(farmId: string, plants: PlantCrop[]): FieldStatus {
  const farmPlants = plants.filter((p) => p.farmId === farmId);
  if (farmPlants.some((p) => p.healthStatus === 'Critical')) return 'Critical';
  if (farmPlants.some((p) => p.healthStatus === 'Warning')) return 'Warning';
  return 'Healthy';
}

const statusTone: Record<FieldStatus, BadgeTone> = {
  Healthy: 'success',
  Warning: 'warning',
  Critical: 'danger',
};

// Late blight (the disease this app's demo data centers on) targets Solanaceae
// crops - flag fields growing them when the forecast turns humid.
const BLIGHT_SUSCEPTIBLE_CROP_PATTERN = /tomato|potato/i;

function isBlightSusceptible(cropType?: string): boolean {
  return !!cropType && BLIGHT_SUSCEPTIBLE_CROP_PATTERN.test(cropType);
}

interface FarmerOverviewSectionProps {
  user: any;
  farms: FarmField[];
  plants: PlantCrop[];
  weatherData: any;
  weatherLoading: boolean;
  weatherError: string;
  weatherLocationInput: string;
  isSavingWeatherLocation: boolean;
  onWeatherLocationInputChange: (value: string) => void;
  onSaveWeatherLocation: (event: React.FormEvent) => void;
  onViewField?: (farmId: string) => void;
}

interface AttentionRow {
  id: string;
  farmId: string;
  name: string;
  cropType: string;
  status: FieldStatus;
}

export default function FarmerOverviewSection({
  user,
  farms,
  plants,
  weatherData,
  weatherLoading,
  weatherError,
  weatherLocationInput,
  isSavingWeatherLocation,
  onWeatherLocationInputChange,
  onSaveWeatherLocation,
  onViewField,
}: FarmerOverviewSectionProps) {
  const totalFields = farms.length;
  const totalArea = farms.reduce((sum, f) => sum + (f.acreage || 0), 0);
  const fieldStatuses = farms.map((f) => ({ farm: f, status: getFieldStatus(f.id, plants) }));
  const cropStatuses = getFieldCropHealth(farms, plants);
  const criticalFields = fieldStatuses.filter((f) => f.status === 'Critical').length;
  const healthyFields = fieldStatuses.filter((f) => f.status === 'Healthy').length;
  const healthScore = totalFields > 0 ? Math.round((healthyFields / totalFields) * 100) : 100;

  const attentionRows: AttentionRow[] = cropStatuses
    .filter((item) => item.status === 'Warning' || item.status === 'Critical')
    .sort((a, b) => (a.status === b.status ? a.cropType.localeCompare(b.cropType) : a.status === 'Critical' ? -1 : 1))
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      farmId: item.farm.id,
      name: item.farm.name,
      cropType: item.cropType,
      status: item.status,
    }));

  // Weather-based risk alert: surface an upcoming humid/high-blight-risk day
  // against fields growing blight-susceptible crops, so the risk is tied to
  // specific fields rather than just a generic regional badge.
  const susceptibleFields = farms.filter((f) => parseCropTypes(f.cropTypes || f.cropType).some((crop) => isBlightSusceptible(crop)));
  const riskyForecastDay = weatherData?.forecast?.find((d: { sporeIndex: number }) => d.sporeIndex >= 6);
  const showWeatherRiskAlert =
    !!weatherData && susceptibleFields.length > 0 && (weatherData.current.blightRisk !== 'Low' || !!riskyForecastDay);

  const columns: TableColumn<AttentionRow>[] = [
    { key: 'name', header: 'Field' },
    {
      key: 'cropType',
      header: 'Crop',
      render: (row) => (
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {row.cropType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge>,
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => <ChevronRight className="ml-auto h-4 w-4 text-stone-400 dark:text-slate-500" />,
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Farm Operations Overview</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Today's field conditions and crop health at a glance.</p>
        </div>
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
      </div>

      <StatCardGrid>
        <StatCard label="Total Fields" value={totalFields} icon={Map} tone="info" />
        <StatCard label="Total Area" value={`${totalArea.toLocaleString()} acres`} icon={ShieldCheck} tone="neutral" />
        <StatCard label="Critical Fields" value={criticalFields} icon={AlertTriangle} tone={criticalFields > 0 ? 'danger' : 'neutral'} />
        <StatCard label="Overall Health Score" value={`${healthScore}%`} icon={ShieldCheck} tone={healthScore >= 80 ? 'success' : healthScore >= 50 ? 'warning' : 'danger'} />
      </StatCardGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader
              title="Regional Weather"
              subtitle="Live conditions for your registered location."
              action={<div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"><CloudSun className="h-5 w-5" /></div>}
            />
            <CardBody>
              <form onSubmit={onSaveWeatherLocation} className="mb-5 flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  value={weatherLocationInput}
                  onChange={(event) => onWeatherLocationInputChange(event.target.value)}
                  placeholder="Search city or region"
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/70 dark:focus:bg-slate-900"
                />
                <button
                  type="submit"
                  disabled={isSavingWeatherLocation || !weatherLocationInput.trim()}
                  className="rounded-xl bg-stone-900 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {isSavingWeatherLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                </button>
              </form>

              {weatherLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                </div>
              ) : weatherError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
                  {weatherError}. Update your registered location under Settings.
                </div>
              ) : weatherData ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight text-stone-950 dark:text-slate-50">
                      {weatherData.current.temp}{weatherData.current.unit}
                    </p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-slate-350">{weatherData.current.condition}</p>
                    <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">Based on {weatherData.resolvedLocation}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-4 text-center dark:border-slate-800">
                    {[
                      { label: 'Humidity', value: `${weatherData.current.humidity}%` },
                      { label: 'Wind', value: weatherData.current.wind },
                      { label: 'Moisture', value: weatherData.current.soilMoisture },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-stone-50 px-2 py-3 dark:bg-slate-950/40">
                        <span className="block text-[11px] font-medium text-stone-400 dark:text-slate-500">{item.label}</span>
                        <span className="mt-1 block text-sm font-semibold text-stone-900 dark:text-slate-100">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                  Weather data is unavailable for this account location.
                </div>
              )}
            </CardBody>
          </Card>

          {showWeatherRiskAlert && (
            <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-950/20">
              <CardBody className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Weather-Based Risk Alert</p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    {riskyForecastDay
                      ? `Upcoming high humidity (${riskyForecastDay.day}, ${riskyForecastDay.humidity}%) increases fungal blight risk for `
                      : `Current conditions (${weatherData.current.blightRisk} blight risk) increase fungal disease pressure for `}
                    {susceptibleFields.map((f) => f.name).join(', ')}. Consider a preventive fungicide pass or a follow-up scan.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <Card className="min-w-0">
          <CardHeader title="Fields Needing Attention" subtitle="Warning and critical fields, sorted worst-first." />
          <CardBody className="p-0 sm:p-0">
            <div className="p-5">
              <Table<AttentionRow>
                columns={columns}
                rows={attentionRows}
                onRowClick={(row) => onViewField?.(row.farmId)}
                emptyMessage="No fields currently need attention. Every field is healthy."
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </motion.div>
  );
}
