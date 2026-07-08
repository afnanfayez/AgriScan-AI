import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();

    const supabase = getSupabaseServerClient(user.token);

    // Fetch all user data concurrently
    const [
      { data: farmsData },
      { data: plantsData },
      { data: scansData },
      { data: treatmentsData }
    ] = await Promise.all([
      supabase.from('farms').select('*'),
      supabase.from('plants').select('*'),
      supabase.from('scans').select('*'),
      supabase.from('treatments').select('*'),
    ]);

    const userFarms = farmsData || [];
    const userPlants = plantsData || [];
    const userScans = scansData || [];
    const userTreatments = treatmentsData || [];

    const generatedAt = new Date().toLocaleString();

    // ─────────────────────────────────────────────
    // FORMAT: CSV
    // ─────────────────────────────────────────────
    if (format === 'csv') {
      let csvContent = `AGRISCAN AI - COMPREHENSIVE FARM HEALTH REPORT\n`;
      csvContent += `Generated On: ${generatedAt}\n`;
      csvContent += `Operator Name: ${user.name}\n`;
      csvContent += `Account Type: ${user.accountType}\n`;
      csvContent += `Plan Level: ${user.plan}\n\n`;

      csvContent += `SECTION 1: MANAGED ZONES / FIELDS\n`;
      csvContent += `Zone ID,Zone Name,Zone Count,Created At\n`;
      userFarms.forEach((f) => {
        csvContent += `"${f.id}","${f.name.replace(/"/g, '""')}",${f.zone_count || 1},"${f.created_at}"\n`;
      });
      csvContent += `\n`;

      csvContent += `SECTION 2: PLANT INVENTORY & HEALTH METRICS\n`;
      csvContent += `Plant ID,Plant Name,Cultivar Type,Planting Date,Health Status,Zone Reference\n`;
      userPlants.forEach((p) => {
        const zone = userFarms.find((f) => f.id === p.farm_id);
        const zoneName = zone ? zone.name : 'Default Zone';
        csvContent += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.type.replace(/"/g, '""')}","${p.planting_date}","${p.health_status}","${zoneName.replace(/"/g, '""')}"\n`;
      });
      csvContent += `\n`;

      csvContent += `SECTION 3: AI DIAGNOSTICS & SCANS HISTORY\n`;
      csvContent += `Scan ID,Plant Reference,Diagnosis,Confidence,Severity,Scanned At\n`;
      userScans.forEach((s) => {
        const plant = userPlants.find((p) => p.id === s.plant_id);
        const plantName = plant ? plant.name : 'Deleted Plant';
        csvContent += `"${s.id}","${plantName.replace(/"/g, '""')}","${s.diagnosis.replace(/"/g, '""')}",${s.confidence}%,${s.severity},"${s.created_at}"\n`;
      });
      csvContent += `\n`;

      csvContent += `SECTION 4: ACTIVE & RESOLVED TREATMENT LOGS\n`;
      csvContent += `Treatment ID,Disease Type,Status,Created At,Resolved At\n`;
      userTreatments.forEach((t) => {
        csvContent += `"${t.id}","${t.type.replace(/"/g, '""')}","${t.status}","${t.created_at}","${t.resolved_at || 'Active'}"\n`;
      });

      const buffer = Buffer.from(csvContent, 'utf-8');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="AgriScan_Farm_Report.csv"',
        },
      });
    }

    // ─────────────────────────────────────────────
    // FORMAT: EXCEL (.xlsx via ExcelJS)
    // ─────────────────────────────────────────────
    if (format === 'excel') {
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
            bottom: { style: 'thin' }, right: { style: 'thin' }
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
        { field: 'Total Farms/Zones', value: userFarms.length },
        { field: 'Total Plants', value: userPlants.length },
        { field: 'Total AI Scans', value: userScans.length },
        { field: 'Active Treatments', value: userTreatments.filter((t: any) => t.status !== 'Completed').length },
        { field: 'Completed Treatments', value: userTreatments.filter((t: any) => t.status === 'Completed').length },
        { field: 'Critical Plants', value: userPlants.filter((p: any) => p.health_status === 'Critical').length },
        { field: 'Warning Plants', value: userPlants.filter((p: any) => p.health_status === 'Warning').length },
        { field: 'Healthy Plants', value: userPlants.filter((p: any) => p.health_status === 'Healthy').length },
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
      userFarms.forEach((f: any) => farmsSheet.addRow(f));

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
      userPlants.forEach((p: any) => {
        const zone = userFarms.find((f: any) => f.id === p.farm_id);
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
      userScans.forEach((s: any) => {
        const plant = userPlants.find((p: any) => p.id === s.plant_id);
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
      userTreatments.forEach((t: any) => treatSheet.addRow(t));

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="AgriScan_Farm_Report.xlsx"',
        },
      });
    }

    // ─────────────────────────────────────────────
    // FORMAT: PDF (Server-rendered HTML → PDF text report)
    // Uses a clean, structured plain-text PDF via a Buffer.
    // jsPDF is a browser library; for server we use a structured
    // text report with the proper MIME type fallback to a
    // pre-formatted printable HTML page.
    // ─────────────────────────────────────────────
    if (format === 'pdf') {
      const criticalPlants = userPlants.filter((p: any) => p.health_status === 'Critical').length;
      const warningPlants = userPlants.filter((p: any) => p.health_status === 'Warning').length;
      const healthyPlants = userPlants.filter((p: any) => p.health_status === 'Healthy').length;
      const activeTreatments = userTreatments.filter((t: any) => t.status !== 'Completed').length;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>AgriScan AI - Farm Health Report</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
  .cover { background: linear-gradient(135deg, #1a472a 0%, #27ae60 100%); color: white; padding: 60px 50px; page-break-after: always; }
  .cover h1 { font-size: 36px; margin: 0 0 10px; letter-spacing: -1px; }
  .cover h2 { font-size: 20px; font-weight: 300; margin: 0 0 40px; opacity: 0.85; }
  .cover .meta { display: flex; gap: 40px; flex-wrap: wrap; }
  .cover .meta div { background: rgba(255,255,255,0.12); border-radius: 10px; padding: 14px 22px; }
  .cover .meta label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; display: block; }
  .cover .meta span { font-size: 16px; font-weight: 600; }
  .section { padding: 40px 50px; border-bottom: 1px solid #eee; }
  .section h3 { font-size: 18px; color: #27ae60; border-left: 4px solid #27ae60; padding-left: 12px; margin-bottom: 20px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
  .stat-box { border: 1px solid #e0e0e0; border-radius: 10px; padding: 18px; text-align: center; }
  .stat-box .num { font-size: 28px; font-weight: 700; }
  .stat-box .lbl { font-size: 12px; color: #666; margin-top: 4px; }
  .stat-box.red .num { color: #c0392b; }
  .stat-box.orange .num { color: #e67e22; }
  .stat-box.green .num { color: #27ae60; }
  .stat-box.blue .num { color: #2980b9; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #27ae60; color: white; padding: 10px 12px; text-align: left; }
  td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge.Critical { background: #fdecea; color: #c0392b; }
  .badge.Warning { background: #fef3e2; color: #e67e22; }
  .badge.Healthy { background: #eafaf1; color: #27ae60; }
  .badge.Completed { background: #eafaf1; color: #27ae60; }
  .badge.Pending { background: #fef3e2; color: #e67e22; }
  .footer { padding: 30px 50px; text-align: center; color: #999; font-size: 12px; }
  @media print { .section { page-break-inside: avoid; } }
</style>
</head>
<body>

<div class="cover">
  <h1>🌿 AgriScan AI</h1>
  <h2>Comprehensive Farm Health Report</h2>
  <div class="meta">
    <div><label>Operator</label><span>${user.name}</span></div>
    <div><label>Account Type</label><span>${user.accountType}</span></div>
    <div><label>Plan</label><span>${user.plan}</span></div>
    <div><label>Generated</label><span>${generatedAt}</span></div>
  </div>
</div>

<div class="section">
  <h3>📊 Executive Summary</h3>
  <div class="stat-grid">
    <div class="stat-box blue"><div class="num">${userFarms.length}</div><div class="lbl">Farms / Zones</div></div>
    <div class="stat-box green"><div class="num">${userPlants.length}</div><div class="lbl">Total Plants</div></div>
    <div class="stat-box blue"><div class="num">${userScans.length}</div><div class="lbl">AI Scans Run</div></div>
    <div class="stat-box orange"><div class="num">${activeTreatments}</div><div class="lbl">Active Treatments</div></div>
    <div class="stat-box red"><div class="num">${criticalPlants}</div><div class="lbl">Critical Plants</div></div>
    <div class="stat-box orange"><div class="num">${warningPlants}</div><div class="lbl">Warning Plants</div></div>
    <div class="stat-box green"><div class="num">${healthyPlants}</div><div class="lbl">Healthy Plants</div></div>
    <div class="stat-box green"><div class="num">${userTreatments.filter((t: any) => t.status === 'Completed').length}</div><div class="lbl">Treatments Resolved</div></div>
  </div>
</div>

<div class="section">
  <h3>🌾 Farms & Zones</h3>
  <table>
    <thead><tr><th>Zone Name</th><th>Zone Count</th><th>Created At</th></tr></thead>
    <tbody>
      ${userFarms.map((f: any) => `<tr><td>${f.name}</td><td>${f.zone_count || 1}</td><td>${new Date(f.created_at).toLocaleDateString()}</td></tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h3>🌿 Plant Inventory</h3>
  <table>
    <thead><tr><th>Plant Name</th><th>Type</th><th>Planting Date</th><th>Health Status</th><th>Zone</th></tr></thead>
    <tbody>
      ${userPlants.map((p: any) => {
        const zone = userFarms.find((f: any) => f.id === p.farm_id);
        return `<tr>
          <td>${p.name}</td>
          <td>${p.type}</td>
          <td>${p.planting_date}</td>
          <td><span class="badge ${p.health_status}">${p.health_status}</span></td>
          <td>${zone ? zone.name : 'Default'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h3>🔬 AI Scan Diagnostics</h3>
  <table>
    <thead><tr><th>Plant</th><th>Diagnosis</th><th>Confidence</th><th>Severity</th><th>Date</th></tr></thead>
    <tbody>
      ${userScans.map((s: any) => {
        const plant = userPlants.find((p: any) => p.id === s.plant_id);
        return `<tr>
          <td>${plant ? plant.name : 'Deleted Plant'}</td>
          <td>${s.diagnosis}</td>
          <td>${s.confidence}%</td>
          <td><span class="badge ${s.severity === 'High' ? 'Critical' : s.severity === 'Medium' ? 'Warning' : 'Healthy'}">${s.severity}</span></td>
          <td>${new Date(s.created_at).toLocaleDateString()}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h3>💊 Treatment Log</h3>
  <table>
    <thead><tr><th>Disease / Type</th><th>Status</th><th>Created</th><th>Resolved</th></tr></thead>
    <tbody>
      ${userTreatments.map((t: any) => `<tr>
          <td>${t.type}</td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
          <td>${new Date(t.created_at).toLocaleDateString()}</td>
          <td>${t.resolved_at ? new Date(t.resolved_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="footer">
  Generated by AgriScan AI &bull; ${generatedAt} &bull; Confidential Farm Health Data
</div>

<script>
  // Auto-trigger browser print dialog when opened directly
  if (window.location.search.includes('print=1')) { window.onload = () => window.print(); }
</script>
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': 'inline; filename="AgriScan_Farm_Report.html"',
        },
      });
    }

    return new NextResponse('Unsupported format. Use ?format=csv, ?format=excel, or ?format=pdf', { status: 400 });

  } catch (error: any) {
    console.error('Export error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
