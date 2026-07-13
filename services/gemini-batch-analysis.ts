import { uploadImageToStorage } from '@/lib/supabase';
import type { ScanResultItem } from '@/types/domain';
import { runGeminiPlantAnalysis } from './gemini-analysis';
import { ServiceError } from './errors';
import type { Plan } from './plan-service';

export interface BatchAnalysisResult {
  totalSamples: number;
  healthyCount: number;
  infectionPercentage: number;
  results: ScanResultItem[];
}

/**
 * Shared multi-image batch analysis helper, used by Commercial Farmer field
 * scans (services/field-scans-service.ts) and conceptually reusable by
 * Nursery Operator batch health screening. Loops sequentially (not
 * Promise.all) to stay under Gemini rate limits and keep error attribution
 * per-image - a single failed image degrades to a placeholder result rather
 * than failing the whole batch.
 */
export async function runGeminiBatchAnalysis(
  images: string[],
  context: { plantName?: string; plantType?: string } = {},
  storagePathPrefix: string = 'batch-scans',
  plan: Plan = 'Free'
): Promise<BatchAnalysisResult> {
  const results: ScanResultItem[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    let imageUrl = image;
    try {
      const uploadedUrl = await uploadImageToStorage(image, `${storagePathPrefix}/${Date.now()}-${i}.jpg`, 'agriscan');
      imageUrl = uploadedUrl || image;
    } catch (uploadError) {
      console.error(`Error uploading batch image ${i}:`, uploadError);
    }

    try {
      const analysis = await runGeminiPlantAnalysis(image, context, plan);
      results.push({
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
      });
    } catch (analysisError) {
      console.error(`Error analyzing batch image ${i}:`, analysisError);
      if (
        analysisError instanceof ServiceError &&
        (analysisError.status === 429 ||
          analysisError.message.includes('Gemini quota or rate limit exceeded') ||
          analysisError.message.includes('Gemini model is unavailable') ||
          analysisError.message.includes('Gemini API key is not configured'))
      ) {
        throw analysisError;
      }

      results.push({
        imageUrl,
        diagnosis: 'Unable to assess image',
        confidence: 1,
        severity: 'Low',
        symptoms: analysisError instanceof Error ? analysisError.message : 'Analysis failed for this image.',
        visibleOrgans: [],
        likelyCause: 'Unclear',
        affectedAreaPercent: 0,
        scoutingNotes: 'Retake this sample in bright, even light with the affected tissue filling most of the frame.',
        recommendedAction: 'Retake the image and rerun analysis before making treatment decisions.',
        treatmentPriority: 'Monitor',
      });
    }
  }

  const totalSamples = results.length;
  const healthyCount = results.filter((r) => r.diagnosis === 'Healthy' || r.likelyCause === 'Healthy').length;
  const infectionPercentage = totalSamples > 0 ? Math.round(((totalSamples - healthyCount) / totalSamples) * 100) : 0;

  return { totalSamples, healthyCount, infectionPercentage, results };
}
