import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

// Public, unauthenticated QR-code lookup for a nursery batch's sellable
// certificate. Intentionally does NOT call getSessionUser() - anyone with
// the batch id (e.g. scanned from a printed QR code) can look this up.
// Because inventory_batches RLS is owner-only, this route must use the
// service-role admin client to read across owners, but it only ever
// selects a safe, minimal, non-identifying subset of columns.
export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;

    if (!batchId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const adminClient = getSupabaseAdminClient();

    const { data: batch, error: batchError } = await adminClient
      .from('inventory_batches')
      .select('batch_name, plant_type, quantity, grade, status, certificate_url')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: latestScan } = await adminClient
      .from('batch_scans')
      .select('infection_percentage, total_samples, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      certificate: {
        batchName: batch.batch_name ?? undefined,
        plantType: batch.plant_type,
        quantity: batch.quantity,
        grade: batch.grade ?? undefined,
        status: batch.status,
        certificateUrl: batch.certificate_url ?? undefined,
        lastScreening: latestScan
          ? {
              infectionPercentage: latestScan.infection_percentage,
              totalSamples: latestScan.total_samples,
              screenedAt: latestScan.created_at,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Public certificate lookup error:', error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
