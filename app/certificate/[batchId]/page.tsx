'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Award, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';

interface CertificateData {
  batchName?: string;
  plantType: string;
  quantity: number;
  grade?: 'A' | 'B' | 'C';
  status: string;
  certificateUrl?: string;
  lastScreening: {
    infectionPercentage: number;
    totalSamples: number;
    screenedAt: string;
  } | null;
}

const gradeTone: Record<'A' | 'B' | 'C', BadgeTone> = {
  A: 'success',
  B: 'warning',
  C: 'danger',
};

export default function PublicCertificatePage() {
  const params = useParams();
  const batchId = Array.isArray(params?.batchId) ? params.batchId[0] : (params?.batchId as string | undefined);

  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batchId) return;
    setIsLoading(true);
    setError('');
    fetch(`/api/public/certificate/${encodeURIComponent(batchId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setCertificate(data.certificate);
        } else {
          setError(data.error || 'Certificate not found.');
        }
      })
      .catch(() => setError('Certificate not found.'))
      .finally(() => setIsLoading(false));
  }, [batchId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 dark:bg-slate-950 sm:p-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
            <Award className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-stone-900 dark:text-slate-50">
            AgriScan AI — Verified Health Record
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Sellable Certificate</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : error || !certificate ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ShieldX className="h-8 w-8 text-stone-400 dark:text-slate-500" />
                <p className="text-sm font-medium text-stone-600 dark:text-slate-300">
                  {error || 'Certificate not found.'}
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader
              title={certificate.batchName || certificate.plantType}
              subtitle={certificate.plantType}
              action={
                certificate.grade ? (
                  <Badge tone={gradeTone[certificate.grade]}>Grade {certificate.grade}</Badge>
                ) : undefined
              }
            />
            <CardBody className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Quantity</span>
                  <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">{certificate.quantity.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">Status</span>
                  <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">{certificate.status}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-slate-300">
                    Last Health Screening
                  </span>
                </div>
                {certificate.lastScreening ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-xs text-stone-500 dark:text-slate-400">Infection Rate</span>
                      <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">
                        {certificate.lastScreening.infectionPercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-stone-500 dark:text-slate-400">Samples Screened</span>
                      <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">
                        {certificate.lastScreening.totalSamples}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs text-stone-500 dark:text-slate-400">Screened On</span>
                      <span className="mt-1 block font-semibold text-stone-900 dark:text-slate-50">
                        {new Date(certificate.lastScreening.screenedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-500 dark:text-slate-400">No health screening on record for this batch.</p>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
