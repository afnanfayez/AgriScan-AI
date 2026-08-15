import { uploadImageToStorage } from '@/lib/supabase';
import type { ScanResultItem } from '@/types/domain';
import { runPlantAnalysis } from './ai';
import { isFatalAiErrorCode } from './ai/errors';
import { ServiceError } from './errors';
import type { Plan } from './plan-service';
import type { PlantAnalysisContext } from './ai/contract';

export interface BatchAnalysisResult {
  totalSamples: number;
  healthyCount: number;
  infectionPercentage: number;
  results: ScanResultItem[];
}

/**
 * How many images are analyzed at once. Previously this loop was strictly
 * sequential, which was fine for Gemini flash models but risks blowing the
 * routes' maxDuration=120 budget on slower reasoning models: eight images at
 * ~15s each is 120s sequentially but ~45s at three-way concurrency.
 * Tunable via AI_BATCH_CONCURRENCY (set to 1 to restore sequential behaviour
 * if a provider's rate limits require it).
 */
function batchConcurrency(): number {
  const configured = Number(process.env.AI_BATCH_CONCURRENCY);
  if (Number.isFinite(configured) && configured >= 1) return Math.min(8, Math.floor(configured));
  return 3;
}

/**
 * True when a failure means the *remaining* images cannot succeed either -
 * missing API key, exhausted quota, rate limit, or no reachable model. Those
 * abort the whole batch instead of quietly producing placeholder results for
 * every image and still charging the user's quota.
 *
 * This replaces a set of message substring checks that no longer matched
 * anything the analysis layer produced, which meant fatal failures were being
 * swallowed.
 */
function isFatalBatchError(error: unknown): error is ServiceError {
  if (!(error instanceof ServiceError)) return false;
  return isFatalAiErrorCode(error.code) || error.status === 429 || error.status === 503;
}

/**
 * Shared multi-image batch analysis helper, used by Commercial Farmer field
 * scans (services/field-scans-service.ts) and Nursery Operator batch health
 * screening (services/batch-scans-service.ts). A single failed image degrades
 * to a placeholder result rather than failing the whole batch; a fatal
 * provider failure aborts it.
 */
export async function runBatchAnalysis(
  images: string[],
  context: PlantAnalysisContext = {},
  storagePathPrefix: string = 'batch-scans',
  plan: Plan = 'Free'
): Promise<BatchAnalysisResult> {
  const results: ScanResultItem[] = new Array(images.length);
  const startedAt = Date.now();

  let fatalError: ServiceError | null = null;
  let cursor = 0;

  const processOne = async (index: number) => {
    const image = images[index];

    let imageUrl = image;
    try {
      const uploadedUrl = await uploadImageToStorage(
        image,
        `${storagePathPrefix}/${startedAt}-${index}.jpg`,
        'agriscan'
      );
      imageUrl = uploadedUrl || image;
    } catch (uploadError) {
      console.error(`Error uploading batch image ${index}:`, uploadError);
    }

    try {
      const analysis = await runPlantAnalysis(image, context, plan);
      results[index] = {
        imageUrl,
        diagnosis: analysis.diagnosis,
        confidence: analysis.confidence,
        severity: analysis.severity,
        symptoms: analysis.symptoms,
        visibleOrgans: analysis.visibleOrgans,
        likelyCause: analysis.likelyCause,
        affectedAreaPercent: analysis.affectedAreaPercent,
        scoutingNotes: analysis.scoutingNotes,
        recommendedAction: analysis.recommendedAction,
        treatmentPriority: analysis.treatmentPriority,
      };
    } catch (analysisError) {
      console.error(`Error analyzing batch image ${index}:`, analysisError);

      if (isFatalBatchError(analysisError)) {
        // First fatal error wins; the others are collateral from in-flight work.
        fatalError = fatalError ?? analysisError;
        return;
      }

      results[index] = {
        imageUrl,
        diagnosis: 'Unable to assess image',
        confidence: 1,
        severity: 'Low',
        symptoms: analysisError instanceof Error ? analysisError.message : 'Analysis failed for this image.',
        visibleOrgans: [],
        likelyCause: 'Unclear',
        affectedAreaPercent: 0,
        scoutingNotes:
          'Retake this sample in bright, even light with the affected tissue filling most of the frame.',
        recommendedAction: 'Retake the image and rerun analysis before making treatment decisions.',
        treatmentPriority: 'Monitor',
      };
    }
  };

  const worker = async () => {
    while (!fatalError) {
      const index = cursor++;
      if (index >= images.length) return;
      await processOne(index);
    }
  };

  const workerCount = Math.max(1, Math.min(batchConcurrency(), images.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  if (fatalError) throw fatalError;

  // A fatal error is the only way an index goes unfilled, and that path threw
  // above - but stay defensive so aggregation never counts an empty slot.
  const completed = results.filter(Boolean);
  const totalSamples = completed.length;
  const healthyCount = completed.filter((r) => r.diagnosis === 'Healthy' || r.likelyCause === 'Healthy').length;
  const infectionPercentage =
    totalSamples > 0 ? Math.round(((totalSamples - healthyCount) / totalSamples) * 100) : 0;

  return { totalSamples, healthyCount, infectionPercentage, results: completed };
}
