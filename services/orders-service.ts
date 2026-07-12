import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { Order, OrderItem } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type OrderWithItems = Order & { items: OrderItem[] };

const mapOrder = (o: any): Order => ({
  id: o.id,
  userId: o.user_id,
  customerName: o.customer_name,
  customerContact: o.customer_contact ?? undefined,
  status: o.status,
  dispatchDate: o.dispatch_date ?? undefined,
  totalAmount: o.total_amount ?? undefined,
  notes: o.notes ?? undefined,
  createdAt: o.created_at,
});

const mapOrderItem = (i: any): OrderItem => ({
  id: i.id,
  orderId: i.order_id,
  batchId: i.batch_id ?? undefined,
  quantity: i.quantity,
  unitPrice: i.unit_price,
});

export interface OrderItemInput {
  batchId?: string;
  quantity: number;
  unitPrice: number;
}

export interface ListOrdersFilters {
  status?: string | null;
}

export async function listOrders(
  supabase: SupabaseClient,
  filters: ListOrdersFilters
): Promise<OrderWithItems[]> {
  let query = supabase.from('orders').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data: ordersData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    throw new ServiceError(error.message, 500);
  }

  const orders = ordersData || [];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o: any) => o.id);
  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  if (itemsError) {
    console.error('Error fetching order items:', itemsError);
    throw new ServiceError(itemsError.message, 500);
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  (itemsData || []).forEach((i: any) => {
    const mapped = mapOrderItem(i);
    const list = itemsByOrder.get(mapped.orderId) || [];
    list.push(mapped);
    itemsByOrder.set(mapped.orderId, list);
  });

  return orders.map((o: any) => ({
    ...mapOrder(o),
    items: itemsByOrder.get(o.id) || [],
  }));
}

const computeTotal = (items: OrderItemInput[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

export interface CreateOrderInput {
  customerName: string;
  customerContact?: string;
  dispatchDate?: string;
  notes?: string;
  items: OrderItemInput[];
}

export async function createOrder(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateOrderInput
): Promise<OrderWithItems> {
  const { customerName, customerContact, dispatchDate, notes, items } = input;

  if (!customerName) {
    throw new ServiceError('Customer name is required.', 400);
  }
  if (!items || items.length === 0) {
    throw new ServiceError('At least one order item is required.', 400);
  }

  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      customer_name: customerName,
      customer_contact: customerContact,
      status: 'Pending',
      dispatch_date: dispatchDate || null,
      total_amount: computeTotal(items),
      notes,
    })
    .select()
    .single();

  if (orderError || !newOrder) {
    console.error('Error creating order:', orderError);
    throw new ServiceError(orderError?.message || 'Failed to create order', 400);
  }

  const { data: newItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(
      items.map((item) => ({
        order_id: newOrder.id,
        batch_id: item.batchId || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    )
    .select();

  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    throw new ServiceError(itemsError.message || 'Failed to create order items', 400);
  }

  return {
    ...mapOrder(newOrder),
    items: (newItems || []).map(mapOrderItem),
  };
}

export interface UpdateOrderInput {
  id: string;
  status?: Order['status'];
  dispatchDate?: string;
  notes?: string;
}

export async function updateOrder(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateOrderInput
): Promise<Order> {
  const { id, status, dispatchDate, notes } = input;

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (dispatchDate !== undefined) updateData.dispatch_date = dispatchDate;
  if (notes !== undefined) updateData.notes = notes;

  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedOrder) {
    console.error('Error updating order:', error);
    throw new ServiceError(error?.message || 'Failed to update order', 400);
  }

  return mapOrder(updatedOrder);
}

export async function deleteOrder(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting order:', error);
    throw new ServiceError(error.message, 400);
  }
}
