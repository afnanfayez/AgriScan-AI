import type { ExportData } from './csv';

// Server-rendered HTML → PDF-style printable report.
// jsPDF is a browser library; for server we use a structured HTML page with
// the proper MIME type and an auto-print script when opened with ?print=1.
export function buildHtmlReport({ user, farms, plants, scans, treatments, generatedAt }: ExportData): string {
  const criticalPlants = plants.filter((p: any) => p.health_status === 'Critical').length;
  const warningPlants = plants.filter((p: any) => p.health_status === 'Warning').length;
  const healthyPlants = plants.filter((p: any) => p.health_status === 'Healthy').length;
  const activeTreatments = treatments.filter((t: any) => t.status !== 'Completed').length;

  return `<!DOCTYPE html>
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
    <div class="stat-box blue"><div class="num">${farms.length}</div><div class="lbl">Farms / Zones</div></div>
    <div class="stat-box green"><div class="num">${plants.length}</div><div class="lbl">Total Plants</div></div>
    <div class="stat-box blue"><div class="num">${scans.length}</div><div class="lbl">AI Scans Run</div></div>
    <div class="stat-box orange"><div class="num">${activeTreatments}</div><div class="lbl">Active Treatments</div></div>
    <div class="stat-box red"><div class="num">${criticalPlants}</div><div class="lbl">Critical Plants</div></div>
    <div class="stat-box orange"><div class="num">${warningPlants}</div><div class="lbl">Warning Plants</div></div>
    <div class="stat-box green"><div class="num">${healthyPlants}</div><div class="lbl">Healthy Plants</div></div>
    <div class="stat-box green"><div class="num">${treatments.filter((t: any) => t.status === 'Completed').length}</div><div class="lbl">Treatments Resolved</div></div>
  </div>
</div>

<div class="section">
  <h3>🌾 Farms & Zones</h3>
  <table>
    <thead><tr><th>Zone Name</th><th>Zone Count</th><th>Created At</th></tr></thead>
    <tbody>
      ${farms.map((f: any) => `<tr><td>${f.name}</td><td>${f.zone_count || 1}</td><td>${new Date(f.created_at).toLocaleDateString()}</td></tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h3>🌿 Plant Inventory</h3>
  <table>
    <thead><tr><th>Plant Name</th><th>Type</th><th>Planting Date</th><th>Health Status</th><th>Zone</th></tr></thead>
    <tbody>
      ${plants.map((p: any) => {
        const zone = farms.find((f: any) => f.id === p.farm_id);
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
      ${scans.map((s: any) => {
        const plant = plants.find((p: any) => p.id === s.plant_id);
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
      ${treatments.map((t: any) => `<tr>
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
}
