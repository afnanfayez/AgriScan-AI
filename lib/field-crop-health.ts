import type { FarmField, FieldScan, PlantCrop, ScanResultItem } from '@/types/domain';
import { parseCropTypes } from './crop-types';

export type FieldCropStatus = 'Healthy' | 'Warning' | 'Critical';

export interface FieldCropHealth {
  id: string;
  farm: FarmField;
  cropType: string;
  status: FieldCropStatus;
  plants: PlantCrop[];
  latestScanResult?: ScanResultItem;
}

function scanResultToStatus(result?: ScanResultItem): FieldCropStatus | undefined {
  if (!result || result.diagnosis === 'Unable to assess image') return undefined;
  if (result.diagnosis === 'Healthy' || result.likelyCause === 'Healthy') return 'Healthy';
  if (result.severity === 'High' || result.treatmentPriority === 'Urgent') return 'Critical';
  return 'Warning';
}

function getLatestScanResult(farmId: string, cropType: string, fieldScans: FieldScan[] = []): ScanResultItem | undefined {
  const cropKey = cropType.toLowerCase();
  const sortedScans = [...fieldScans]
    .filter((scan) => scan.farmId === farmId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const scan of sortedScans) {
    const result = (scan.results || []).find((item) => item.cropType?.toLowerCase() === cropKey);
    if (result) return result;
  }

  return undefined;
}

export function getCropStatus(farmId: string, cropType: string, plants: PlantCrop[], fieldScans: FieldScan[] = []): FieldCropStatus {
  const scanStatus = scanResultToStatus(getLatestScanResult(farmId, cropType, fieldScans));
  if (scanStatus) return scanStatus;

  const cropKey = cropType.toLowerCase();
  const cropPlants = plants.filter((plant) => {
    if (plant.farmId !== farmId) return false;
    return parseCropTypes(plant.type).some((type) => type.toLowerCase() === cropKey);
  });

  if (cropPlants.some((plant) => plant.healthStatus === 'Critical')) return 'Critical';
  if (cropPlants.some((plant) => plant.healthStatus === 'Warning')) return 'Warning';
  return 'Healthy';
}

export function getFieldCropHealth(farms: FarmField[], plants: PlantCrop[], fieldScans: FieldScan[] = []): FieldCropHealth[] {
  return farms.flatMap((farm) => {
    const cropTypes = parseCropTypes(farm.cropTypes || farm.cropType);
    const normalizedCrops = cropTypes.length > 0 ? cropTypes : ['Unspecified'];

    return normalizedCrops.map((cropType) => {
      const cropKey = cropType.toLowerCase();
      const cropPlants = plants.filter((plant) => {
        if (plant.farmId !== farm.id) return false;
        return parseCropTypes(plant.type).some((type) => type.toLowerCase() === cropKey);
      });
      const latestScanResult = getLatestScanResult(farm.id, cropType, fieldScans);

      return {
        id: `${farm.id}:${cropKey}`,
        farm,
        cropType,
        status: getCropStatus(farm.id, cropType, plants, fieldScans),
        plants: cropPlants,
        latestScanResult,
      };
    });
  });
}
