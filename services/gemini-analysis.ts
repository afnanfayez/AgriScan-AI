import { GoogleGenAI, Type } from '@google/genai';
import { ServiceError } from './errors';

export interface GeminiAnalysisResult {
  diagnosis: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string;
  organicSteps: string[];
  chemicalSteps: string[];
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
  context: { plantName?: string; plantType?: string } = {}
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
      Analyze this agricultural plant image for disease, pests, nutrient deficiency, abiotic stress, physical injury, or healthy status.
      ${context.plantName ? `Registered plant name: "${context.plantName}".` : ''}
      ${context.plantType ? `Registered plant type/cultivar: "${context.plantType}".` : ''}

      The image may show the whole plant or any visible plant part, including leaves, stems, fruit, flowers, roots, soil-line crown, canopy, or field row context.
      First identify the visible plant organ(s) and visible evidence. Only diagnose what is visible or reasonably inferable from the image and the registered crop type.
      If image quality is poor, the plant part is too distant/occluded, or the subject is not a plant, say so in the diagnosis and keep confidence low.
      Return practical organic and chemical/control recommendations. If healthy, return maintenance recommendations and "No chemical treatment required."
      Avoid claiming laboratory certainty. Mention uncertainty when symptoms overlap across diseases, pests, or nutrient/irrigation issues.

      You MUST respond ONLY with a JSON object in this exact structure:
      {
        "diagnosis": "Name of disease, pest, stress, 'Healthy', or 'Unable to assess image'",
        "confidence": a number between 1 and 99,
        "severity": "Low", "Medium", or "High",
        "symptoms": "A concise professional paragraph describing visible evidence and uncertainty.",
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

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: [promptText, imagePart],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['diagnosis', 'confidence', 'severity', 'symptoms', 'organicTreatments', 'chemicalTreatments'],
          properties: {
            diagnosis: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            symptoms: { type: Type.STRING },
            organicTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
            chemicalTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsed = JSON.parse(response.text.trim());
    return {
      diagnosis: String(parsed.diagnosis || 'Unable to assess image'),
      confidence: Math.min(99, Math.max(1, Number(parsed.confidence || 1))),
      severity: ['Low', 'Medium', 'High'].includes(parsed.severity) ? parsed.severity : 'Low',
      symptoms: String(parsed.symptoms || 'No symptom explanation returned by Gemini.'),
      organicSteps: Array.isArray(parsed.organicTreatments) ? parsed.organicTreatments : [],
      chemicalSteps: Array.isArray(parsed.chemicalTreatments) ? parsed.chemicalTreatments : [],
    };
  } catch (geminiError: any) {
    console.error('Gemini analysis failed:', geminiError);
    throw new ServiceError(geminiError.message || 'Gemini analysis failed', 502);
  }
}
