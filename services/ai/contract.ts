/**
 * The provider-neutral analysis contract.
 *
 * Everything downstream of a scan - Supabase writes, dashboard rendering, PDF
 * export, notification copy - depends on this exact shape. Providers differ in
 * how they are asked for it (services/ai/openai-provider.ts,
 * services/ai/gemini-provider.ts) but must all return this, normalized and
 * clamped, so swapping AI_PROVIDER changes no behaviour anywhere else.
 */

export type AiProvider = 'openai' | 'gemini';

export interface PlantAnalysisResult {
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

export interface PlantAnalysisContext {
  plantName?: string;
  plantType?: string;
}

export const ANALYSIS_SCHEMA_NAME = 'plant_analysis';

const SEVERITIES = ['Low', 'Medium', 'High'] as const;
const PRIORITIES = ['Monitor', 'Treat Soon', 'Urgent'] as const;

/**
 * Plain JSON Schema, shared by both providers.
 *
 * Shaped to satisfy OpenAI structured-output strict mode, which requires every
 * property to appear in `required` and `additionalProperties: false` on every
 * object. The Gemini provider converts this via toGeminiSchema().
 *
 * Note the wire names `organicTreatments`/`chemicalTreatments` - they are
 * mapped onto `organicSteps`/`chemicalSteps` in normalizeAnalysis() to match
 * the column names used by the treatments table.
 */
export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
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
    'chemicalTreatments',
  ],
  properties: {
    diagnosis: { type: 'string' },
    confidence: { type: 'integer', minimum: 1, maximum: 99 },
    severity: { type: 'string', enum: [...SEVERITIES] },
    symptoms: { type: 'string' },
    visibleOrgans: { type: 'array', items: { type: 'string' } },
    likelyCause: { type: 'string' },
    affectedAreaPercent: { type: 'integer', minimum: 0, maximum: 100 },
    scoutingNotes: { type: 'string' },
    recommendedAction: { type: 'string' },
    treatmentPriority: { type: 'string', enum: [...PRIORITIES] },
    organicTreatments: { type: 'array', items: { type: 'string' } },
    chemicalTreatments: { type: 'array', items: { type: 'string' } },
  },
} as const;

export function buildAnalysisPrompt(context: PlantAnalysisContext = {}): string {
  return `
      Analyze this agricultural crop scouting image for disease, pests, nutrient deficiency, abiotic stress, physical injury, or healthy status.
      ${context.plantName ? `Registered plant name: "${context.plantName}".` : ''}
      ${context.plantType ? `Registered plant type/cultivar: "${context.plantType}".` : ''}

      The image may show the whole plant or any visible plant part, including leaves, stems, fruit, flowers, roots, soil-line crown, canopy, or field row context.
      First identify the visible plant organ(s) and visible evidence. Only diagnose what is visible or reasonably inferable from the image and the registered crop type.
      Do not overuse "Unable to assess image". If any crop tissue, field row, leaf, stem, fruit, canopy, or soil-line plant context is visible, provide the best cautious agronomic assessment with low confidence when needed.
      Use "Unable to assess image" only when the subject is not agricultural/plant material or the image is too blurred/dark/occluded to identify any useful plant evidence.
      Return practical organic and chemical/control recommendations. If healthy, return maintenance recommendations and "No chemical treatment required."
      Avoid claiming laboratory certainty. Mention uncertainty when symptoms overlap across diseases, pests, or nutrient/irrigation issues.

      Respond only with a JSON object matching the required schema:
      - "diagnosis": name of disease, pest, stress, "Healthy", or "Unable to assess image"
      - "confidence": integer 1-99
      - "severity": "Low", "Medium", or "High"
      - "symptoms": a concise professional paragraph describing visible evidence and uncertainty
      - "visibleOrgans": visible plant parts, e.g. "leaf", "fruit", "stem", "canopy", "soil-line"
      - "likelyCause": "Disease", "Pest", "Nutrient deficiency", "Water/heat stress", "Physical injury", "Healthy", or "Unclear"
      - "affectedAreaPercent": integer 0-100 estimating visible affected tissue
      - "scoutingNotes": what a farmer should inspect next in the field
      - "recommendedAction": the most important next action for this sample
      - "treatmentPriority": "Monitor", "Treat Soon", or "Urgent"
      - "organicTreatments": ordered organic steps
      - "chemicalTreatments": ordered chemical/control steps
    `;
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];

/**
 * Clamps and defaults a raw model payload into the app contract. Structured
 * outputs make most of this belt-and-braces, but Gemini's responseSchema is
 * advisory rather than enforced, and neither provider guarantees a payload
 * when it degrades to a fallback model - so nothing downstream ever sees an
 * out-of-range confidence or an unexpected enum value.
 */
export function normalizeAnalysis(parsed: any, providerLabel: string): PlantAnalysisResult {
  const severity = SEVERITIES.includes(parsed?.severity) ? parsed.severity : 'Low';
  const treatmentPriority = PRIORITIES.includes(parsed?.treatmentPriority) ? parsed.treatmentPriority : 'Monitor';

  const confidence = Number(parsed?.confidence);
  const affectedAreaPercent = Number(parsed?.affectedAreaPercent);

  return {
    diagnosis: String(parsed?.diagnosis || 'Unable to assess image'),
    confidence: Math.min(99, Math.max(1, Number.isFinite(confidence) ? Math.round(confidence) : 1)),
    severity,
    symptoms: String(parsed?.symptoms || `No symptom explanation returned by ${providerLabel}.`),
    visibleOrgans: asStringArray(parsed?.visibleOrgans),
    likelyCause: String(parsed?.likelyCause || 'Unclear'),
    affectedAreaPercent: Math.min(
      100,
      Math.max(0, Number.isFinite(affectedAreaPercent) ? Math.round(affectedAreaPercent) : 0)
    ),
    scoutingNotes: String(
      parsed?.scoutingNotes || 'Inspect neighboring plants and compare symptoms across the row.'
    ),
    recommendedAction: String(
      parsed?.recommendedAction ||
        'Continue monitoring and retake a clearer sample if symptoms progress.'
    ),
    treatmentPriority,
    organicSteps: asStringArray(parsed?.organicTreatments),
    chemicalSteps: asStringArray(parsed?.chemicalTreatments),
  };
}
