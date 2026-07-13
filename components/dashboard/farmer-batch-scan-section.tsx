'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle, Loader2, Trash, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { useImageCapture } from '@/hooks/use-image-capture';
import { parseCropTypes } from '@/lib/crop-types';
import type { FarmField, FieldScan, ScanResultItem } from '@/types/domain';

const severityTone: Record<ScanResultItem['severity'], BadgeTone> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};

// Healthy diagnoses render green regardless of the Low/Medium/High severity
// scale, so the heatmap reads as "affected vs not" rather than always-amber.
function zoneColor(result: ScanResultItem): string {
  if (result.diagnosis === 'Healthy') return 'bg-emerald-500';
  if (result.severity === 'High') return 'bg-red-500';
  if (result.severity === 'Medium') return 'bg-amber-500';
  return 'bg-emerald-400';
}

interface FarmerBatchScanSectionProps {
  farms: FarmField[];
  onScanComplete?: () => void;
}

export default function FarmerBatchScanSection({ farms, onScanComplete }: FarmerBatchScanSectionProps) {
  const {
    images,
    videoRef,
    isCameraActive,
    error: captureError,
    startCamera,
    stopCamera,
    addFromVideo,
    addFromFiles,
    removeImage,
    clearImages,
  } = useImageCapture();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCropType, setSelectedCropType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldScan, setFieldScan] = useState<FieldScan | null>(null);

  const canSubmit = !!selectedFarmId && images.length > 0 && !isSubmitting;
  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId);
  const selectedFarmCropTypes = parseCropTypes(selectedFarm?.cropTypes || selectedFarm?.cropType);

  useEffect(() => {
    setSelectedCropType(selectedFarmCropTypes[0] || '');
  }, [selectedFarmId, selectedFarmCropTypes.join('|')]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFromFiles(e.target.files);
    }
    e.target.value = '';
  };

  const runBatchAnalysis = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError('');
    setFieldScan(null);
    try {
      const res = await fetch('/api/farmer/field-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId: selectedFarmId, cropType: selectedCropType || undefined, images: images.map((i) => i.dataUrl) }),
      });
      const data = await res.json();
      if (data.success) {
        setFieldScan(data.fieldScan);
        clearImages();
        onScanComplete?.();
      } else {
        setSubmitError(data.error || 'Batch analysis failed. Please try again.');
      }
    } catch (error: any) {
      setSubmitError(error.message || 'An error occurred while running the batch analysis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const healthyPct = fieldScan && fieldScan.totalSamples > 0
    ? Math.round((fieldScan.healthyCount / fieldScan.totalSamples) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Crop Scanner</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
          Capture or upload a batch of sample photos from a field for AI-powered disease screening across the whole plot.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Field Sample Intake"
          subtitle="Select the field, then capture or upload representative crop samples."
        />
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-stone-950 dark:text-slate-50">1. Select a field</p>
                <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">Analysis uses this field's crop profile as Gemini context.</p>
              </div>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Choose a field...</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>

              {selectedFarm && (
                <div className="mt-4 space-y-2 rounded-xl border border-stone-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div>
                    <span className="text-stone-500 dark:text-slate-400">Crop profile</span>
                    {selectedFarmCropTypes.length > 1 ? (
                      <select
                        value={selectedCropType}
                        onChange={(event) => setSelectedCropType(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {selectedFarmCropTypes.map((crop) => (
                          <option key={crop} value={crop}>{crop}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="mt-2 block rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {selectedFarmCropTypes[0] || 'Not set'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500 dark:text-slate-400">Area</span>
                    <span className="font-semibold text-stone-900 dark:text-slate-100">{selectedFarm.acreage ? `${selectedFarm.acreage} acres` : 'Not set'}</span>
                  </div>
                </div>
              )}

              <button
                onClick={runBatchAnalysis}
                disabled={!canSubmit}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isSubmitting ? 'Running analysis...' : 'Run Field Analysis'}
              </button>
              {!selectedFarmId && <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">Select a field to continue.</p>}
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-stone-950 dark:text-slate-50">2. Capture or upload samples</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{images.length} image{images.length === 1 ? '' : 's'} queued</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isCameraActive ? (
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <Camera className="h-4 w-4" />
                      Open Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Close Camera
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Photos
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
                </div>
              </div>

              {isCameraActive && (
                <div className="mt-4 space-y-3">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-w-xl rounded-2xl border border-stone-200 bg-black dark:border-slate-800" />
                  <button
                    onClick={addFromVideo}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    <Camera className="h-4 w-4" />
                    Capture Photo
                  </button>
                </div>
              )}

              {captureError && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
                  {captureError}
                </div>
              )}

              {images.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {images.map((image) => (
                    <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 dark:border-slate-800">
                      <img src={image.dataUrl} alt="Sample" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-stone-950/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                  Add leaf, fruit, stem, canopy, or field-row photos from several points in the field.
                </div>
              )}
            </section>
          </div>
        </CardBody>
      </Card>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
          {submitError}
        </div>
      )}

      {fieldScan && (
        <Card>
          <CardHeader
            title="Batch Results"
            subtitle={`${fieldScan.healthyCount} of ${fieldScan.totalSamples} samples healthy - ${healthyPct}% healthy (${fieldScan.infectionPercentage}% infection rate)`}
          />
          <CardBody className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                Field Health Heatmap — one cell per sampled zone
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fieldScan.results.map((result, index) => (
                  <div
                    key={index}
                    title={`Zone ${index + 1}: ${result.diagnosis} (${result.severity})`}
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-[10px] font-semibold text-white ${zoneColor(result)}`}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fieldScan.results.map((result, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-stone-200 dark:border-slate-800">
                  <img src={result.imageUrl} alt={result.diagnosis} className="h-36 w-full object-cover" />
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-stone-900 dark:text-slate-50">{result.diagnosis}</span>
                      <Badge tone={severityTone[result.severity]}>{result.severity}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-stone-50 p-2 dark:bg-slate-950/50">
                        <span className="block text-stone-400 dark:text-slate-500">Confidence</span>
                        <strong className="text-stone-900 dark:text-slate-100">{Math.round(result.confidence)}%</strong>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-2 dark:bg-slate-950/50">
                        <span className="block text-stone-400 dark:text-slate-500">Affected</span>
                        <strong className="text-stone-900 dark:text-slate-100">{result.affectedAreaPercent ?? 0}%</strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(result.visibleOrgans || []).slice(0, 4).map((organ) => (
                        <span key={organ} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {organ}
                        </span>
                      ))}
                      {result.likelyCause && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-slate-800 dark:text-slate-300">
                          {result.likelyCause}
                        </span>
                      )}
                      {result.treatmentPriority && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {result.treatmentPriority}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-stone-600 dark:text-slate-300">{result.symptoms}</p>
                    {result.scoutingNotes && (
                      <p className="rounded-lg bg-blue-50 p-2 text-xs leading-relaxed text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
                        <strong>Scout next:</strong> {result.scoutingNotes}
                      </p>
                    )}
                    {result.recommendedAction && (
                      <p className="rounded-lg bg-emerald-50 p-2 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <strong>Action:</strong> {result.recommendedAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </motion.div>
  );
}
