'use client';

import { motion } from 'motion/react';
import type React from 'react';
import { CheckCircle, FileText, Loader2, Sliders, Sprout, X } from 'lucide-react';

interface CarePlansSectionProps {
  plants: any[];
  carePlanDetail: { plant: any; treatment: any | null } | null;
  carePlanLoadingId: string | null;
  toastMessage: string;
  onOpenCarePlan: (plant: any) => void;
  onCloseCarePlan: () => void;
  onMarkFullyTreated: (plant: any, treatment?: any | null) => Promise<void>;
  onOpenTimeline: (plantId: string) => void;
}

export default function CarePlansSection({
  plants,
  carePlanDetail,
  carePlanLoadingId,
  toastMessage,
  onOpenCarePlan,
  onCloseCarePlan,
  onMarkFullyTreated,
  onOpenTimeline,
}: CarePlansSectionProps) {
  const activeTreatments = plants.filter((p) => p.healthStatus !== 'Healthy');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Care Plans</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
              Treatment protocols, recovery status, and follow-up actions for plants that need attention.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Active', value: activeTreatments.length },
              { label: 'Warning', value: plants.filter((p) => p.healthStatus === 'Warning').length },
              { label: 'Critical', value: plants.filter((p) => p.healthStatus === 'Critical').length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="block text-lg font-bold text-stone-900 dark:text-slate-50 font-mono">{stat.value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {activeTreatments.length === 0 ? (
            <div className="xl:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-12 text-center text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle className="mx-auto h-10 w-10" />
              <h3 className="mt-4 text-base font-bold">All plants are currently healthy</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-emerald-700/80 dark:text-emerald-100/80">
                No active care plans are waiting for treatment.
              </p>
            </div>
          ) : (
            activeTreatments.map((plant) => (
              <div key={plant.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-colors hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30">
                <div className={`h-1.5 ${plant.healthStatus === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <img
                      src={plant.photoUrl}
                      alt={plant.name}
                      className="h-20 w-20 rounded-xl object-cover border border-stone-200 shadow-sm dark:border-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wider ${
                        plant.healthStatus === 'Critical'
                          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300'
                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300'
                      }`}>
                        {plant.healthStatus} care plan
                      </span>
                      <h3 className="text-lg font-bold text-stone-900 dark:text-slate-50 mt-3 truncate">{plant.name}</h3>
                      <p className="text-xs text-stone-500 dark:text-slate-400 font-mono mt-0.5">Cultivar Type: {plant.type}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">Priority</span>
                          <span className={`mt-1 block font-bold ${plant.healthStatus === 'Critical' ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}>
                            {plant.healthStatus === 'Critical' ? 'Immediate' : 'Monitor'}
                          </span>
                        </div>
                        <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">Next action</span>
                          <span className="mt-1 block font-bold text-stone-800 dark:text-slate-200">Review protocol</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-3 w-full border-t border-stone-100 pt-4 dark:border-slate-800">
                    <button
                      onClick={() => onOpenCarePlan(plant)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {carePlanLoadingId === plant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      <span>View Care Protocol</span>
                    </button>
                    <button
                      onClick={() => onMarkFullyTreated(plant)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Mark as Fully Treated</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {carePlanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`h-2 ${carePlanDetail.plant.healthStatus === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <img src={carePlanDetail.plant.photoUrl} alt={carePlanDetail.plant.name} className="h-16 w-16 rounded-xl border border-stone-200 object-cover dark:border-slate-800" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono">Care protocol</span>
                    <h2 className="mt-1 truncate text-xl font-bold text-stone-900 dark:text-slate-50">{carePlanDetail.plant.name}</h2>
                    <p className="text-xs text-stone-500 dark:text-slate-400 font-mono">{carePlanDetail.plant.type}</p>
                  </div>
                </div>
                <button onClick={onCloseCarePlan} className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryBox label="Diagnosis" value={carePlanDetail.treatment?.type || 'No treatment diagnosis found'} />
                <SummaryBox label="Plan status" value={carePlanDetail.treatment?.status || carePlanDetail.plant.healthStatus} tone="green" />
                <SummaryBox label="Created" value={carePlanDetail.treatment?.createdAt ? new Date(carePlanDetail.treatment.createdAt).toLocaleDateString() : 'Not available'} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ProtocolList title="Organic recovery steps" icon={<Sprout className="h-4 w-4" />} steps={carePlanDetail.treatment?.organicSteps || []} tone="green" />
                <ProtocolList title="Chemical controls" icon={<Sliders className="h-4 w-4" />} steps={carePlanDetail.treatment?.chemicalSteps || []} tone="stone" />
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  onClick={() => onOpenTimeline(carePlanDetail.plant.id)}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open Full Timeline
                </button>
                <button
                  onClick={() => onMarkFullyTreated(carePlanDetail.plant, carePlanDetail.treatment)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Fully Treated
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-xl dark:border-emerald-500/20 dark:bg-slate-900 dark:text-slate-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryBox({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">{label}</span>
      <p className={`mt-2 text-sm font-bold ${tone === 'green' ? 'text-emerald-700 dark:text-emerald-300' : 'text-stone-900 dark:text-slate-50'}`}>{value}</p>
    </div>
  );
}

function ProtocolList({ title, icon, steps, tone }: { title: string; icon: React.ReactNode; steps: string[]; tone: 'green' | 'stone' }) {
  const green = tone === 'green';
  return (
    <div className={`rounded-2xl border p-5 ${green ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-stone-200 bg-stone-50 dark:border-slate-800 dark:bg-slate-950/60'}`}>
      <h3 className={`flex items-center gap-2 text-sm font-bold ${green ? 'text-emerald-900 dark:text-emerald-200' : 'text-stone-900 dark:text-slate-100'}`}>
        {icon}
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed text-stone-700 dark:text-slate-300">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${green ? 'bg-emerald-600' : 'bg-stone-800 dark:bg-slate-700'}`}>{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
        {steps.length === 0 && <li className="text-sm text-stone-500 dark:text-slate-400">No steps are attached to this plan yet.</li>}
      </ul>
    </div>
  );
}
