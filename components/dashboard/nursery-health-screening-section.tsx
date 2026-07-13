'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Camera, CheckCircle, Loader2, Trash, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { useImageCapture } from '@/hooks/use-image-capture';
import type { BatchScan, InventoryBatch, ScanResultItem } from '@/types/domain';

const severityTone: Record<ScanResultItem['severity'], BadgeTone> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};

const INFECTION_THRESHOLD = 25;

export default function NurseryHealthScreeningSection() {
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
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [batchScan, setBatchScan] = useState<BatchScan | null>(null);

  useEffect(() => {
    setBatchesLoading(true);
    fetch('/api/inventory-batches')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBatches(data.batches);
      })
      .finally(() => setBatchesLoading(false));
  }, []);

  const canSubmit = !!selectedBatchId && images.length > 0 && !isSubmitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFromFiles(e.target.files);
    }
    e.target.value = '';
  };

  const runScreening = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError('');
    setBatchScan(null);
    try {
      const res = await fetch('/api/nursery/batch-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: selectedBatchId, images: images.map((i) => i.dataUrl) }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchScan(data.batchScan);
        clearImages();
      } else {
        setSubmitError(data.error || 'Health screening failed. Please try again.');
      }
    } catch (error: any) {
      setSubmitError(error.message || 'An error occurred while running the health screening.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsTreatment = batchScan ? batchScan.infectionPercentage > INFECTION_THRESHOLD : false;
  const healthyPct = batchScan && batchScan.totalSamples > 0
    ? Math.round((batchScan.healthyCount / batchScan.totalSamples) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Health Screening</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
          Capture or upload a batch of sample photos for AI-powered disease screening across a whole nursery batch.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Batch Sample Intake"
          subtitle={`${images.length} image${images.length === 1 ? '' : 's'} queued for screening.`}
        />
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-sm font-bold text-stone-950 dark:text-slate-50">1. Select a batch</p>
              {batchesLoading ? (
                <div className="mt-4 flex items-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Choose a batch...</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.batchName || batch.plantType}</option>
                  ))}
                </select>
              )}

              <button
                onClick={runScreening}
                disabled={!canSubmit}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isSubmitting ? 'Screening batch...' : 'Apply to Whole Batch'}
              </button>
              {!selectedBatchId && <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">Select a batch to continue.</p>}
            </section>

            <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-stone-950 dark:text-slate-50">2. Capture or upload samples</p>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  {!isCameraActive ? (
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <Camera className="h-4 w-4" />
                      Open Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Close Camera
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {images.map((image) => (
                    <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 dark:border-slate-800">
                      <img src={image.dataUrl} alt="Sample" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-stone-950/70 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                  Add representative photos from multiple trays or benches in the selected batch.
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

      {batchScan && (
        <Card className={needsTreatment ? 'border-red-200 dark:border-red-500/25' : 'border-emerald-200 dark:border-emerald-500/25'}>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                {needsTreatment ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    Needs Treatment
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Ready to Sell
                  </>
                )}
              </span>
            }
            subtitle={`${batchScan.healthyCount} of ${batchScan.totalSamples} samples healthy - ${healthyPct}% healthy (${batchScan.infectionPercentage}% infection rate)`}
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {batchScan.results.map((result, index) => (
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
