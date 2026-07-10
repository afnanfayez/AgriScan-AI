import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import { ServiceError } from '../errors';
import { buildCsvReport } from './csv';
import { buildXlsxReport } from './xlsx';
import { buildHtmlReport } from './html-report';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface ExportResult {
  body: Buffer | string;
  contentType: string;
  contentDisposition: string;
}

export async function generateExport(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  format: string
): Promise<ExportResult> {
  // Fetch all user data concurrently
  const [
    { data: farmsData },
    { data: plantsData },
    { data: scansData },
    { data: treatmentsData },
  ] = await Promise.all([
    supabase.from('farms').select('*'),
    supabase.from('plants').select('*'),
    supabase.from('scans').select('*'),
    supabase.from('treatments').select('*'),
  ]);

  const exportData = {
    user: { name: user.name, accountType: user.accountType, plan: user.plan },
    farms: farmsData || [],
    plants: plantsData || [],
    scans: scansData || [],
    treatments: treatmentsData || [],
    generatedAt: new Date().toLocaleString(),
  };

  if (format === 'csv') {
    return {
      body: buildCsvReport(exportData),
      contentType: 'text/csv; charset=utf-8',
      contentDisposition: 'attachment; filename="AgriScan_Farm_Report.csv"',
    };
  }

  if (format === 'excel') {
    return {
      body: await buildXlsxReport(exportData),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentDisposition: 'attachment; filename="AgriScan_Farm_Report.xlsx"',
    };
  }

  if (format === 'pdf') {
    return {
      body: buildHtmlReport(exportData),
      contentType: 'text/html; charset=utf-8',
      contentDisposition: 'inline; filename="AgriScan_Farm_Report.html"',
    };
  }

  throw new ServiceError('Unsupported format. Use ?format=csv, ?format=excel, or ?format=pdf', 400);
}
