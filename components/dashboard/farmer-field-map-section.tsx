'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { AlertTriangle, CheckCircle, Loader2, Map, MapPin, Plus, ShieldCheck, Sprout, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { parseCropTypes } from '@/lib/crop-types';
import { getFieldCropHealth } from '@/lib/field-crop-health';
import type { FarmField, FieldScan, PlantCrop, ScanResultItem } from '@/types/domain';

type FieldStatus = 'Healthy' | 'Warning' | 'Critical';

function offsetCropMarker(latitude: number, longitude: number, index: number, total: number): [number, number] {
  if (total <= 1) return [latitude, longitude];
  const radius = 0.012;
  const angle = (Math.PI * 2 * index) / total;
  return [latitude + Math.cos(angle) * radius, longitude + Math.sin(angle) * radius];
}

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

const severityColor: Record<ScanResultItem['severity'], string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
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

function FieldMapViewport({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 9, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: 9,
      animate: false,
    });
  }, [map, points]);

  return null;
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
  selectedFieldId?: string | null;
  onViewField?: (farmId: string) => void;
  onCloseFieldDetails?: () => void;
  onFieldCreated?: () => Promise<void>;
}

export default function FarmerFieldMapSection({
  farms,
  plants,
  selectedFieldId,
  onViewField,
  onCloseFieldDetails,
  onFieldCreated,
}: FarmerFieldMapSectionProps) {
  useEffect(() => {
    ensureDefaultIconFix();
  }, []);

  const [statusFilter, setStatusFilter] = useState<'all' | FieldStatus>('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldCropType, setNewFieldCropType] = useState('');
  const [newFieldAcreage, setNewFieldAcreage] = useState('');
  const [newFieldLocation, setNewFieldLocation] = useState('');
  const [newFieldLatitude, setNewFieldLatitude] = useState('');
  const [newFieldLongitude, setNewFieldLongitude] = useState('');
  const [newFieldError, setNewFieldError] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [additionalCropType, setAdditionalCropType] = useState('');
  const [cropUpdateError, setCropUpdateError] = useState('');
  const [isUpdatingCrops, setIsUpdatingCrops] = useState(false);
  const [selectedCropType, setSelectedCropType] = useState('');
  const [allFieldScans, setAllFieldScans] = useState<FieldScan[]>([]);
  const [fieldScans, setFieldScans] = useState<FieldScan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldLocation, setEditFieldLocation] = useState('');
  const [editFieldAcreage, setEditFieldAcreage] = useState('');
  const [editFieldLatitude, setEditFieldLatitude] = useState('');
  const [editFieldLongitude, setEditFieldLongitude] = useState('');
  const [fieldUpdateError, setFieldUpdateError] = useState('');
  const [isUpdatingField, setIsUpdatingField] = useState(false);

  useEffect(() => {
    if (selectedFieldId) {
      setStatusFilter('all');
      setFieldFilter(selectedFieldId);
    }
  }, [selectedFieldId]);

  const selectedField = selectedFieldId ? farms.find((farm) => farm.id === selectedFieldId) : undefined;
  const filteredField = fieldFilter !== 'all' ? farms.find((farm) => farm.id === fieldFilter) : undefined;
  const cropEditField = selectedField || filteredField;
  const effectiveFieldFilter = fieldFilter !== 'all' ? fieldFilter : 'all';
  const selectedFieldCropTypes = parseCropTypes(selectedField?.cropTypes || selectedField?.cropType);
  const cropHealth = useMemo(() => getFieldCropHealth(farms, plants, allFieldScans), [farms, plants, allFieldScans]);
  const selectedFieldCropHealth = selectedField ? cropHealth.filter((item) => item.farm.id === selectedField.id) : [];
  const selectedCropHealth = selectedFieldCropHealth.find((item) => item.cropType.toLowerCase() === selectedCropType.toLowerCase()) || selectedFieldCropHealth[0];
  const selectedFieldStatus = selectedField ? getFieldStatus(selectedField.id, plants) : undefined;
  const latestScanResult = useMemo(() => {
    const cropKey = selectedCropHealth?.cropType.toLowerCase();
    if (!cropKey) return null;

    if (selectedCropHealth?.latestScanResult) {
      return { scan: null, result: selectedCropHealth.latestScanResult };
    }

    for (const scan of fieldScans) {
      const result = (scan.results || []).find((item) => item.cropType?.toLowerCase() === cropKey);
      if (result) return { scan, result };
    }
    return null;
  }, [fieldScans, selectedCropHealth?.cropType, selectedCropHealth?.latestScanResult]);
  const scannerStatus: FieldStatus | undefined = latestScanResult
    ? latestScanResult.result.diagnosis === 'Healthy' || latestScanResult.result.likelyCause === 'Healthy'
      ? 'Healthy'
      : latestScanResult.result.severity === 'High' || latestScanResult.result.treatmentPriority === 'Urgent'
        ? 'Critical'
        : 'Warning'
    : undefined;
  const detailStatus = scannerStatus || selectedCropHealth?.status || selectedFieldStatus;

  useEffect(() => {
    if (selectedFieldCropTypes.length > 0 && !selectedFieldCropTypes.some((crop) => crop.toLowerCase() === selectedCropType.toLowerCase())) {
      setSelectedCropType(selectedFieldCropTypes[0]);
    }
  }, [selectedField?.id, selectedFieldCropTypes.join('|'), selectedCropType]);

  useEffect(() => {
    if (!cropEditField) {
      setEditFieldName('');
      setEditFieldLocation('');
      setEditFieldAcreage('');
      setEditFieldLatitude('');
      setEditFieldLongitude('');
      setFieldUpdateError('');
      setCropUpdateError('');
      return;
    }

    setEditFieldName(cropEditField.name || '');
    setEditFieldLocation(cropEditField.location || '');
    setEditFieldAcreage(cropEditField.acreage === undefined ? '' : String(cropEditField.acreage));
    setEditFieldLatitude(cropEditField.latitude === undefined ? '' : String(cropEditField.latitude));
    setEditFieldLongitude(cropEditField.longitude === undefined ? '' : String(cropEditField.longitude));
    setFieldUpdateError('');
    setCropUpdateError('');
  }, [cropEditField?.id]);

  useEffect(() => {
    fetch('/api/farmer/field-scans')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setAllFieldScans(payload.fieldScans || []);
        else setAllFieldScans([]);
      })
      .catch(() => setAllFieldScans([]));
  }, [farms.length]);

  useEffect(() => {
    if (!selectedField) {
      setFieldScans([]);
      return;
    }

    setIsLoadingScans(true);
    fetch(`/api/farmer/field-scans?farmId=${encodeURIComponent(selectedField.id)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setFieldScans(payload.fieldScans || []);
        else setFieldScans([]);
      })
      .catch(() => setFieldScans([]))
      .finally(() => setIsLoadingScans(false));
  }, [selectedField?.id]);

  const mappableCropMarkers = useMemo(
    () =>
      farms
        .filter((farm) => typeof farm.latitude === 'number' && typeof farm.longitude === 'number')
        .flatMap((farm) => {
          const farmCrops = cropHealth.filter((item) => item.farm.id === farm.id);
          return farmCrops.map((item, index) => ({
            ...item,
            position: offsetCropMarker(farm.latitude as number, farm.longitude as number, index, farmCrops.length),
          }));
        })
        .filter((item) => statusFilter === 'all' || item.status === statusFilter)
        .filter((item) => effectiveFieldFilter === 'all' || item.farm.id === effectiveFieldFilter),
    [farms, cropHealth, statusFilter, effectiveFieldFilter]
  );

  const center: [number, number] =
    selectedField && typeof selectedField.latitude === 'number' && typeof selectedField.longitude === 'number'
      ? [selectedField.latitude, selectedField.longitude]
      : mappableCropMarkers.length > 0
        ? mappableCropMarkers[0].position
        : [37.5, -119.5]; // Central Valley, CA fallback
  const mapPoints = useMemo(
    () => mappableCropMarkers.map(({ position }) => position),
    [mappableCropMarkers]
  );
  const visibleFieldCount = useMemo(
    () => new Set(mappableCropMarkers.map((item) => item.farm.id)).size,
    [mappableCropMarkers]
  );

  const handleAddField = async (event: React.FormEvent) => {
    event.preventDefault();
    setNewFieldError('');

    const latitude = Number(newFieldLatitude);
    const longitude = Number(newFieldLongitude);
    const acreage = newFieldAcreage ? Number(newFieldAcreage) : undefined;

    if (!newFieldName.trim()) {
      setNewFieldError('Field name is required.');
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setNewFieldError('Latitude must be a number between -90 and 90.');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setNewFieldError('Longitude must be a number between -180 and 180.');
      return;
    }
    if (acreage !== undefined && (!Number.isFinite(acreage) || acreage < 0)) {
      setNewFieldError('Acreage must be a positive number.');
      return;
    }

    setIsSavingField(true);
    try {
      const response = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFieldName.trim(),
          cropTypes: parseCropTypes(newFieldCropType),
          acreage,
          location: newFieldLocation.trim() || undefined,
          latitude,
          longitude,
          zoneCount: 1,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setNewFieldError(payload.error || 'Failed to create field.');
        return;
      }

      setNewFieldName('');
      setNewFieldCropType('');
      setNewFieldAcreage('');
      setNewFieldLocation('');
      setNewFieldLatitude('');
      setNewFieldLongitude('');
      setStatusFilter('all');
      setFieldFilter('all');
      setIsAddFieldOpen(false);
      await onFieldCreated?.();
      onViewField?.(payload.farm.id);
    } catch {
      setNewFieldError('Failed to create field.');
    } finally {
      setIsSavingField(false);
    }
  };

  const handleAddCropType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cropEditField) {
      setCropUpdateError('Select a field before adding a crop type.');
      return;
    }

    const nextCrop = additionalCropType.trim();
    if (!nextCrop) return;

    const currentCrops = parseCropTypes(cropEditField.cropTypes || cropEditField.cropType);
    if (currentCrops.some((crop) => crop.toLowerCase() === nextCrop.toLowerCase())) {
      setCropUpdateError('This crop type is already listed for the field.');
      return;
    }

    setIsUpdatingCrops(true);
    setCropUpdateError('');
    try {
      const response = await fetch('/api/farms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cropEditField.id,
          cropTypes: [...currentCrops, nextCrop],
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setCropUpdateError(payload.error || 'Failed to update crop types.');
        return;
      }

      setAdditionalCropType('');
      setFieldFilter(cropEditField.id);
      await onFieldCreated?.();
    } catch {
      setCropUpdateError('Failed to update crop types.');
    } finally {
      setIsUpdatingCrops(false);
    }
  };

  const handleUpdateField = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cropEditField) return;

    const acreage = editFieldAcreage.trim() ? Number(editFieldAcreage) : null;
    const latitude = editFieldLatitude.trim() ? Number(editFieldLatitude) : null;
    const longitude = editFieldLongitude.trim() ? Number(editFieldLongitude) : null;

    if (!editFieldName.trim()) {
      setFieldUpdateError('Field name is required.');
      return;
    }
    if (acreage !== null && (!Number.isFinite(acreage) || acreage < 0)) {
      setFieldUpdateError('Acreage must be a positive number.');
      return;
    }
    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      setFieldUpdateError('Latitude must be between -90 and 90.');
      return;
    }
    if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      setFieldUpdateError('Longitude must be between -180 and 180.');
      return;
    }

    setIsUpdatingField(true);
    setFieldUpdateError('');
    try {
      const response = await fetch('/api/farms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cropEditField.id,
          name: editFieldName.trim(),
          location: editFieldLocation.trim(),
          acreage,
          latitude,
          longitude,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setFieldUpdateError(payload.error || 'Failed to update field.');
        return;
      }

      await onFieldCreated?.();
    } catch {
      setFieldUpdateError('Failed to update field.');
    } finally {
      setIsUpdatingField(false);
    }
  };

  const handleDeleteCropType = async (cropType: string) => {
    if (!cropEditField) return;

    const currentCrops = parseCropTypes(cropEditField.cropTypes || cropEditField.cropType);
    const nextCrops = currentCrops.filter((crop) => crop.toLowerCase() !== cropType.toLowerCase());

    setIsUpdatingCrops(true);
    setCropUpdateError('');
    try {
      const response = await fetch('/api/farms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cropEditField.id,
          cropTypes: nextCrops,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setCropUpdateError(payload.error || 'Failed to delete crop type.');
        return;
      }

      setSelectedCropType(nextCrops[0] || '');
      await onFieldCreated?.();
    } catch {
      setCropUpdateError('Failed to delete crop type.');
    } finally {
      setIsUpdatingCrops(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Field Map</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Geographic view of every field with derived crop health status.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddFieldOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          <span>Add Field</span>
        </button>
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
          value={fieldFilter}
          onChange={(e) => {
            const nextFieldFilter = e.target.value;
            setFieldFilter(nextFieldFilter);
            if (selectedFieldId && nextFieldFilter !== selectedFieldId) {
              onCloseFieldDetails?.();
            }
          }}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All fields</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>{farm.name}</option>
          ))}
        </select>
        <span className="text-xs text-stone-500 dark:text-slate-400">
          Showing {mappableCropMarkers.length} crop marker{mappableCropMarkers.length === 1 ? '' : 's'} across {visibleFieldCount} field{visibleFieldCount === 1 ? '' : 's'}
          {farms.some((f) => typeof f.latitude !== 'number' || typeof f.longitude !== 'number') && ' (some fields have no coordinates set)'}
        </span>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <CardHeader title="Fields" subtitle="Marker color reflects derived field health status." />
          <CardBody className="p-0">
            <div className="h-[560px] w-full overflow-hidden rounded-b-2xl">
              <MapContainer center={center} zoom={mappableCropMarkers.length > 0 ? 9 : 5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                <FieldMapViewport points={mapPoints} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {mappableCropMarkers.map(({ farm, cropType, status, position }) => (
                  <Marker
                    key={`${farm.id}:${cropType}`}
                    position={position}
                    icon={statusDivIcon(status)}
                  >
                    <Popup>
                      <div className="space-y-2 text-sm">
                        <p className="font-bold text-stone-900">{farm.name}</p>
                        <p className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {cropType}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCropType(cropType);
                            onViewField?.(farm.id);
                          }}
                          className="mt-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {cropEditField && (
              <div className="border-t border-stone-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Add Crop To Field</p>
                    <p className="mt-1 text-sm font-semibold text-stone-950 dark:text-slate-50">{cropEditField.name}</p>
                  </div>
                  <form onSubmit={handleAddCropType} className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
                    <input
                      type="text"
                      value={additionalCropType}
                      onChange={(event) => setAdditionalCropType(event.target.value)}
                      placeholder="Add crop type"
                      className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingCrops || !additionalCropType.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      {isUpdatingCrops ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      <span>Add Crop</span>
                    </button>
                  </form>
                </div>
                {cropUpdateError && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{cropUpdateError}</p>}
                <div className="mt-4 border-t border-stone-100 pt-4 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Manage Field</p>
                  <form onSubmit={handleUpdateField} className="mt-3 grid gap-3 lg:grid-cols-[minmax(160px,1.2fr)_minmax(140px,1fr)_110px_110px_110px_auto]">
                    <input
                      type="text"
                      value={editFieldName}
                      onChange={(event) => setEditFieldName(event.target.value)}
                      placeholder="Field name"
                      className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={editFieldLocation}
                      onChange={(event) => setEditFieldLocation(event.target.value)}
                      placeholder="Location"
                      className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editFieldAcreage}
                      onChange={(event) => setEditFieldAcreage(event.target.value)}
                      placeholder="Acres"
                      className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      min="-90"
                      max="90"
                      step="0.000001"
                      value={editFieldLatitude}
                      onChange={(event) => setEditFieldLatitude(event.target.value)}
                      placeholder="Lat"
                      className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="0.000001"
                      value={editFieldLongitude}
                      onChange={(event) => setEditFieldLongitude(event.target.value)}
                      placeholder="Lng"
                      className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingField}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isUpdatingField && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save
                    </button>
                  </form>
                  {fieldUpdateError && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{fieldUpdateError}</p>}
                  {parseCropTypes(cropEditField.cropTypes || cropEditField.cropType).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {parseCropTypes(cropEditField.cropTypes || cropEditField.cropType).map((crop) => (
                        <span key={crop} className="inline-flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-800 dark:bg-slate-900 dark:text-slate-100">
                          {crop}
                          <button
                            type="button"
                            onClick={() => handleDeleteCropType(crop)}
                            disabled={isUpdatingCrops}
                            className="rounded-md border border-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Field Details"
            subtitle={selectedField ? 'Selected field profile from the map.' : 'Open a marker to inspect field data.'}
            action={selectedField && onCloseFieldDetails ? (
              <button
                type="button"
                onClick={onCloseFieldDetails}
                className="rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close field details"
              >
                <X className="h-4 w-4" />
              </button>
            ) : undefined}
          />
          <CardBody>
            {selectedField && detailStatus ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xl font-bold text-stone-950 dark:text-slate-50">{selectedField.name}</p>
                  <p className="mt-1 break-all text-xs text-stone-400 dark:text-slate-500">ID: {selectedField.id}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    { label: 'Status', value: detailStatus, icon: ShieldCheck, color: statusColor[detailStatus] },
                    {
                      label: 'Crop',
                      value: selectedCropHealth?.cropType || selectedFieldCropTypes[0] || 'Not set',
                      icon: Sprout,
                    },
                    { label: 'Area', value: selectedField.acreage ? `${selectedField.acreage} acres` : 'Not set', icon: Map },
                    { label: 'Location', value: selectedField.location || 'Not set', icon: MapPin },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">{item.label}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-stone-950 dark:text-slate-50" style={item.color ? { color: item.color } : undefined}>
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {isLoadingScans ? (
                  <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/40">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : latestScanResult ? (
                  <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Scanner Findings</p>
                        <p className="mt-1 text-sm font-bold text-stone-950 dark:text-slate-50">{latestScanResult.result.diagnosis}</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: severityColor[latestScanResult.result.severity] }}>
                        {latestScanResult.result.severity}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-stone-50 p-2 dark:bg-slate-900">
                        <span className="block text-stone-400 dark:text-slate-500">Confidence</span>
                        <strong className="text-stone-900 dark:text-slate-100">{Math.round(latestScanResult.result.confidence)}%</strong>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-2 dark:bg-slate-900">
                        <span className="block text-stone-400 dark:text-slate-500">Affected</span>
                        <strong className="text-stone-900 dark:text-slate-100">{latestScanResult.result.affectedAreaPercent ?? 0}%</strong>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-stone-600 dark:text-slate-300">{latestScanResult.result.symptoms}</p>
                    {latestScanResult.result.recommendedAction && (
                      <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs leading-5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {latestScanResult.result.recommendedAction}
                      </p>
                    )}
                  </div>
                ) : null}

              </div>
            ) : selectedFieldId ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
                This field could not be found. It may have been removed or filtered out.
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                Choose View Details from any field marker to review its crop, acreage, health status, and coordinates here.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={isAddFieldOpen}
        onClose={() => {
          if (!isSavingField) setIsAddFieldOpen(false);
        }}
        title="Add Field"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddFieldOpen(false)}
              disabled={isSavingField}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-field-form"
              disabled={isSavingField}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              {isSavingField ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span>{isSavingField ? 'Saving...' : 'Create Field'}</span>
            </button>
          </>
        }
      >
        <form id="add-field-form" onSubmit={handleAddField} className="space-y-5">
          {newFieldError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{newFieldError}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Field Name</span>
              <input
                type="text"
                required
                value={newFieldName}
                onChange={(event) => setNewFieldName(event.target.value)}
                placeholder="Block C - Roma Tomato"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Crop Type</span>
              <input
                type="text"
                value={newFieldCropType}
                onChange={(event) => setNewFieldCropType(event.target.value)}
                placeholder="Tomato"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Acreage</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={newFieldAcreage}
                onChange={(event) => setNewFieldAcreage(event.target.value)}
                placeholder="35"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Location Label</span>
              <input
                type="text"
                value={newFieldLocation}
                onChange={(event) => setNewFieldLocation(event.target.value)}
                placeholder="Fresno north block"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Latitude</span>
              <input
                type="number"
                required
                min="-90"
                max="90"
                step="0.000001"
                value={newFieldLatitude}
                onChange={(event) => setNewFieldLatitude(event.target.value)}
                placeholder="36.7378"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-stone-500 dark:text-slate-400">Longitude</span>
              <input
                type="number"
                required
                min="-180"
                max="180"
                step="0.000001"
                value={newFieldLongitude}
                onChange={(event) => setNewFieldLongitude(event.target.value)}
                placeholder="-119.7871"
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
