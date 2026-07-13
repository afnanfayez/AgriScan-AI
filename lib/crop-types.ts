export function parseCropTypes(cropType?: string | string[] | null): string[] {
  const rawCrops = Array.isArray(cropType) ? cropType : (cropType || '').split(',');
  const byKey = new Map<string, string>();

  for (const crop of rawCrops) {
    const trimmed = String(crop).trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, trimmed);
    }
  }

  return Array.from(byKey.values());
}

export function formatCropTypes(cropTypes?: string[] | string | null): string | undefined {
  const parsed = parseCropTypes(cropTypes);
  return parsed.length > 0 ? parsed.join(', ') : undefined;
}

export function hasCropType(cropTypes: string[] | string | undefined, crop: string): boolean {
  const target = crop.trim().toLowerCase();
  if (!target) return false;
  return parseCropTypes(cropTypes).some((value) => value.toLowerCase() === target);
}
