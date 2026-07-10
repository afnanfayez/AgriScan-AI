import type { ExportData } from './csv';

export async function buildXlsxReport({ user, farms, plants, scans, treatments, generatedAt }: ExportData): Promise<Buffer> {
  // @ts-ignore
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AgriScan AI';
  workbook.created = new Date();

  // Helper to style a header row
  const styleHeader = (row: any, color = '27AE60') => {
    row.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    row.height = 20;
  };

  // ── Sheet 1: Summary ──
  const summarySheet = workbook.addWorksheet('📊 Summary');
  summarySheet.columns = [{ header: 'Field', key: 'field', width: 25 }, { header: 'Value', key: 'value', width: 45 }];
  styleHeader(summarySheet.getRow(1));
  const summaryRows = [
    { field: 'Report Generated', value: generatedAt },
    { field: 'Operator Name', value: user.name },
    { field: 'Account Type', value: user.accountType },
    { field: 'Subscription Plan', value: user.plan },
    { field: 'Total Farms/Zones', value: farms.length },
    { field: 'Total Plants', value: plants.length },
    { field: 'Total AI Scans', value: scans.length },
    { field: 'Active Treatments', value: treatments.filter((t: any) => t.status !== 'Completed').length },
    { field: 'Completed Treatments', value: treatments.filter((t: any) => t.status === 'Completed').length },
    { field: 'Critical Plants', value: plants.filter((p: any) => p.health_status === 'Critical').length },
    { field: 'Warning Plants', value: plants.filter((p: any) => p.health_status === 'Warning').length },
    { field: 'Healthy Plants', value: plants.filter((p: any) => p.health_status === 'Healthy').length },
  ];
  summarySheet.addRows(summaryRows);

  // ── Sheet 2: Farms ──
  const farmsSheet = workbook.addWorksheet('🌾 Farms');
  farmsSheet.columns = [
    { header: 'Zone ID', key: 'id', width: 38 },
    { header: 'Zone Name', key: 'name', width: 30 },
    { header: 'Zone Count', key: 'zone_count', width: 14 },
    { header: 'Created At', key: 'created_at', width: 26 },
  ];
  styleHeader(farmsSheet.getRow(1));
  farms.forEach((f: any) => farmsSheet.addRow(f));

  // ── Sheet 3: Plants ──
  const plantsSheet = workbook.addWorksheet('🌿 Plants');
  plantsSheet.columns = [
    { header: 'Plant ID', key: 'id', width: 38 },
    { header: 'Plant Name', key: 'name', width: 28 },
    { header: 'Type/Cultivar', key: 'type', width: 20 },
    { header: 'Planting Date', key: 'planting_date', width: 16 },
    { header: 'Health Status', key: 'health_status', width: 16 },
    { header: 'Farm/Zone', key: 'farm_name', width: 28 },
  ];
  styleHeader(plantsSheet.getRow(1));
  plants.forEach((p: any) => {
    const zone = farms.find((f: any) => f.id === p.farm_id);
    const row = plantsSheet.addRow({
      ...p,
      farm_name: zone ? zone.name : 'Default Zone',
    });
    // Color-code health status
    const statusCell = row.getCell('health_status');
    if (p.health_status === 'Critical') statusCell.font = { bold: true, color: { argb: 'FFC0392B' } };
    else if (p.health_status === 'Warning') statusCell.font = { bold: true, color: { argb: 'FFE67E22' } };
    else statusCell.font = { bold: true, color: { argb: 'FF27AE60' } };
  });

  // ── Sheet 4: AI Scans ──
  const scansSheet = workbook.addWorksheet('🔬 AI Scans');
  scansSheet.columns = [
    { header: 'Scan ID', key: 'id', width: 38 },
    { header: 'Plant', key: 'plant_name', width: 28 },
    { header: 'Diagnosis', key: 'diagnosis', width: 32 },
    { header: 'Confidence %', key: 'confidence', width: 16 },
    { header: 'Severity', key: 'severity', width: 14 },
    { header: 'Scanned At', key: 'created_at', width: 26 },
  ];
  styleHeader(scansSheet.getRow(1), '2980B9');
  scans.forEach((s: any) => {
    const plant = plants.find((p: any) => p.id === s.plant_id);
    scansSheet.addRow({ ...s, plant_name: plant ? plant.name : 'Deleted Plant' });
  });

  // ── Sheet 5: Treatments ──
  const treatSheet = workbook.addWorksheet('💊 Treatments');
  treatSheet.columns = [
    { header: 'Treatment ID', key: 'id', width: 38 },
    { header: 'Disease / Type', key: 'type', width: 32 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Created At', key: 'created_at', width: 26 },
    { header: 'Resolved At', key: 'resolved_at', width: 26 },
  ];
  styleHeader(treatSheet.getRow(1), 'E74C3C');
  treatments.forEach((t: any) => treatSheet.addRow(t));

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as any;
}
