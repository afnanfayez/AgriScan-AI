export interface ExportData {
  user: { name: string; accountType: string; plan: string };
  farms: any[];
  plants: any[];
  scans: any[];
  treatments: any[];
  generatedAt: string;
}

export function buildCsvReport({ user, farms, plants, scans, treatments, generatedAt }: ExportData): Buffer {
  let csvContent = `AGRISCAN AI - COMPREHENSIVE FARM HEALTH REPORT\n`;
  csvContent += `Generated On: ${generatedAt}\n`;
  csvContent += `Operator Name: ${user.name}\n`;
  csvContent += `Account Type: ${user.accountType}\n`;
  csvContent += `Plan Level: ${user.plan}\n\n`;

  csvContent += `SECTION 1: MANAGED ZONES / FIELDS\n`;
  csvContent += `Zone ID,Zone Name,Zone Count,Created At\n`;
  farms.forEach((f) => {
    csvContent += `"${f.id}","${f.name.replace(/"/g, '""')}",${f.zone_count || 1},"${f.created_at}"\n`;
  });
  csvContent += `\n`;

  csvContent += `SECTION 2: PLANT INVENTORY & HEALTH METRICS\n`;
  csvContent += `Plant ID,Plant Name,Cultivar Type,Planting Date,Health Status,Zone Reference\n`;
  plants.forEach((p) => {
    const zone = farms.find((f) => f.id === p.farm_id);
    const zoneName = zone ? zone.name : 'Default Zone';
    csvContent += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.type.replace(/"/g, '""')}","${p.planting_date}","${p.health_status}","${zoneName.replace(/"/g, '""')}"\n`;
  });
  csvContent += `\n`;

  csvContent += `SECTION 3: AI DIAGNOSTICS & SCANS HISTORY\n`;
  csvContent += `Scan ID,Plant Reference,Diagnosis,Confidence,Severity,Scanned At\n`;
  scans.forEach((s) => {
    const plant = plants.find((p) => p.id === s.plant_id);
    const plantName = plant ? plant.name : 'Deleted Plant';
    csvContent += `"${s.id}","${plantName.replace(/"/g, '""')}","${s.diagnosis.replace(/"/g, '""')}",${s.confidence}%,${s.severity},"${s.created_at}"\n`;
  });
  csvContent += `\n`;

  csvContent += `SECTION 4: ACTIVE & RESOLVED TREATMENT LOGS\n`;
  csvContent += `Treatment ID,Disease Type,Status,Created At,Resolved At\n`;
  treatments.forEach((t) => {
    csvContent += `"${t.id}","${t.type.replace(/"/g, '""')}","${t.status}","${t.created_at}","${t.resolved_at || 'Active'}"\n`;
  });

  return Buffer.from(csvContent, 'utf-8');
}
