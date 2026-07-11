import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { Expense } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapExpense = (e: any): Expense => ({
  id: e.id,
  userId: e.user_id,
  farmId: e.farm_id ?? undefined,
  category: e.category,
  type: e.type,
  amount: Number(e.amount),
  description: e.description ?? undefined,
  occurredOn: e.occurred_on,
  createdAt: e.created_at,
});

export interface ListExpensesFilters {
  farmId?: string | null;
}

export async function listExpenses(
  supabase: SupabaseClient,
  filters: ListExpensesFilters
): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*');

  if (filters.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }

  const { data, error } = await query.order('occurred_on', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapExpense);
}

export interface CreateExpenseInput {
  farmId?: string;
  category: string;
  type: string;
  amount: number;
  description?: string;
  occurredOn: string;
}

export async function createExpense(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateExpenseInput
): Promise<Expense> {
  const { farmId, category, type, amount, description, occurredOn } = input;

  if (!category || !type || amount === undefined || amount === null || !occurredOn) {
    throw new ServiceError('Category, type, amount, and occurred date are required.', 400);
  }

  const { data: newExpense, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      farm_id: farmId || null,
      category,
      type,
      amount,
      description,
      occurred_on: occurredOn,
    })
    .select()
    .single();

  if (error || !newExpense) {
    console.error('Error creating expense:', error);
    throw new ServiceError(error?.message || 'Failed to create expense', 400);
  }

  return mapExpense(newExpense);
}

export interface UpdateExpenseInput {
  id: string;
  farmId?: string;
  category?: string;
  type?: string;
  amount?: number;
  description?: string;
  occurredOn?: string;
}

export async function updateExpense(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateExpenseInput
): Promise<Expense> {
  const { id, farmId, category, type, amount, description, occurredOn } = input;

  const updateData: any = {};
  if (farmId !== undefined) updateData.farm_id = farmId;
  if (category !== undefined) updateData.category = category;
  if (type !== undefined) updateData.type = type;
  if (amount !== undefined) updateData.amount = amount;
  if (description !== undefined) updateData.description = description;
  if (occurredOn !== undefined) updateData.occurred_on = occurredOn;

  const { data: updatedExpense, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedExpense) {
    console.error('Error updating expense:', error);
    throw new ServiceError(error?.message || 'Failed to update expense', 400);
  }

  return mapExpense(updatedExpense);
}

export async function deleteExpense(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error);
    throw new ServiceError(error.message, 400);
  }
}

export interface ExpenseSummary {
  byCategory: { category: string; total: number }[];
  byMonth: { month: string; expense: number; revenue: number }[];
}

export async function getExpenseSummary(
  supabase: SupabaseClient,
  filters: ListExpensesFilters
): Promise<ExpenseSummary> {
  let query = supabase.from('expenses').select('*');

  if (filters.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }

  const { data, error } = await query.order('occurred_on', { ascending: true });

  if (error) {
    console.error('Error fetching expense summary:', error);
    throw new ServiceError(error.message, 500);
  }

  const expenses = data || [];

  const byCategoryMap = new Map<string, number>();
  const byMonthMap = new Map<string, { expense: number; revenue: number }>();

  for (const e of expenses) {
    const amount = Number(e.amount) || 0;

    if (e.type === 'Expense') {
      byCategoryMap.set(e.category, (byCategoryMap.get(e.category) || 0) + amount);
    }

    const month = typeof e.occurred_on === 'string' ? e.occurred_on.slice(0, 7) : null; // YYYY-MM
    if (month) {
      const entry = byMonthMap.get(month) || { expense: 0, revenue: 0 };
      if (e.type === 'Expense') entry.expense += amount;
      else if (e.type === 'Revenue') entry.revenue += amount;
      byMonthMap.set(month, entry);
    }
  }

  const byCategory = Array.from(byCategoryMap.entries()).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
  }));

  const byMonth = Array.from(byMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      expense: Math.round(v.expense * 100) / 100,
      revenue: Math.round(v.revenue * 100) / 100,
    }));

  return { byCategory, byMonth };
}
