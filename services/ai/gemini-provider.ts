import { GoogleGenAI } from '@google/genai';
import { ServiceError } from '../errors';
import {
  ANALYSIS_JSON_SCHEMA,
  buildAnalysisPrompt,
  normalizeAnalysis,
  type PlantAnalysisContext,
  type PlantAnalysisResult,
} from './contract';
import { parseImageInput } from './image';
import { readRetryAfterSeconds, type AiErrorCode } from './errors';

const PLACEHOLDER_KEYS = new Set(['MY_GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY']);

function readApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY;
  if (!key || PLACEHOLDER_KEYS.has(key) || key.length <= 10) return undefined;
  return key;
}

export function isGeminiConfigured(): boolean {
  return !!readApiKey();
}

/**
 * Rewrites the shared JSON Schema into the dialect Gemini's responseSchema
 * expects: uppercase type names, and no `additionalProperties` (which Gemini
 * rejects but OpenAI strict mode requires). One schema, two dialects.
 */
function toGeminiSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== 'object') return schema;

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties') continue;
    if (key === 'type' && typeof value === 'string') {
      converted.type = value.toUpperCase();
    } else if (key === 'properties' && value && typeof value === 'object') {
      converted.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([name, sub]) => [name, toGeminiSchema(sub)])
      );
    } else if (key === 'items') {
      converted.items = toGeminiSchema(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

function getGeminiErrorText(error: any): string {
  return error?.message || JSON.stringify(error?.error || error) || String(error || 'Gemini analysis failed.');
}

function isGeminiQuotaError(error: any): boolean {
  const detail = getGeminiErrorText(error);
  return (
    error?.status === 429 ||
    error?.error?.code === 429 ||
    detail.includes('"code":429') ||
    detail.includes('RESOURCE_EXHAUSTED') ||
    detail.includes('Quota exceeded') ||
    detail.includes('rate-limits')
  );
}

/**
 * One image in, one structured diagnosis out, via Gemini. Retained as a
 * fallback provider so AI_PROVIDER=gemini restores the pre-migration path
 * without a code change or redeploy.
 */
export async function analyzeWithGemini(
  image: string,
  context: PlantAnalysisContext,
  models: string[]
): Promise<PlantAnalysisResult> {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new ServiceError(
      'Gemini API key is not configured. Set GEMINI_API_KEY to enable real AI plant diagnosis.',
      503,
      { code: 'provider_not_configured' }
    );
  }

  if (models.length === 0) {
    throw new ServiceError('No Gemini model is configured for this plan.', 500, {
      code: 'model_unavailable',
    });
  }

  const { base64, mimeType } = parseImageInput(image);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const imagePart = { inlineData: { mimeType, data: base64 } };
  const prompt = buildAnalysisPrompt(context);
  const responseSchema = toGeminiSchema(ANALYSIS_JSON_SCHEMA);

  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
  let lastModelError: any = null;
  let hadQuotaError = false;
  let retryAfter = 0;

  for (const model of models) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: [prompt, imagePart],
        config: {
          responseMimeType: 'application/json',
          // Gemini's Schema type is nominally typed; the converter above emits
          // the same structure with uppercase type names.
          responseSchema: responseSchema as any,
        },
      });
      break;
    } catch (modelError: any) {
      lastModelError = modelError;
      const quotaError = isGeminiQuotaError(modelError);
      console.error('Gemini model request failed', {
        provider: 'gemini',
        model,
        status: modelError?.status ?? modelError?.error?.code ?? 'unknown',
        code: quotaError ? 'quota_exhausted' : 'model_unavailable',
        timestamp: new Date().toISOString(),
        detail: getGeminiErrorText(modelError),
      });
      if (quotaError) {
        hadQuotaError = true;
        retryAfter = Math.max(retryAfter, readRetryAfterSeconds(modelError, getGeminiErrorText(modelError)));
      }
    }
  }

  if (!response) {
    if (hadQuotaError) {
      throw new ServiceError(
        'AI analysis is temporarily unavailable because our API quota limit was reached. Please try again later.',
        429,
        { code: 'quota_exhausted' satisfies AiErrorCode, retryAfter }
      );
    }
    throw new ServiceError(
      `Gemini model is unavailable or misconfigured. Set GEMINI_MODEL to a model available for your API key, such as gemini-2.5-flash. Last error: ${getGeminiErrorText(lastModelError)}`,
      502,
      { code: 'model_unavailable' satisfies AiErrorCode }
    );
  }

  if (!response.text) {
    throw new ServiceError('Gemini returned an empty response.', 502, {
      code: 'invalid_response' satisfies AiErrorCode,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text.trim());
  } catch {
    throw new ServiceError('Gemini returned a response that was not valid JSON.', 502, {
      code: 'invalid_response' satisfies AiErrorCode,
    });
  }

  return normalizeAnalysis(parsed, 'Gemini');
}
