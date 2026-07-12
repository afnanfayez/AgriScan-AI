'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Plus, Trash, Truck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardBody } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Table, type TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import type { InventoryBatch, Order, OrderItem } from '@/types/domain';

type OrderWithItems = Order & { items: OrderItem[] };

const statusTone: Record<Order['status'], BadgeTone> = {
  Pending: 'warning',
  Shipped: 'info',
  Fulfilled: 'success',
  Cancelled: 'danger',
};

type LineItemDraft = { batchId: string; quantity: string; unitPrice: string };

const emptyLineItem = (): LineItemDraft => ({ batchId: '', quantity: '1', unitPrice: '' });

const emptyForm = {
  customerName: '',
  customerContact: '',
  dispatchDate: '',
  notes: '',
};

export default function NurseryOrdersSection() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([emptyLineItem()]);
  const [isSaving, setIsSaving] = useState(false);

  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const batchName = (batchId?: string) => {
    const batch = batches.find((b) => b.id === batchId);
    return batch ? (batch.batchName || batch.plantType) : 'Unknown batch';
  };

  const fetchOrders = () => {
    setIsLoading(true);
    setError('');
    const url = statusFilter ? `/api/orders?status=${encodeURIComponent(statusFilter)}` : '/api/orders';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.error || 'Failed to load orders.');
        }
      })
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    fetch('/api/inventory-batches')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBatches(data.batches);
      });
  }, []);

  const addLineItem = () => setLineItems((prev) => [...prev, emptyLineItem()]);
  const removeLineItem = (index: number) => setLineItems((prev) => prev.filter((_, i) => i !== index));
  const updateLineItem = (index: number, fields: Partial<LineItemDraft>) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...fields } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) return;
    const validItems = lineItems.filter((li) => li.batchId && li.quantity);
    if (validItems.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerContact: form.customerContact || undefined,
          dispatchDate: form.dispatchDate || undefined,
          notes: form.notes || undefined,
          items: validItems.map((li) => ({
            batchId: li.batchId,
            quantity: Number(li.quantity),
            unitPrice: li.unitPrice ? Number(li.unitPrice) : 0,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setForm(emptyForm);
        setLineItems([emptyLineItem()]);
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const dispatchOrder = async (order: OrderWithItems) => {
    setDispatchingId(order.id);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: 'Shipped' }),
      });
      const data = await res.json();
      if (data.success) fetchOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setDispatchingId(null);
    }
  };

  const columns: TableColumn<OrderWithItems>[] = [
    { key: 'customerName', header: 'Customer', render: (row) => row.customerName },
    {
      key: 'items',
      header: 'Items',
      render: (row) => (
        <span className="text-xs">
          {row.items.map((item) => `${batchName(item.batchId)} x${item.quantity}`).join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'quantityTotal',
      header: 'Qty Total',
      render: (row) => row.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString(),
    },
    { key: 'dispatchDate', header: 'Dispatch Date', render: (row) => (row.dispatchDate ? new Date(row.dispatchDate).toLocaleDateString() : '-') },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
    {
      key: 'certificate',
      header: 'Certificate QR',
      render: (row) => {
        const primaryBatchId = row.items[0]?.batchId;
        if (!primaryBatchId || !origin) return <span className="text-xs text-stone-400">-</span>;
        return <QRCodeSVG value={`${origin}/certificate/${primaryBatchId}`} size={48} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'Pending' ? (
          <button
            onClick={() => dispatchOrder(row)}
            disabled={dispatchingId === row.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-55"
          >
            {dispatchingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
            Dispatch
          </button>
        ) : (
          <span className="text-xs text-stone-400">-</span>
        ),
    },
  ];

  const lineItemTotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0),
    [lineItems]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Orders & Dispatch</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Track customer orders and dispatch status with certificate lookups.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Order
          </button>
        </div>
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
        <Card>
          <CardBody className="p-0">
            <div className="p-5">
              <Table<OrderWithItems> columns={columns} rows={orders} emptyMessage="No orders recorded yet." />
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Customer Name</label>
              <input
                type="text"
                required
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Contact</label>
              <input
                type="text"
                value={form.customerContact}
                onChange={(e) => setForm((f) => ({ ...f, customerContact: e.target.value }))}
                placeholder="Email or phone"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Dispatch Date</label>
            <input
              type="date"
              value={form.dispatchDate}
              onChange={(e) => setForm((f) => ({ ...f, dispatchDate: e.target.value }))}
              className="mt-1 w-full max-w-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-2">
                  <select
                    value={item.batchId}
                    onChange={(e) => updateLineItem(index, { batchId: e.target.value })}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Choose batch...</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>{batch.batchName || batch.plantType}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, { unitPrice: e.target.value })}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-red-600 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-stone-600 dark:text-slate-400">
              Estimated Total: ${lineItemTotal.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-slate-400">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
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
              Create Order
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
