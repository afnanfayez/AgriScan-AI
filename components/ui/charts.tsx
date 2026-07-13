'use client';

import type React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Default categorical palette, validated for CVD-safe adjacency and
 * WCAG-legible contrast against both the light and dark card surfaces used
 * across the app. Light-mode hex first, dark-mode hex second — exposed as
 * paired CSS custom properties so series/segments automatically pick the
 * right shade for the active theme without any client-side detection.
 */
const DEFAULT_PALETTE: { light: string; dark: string }[] = [
  { light: '#10b981', dark: '#059669' }, // emerald
  { light: '#3b82f6', dark: '#3b82f6' }, // blue
  { light: '#f59e0b', dark: '#d97706' }, // amber
  { light: '#ef4444', dark: '#ef4444' }, // red
  { light: '#a855f7', dark: '#a855f7' }, // violet
];

// NOTE: these must be literal, fully-written-out class strings (not built via
// .map()/template-literal interpolation over DEFAULT_PALETTE) — Tailwind's
// static scanner can't see dynamically-constructed arbitrary-value classes,
// so a generated version of this constant silently produces undefined
// --chart-* vars and every default (non-explicit-color) series/segment falls
// back to the browser's default black fill/stroke.
const CHART_VARS_CLASSNAME = cn(
  '[--chart-c1:#10b981] dark:[--chart-c1:#059669]',
  '[--chart-c2:#3b82f6] dark:[--chart-c2:#3b82f6]',
  '[--chart-c3:#f59e0b] dark:[--chart-c3:#d97706]',
  '[--chart-c4:#ef4444] dark:[--chart-c4:#ef4444]',
  '[--chart-c5:#a855f7] dark:[--chart-c5:#a855f7]',
  '[--chart-grid:#e7e5e4] dark:[--chart-grid:#1e293b]',
  '[--chart-axis:#a8a29e] dark:[--chart-axis:#64748b]',
  '[--chart-tooltip-bg:#ffffff] dark:[--chart-tooltip-bg:#0f172a]',
  '[--chart-tooltip-border:#e7e5e4] dark:[--chart-tooltip-border:#1e293b]',
  '[--chart-tooltip-text:#44403c] dark:[--chart-tooltip-text:#e2e8f0]'
);

function defaultColor(index: number): string {
  const slot = (index % DEFAULT_PALETTE.length) + 1;
  return `var(--chart-c${slot})`;
}

const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  borderColor: 'var(--chart-tooltip-border)',
  borderRadius: 12,
  borderWidth: 1,
  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.25)',
  fontSize: 12,
  padding: '8px 12px',
};

const tooltipLabelStyle: React.CSSProperties = {
  color: 'var(--chart-tooltip-text)',
  fontWeight: 600,
  marginBottom: 4,
};

const tooltipItemStyle: React.CSSProperties = {
  color: 'var(--chart-tooltip-text)',
  fontSize: 12,
};

const axisTick = { fill: 'var(--chart-axis)', fontSize: 11 };
const legendStyle: React.CSSProperties = { fontSize: 12, color: 'var(--chart-axis)' };

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

interface ChartCardShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  height: number;
  children: React.ReactElement;
}

function ChartCardShell({ title, subtitle, action, className, height, children }: ChartCardShellProps) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardBody>
        <div className={CHART_VARS_CLASSNAME} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

export interface LineChartCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  data: Record<string, string | number>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  className?: string;
}

export function LineChartCard({
  title,
  subtitle,
  action,
  data,
  xKey,
  series,
  height = 280,
  className,
}: LineChartCardProps) {
  return (
    <ChartCardShell title={title} subtitle={subtitle} action={action} className={className} height={height}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ stroke: 'var(--chart-grid)' }}
        />
        {series.length > 1 && <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? defaultColor(i)}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: s.color ?? defaultColor(i) }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartCardShell>
  );
}

export interface BarChartCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  data: Record<string, string | number>[];
  xKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  height?: number;
  className?: string;
}

export function BarChartCard({
  title,
  subtitle,
  action,
  data,
  xKey,
  series,
  stacked = false,
  height = 280,
  className,
}: BarChartCardProps) {
  return (
    <ChartCardShell title={title} subtitle={subtitle} action={action} className={className} height={height}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: 'var(--chart-grid)', opacity: 0.35 }}
        />
        {series.length > 1 && <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? defaultColor(i)}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ChartCardShell>
  );
}

export interface DonutChartCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  data: DonutDatum[];
  height?: number;
  className?: string;
}

export function DonutChartCard({ title, subtitle, action, data, height = 280, className }: DonutChartCardProps) {
  return (
    <ChartCardShell title={title} subtitle={subtitle} action={action} className={className} height={height}>
      <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
        />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={d.label} fill={d.color ?? defaultColor(i)} stroke="var(--chart-tooltip-bg)" />
          ))}
        </Pie>
      </PieChart>
    </ChartCardShell>
  );
}
