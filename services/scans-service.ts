import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { uploadImageToStorage } from '@/lib/supabase';
import type { SupabaseUserProfile } from '@/lib/auth';
import type { PlantScan, TreatmentPlan } from '@/types/domain';
import { mapTreatment } from './treatments-service';
import { ServiceError } from './errors';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const mapScan = (s: any): PlantScan => ({
  id: s.id,
  plantId: s.plant_id,
  userId: s.user_id,
  imageUrl: s.image_url,
  diagnosis: s.diagnosis,
  confidence: s.confidence,
  severity: s.severity,
  symptoms: s.symptoms,
  createdAt: s.created_at,
});

export async function listScans(supabase: SupabaseClient, plantId?: string | null): Promise<PlantScan[]> {
  let query = supabase.from('scans').select('*');

  if (plantId) {
    query = query.eq('plant_id', plantId);
  }

  const { data: scansData, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scans:', error);
    throw new ServiceError(error.message, 500);
  }

  return (scansData || []).map(mapScan);
}

export interface AnalyzeScanResult {
  scan: PlantScan;
  treatment: TreatmentPlan | null;
}

export async function analyzeScan(
  supabase: SupabaseClient,
  user: SupabaseUserProfile,
  input: { image: string; plantId: string }
): Promise<AnalyzeScanResult> {
  const { image, plantId } = input;

  // Fetch plant from Supabase
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('*')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    throw new ServiceError('Plant not found or unauthorized', 404);
  }

  let diagnosis = '';
  let confidence = 0;
  let severity: 'Low' | 'Medium' | 'High' = 'Low';
  let symptoms = '';
  let organicSteps: string[] = [];
  let chemicalSteps: string[] = [];

  // Extract base64 image data for mime type detection
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
      Registered plant name: "${plant.name}".
      Registered plant type/cultivar: "${plant.type}".

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
    diagnosis = String(parsed.diagnosis || 'Unable to assess image');
    confidence = Math.min(99, Math.max(1, Number(parsed.confidence || 1)));
    severity = ['Low', 'Medium', 'High'].includes(parsed.severity) ? parsed.severity : 'Low';
    symptoms = String(parsed.symptoms || 'No symptom explanation returned by Gemini.');
    organicSteps = Array.isArray(parsed.organicTreatments) ? parsed.organicTreatments : [];
    chemicalSteps = Array.isArray(parsed.chemicalTreatments) ? parsed.chemicalTreatments : [];
  } catch (geminiError: any) {
    console.error('Gemini analysis failed:', geminiError);
    throw new ServiceError(geminiError.message || 'Gemini analysis failed', 502);
  }

  // Upload plant inspection photo to Supabase Storage
  const storageFileName = `scans/${user.id}/${Date.now()}.jpg`;
  const storageUrl = await uploadImageToStorage(image, storageFileName, 'agriscan');
  const finalImageUrl = storageUrl || (image.startsWith('data:') ? image : `data:${mimeType};base64,${image}`);

  // Save scan to Supabase scans table
  const { data: newScan, error: scanError } = await supabase
    .from('scans')
    .insert({
      plant_id: plantId,
      user_id: user.id,
      image_url: finalImageUrl,
      diagnosis,
      confidence,
      severity,
      symptoms,
    })
    .select()
    .single();

  if (scanError || !newScan) {
    console.error('Error inserting scan:', scanError);
    throw new ServiceError(scanError?.message || 'Failed to save scan record', 400);
  }

  // Save treatment plan to Supabase treatments table
  const { data: newTreatment, error: treatmentError } = await supabase
    .from('treatments')
    .insert({
      scan_id: newScan.id,
      plant_id: plantId,
      user_id: user.id,
      type: diagnosis,
      organic_steps: organicSteps,
      chemical_steps: chemicalSteps,
      status: diagnosis === 'Healthy' ? 'Completed' : 'Pending',
    })
    .select()
    .single();

  if (treatmentError || !newTreatment) {
    console.error('Error inserting treatment:', treatmentError);
  }

  // Update plant status based on diagnosis
  let nextStatus: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
  if (diagnosis !== 'Healthy') {
    nextStatus = severity === 'High' ? 'Critical' : 'Warning';
  }

  const { error: plantUpdateError } = await supabase
    .from('plants')
    .update({ health_status: nextStatus })
    .eq('id', plantId);

  if (plantUpdateError) console.error('Error updating plant status:', plantUpdateError);

  // Add a note in notes table
  const mismatchFlag = /mismatch|wrong plant|different plant|not match|does not match|specimen/i.test(`${diagnosis} ${symptoms}`);
  const organicSummary = organicSteps.length ? organicSteps.map((step, index) => `${index + 1}. ${step}`).join('\n') : 'No organic steps returned.';
  const chemicalSummary = chemicalSteps.length ? chemicalSteps.map((step, index) => `${index + 1}. ${step}`).join('\n') : 'No chemical controls returned.';
  const { error: noteError } = await supabase
    .from('notes')
    .insert({
      plant_id: plantId,
      user_id: user.id,
      photo_url: finalImageUrl,
      content: [
        `AI Scan completed for ${plant.name}.`,
        `Diagnosis: ${diagnosis}`,
        `Confidence: ${confidence}%`,
        `Severity: ${severity}`,
        `Plant status updated to: ${nextStatus}`,
        mismatchFlag ? 'Important: Gemini indicated the image may not match the selected plant record. Review the saved scan image before applying treatment.' : '',
        `Visible evidence: ${symptoms}`,
        `Organic steps:\n${organicSummary}`,
        `Chemical controls:\n${chemicalSummary}`,
      ].filter(Boolean).join('\n\n'),
    });

  if (noteError) console.error('Error creating scan log note:', noteError);

  // Add notification about diagnosis
  let notifTitle = `Scan Clear: ${plant.name}`;
  let notifMessage = `Your "${plant.name}" appears healthy in the submitted plant image.`;

  if (diagnosis !== 'Healthy') {
    notifTitle = `Disease Alert: ${diagnosis}`;
    notifMessage = `AgriScan AI detected ${diagnosis} on your "${plant.name}" with ${confidence}% confidence. Please review the treatment plan immediately.`;
  }

  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      title: notifTitle,
      message: notifMessage,
      category: 'Scan',
      read: false,
    });

  if (notifError) console.error('Error creating scan notification:', notifError);

  return {
    scan: mapScan(newScan),
    treatment: newTreatment ? mapTreatment(newTreatment) : null,
  };
}
