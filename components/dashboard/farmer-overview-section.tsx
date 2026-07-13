'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight, CloudSun, Droplets, FileDown, Loader2, Map, ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { Table, type TableColumn } from '@/components/ui/table';
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
  onViewField?: (farmId: string) => void;
}

interface AttentionRow {
  id: string;
  name: string;
  cropType: string;
  status: FieldStatus;
}

export default function FarmerOverviewSection({ user, farms, plants, onViewField }: FarmerOverviewSectionProps) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');

  // Fetch regional weather the same way the account-wide dashboard tab does:
  // prefer the saved profile location, else geolocation, else a sane default.
  useEffect(() => {
    setWeatherLoading(true);
    setWeatherError('');
    const preferredLocation = user?.location || '';
    const fetchWeather = (url: string) =>
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setWeatherData(data);
          } else {
            setWeatherData(null);
            setWeatherError(data.error || 'Weather data unavailable');
          }
        })
        .catch(() => {
          setWeatherData(null);
          setWeatherError('Weather data unavailable');
        })
        .finally(() => setWeatherLoading(false));

    if (preferredLocation) {
      fetchWeather(`/api/weather?location=${encodeURIComponent(preferredLocation)}`);
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(`/api/weather?lat=${latitude}&lon=${longitude}`);
        },
        () => fetchWeather('/api/weather?location=Central Valley, CA'),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 15 * 60 * 1000 }
      );
    } else {
      fetchWeather('/api/weather?location=Central Valley, CA');
    }
  }, [user?.location]);

  const totalFields = farms.length;
  const totalArea = farms.reduce((sum, f) => sum + (f.acreage || 0), 0);
  const fieldStatuses = farms.map((f) => ({ farm: f, status: getFieldStatus(f.id, plants) }));
  const criticalFields = fieldStatuses.filter((f) => f.status === 'Critical').length;
  const healthyFields = fieldStatuses.filter((f) => f.status === 'Healthy').length;
  const healthScore = totalFields > 0 ? Math.round((healthyFields / totalFields) * 100) : 100;

  const attentionRows: AttentionRow[] = fieldStatuses
    .filter((f) => f.status === 'Warning' || f.status === 'Critical')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'Critical' ? -1 : 1))
    .map((f) => ({ id: f.farm.id, name: f.farm.name, cropType: f.farm.cropType || 'Unspecified', status: f.status }));

  // Weather-based risk alert: surface an upcoming humid/high-blight-risk day
  // against fields growing blight-susceptible crops, so the risk is tied to
  // specific fields rather than just a generic regional badge.
  const susceptibleFields = farms.filter((f) => isBlightSusceptible(f.cropType));
  const riskyForecastDay = weatherData?.forecast?.find((d: { sporeIndex: number }) => d.sporeIndex >= 6);
  const showWeatherRiskAlert =
    !!weatherData && susceptibleFields.length > 0 && (weatherData.current.blightRisk !== 'Low' || !!riskyForecastDay);

  const columns: TableColumn<AttentionRow>[] = [
    { key: 'name', header: 'Field' },
    { key: 'cropType', header: 'Crop Type' },
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

      <Card>
        <CardHeader
          title="Regional Weather"
          subtitle="Live conditions for your registered location."
          action={<div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"><CloudSun className="h-5 w-5" /></div>}
        />
        <CardBody>
          {weatherLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            </div>
          ) : weatherError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm leading-6 text-amber-900 dark:text-amber-200 dark:border-amber-900/30">
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
              <div className="grid grid-cols-3 gap-2 border-t border-stone-100 dark:border-slate-800 pt-4 text-center">
                {[
                  { label: 'Humidity', value: `${weatherData.current.humidity}%` },
                  { label: 'Wind', value: weatherData.current.wind },
                  { label: 'Moisture', value: weatherData.current.soilMoisture },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-stone-50 dark:bg-slate-950/40 px-2 py-3">
                    <span className="block text-[11px] font-medium text-stone-400 dark:text-slate-500">{item.label}</span>
                    <span className="mt-1 block text-sm font-semibold text-stone-900 dark:text-slate-100">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/40 p-4 text-sm text-stone-500 dark:text-slate-400">
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

      <Card>
        <CardHeader title="Fields Needing Attention" subtitle="Warning and critical fields, sorted worst-first." />
        <CardBody className="p-0 sm:p-0">
          <div className="p-5">
            <Table<AttentionRow>
              columns={columns}
              rows={attentionRows}
              onRowClick={(row) => onViewField?.(row.id)}
              emptyMessage="No fields currently need attention. Every field is healthy."
            />
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
