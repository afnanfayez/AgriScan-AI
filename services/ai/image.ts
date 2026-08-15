import { ServiceError } from '../errors';

/**
 * Normalizes whatever the client uploaded into both shapes the providers need:
 * OpenAI wants the whole data URL for `input_image.image_url`, Gemini wants the
 * bare base64 payload plus a separate mimeType for `inlineData`.
 */
export interface ParsedImage {
  /** `data:<mime>;base64,<payload>` - what OpenAI's input_image takes. */
  dataUrl: string;
  /** Bare base64 payload with no prefix - what Gemini's inlineData takes. */
  base64: string;
  mimeType: string;
}

/** Formats accepted by both providers' vision endpoints. */
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function parseImageInput(image: string): ParsedImage {
  if (!image || typeof image !== 'string') {
    throw new ServiceError('No plant image provided.', 400);
  }

  if (!image.startsWith('data:')) {
    // A bare base64 payload; the dashboard only ever uploads JPEG this way.
    return { dataUrl: `data:image/jpeg;base64,${image}`, base64: image, mimeType: 'image/jpeg' };
  }

  const commaIndex = image.indexOf(',');
  const header = commaIndex === -1 ? '' : image.slice(0, commaIndex);
  const payload = commaIndex === -1 ? '' : image.slice(commaIndex + 1);

  if (!payload) {
    throw new ServiceError('Plant image data URL is malformed or empty.', 400);
  }

  const mimeType = (header.match(/data:(.*?)(;|$)/)?.[1] || 'image/jpeg').toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new ServiceError(
      `Unsupported image format "${mimeType}". Upload a JPEG, PNG, WEBP, or GIF photo.`,
      400
    );
  }

  return { dataUrl: image, base64: payload, mimeType };
}
