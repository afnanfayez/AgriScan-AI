import type { Plan } from '../plan-service';
import type { AiProvider } from './contract';

/**
 * Which models each subscription tier is analyzed with, per provider.
 *
 * Kept here rather than in plan-service so the AI layer stays importable
 * without pulling in the Supabase server client - that is what lets
 * scripts/verify-openai.mjs exercise this configuration outside a request.
 *
 * Chains are tried in order and fall through only on "model missing/rejected"
 * failures; auth and quota failures stop the chain (see openai-provider.ts).
 *
 * NOTE: the previous Gemini chains listed ids that do not exist
 * (gemini-3.5-flash, gemini-1.5-flash-8b) and were byte-identical across all
 * three tiers, so the tier differentiation promised in the README was not
 * real. Both problems are fixed here.
 */
export const MODEL_CHAINS: Record<AiProvider, Record<Plan, string[]>> = {
  openai: {
    // Cost-optimized: high volume, lowest cost per scan.
    Free: ['gpt-5.6-luna', 'gpt-4o-mini'],
    // Balanced intelligence/cost, with a cheaper and an older fallback.
    Pro: ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-4o'],
    // Frontier first, degrading through the cheaper tiers rather than failing.
    Enterprise: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'],
  },
  gemini: {
    Free: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    Pro: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
    Enterprise: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
};

/**
 * The model chain for a provider/plan pair, with the operator's env override
 * (OPENAI_MODEL / GEMINI_MODEL) tried first when set. Deduplicated so an
 * override that already appears in the chain does not get called twice.
 */
export function resolveModelChain(provider: AiProvider, plan: Plan): string[] {
  const override = provider === 'openai' ? process.env.OPENAI_MODEL : process.env.GEMINI_MODEL;
  const chain = MODEL_CHAINS[provider][plan] ?? MODEL_CHAINS[provider].Free;
  return Array.from(new Set([override, ...chain].filter(Boolean))) as string[];
}
