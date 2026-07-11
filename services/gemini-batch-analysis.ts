import { uploadImageToStorage } from '@/lib/supabase';
import type { ScanResultItem } from '@/types/domain';
import { runGeminiPlantAnalysis } from './gemini-analysis';

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
  storagePathPrefix: string = 'batch-scans'
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
      const { diagnosis, confidence, severity, symptoms } = await runGeminiPlantAnalysis(image, context);
      results.push({ imageUrl, diagnosis, confidence, severity, symptoms });
    } catch (analysisError) {
      console.error(`Error analyzing batch image ${i}:`, analysisError);
      results.push({
        imageUrl,
        diagnosis: 'Unable to assess image',
        confidence: 1,
        severity: 'Low',
        symptoms: 'Analysis failed for this image.',
      });
    }
  }

  const totalSamples = results.length;
  const healthyCount = results.filter((r) => r.diagnosis === 'Healthy').length;
  const infectionPercentage = totalSamples > 0 ? Math.round(((totalSamples - healthyCount) / totalSamples) * 100) : 0;

  return { totalSamples, healthyCount, infectionPercentage, results };
}
