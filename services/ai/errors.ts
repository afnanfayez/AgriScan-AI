/**
 * Provider-neutral failure taxonomy.
 *
 * Routes and the batch loop branch on these codes rather than on message text.
 * The previous Gemini-only code matched on substrings such as
 * "Gemini quota or rate limit exceeded", which no longer appeared anywhere in
 * the codebase - so genuinely fatal failures were being swallowed into
 * per-image placeholder results instead of aborting the batch.
 */

export type AiErrorCode =
  /** No usable API key for the selected provider. Operator problem, not user. */
  | 'provider_not_configured'
  /** Billing/credit exhausted. Retrying will not help until the account is topped up. */
  | 'quota_exhausted'
  /** Transient throughput limit. Retrying after `retryAfter` seconds should work. */
  | 'rate_limited'
  /** Every model in the chain failed or was rejected. */
  | 'model_unavailable'
  /** The model declined the request on safety grounds. */
  | 'analysis_refused'
  /** The model hit its output-token ceiling before emitting complete JSON. */
  | 'response_incomplete'
  /** A response arrived but was empty or unparseable. */
  | 'invalid_response';

/**
 * Failures that mean the *next* image in a batch cannot succeed either, so the
 * whole batch should abort rather than burn quota producing placeholders.
 * `analysis_refused` and `invalid_response` are deliberately absent: those are
 * per-image outcomes and the batch should carry on.
 */
export const FATAL_AI_ERROR_CODES: ReadonlySet<AiErrorCode> = new Set<AiErrorCode>([
  'provider_not_configured',
  'quota_exhausted',
  'rate_limited',
  'model_unavailable',
]);

export function isFatalAiErrorCode(code: string | undefined): boolean {
  return !!code && FATAL_AI_ERROR_CODES.has(code as AiErrorCode);
}

/** Default backoff when a provider signals a rate limit without a Retry-After. */
export const DEFAULT_RETRY_AFTER_SECONDS = 17;

/**
 * Reads a retry hint from whichever shape the provider used: a `Retry-After`
 * header (OpenAI, as a Headers object or a plain record) or a `retryDelay`
 * embedded in the error text (Gemini).
 */
export function readRetryAfterSeconds(error: any, fallbackText: string = ''): number {
  const rawHeader =
    error?.headers?.get?.('retry-after') ??
    error?.headers?.['retry-after'] ??
    error?.headers?.['Retry-After'];

  const headerSeconds = Number(rawHeader);
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) return Math.ceil(headerSeconds);

  const detail = fallbackText || String(error?.message ?? '');
  const embedded = detail.match(/(?:retry(?:Delay| after)?)[^0-9]*(\d+(?:\.\d+)?)\s*s/i);
  return embedded ? Math.max(1, Math.ceil(Number(embedded[1]))) : DEFAULT_RETRY_AFTER_SECONDS;
}
