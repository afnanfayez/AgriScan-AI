import type React from 'react';
import { cn } from '@/lib/utils';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface TableProps<T extends { id: string }> {
  columns: TableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

const alignClass: Record<NonNullable<TableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'No data available.',
  className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-stone-200 dark:border-slate-800', className)}>
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 dark:border-slate-800 dark:bg-slate-950/60">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400',
                  alignClass[col.align ?? 'left']
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-stone-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  rowIndex % 2 === 1 && 'bg-stone-50/60 dark:bg-slate-950/30',
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-stone-700 dark:text-slate-300',
                      alignClass[col.align ?? 'left']
                    )}
                  >
                    {col.render ? col.render(row) : (row as Record<string, React.ReactNode>)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
