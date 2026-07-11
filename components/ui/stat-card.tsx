'use client';

import type React from 'react';
import { motion } from 'motion/react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardDelta {
  value: string;
  direction: 'up' | 'down' | 'flat';
}

export type StatCardTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<StatCardTone, string> = {
  neutral: 'text-stone-700 bg-stone-50 ring-stone-100 dark:text-slate-300 dark:bg-slate-800 dark:ring-slate-700',
  success:
    'text-emerald-700 bg-emerald-50 ring-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/10 dark:ring-emerald-500/20',
  warning:
    'text-amber-700 bg-amber-50 ring-amber-100 dark:text-amber-300 dark:bg-amber-500/10 dark:ring-amber-500/20',
  danger: 'text-red-700 bg-red-50 ring-red-100 dark:text-red-300 dark:bg-red-500/10 dark:ring-red-500/20',
  info: 'text-blue-700 bg-blue-50 ring-blue-100 dark:text-sky-300 dark:bg-sky-500/10 dark:ring-sky-500/20',
};

const deltaClasses: Record<StatCardDelta['direction'], string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-stone-500 dark:text-slate-400',
};

const DeltaIcon = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: StatCardDelta;
  tone?: StatCardTone;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function StatCard({ label, value, delta, tone = 'neutral', icon: Icon, className }: StatCardProps) {
  const Trend = delta ? DeltaIcon[delta.direction] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className={cn(
        'rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md md:p-5 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none dark:hover:border-slate-700',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">{label}</span>
          <span className="mt-2 block truncate text-2xl font-semibold tracking-tight text-stone-950 dark:text-slate-50">
            {value}
          </span>
          {delta && Trend && (
            <span className={cn('mt-2 inline-flex items-center gap-1 text-xs font-semibold', deltaClasses[delta.direction])}>
              <Trend className="h-3.5 w-3.5" />
              {delta.value}
            </span>
          )}
        </div>
        {Icon && (
          <div className={cn('shrink-0 rounded-xl p-2.5 ring-1', toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export interface StatCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatCardGrid({ children, className }: StatCardGridProps) {
  return <div className={cn('grid grid-cols-2 gap-4 xl:grid-cols-4', className)}>{children}</div>;
}
