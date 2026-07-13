import type React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-stretch gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5 dark:border-slate-800',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-snug text-stone-950 dark:text-slate-50">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

export function CardBody({ className, children }: CardBodyProps) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
}
