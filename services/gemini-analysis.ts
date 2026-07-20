import { GoogleGenAI, Type } from '@google/genai';
import { ServiceError } from './errors';
import { PLAN_LIMITS, type Plan } from './plan-service';

export interface GeminiAnalysisResult {
  diagnosis: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string;
  visibleOrgans: string[];
  likelyCause: string;
  affectedAreaPercent: number;
  scoutingNotes: string;
  recommendedAction: string;
  treatmentPriority: 'Monitor' | 'Treat Soon' | 'Urgent';
  organicSteps: string[];
  chemicalSteps: string[];
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

function getRetryAfterSeconds(error: any): number {
  const retryAfter = Number(error?.headers?.get?.('retry-after') ?? error?.headers?.['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.ceil(retryAfter);

  const detail = getGeminiErrorText(error);
  const retryDelay = detail.match(/(?:retry(?:Delay| after)?)[^0-9]*(\d+(?:\.\d+)?)\s*s/i);
  return retryDelay ? Math.max(1, Math.ceil(Number(retryDelay[1]))) : 17;
}

/**
 * Shared Gemini plant-image analysis call, used by the single-plant Plant
 * Doctor scan (services/scans-service.ts) as well as Commercial Farmer batch
 * field scans and Nursery Operator batch health screening - one image in,
 * one structured diagnosis out. Callers handle their own persistence and
 * aggregation.
 */
export async function runGeminiPlantAnalysis(
  image: string,
  context: { plantName?: string; plantType?: string } = {},
  plan: Plan = 'Free'
): Promise<GeminiAnalysisResult> {
  let base64Data = '';
  let mimeType = 'image/jpeg';
  if (image.startsWith('data:')) {
    const parts = image.split(',');
    base64Data = parts[1];
    const mimeMatch = parts[0].match(/data:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  } else {
    base64Data = image;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isRealKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10;

  if (!isRealKey) {
    throw new ServiceError('Gemini API key is not configured. Set GEMINI_API_KEY to enable real AI plant diagnosis.', 503);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `
      Analyze this agricultural crop scouting image for disease, pests, nutrient deficiency, abiotic stress, physical injury, or healthy status.
      ${context.plantName ? `Registered plant name: "${context.plantName}".` : ''}
      ${context.plantType ? `Registered plant type/cultivar: "${context.plantType}".` : ''}

      The image may show the whole plant or any visible plant part, including leaves, stems, fruit, flowers, roots, soil-line crown, canopy, or field row context.
      First identify the visible plant organ(s) and visible evidence. Only diagnose what is visible or reasonably inferable from the image and the registered crop type.
      Do not overuse "Unable to assess image". If any crop tissue, field row, leaf, stem, fruit, canopy, or soil-line plant context is visible, provide the best cautious agronomic assessment with low confidence when needed.
      Use "Unable to assess image" only when the subject is not agricultural/plant material or the image is too blurred/dark/occluded to identify any useful plant evidence.
      Return practical organic and chemical/control recommendations. If healthy, return maintenance recommendations and "No chemical treatment required."
      Avoid claiming laboratory certainty. Mention uncertainty when symptoms overlap across diseases, pests, or nutrient/irrigation issues.

      You MUST respond ONLY with a JSON object in this exact structure:
      {
        "diagnosis": "Name of disease, pest, stress, 'Healthy', or 'Unable to assess image'",
        "confidence": a number between 1 and 99,
        "severity": "Low", "Medium", or "High",
        "symptoms": "A concise professional paragraph describing visible evidence and uncertainty.",
        "visibleOrgans": ["leaf", "fruit", "stem", "canopy", "soil-line", or other visible parts],
        "likelyCause": "Disease, Pest, Nutrient deficiency, Water/heat stress, Physical injury, Healthy, or Unclear",
        "affectedAreaPercent": a number between 0 and 100 estimating visible affected tissue,
        "scoutingNotes": "What a farmer should inspect next in the field.",
        "recommendedAction": "The most important next action for this sample.",
        "treatmentPriority": "Monitor", "Treat Soon", or "Urgent",
        "organicTreatments": ["Step 1...", "Step 2..."],
        "chemicalTreatments": ["Step 1...", "Step 2..."]
      }
    `;

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const responseSchema = {
      type: Type.OBJECT,
      required: [
        'diagnosis',
        'confidence',
        'severity',
        'symptoms',
        'visibleOrgans',
        'likelyCause',
        'affectedAreaPercent',
        'scoutingNotes',
        'recommendedAction',
        'treatmentPriority',
        'organicTreatments',
        'chemicalTreatments'
      ],
      properties: {
        diagnosis: { type: Type.STRING },
        confidence: { type: Type.INTEGER },
        severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
        symptoms: { type: Type.STRING },
        visibleOrgans: { type: Type.ARRAY, items: { type: Type.STRING } },
        likelyCause: { type: Type.STRING },
        affectedAreaPercent: { type: Type.INTEGER },
        scoutingNotes: { type: Type.STRING },
        recommendedAction: { type: Type.STRING },
        treatmentPriority: { type: Type.STRING, enum: ['Monitor', 'Treat Soon', 'Urgent'] },
        organicTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
        chemicalTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    };

    const models = Array.from(new Set([
      process.env.GEMINI_MODEL,
      ...PLAN_LIMITS[plan].modelChain,
    ].filter(Boolean))) as string[];

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastModelError: any = null;
    let hadQuotaError = false;
    let retryAfter = 17;
    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [promptText, imagePart],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        break;
      } catch (modelError) {
        lastModelError = modelError;
        const quotaError = isGeminiQuotaError(modelError);
        console.error('Gemini model request failed', {
          model,
          code: modelError?.status ?? modelError?.error?.code ?? 'unknown',
          reason: quotaError ? 'quota_exhausted' : 'model_request_failed',
          timestamp: new Date().toISOString(),
          detail: getGeminiErrorText(modelError),
        });
        if (quotaError) {
          hadQuotaError = true;
          retryAfter = Math.max(retryAfter, getRetryAfterSeconds(modelError));
        }
      }
    }

    if (!response) {
      const detail = getGeminiErrorText(lastModelError);
      if (hadQuotaError) {
        throw new ServiceError(
          'AI analysis is temporarily unavailable because our API quota limit was reached. Please try again later.',
          429,
          { code: 'quota_exhausted', retryAfter }
        );
      }
      throw new ServiceError(
        `Gemini model is unavailable or misconfigured. Set GEMINI_MODEL to a model available for your API key, such as gemini-2.5-flash. Last error: ${detail}`,
        502
      );
    }

    if (!response.text) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsed = JSON.parse(response.text.trim());
    const priority = ['Monitor', 'Treat Soon', 'Urgent'].includes(parsed.treatmentPriority) ? parsed.treatmentPriority : 'Monitor';
    return {
      diagnosis: String(parsed.diagnosis || 'Unable to assess image'),
      confidence: Math.min(99, Math.max(1, Number(parsed.confidence || 1))),
      severity: ['Low', 'Medium', 'High'].includes(parsed.severity) ? parsed.severity : 'Low',
      symptoms: String(parsed.symptoms || 'No symptom explanation returned by Gemini.'),
      visibleOrgans: Array.isArray(parsed.visibleOrgans) ? parsed.visibleOrgans.map(String).filter(Boolean) : [],
      likelyCause: String(parsed.likelyCause || 'Unclear'),
      affectedAreaPercent: Math.min(100, Math.max(0, Number(parsed.affectedAreaPercent || 0))),
      scoutingNotes: String(parsed.scoutingNotes || 'Inspect neighboring plants and compare symptoms across the row.'),
      recommendedAction: String(parsed.recommendedAction || 'Continue monitoring and retake a clearer sample if symptoms progress.'),
      treatmentPriority: priority,
      organicSteps: Array.isArray(parsed.organicTreatments) ? parsed.organicTreatments : [],
      chemicalSteps: Array.isArray(parsed.chemicalTreatments) ? parsed.chemicalTreatments : [],
    };
  } catch (geminiError: any) {
    console.error('Gemini analysis failed:', geminiError);
    if (geminiError instanceof ServiceError) {
      throw geminiError;
    }
    throw new ServiceError(geminiError.message || 'Gemini analysis failed', 502);
  }
}
