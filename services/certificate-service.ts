import { jsPDF } from 'jspdf';
import { createClient } from '@/utils/supabase/server';
import { uploadPdfToStorage } from '@/lib/supabase';
import type { SupabaseUserProfile } from '@/lib/auth';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function buildCertificatePdf(batch: any, latestScan: any | null): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFillColor(22, 101, 52);
  doc.rect(0, 0, 210, 44, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AgriScan AI', 14, 18);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Sellable Certificate', 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

  doc.setTextColor(28, 25, 23);
  let y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(batch.batch_name || batch.plant_type || 'Inventory Batch', 14, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const rows: [string, string][] = [
    ['Plant Type', batch.plant_type || '-'],
    ['Quantity', String(batch.quantity ?? '-')],
    ['Grade', batch.grade || 'Ungraded'],
    ['Status', batch.status || '-'],
  ];
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 8;
  });

  y += 6;
  doc.setDrawColor(220, 252, 231);
  doc.line(14, y, 196, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 101, 52);
  doc.text('Latest Health Screening', 14, y);
  y += 10;

  doc.setTextColor(28, 25, 23);
  doc.setFontSize(11);
  if (latestScan) {
    const screeningRows: [string, string][] = [
      ['Infection Rate', `${latestScan.infection_percentage}%`],
      ['Samples Screened', String(latestScan.total_samples)],
      ['Healthy Samples', String(latestScan.healthy_count)],
      ['Screened On', latestScan.created_at ? new Date(latestScan.created_at).toLocaleDateString() : '-'],
    ];
    screeningRows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, y);
      y += 8;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('No health screening has been performed on this batch yet.', 14, y);
    y += 8;
  }

  y += 14;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 196, y);
  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Certified by AgriScan AI - Generated on ${new Date().toLocaleDateString()}`, 14, y);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export interface GenerateCertificateResult {
  certificateUrl: string;
}

export async function generateCertificate(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  batchId: string
): Promise<GenerateCertificateResult> {
  const { data: batch, error: batchError } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('id', batchId)
    .eq('user_id', user.id)
    .single();

  if (batchError || !batch) {
    throw new ServiceError('Batch not found or unauthorized', 404);
  }

  const { data: latestScan } = await supabase
    .from('batch_scans')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const pdfBuffer = buildCertificatePdf(batch, latestScan || null);

  const certificateUrl = await uploadPdfToStorage(pdfBuffer, `certificates/${batchId}.pdf`, 'agriscan');

  if (!certificateUrl) {
    throw new ServiceError('Failed to upload certificate PDF', 500);
  }

  const { error: updateError } = await supabase
    .from('inventory_batches')
    .update({ certificate_url: certificateUrl })
    .eq('id', batchId);

  if (updateError) {
    console.error('Error updating batch certificate_url:', updateError);
    throw new ServiceError(updateError.message || 'Failed to save certificate URL', 400);
  }

  return { certificateUrl };
}
