'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CalendarClock, Loader2, MapPin, Plus, User } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import type { FarmField, FarmTask } from '@/types/domain';

type Column = { status: FarmTask['status']; label: string };

const COLUMNS: Column[] = [
  { status: 'Pending', label: 'To Do' },
  { status: 'In Progress', label: 'In Progress' },
  { status: 'Completed', label: 'Done' },
];

const NEXT_STATUS: Record<FarmTask['status'], FarmTask['status'] | null> = {
  Pending: 'In Progress',
  'In Progress': 'Completed',
  Completed: null,
};

const NEXT_LABEL: Record<FarmTask['status'], string> = {
  Pending: 'Start',
  'In Progress': 'Complete',
  Completed: 'Done',
};

interface FarmerLaborSectionProps {
  farms: FarmField[];
}

const emptyForm = {
  title: '',
  description: '',
  farmId: '',
  assigneeEmail: '',
  dueDate: '',
};

export default function FarmerLaborSection({ farms }: FarmerLaborSectionProps) {
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [workerFilter, setWorkerFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');

  const farmName = (farmId?: string) => farms.find((f) => f.id === farmId)?.name || 'Unassigned';

  const fetchTasks = () => {
    setIsLoading(true);
    setError('');
    fetch('/api/farm-tasks')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTasks(data.tasks);
        } else {
          setError(data.error || 'Failed to load tasks.');
        }
      })
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const workers = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.assigneeEmail).filter((e): e is string => !!e))).sort(),
    [tasks]
  );

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((t) => !workerFilter || t.assigneeEmail === workerFilter)
        .filter((t) => !fieldFilter || t.farmId === fieldFilter),
    [tasks, workerFilter, fieldFilter]
  );

  const advanceTask = async (task: FarmTask) => {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    try {
      const res = await fetch('/api/farm-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: next }),
      });
      const data = await res.json();
      if (data.success) fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/farm-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description || undefined,
          farmId: form.farmId || undefined,
          assigneeEmail: form.assigneeEmail || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm(emptyForm);
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSaving(false);
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
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Labor/Tasks</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Assign and track field work across your crew.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Assign Task
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={workerFilter}
          onChange={(e) => setWorkerFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Workers</option>
          {workers.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <select
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Fields</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>{farm.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <Card key={col.status}>
                <CardHeader title={col.label} subtitle={`${colTasks.length} task${colTasks.length === 1 ? '' : 's'}`} />
                <CardBody className="space-y-3">
                  {colTasks.length === 0 ? (
                    <p className="py-6 text-center text-sm text-stone-400 dark:text-slate-500">No tasks here.</p>
                  ) : (
                    colTasks.map((task) => (
                      <div key={task.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="space-y-2">
                          <h4 className="break-words text-sm font-semibold leading-5 text-stone-900 dark:text-slate-50">{task.title}</h4>
                          {task.description && <p className="break-words text-xs leading-5 text-stone-500 dark:text-slate-400">{task.description}</p>}
                          <div className="flex items-start gap-2 text-xs text-stone-600 dark:text-slate-300">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="min-w-0 break-words">{farmName(task.farmId)}</span>
                          </div>
                          {task.assigneeEmail && (
                            <div className="flex items-start gap-2 text-xs text-stone-600 dark:text-slate-300">
                              <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span className="min-w-0 break-all">{task.assigneeEmail}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-start gap-2 text-xs text-stone-600 dark:text-slate-300">
                              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        {NEXT_STATUS[task.status] && (
                          <button
                            onClick={() => advanceTask(task)}
                            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            {NEXT_LABEL[task.status]}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Assign Task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Field</label>
              <select
                value={form.farmId}
                onChange={(e) => setForm((f) => ({ ...f, farmId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Unassigned</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Assignee Email</label>
            <input
              type="email"
              value={form.assigneeEmail}
              onChange={(e) => setForm((f) => ({ ...f, assigneeEmail: e.target.value }))}
              placeholder="worker@example.com"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-55"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Assign Task
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
