'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import type { FarmField, PlantCrop } from '@/types/domain';

type FieldStatus = 'Healthy' | 'Warning' | 'Critical';

function getFieldStatus(farmId: string, plants: PlantCrop[]): FieldStatus {
  const farmPlants = plants.filter((p) => p.farmId === farmId);
  if (farmPlants.some((p) => p.healthStatus === 'Critical')) return 'Critical';
  if (farmPlants.some((p) => p.healthStatus === 'Warning')) return 'Warning';
  return 'Healthy';
}

const statusColor: Record<FieldStatus, string> = {
  Healthy: '#10b981',
  Warning: '#f59e0b',
  Critical: '#ef4444',
};

function statusDivIcon(status: FieldStatus) {
  const color = statusColor[status];
  return L.divIcon({
    className: 'agriscan-field-marker',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

let iconsFixed = false;
function ensureDefaultIconFix() {
  if (iconsFixed) return;
  iconsFixed = true;
  // @ts-expect-error - _getIconUrl exists at runtime but isn't typed on the prototype
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface FarmerFieldMapSectionProps {
  farms: FarmField[];
  plants: PlantCrop[];
  onViewField?: (farmId: string) => void;
}

export default function FarmerFieldMapSection({ farms, plants, onViewField }: FarmerFieldMapSectionProps) {
  useEffect(() => {
    ensureDefaultIconFix();
  }, []);

  const [statusFilter, setStatusFilter] = useState<'all' | FieldStatus>('all');
  const [cropFilter, setCropFilter] = useState('all');

  const cropTypes = useMemo(
    () => Array.from(new Set(farms.map((f) => f.cropType).filter((c): c is string => !!c))).sort(),
    [farms]
  );

  const mappableFarms = useMemo(
    () =>
      farms
        .filter((f) => typeof f.latitude === 'number' && typeof f.longitude === 'number')
        .map((f) => ({ farm: f, status: getFieldStatus(f.id, plants) }))
        .filter(({ status }) => statusFilter === 'all' || status === statusFilter)
        .filter(({ farm }) => cropFilter === 'all' || farm.cropType === cropFilter),
    [farms, plants, statusFilter, cropFilter]
  );

  const center: [number, number] = mappableFarms.length > 0
    ? [mappableFarms[0].farm.latitude as number, mappableFarms[0].farm.longitude as number]
    : [37.5, -119.5]; // Central Valley, CA fallback

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Field Map</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Geographic view of every field with derived crop health status.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | FieldStatus)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All statuses</option>
          <option value="Healthy">Healthy</option>
          <option value="Warning">Warning</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={cropFilter}
          onChange={(e) => setCropFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All crop types</option>
          {cropTypes.map((crop) => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>
        <span className="text-xs text-stone-500 dark:text-slate-400">
          Showing {mappableFarms.length} of {farms.length} field{farms.length === 1 ? '' : 's'}
          {farms.some((f) => typeof f.latitude !== 'number' || typeof f.longitude !== 'number') && ' (some fields have no coordinates set)'}
        </span>
      </div>

      <Card>
        <CardHeader title="Fields" subtitle="Marker color reflects derived field health status." />
        <CardBody className="p-0">
          <div className="h-[560px] w-full overflow-hidden rounded-b-2xl">
            <MapContainer center={center} zoom={mappableFarms.length > 0 ? 9 : 5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {mappableFarms.map(({ farm, status }) => (
                <Marker
                  key={farm.id}
                  position={[farm.latitude as number, farm.longitude as number]}
                  icon={statusDivIcon(status)}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-stone-900">{farm.name}</p>
                      <p className="text-stone-600">{farm.acreage ? `${farm.acreage} acres` : 'Area not set'}</p>
                      <p className="text-stone-600">{farm.cropType || 'Crop type not set'}</p>
                      <p className="font-semibold" style={{ color: statusColor[status] }}>{status}</p>
                      <button
                        onClick={() => onViewField?.(farm.id)}
                        className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
