import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { generateExport } from '@/services/export';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();

    const supabase = await createClient();
    const result = await generateExport(supabase, user, format);

    return new NextResponse(result.body as any, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': result.contentDisposition,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
