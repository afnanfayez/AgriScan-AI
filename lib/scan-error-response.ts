import { NextResponse } from 'next/server';
import { ServiceError } from '@/services/errors';
import { DEFAULT_RETRY_AFTER_SECONDS } from '@/services/ai/errors';

/**
 * Shared error shaping for the three scan routes (single scan, farmer field
 * scan, nursery batch scan) so they report provider failures identically.
 *
 * Retryable failures answer 429 with a machine-readable `error` code plus a
 * `Retry-After` header; everything else keeps the pre-existing
 * `{ error: <message> }` shape the dashboard already reads.
 */
const RETRYABLE_CODES = new Set(['quota_exhausted', 'rate_limited']);

const RETRYABLE_MESSAGES: Record<string, string> = {
  quota_exhausted:
    'AI analysis is temporarily unavailable because our API quota limit was reached. Please try again later.',
  rate_limited: 'AI analysis is busy right now. Please retry in a few seconds.',
};

export function scanErrorResponse(error: unknown, context: string): NextResponse {
  const serviceError = error instanceof ServiceError ? error : null;

  console.error(context, {
    code: serviceError?.code ?? (error as any)?.code ?? (error as any)?.status ?? 'unknown',
    status: serviceError?.status ?? 500,
    timestamp: new Date().toISOString(),
    message: (error as any)?.message ?? 'Unknown error',
  });

  if (serviceError && serviceError.code && RETRYABLE_CODES.has(serviceError.code)) {
    const retryAfter = serviceError.retryAfter ?? DEFAULT_RETRY_AFTER_SECONDS;
    return NextResponse.json(
      {
        success: false,
        error: serviceError.code,
        message: RETRYABLE_MESSAGES[serviceError.code] ?? serviceError.message,
        retryAfter,
      },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  if (serviceError) {
    return NextResponse.json({ error: serviceError.message }, { status: serviceError.status });
  }

  return NextResponse.json(
    { error: (error as any)?.message || 'Internal Server Error' },
    { status: 500 }
  );
}
