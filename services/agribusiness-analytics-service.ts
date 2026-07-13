import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import { ServiceError } from './errors';
import { getOrCreateOrganization } from './organizations-service';
import { listOrganizationFarms } from './organization-farms-service';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AgribusinessAnalytics {
  totalFarms: number;
  totalManagedPlants: number;
  avgInfectionRate: number; // 0-100, average plant infection/critical rate across all linked farms' plants
  criticalAlerts: number; // count of plants with healthStatus === 'Critical' across all linked farms
  farmRanking: { farmId: string; farmName: string; healthScore: number; status: 'Healthy' | 'Warning' | 'Critical' }[]; // healthScore 0-100 (100 = all healthy), sorted best (highest healthScore) first
  healthTrend: { date: string; healthScore: number }[]; // org-wide healthScore over time, derived from field_scans across all linked farms grouped by created_at date, chronological order
  farmComparison: { farmId: string; farmName: string; area: number; infectionRate: number; estimatedCostImpact: number }[]; // one row per linked farm
  monthlyHeatmap: { farmId: string; farmName: string; month: string; healthScore: number }[]; // month format 'YYYY-MM', one row per farm per month present in its field_scans history
}

const classifyHealthScore = (healthScore: number): 'Healthy' | 'Warning' | 'Critical' => {
  if (healthScore >= 80) return 'Healthy';
  if (healthScore >= 50) return 'Warning';
  return 'Critical';
};

const EMPTY_ANALYTICS: AgribusinessAnalytics = {
  totalFarms: 0,
  totalManagedPlants: 0,
  avgInfectionRate: 0,
  criticalAlerts: 0,
  farmRanking: [],
  healthTrend: [],
  farmComparison: [],
  monthlyHeatmap: [],
};

/**
 * Read-only dashboard aggregation for the Agribusiness Professional role.
 * Aggregates across every farm linked to the caller's organization via
 * organization_farms: plants (health-status counts), field_scans (infection
 * history), and expenses (cost impact). This is a dashboard estimate, not a
 * certified calculation.
 */
export async function getAgribusinessAnalytics(
  supabase: SupabaseClient,
  user: SupabaseUserProfile
): Promise<AgribusinessAnalytics> {
  const org = await getOrCreateOrganization(supabase, user);
  const farms = await listOrganizationFarms(supabase, org.id);

  if (farms.length === 0) {
    return EMPTY_ANALYTICS;
  }

  const farmIds = farms.map((f) => f.id);
  const farmNameById = new Map(farms.map((f) => [f.id, f.name]));

  // ── plants (health-status counts per farm) ──
  const { data: plantsData, error: plantsError } = await supabase
    .from('plants')
    .select('farm_id, health_status')
    .in('farm_id', farmIds);

  if (plantsError) {
    console.error('Error fetching plants for agribusiness analytics:', plantsError);
    throw new ServiceError(plantsError.message, 500);
  }

  const plants = plantsData || [];

  const plantCountsByFarm = new Map<string, { total: number; nonHealthy: number; critical: number }>();
  let totalManagedPlants = 0;
  let totalNonHealthy = 0;
  let criticalAlerts = 0;

  for (const p of plants) {
    const entry = plantCountsByFarm.get(p.farm_id) || { total: 0, nonHealthy: 0, critical: 0 };
    entry.total += 1;
    if (p.health_status !== 'Healthy') entry.nonHealthy += 1;
    if (p.health_status === 'Critical') entry.critical += 1;
    plantCountsByFarm.set(p.farm_id, entry);

    totalManagedPlants += 1;
    if (p.health_status !== 'Healthy') totalNonHealthy += 1;
    if (p.health_status === 'Critical') criticalAlerts += 1;
  }

  const avgInfectionRate = totalManagedPlants > 0 ? Math.round((totalNonHealthy / totalManagedPlants) * 100) : 0;

  // ── field_scans (infection history per farm, used for infectionRate/healthTrend/monthlyHeatmap) ──
  const { data: fieldScansData, error: fieldScansError } = await supabase
    .from('field_scans')
    .select('farm_id, infection_percentage, created_at')
    .in('farm_id', farmIds)
    .order('created_at', { ascending: true });

  if (fieldScansError) {
    console.error('Error fetching field scans for agribusiness analytics:', fieldScansError);
    throw new ServiceError(fieldScansError.message, 500);
  }

  const fieldScans = fieldScansData || [];

  const scansByFarm = new Map<string, { infection_percentage: number; created_at: string }[]>();
  for (const fs of fieldScans) {
    const list = scansByFarm.get(fs.farm_id) || [];
    list.push({ infection_percentage: Number(fs.infection_percentage), created_at: fs.created_at });
    scansByFarm.set(fs.farm_id, list);
  }

  // ── expenses (cost impact per farm) ──
  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select('farm_id, type, amount')
    .in('farm_id', farmIds);

  if (expensesError) {
    console.error('Error fetching expenses for agribusiness analytics:', expensesError);
    throw new ServiceError(expensesError.message, 500);
  }

  const expenses = expensesData || [];
  const totalExpenseByFarm = new Map<string, number>();
  for (const e of expenses) {
    if (e.type !== 'Expense' || !e.farm_id) continue;
    totalExpenseByFarm.set(e.farm_id, (totalExpenseByFarm.get(e.farm_id) || 0) + (Number(e.amount) || 0));
  }

  // ── farmRanking: healthScore derived from current plants.healthStatus ──
  const farmRanking = farms
    .map((farm) => {
      const counts = plantCountsByFarm.get(farm.id) || { total: 0, nonHealthy: 0, critical: 0 };
      const healthScore = counts.total > 0 ? Math.round(100 - (counts.nonHealthy / counts.total) * 100) : 100;
      return {
        farmId: farm.id,
        farmName: farm.name,
        healthScore,
        status: classifyHealthScore(healthScore),
      };
    })
    .sort((a, b) => b.healthScore - a.healthScore);

  // ── farmComparison: one row per linked farm ──
  const farmComparison = farms.map((farm) => {
    const scans = scansByFarm.get(farm.id) || [];
    const infectionRate = scans.length > 0 ? scans[scans.length - 1].infection_percentage : 0;
    const totalExpense = totalExpenseByFarm.get(farm.id) || 0;
    const estimatedCostImpact = Math.round(totalExpense * (infectionRate / 100));
    return {
      farmId: farm.id,
      farmName: farm.name,
      area: farm.acreage ?? 0,
      infectionRate,
      estimatedCostImpact,
    };
  });

  // ── healthTrend: org-wide healthScore over time, grouped by date across all linked farms ──
  const byDateMap = new Map<string, { sum: number; count: number }>();
  for (const fs of fieldScans) {
    const dateLabel = typeof fs.created_at === 'string' ? fs.created_at.slice(0, 10) : String(fs.created_at);
    const entry = byDateMap.get(dateLabel) || { sum: 0, count: 0 };
    entry.sum += Number(fs.infection_percentage);
    entry.count += 1;
    byDateMap.set(dateLabel, entry);
  }

  const healthTrend = Array.from(byDateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sum, count }]) => ({
      date,
      healthScore: Math.round(100 - sum / count),
    }));

  // ── monthlyHeatmap: one row per farm per month present in its field_scans history ──
  const monthlyMap = new Map<string, { farmId: string; sum: number; count: number }>();
  for (const [farmId, scans] of scansByFarm.entries()) {
    for (const scan of scans) {
      const month = typeof scan.created_at === 'string' ? scan.created_at.slice(0, 7) : String(scan.created_at);
      const key = `${farmId}::${month}`;
      const entry = monthlyMap.get(key) || { farmId, sum: 0, count: 0 };
      entry.sum += scan.infection_percentage;
      entry.count += 1;
      monthlyMap.set(key, entry);
    }
  }

  const monthlyHeatmap = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { farmId, sum, count }]) => {
      const month = key.split('::')[1];
      return {
        farmId,
        farmName: farmNameById.get(farmId) || 'Unknown Farm',
        month,
        healthScore: Math.round(100 - sum / count),
      };
    });

  return {
    totalFarms: farms.length,
    totalManagedPlants,
    avgInfectionRate,
    criticalAlerts,
    farmRanking,
    healthTrend,
    farmComparison,
    monthlyHeatmap,
  };
}
