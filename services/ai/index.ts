import type { Plan } from '../plan-service';
import type { AiProvider, PlantAnalysisContext, PlantAnalysisResult } from './contract';
import { resolveModelChain } from './models';
import { analyzeWithOpenAi, isOpenAiConfigured } from './openai-provider';
import { analyzeWithGemini, isGeminiConfigured } from './gemini-provider';

export type { AiProvider, PlantAnalysisContext, PlantAnalysisResult } from './contract';
export type { AiErrorCode } from './errors';
export { isFatalAiErrorCode } from './errors';
export { MODEL_CHAINS, resolveModelChain } from './models';

const PROVIDERS: AiProvider[] = ['openai', 'gemini'];

/**
 * Picks the analysis provider entirely from the environment - no code change
 * or redeploy is needed to switch:
 *
 *   AI_PROVIDER=openai   force OpenAI
 *   AI_PROVIDER=gemini   force Gemini (the pre-migration path)
 *   (unset)              auto: OpenAI if its key is set, else Gemini if its
 *                        key is set, else OpenAI so the resulting error names
 *                        the provider the app now expects.
 *
 * An unrecognized value is reported and treated as unset rather than throwing,
 * so a typo in a Cloud Run env var degrades to the default instead of taking
 * every scan route down.
 */
export function resolveAiProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (configured) {
    if (PROVIDERS.includes(configured as AiProvider)) return configured as AiProvider;
    console.error('Unrecognized AI_PROVIDER value; falling back to auto-detection', {
      value: configured,
      supported: PROVIDERS,
    });
  }

  if (isOpenAiConfigured()) return 'openai';
  if (isGeminiConfigured()) return 'gemini';
  return 'openai';
}

/** Whether the given provider (default: the active one) has a usable API key. */
export function isAiConfigured(provider: AiProvider = resolveAiProvider()): boolean {
  return provider === 'openai' ? isOpenAiConfigured() : isGeminiConfigured();
}

/**
 * Shared plant-image analysis call, used by the single-plant Plant Doctor scan
 * (services/scans-service.ts) as well as Commercial Farmer batch field scans
 * and Nursery Operator batch health screening - one image in, one structured
 * diagnosis out. Callers handle their own persistence and aggregation.
 */
export async function runPlantAnalysis(
  image: string,
  context: PlantAnalysisContext = {},
  plan: Plan = 'Free'
): Promise<PlantAnalysisResult> {
  const provider = resolveAiProvider();
  const models = resolveModelChain(provider, plan);

  if (provider === 'gemini') {
    return analyzeWithGemini(image, context, models);
  }
  return analyzeWithOpenAi(image, context, models);
}
