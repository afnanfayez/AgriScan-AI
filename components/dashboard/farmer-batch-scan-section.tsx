'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle, Loader2, Trash, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { useImageCapture } from '@/hooks/use-image-capture';
import type { FarmField, FieldScan, ScanResultItem } from '@/types/domain';

const severityTone: Record<ScanResultItem['severity'], BadgeTone> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldScan, setFieldScan] = useState<FieldScan | null>(null);

  const canSubmit = !!selectedFarmId && images.length > 0 && !isSubmitting;

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
        body: JSON.stringify({ farmId: selectedFarmId, images: images.map((i) => i.dataUrl) }),
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
        <CardHeader title="1. Select a field" />
        <CardBody>
          <select
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Choose a field...</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="2. Capture or upload samples" subtitle={`${images.length} image${images.length === 1 ? '' : 's'} queued`} />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Camera className="h-4 w-4" />
                Open Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Close Camera
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" />
              Upload Photos
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
          </div>

          {isCameraActive && (
            <div className="space-y-3">
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
              {captureError}
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
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
          )}
        </CardBody>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={runBatchAnalysis}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {isSubmitting ? 'Running batch analysis...' : 'Run Batch Analysis'}
        </button>
        {!selectedFarmId && <span className="text-xs text-stone-500 dark:text-slate-400">Select a field to continue.</span>}
      </div>

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
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fieldScan.results.map((result, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-stone-200 dark:border-slate-800">
                  <img src={result.imageUrl} alt={result.diagnosis} className="h-36 w-full object-cover" />
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-stone-900 dark:text-slate-50">{result.diagnosis}</span>
                      <Badge tone={severityTone[result.severity]}>{result.severity}</Badge>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-slate-400">Confidence: {Math.round(result.confidence)}%</p>
                    <p className="text-xs leading-relaxed text-stone-600 dark:text-slate-300">{result.symptoms}</p>
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
