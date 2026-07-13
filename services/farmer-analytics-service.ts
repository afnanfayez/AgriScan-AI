import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface FarmerAnalytics {
  infectionTrend: { date: string; infectionPercentage: number }[];
  seasonComparison: { period: string; expense: number; revenue: number }[];
  estimatedYieldLossPct: number;
  estimatedCostImpact: number;
  highestRiskField: { id: string; name: string; infectionPercentage: number } | null;
}

export interface FarmerAnalyticsFilters {
  farmId?: string | null;
}

/**
 * Read-only dashboard aggregation for the Commercial Farmer role. No new
 * table - reads field_scans, expenses, and plants, all already scoped to
 * the requesting user by RLS. This is a dashboard estimate, not a
 * certified calculation.
 */
export async function getFarmerAnalytics(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  filters: FarmerAnalyticsFilters
): Promise<FarmerAnalytics> {
  const { farmId } = filters;

  // Resolve the farm(s) in scope
  let farmsQuery = supabase.from('farms').select('id, name').eq('user_id', user.id);
  if (farmId) farmsQuery = farmsQuery.eq('id', farmId);
  const { data: farmsData, error: farmsError } = await farmsQuery;

  if (farmsError) {
    console.error('Error fetching farms for analytics:', farmsError);
    throw new ServiceError(farmsError.message, 500);
  }

  if (farmId && (!farmsData || farmsData.length === 0)) {
    throw new ServiceError('Farm not found or unauthorized', 404);
  }

  const farms = farmsData || [];
  const farmIds = farms.map((f) => f.id as string);
  const farmNameById = new Map(farms.map((f) => [f.id as string, (f.name as string) || 'Unknown Field']));

  // ── field_scans, ordered by created_at (used for infectionTrend, estimatedYieldLossPct, highestRiskField) ──
  let fieldScans: { farm_id: string; infection_percentage: number; created_at: string }[] = [];
  if (farmIds.length > 0) {
    const { data: fieldScansData, error: fieldScansError } = await supabase
      .from('field_scans')
      .select('farm_id, infection_percentage, created_at')
      .in('farm_id', farmIds)
      .order('created_at', { ascending: true });

    if (fieldScansError) {
      console.error('Error fetching field scans for analytics:', fieldScansError);
      throw new ServiceError(fieldScansError.message, 500);
    }

    fieldScans = fieldScansData || [];
  }

  const infectionTrend = fieldScans.map((fs) => {
    const dateLabel = typeof fs.created_at === 'string' ? fs.created_at.slice(0, 10) : String(fs.created_at);
    const farmName = farmNameById.get(fs.farm_id);
    return {
      date: farmId || !farmName ? dateLabel : `${farmName} (${dateLabel})`,
      infectionPercentage: Number(fs.infection_percentage),
    };
  });

  // ── expenses (used for seasonComparison and estimatedCostImpact) ──
  let expensesQuery = supabase.from('expenses').select('type, amount, occurred_on');
  if (farmId) {
    expensesQuery = expensesQuery.eq('farm_id', farmId);
  }
  const { data: expensesData, error: expensesError } = await expensesQuery;

  if (expensesError) {
    console.error('Error fetching expenses for analytics:', expensesError);
    throw new ServiceError(expensesError.message, 500);
  }

  const expenses = expensesData || [];

  const byMonthMap = new Map<string, { expense: number; revenue: number }>();
  for (const e of expenses) {
    const month = typeof e.occurred_on === 'string' ? e.occurred_on.slice(0, 7) : null; // YYYY-MM
    if (!month) continue;
    const entry = byMonthMap.get(month) || { expense: 0, revenue: 0 };
    const amount = Number(e.amount) || 0;
    if (e.type === 'Expense') entry.expense += amount;
    else if (e.type === 'Revenue') entry.revenue += amount;
    byMonthMap.set(month, entry);
  }

  const seasonComparison = Array.from(byMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      period: month,
      expense: Math.round(v.expense * 100) / 100,
      revenue: Math.round(v.revenue * 100) / 100,
    }));

  // ── estimatedYieldLossPct: avg of latest field_scans.infection_percentage across fields ──
  // fieldScans is ascending by created_at, so the last write seen per farm_id is the latest.
  const latestByFarm = new Map<string, number>();
  for (const fs of fieldScans) {
    latestByFarm.set(fs.farm_id, Number(fs.infection_percentage));
  }

  const latestValues = Array.from(latestByFarm.values());
  const estimatedYieldLossPct =
    latestValues.length > 0
      ? Math.round((latestValues.reduce((sum, v) => sum + v, 0) / latestValues.length) * 100) / 100
      : 0;

  // ── estimatedCostImpact: naive estimate ──
  const totalExpense = expenses
    .filter((e) => e.type === 'Expense')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const estimatedCostImpact = Math.round(totalExpense * (estimatedYieldLossPct / 100));

  // ── highestRiskField: field with the highest latest infection_percentage ──
  let highestRiskField: { id: string; name: string; infectionPercentage: number } | null = null;
  for (const [fId, infectionPercentage] of latestByFarm.entries()) {
    if (!highestRiskField || infectionPercentage > highestRiskField.infectionPercentage) {
      highestRiskField = {
        id: fId,
        name: farmNameById.get(fId) || 'Unknown Field',
        infectionPercentage,
      };
    }
  }

  return {
    infectionTrend,
    seasonComparison,
    estimatedYieldLossPct,
    estimatedCostImpact,
    highestRiskField,
  };
}
