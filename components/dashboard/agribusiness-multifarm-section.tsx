'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp, Link2, Loader2, MapPin, Plus, Sprout, Unlink } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import type { FarmField, PlantCrop } from '@/types/domain';

type FarmStatus = 'Healthy' | 'Warning' | 'Critical';

function getFarmStatus(farmId: string, plants: PlantCrop[]): FarmStatus {
  const farmPlants = plants.filter((p) => p.farmId === farmId);
  if (farmPlants.some((p) => p.healthStatus === 'Critical')) return 'Critical';
  if (farmPlants.some((p) => p.healthStatus === 'Warning')) return 'Warning';
  return 'Healthy';
}

const statusTone: Record<FarmStatus, BadgeTone> = {
  Healthy: 'success',
  Warning: 'warning',
  Critical: 'danger',
};

function inferFarmType(cropType?: string): string {
  const value = (cropType || '').toLowerCase();
  if (value.includes('seedling') || value.includes('nursery')) return 'Nursery';
  return 'Commercial Farm';
}

interface AgribusinessMultifarmSectionProps {
  farms: FarmField[];
  plants: PlantCrop[];
}

export default function AgribusinessMultifarmSection({ farms, plants }: AgribusinessMultifarmSectionProps) {
  const [orgId, setOrgId] = useState('');
  const [linkedFarms, setLinkedFarms] = useState<FarmField[]>([]);
  const [allFarms, setAllFarms] = useState<FarmField[]>(farms);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [expandedFarmId, setExpandedFarmId] = useState<string | null>(null);

  const fetchLinkedFarms = (id: string) => {
    fetch(`/api/organization-farms?orgId=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLinkedFarms(data.farms);
      });
  };

  const fetchAllFarms = () => {
    fetch('/api/farms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAllFarms(data.farms);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    setError('');
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrgId(data.organization.id);
          return Promise.all([
            fetch(`/api/organization-farms?orgId=${encodeURIComponent(data.organization.id)}`).then((res) => res.json()),
            fetch('/api/farms').then((res) => res.json()),
          ]).then(([orgFarmsData, farmsData]) => {
            if (orgFarmsData.success) setLinkedFarms(orgFarmsData.farms);
            if (farmsData.success) setAllFarms(farmsData.farms);
          });
        } else {
          setError(data.error || 'Failed to load organization.');
        }
      })
      .catch(() => setError('Failed to load organization.'))
      .finally(() => setIsLoading(false));
  }, []);

  const unlinkedFarms = useMemo(() => {
    const linkedIds = new Set(linkedFarms.map((f) => f.id));
    return allFarms.filter((f) => !linkedIds.has(f.id));
  }, [allFarms, linkedFarms]);

  const linkFarm = async (farmId: string) => {
    if (!orgId) return;
    setLinkingId(farmId);
    try {
      const res = await fetch('/api/organization-farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, farmId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLinkedFarms(orgId);
        fetchAllFarms();
      }
    } catch (err) {
      console.error('Failed to link farm:', err);
    } finally {
      setLinkingId(null);
    }
  };

  const unlinkFarm = async (farmId: string) => {
    if (!orgId) return;
    setUnlinkingId(farmId);
    try {
      const res = await fetch(`/api/organization-farms?orgId=${encodeURIComponent(orgId)}&farmId=${encodeURIComponent(farmId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchLinkedFarms(orgId);
        fetchAllFarms();
      }
    } catch (err) {
      console.error('Failed to unlink farm:', err);
    } finally {
      setUnlinkingId(null);
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Multi-Farm Manager</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Link and manage every farm or site under your organization.</p>
        </div>
        <button
          onClick={() => setShowLinkModal(true)}
          disabled={!orgId}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-55"
        >
          <Plus className="h-4 w-4" />
          Link New Farm
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : linkedFarms.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-50">No farms linked yet</h2>
            <p className="max-w-sm text-sm text-stone-500 dark:text-slate-400">
              Link one of your farms to this organization to start tracking it across the Agribusiness dashboard.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {linkedFarms.map((farm) => {
            const status = getFarmStatus(farm.id, plants);
            const isExpanded = expandedFarmId === farm.id;
            const plantCount = plants.filter((p) => p.farmId === farm.id).length;
            return (
              <Card key={farm.id}>
                <CardHeader
                  title={farm.name}
                  subtitle={inferFarmType(farm.cropType)}
                  action={<Badge tone={statusTone[status]}>{status}</Badge>}
                />
                <CardBody className="space-y-3">
                  <button
                    onClick={() => setExpandedFarmId(isExpanded ? null : farm.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    View Details
                  </button>

                  {isExpanded && (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-stone-400 dark:text-slate-500">Acreage</span>
                        <span className="font-semibold">{farm.acreage ? `${farm.acreage.toLocaleString()} acres` : 'Unspecified'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-stone-400 dark:text-slate-500">Crop Type</span>
                        <span className="font-semibold">{farm.cropType || 'Unspecified'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-stone-400 dark:text-slate-500">Plant Count</span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Sprout className="h-3 w-3" />
                          {plantCount}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => unlinkFarm(farm.id)}
                    disabled={unlinkingId === farm.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-55 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    {unlinkingId === farm.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                    Unlink
                  </button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link New Farm">
        {unlinkedFarms.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500 dark:text-slate-400">
            All of your farms are already linked to this organization.
          </p>
        ) : (
          <div className="space-y-2">
            {unlinkedFarms.map((farm) => (
              <div
                key={farm.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900 dark:text-slate-50">{farm.name}</p>
                  <p className="text-xs text-stone-500 dark:text-slate-400">{farm.cropType || 'Unspecified crop'}</p>
                </div>
                <button
                  onClick={() => linkFarm(farm.id)}
                  disabled={linkingId === farm.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-55"
                >
                  {linkingId === farm.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                  Link
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
