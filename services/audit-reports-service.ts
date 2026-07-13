import { createClient } from '@/utils/supabase/server';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { AuditReport } from '@/types/domain';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapAuditReport = (r: any): AuditReport => ({
  id: r.id,
  userId: r.user_id,
  farmId: r.farm_id ?? undefined,
  title: r.title,
  summary: r.summary ?? undefined,
  status: r.status,
  createdAt: r.created_at,
});

export async function listAuditReports(supabase: SupabaseClient, user: SupabaseUserProfile): Promise<AuditReport[]> {
  const { data, error } = await supabase
    .from('audit_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audit reports:', error);
    throw new ServiceError(error.message, 500);
  }

  return (data || []).map(mapAuditReport);
}

export interface CreateAuditReportInput {
  title: string;
  summary?: string;
  farmId?: string;
  status?: AuditReport['status'];
}

export async function createAuditReport(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: CreateAuditReportInput
): Promise<AuditReport> {
  const { title, summary, farmId, status } = input;

  if (!title) {
    throw new ServiceError('Title is required.', 400);
  }

  const { data: newReport, error } = await supabase
    .from('audit_reports')
    .insert({
      user_id: user.id,
      farm_id: farmId || null,
      title,
      summary,
      status: status || 'Draft',
    })
    .select()
    .single();

  if (error || !newReport) {
    console.error('Error creating audit report:', error);
    throw new ServiceError(error?.message || 'Failed to create audit report', 400);
  }

  return mapAuditReport(newReport);
}

export interface UpdateAuditReportInput {
  id: string;
  title?: string;
  summary?: string;
  status?: AuditReport['status'];
}

export async function updateAuditReport(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: UpdateAuditReportInput
): Promise<AuditReport> {
  const { id, title, summary, status } = input;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (summary !== undefined) updateData.summary = summary;
  if (status !== undefined) updateData.status = status;

  const { data: updatedReport, error } = await supabase
    .from('audit_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedReport) {
    console.error('Error updating audit report:', error);
    throw new ServiceError(error?.message || 'Failed to update audit report', 400);
  }

  return mapAuditReport(updatedReport);
}

export async function deleteAuditReport(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('audit_reports')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting audit report:', error);
    throw new ServiceError(error.message, 400);
  }
}
