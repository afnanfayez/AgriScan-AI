import OpenAI, { APIError } from 'openai';
import { ServiceError } from '../errors';
import {
  ANALYSIS_JSON_SCHEMA,
  ANALYSIS_SCHEMA_NAME,
  buildAnalysisPrompt,
  normalizeAnalysis,
  type PlantAnalysisContext,
  type PlantAnalysisResult,
} from './contract';
import { parseImageInput } from './image';
import { readRetryAfterSeconds, type AiErrorCode } from './errors';

const PLACEHOLDER_KEYS = new Set(['MY_OPENAI_API_KEY', 'sk-proj-MY_OPENAI_API_KEY', 'YOUR_OPENAI_API_KEY']);

function readApiKey(): string | undefined {
  // OPENAI_API_KEY is the SDK-standard name; OPENAI_KEY is accepted as an
  // alias so an existing deployment that used the shorter name keeps working.
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key || PLACEHOLDER_KEYS.has(key) || key.length < 20) return undefined;
  return key;
}

export function isOpenAiConfigured(): boolean {
  return !!readApiKey();
}

/** Number of output tokens reserved per call. Must leave room for reasoning
 *  tokens as well as the JSON payload, or the response comes back `incomplete`
 *  with empty output. */
function maxOutputTokens(): number {
  const configured = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 4000;
}

function requestTimeoutMs(): number {
  const configured = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 60_000;
}

function maxRetries(): number {
  // Deliberately low: the SDK retries 429s internally, and each retry eats into
  // the route's maxDuration budget. The model chain is the real fallback.
  const configured = Number(process.env.OPENAI_MAX_RETRIES);
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 1;
}

interface ClassifiedError {
  code: AiErrorCode;
  status: number;
  message: string;
  retryAfter?: number;
  /** When true, later models in the chain cannot succeed either - stop trying. */
  stopChain: boolean;
}

/**
 * Maps an OpenAI SDK error onto the provider-neutral taxonomy.
 *
 * The important distinction Gemini did not have: OpenAI returns 429 for both
 * `insufficient_quota` (billing exhausted - retrying never helps) and
 * `rate_limit_exceeded` (transient throughput - retrying does help). Telling a
 * user "try again later" is wrong for the first case.
 */
export function classifyOpenAiError(error: unknown): ClassifiedError {
  if (error instanceof APIError) {
    const detail = error.message || 'OpenAI request failed.';

    if (error.status === 401 || error.status === 403) {
      return {
        code: 'provider_not_configured',
        status: 503,
        message:
          'The OpenAI API key is invalid or lacks access to the configured model. Check OPENAI_API_KEY and the project it belongs to.',
        stopChain: true,
      };
    }

    if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
      return {
        code: 'quota_exhausted',
        status: 429,
        message:
          'AI analysis is temporarily unavailable because our API quota limit was reached. Please try again later.',
        retryAfter: readRetryAfterSeconds(error, detail),
        stopChain: true,
      };
    }

    if (error.status === 429) {
      return {
        code: 'rate_limited',
        status: 429,
        message: 'AI analysis is busy right now. Please retry in a few seconds.',
        retryAfter: readRetryAfterSeconds(error, detail),
        stopChain: true,
      };
    }

    // 404 / model_not_found / unsupported model: the next model in the chain is
    // exactly the right thing to try.
    if (error.status === 404 || error.code === 'model_not_found') {
      return { code: 'model_unavailable', status: 502, message: detail, stopChain: false };
    }

    return { code: 'model_unavailable', status: 502, message: detail, stopChain: false };
  }

  return {
    code: 'model_unavailable',
    status: 502,
    message: error instanceof Error ? error.message : 'OpenAI request failed.',
    stopChain: false,
  };
}

interface ExtractedPayload {
  kind: 'text' | 'refusal' | 'empty';
  text: string;
}

/**
 * Pulls the JSON payload out of a Responses API result.
 *
 * A refusal arrives as a distinct content part rather than as the schema-shaped
 * JSON, so it has to be detected before any JSON.parse - otherwise a safety
 * refusal surfaces as an unhelpful parser crash.
 */
export function extractPayload(response: any): ExtractedPayload {
  for (const item of response?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === 'refusal' && part.refusal) {
        return { kind: 'refusal', text: String(part.refusal) };
      }
    }
  }

  const text = typeof response?.output_text === 'string' ? response.output_text.trim() : '';
  if (text) return { kind: 'text', text };

  return { kind: 'empty', text: '' };
}

/**
 * One image in, one structured diagnosis out, via the OpenAI Responses API.
 *
 * `models` is tried in order; a model that is missing or rejected falls through
 * to the next, while an auth or quota failure stops the chain immediately
 * because no later model can succeed either.
 */
export async function analyzeWithOpenAi(
  image: string,
  context: PlantAnalysisContext,
  models: string[]
): Promise<PlantAnalysisResult> {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new ServiceError(
      'OpenAI API key is not configured. Set OPENAI_API_KEY to enable real AI plant diagnosis.',
      503,
      { code: 'provider_not_configured' }
    );
  }

  if (models.length === 0) {
    throw new ServiceError('No OpenAI model is configured for this plan.', 500, {
      code: 'model_unavailable',
    });
  }

  const { dataUrl } = parseImageInput(image);
  const prompt = buildAnalysisPrompt(context);

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: requestTimeoutMs(),
    maxRetries: maxRetries(),
  });

  let lastError: ClassifiedError | null = null;

  for (const model of models) {
    try {
      const response = await client.responses.create({
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: dataUrl, detail: 'auto' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: ANALYSIS_SCHEMA_NAME,
            strict: true,
            schema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
          },
        },
        max_output_tokens: maxOutputTokens(),
      });

      const payload = extractPayload(response);

      if (payload.kind === 'refusal') {
        throw new ServiceError(
          'The AI model declined to analyze this image. Upload a clear photo of the crop or plant tissue.',
          422,
          { code: 'analysis_refused' }
        );
      }

      if (payload.kind === 'empty') {
        const reason = response?.incomplete_details?.reason;
        if (response?.status === 'incomplete' || reason) {
          throw new ServiceError(
            `AI analysis stopped before returning a full result (${reason || 'incomplete'}). Raise OPENAI_MAX_OUTPUT_TOKENS and retry.`,
            502,
            { code: 'response_incomplete' }
          );
        }
        throw new ServiceError('OpenAI returned an empty response.', 502, {
          code: 'invalid_response',
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(payload.text);
      } catch {
        throw new ServiceError('OpenAI returned a response that was not valid JSON.', 502, {
          code: 'invalid_response',
        });
      }

      return normalizeAnalysis(parsed, 'OpenAI');
    } catch (modelError) {
      // Per-image outcomes (refusal, unparseable payload) are already final -
      // retrying them on a different model would just spend more quota.
      if (modelError instanceof ServiceError) throw modelError;

      const classified = classifyOpenAiError(modelError);
      lastError = classified;

      console.error('OpenAI model request failed', {
        provider: 'openai',
        model,
        status: modelError instanceof APIError ? modelError.status : 'unknown',
        code: classified.code,
        timestamp: new Date().toISOString(),
        detail: classified.message,
      });

      if (classified.stopChain) break;
    }
  }

  const failure: ClassifiedError = lastError ?? {
    code: 'model_unavailable',
    status: 502,
    message: 'No OpenAI model in the configured chain could be reached.',
    stopChain: true,
  };

  throw new ServiceError(
    failure.code === 'model_unavailable'
      ? `OpenAI model is unavailable or misconfigured. Set OPENAI_MODEL to a model available to your API key. Last error: ${failure.message}`
      : failure.message,
    failure.status,
    { code: failure.code, retryAfter: failure.retryAfter }
  );
}
