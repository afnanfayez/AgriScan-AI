import { jsPDF } from 'jspdf';
import type { ExportData } from './csv';

function writeSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 101, 52);
  doc.text(title, 14, y);
  doc.setDrawColor(220, 252, 231);
  doc.line(14, y + 2, 196, y + 2);
}

function writeWrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(text || '-', maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensurePage(doc: jsPDF, y: number, minSpace = 24) {
  if (y + minSpace <= 282) return y;
  doc.addPage();
  return 18;
}

export function buildPdfReport({ user, farms, plants, scans, treatments, generatedAt }: ExportData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const activeTreatments = treatments.filter((t: any) => t.status !== 'Completed').length;
  const criticalPlants = plants.filter((p: any) => p.health_status === 'Critical').length;
  const warningPlants = plants.filter((p: any) => p.health_status === 'Warning').length;
  const healthyPlants = plants.filter((p: any) => p.health_status === 'Healthy').length;

  doc.setFillColor(22, 101, 52);
  doc.rect(0, 0, 210, 44, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('AgriScan AI', 14, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Gardener Health Report', 14, 28);
  doc.text(`Generated: ${generatedAt}`, 14, 36);

  doc.setTextColor(28, 25, 23);
  doc.setFontSize(10);
  let y = 56;
  doc.text(`Operator: ${user.name}`, 14, y);
  doc.text(`Role: ${user.accountType}`, 82, y);
  doc.text(`Plan: ${user.plan}`, 145, y);

  y += 14;
  writeSectionTitle(doc, 'Summary', y);
  y += 10;
  const stats = [
    ['Gardens / Zones', farms.length],
    ['Plants', plants.length],
    ['AI Scans', scans.length],
    ['Active Treatments', activeTreatments],
    ['Critical Plants', criticalPlants],
    ['Warning Plants', warningPlants],
    ['Healthy Plants', healthyPlants],
  ];
  stats.forEach(([label, value], index) => {
    const x = 14 + (index % 2) * 92;
    const rowY = y + Math.floor(index / 2) * 12;
    doc.setFillColor(250, 250, 249);
    doc.roundedRect(x, rowY - 5, 82, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), x + 4, rowY + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(String(label), x + 18, rowY + 1);
  });

  y += 54;
  writeSectionTitle(doc, 'Gardens / Zones', y);
  y += 8;
  doc.setFontSize(9);
  farms.forEach((farm: any) => {
    y = ensurePage(doc, y);
    doc.setFont('helvetica', 'bold');
    doc.text(farm.name || 'Unnamed garden', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Zones: ${farm.zone_count || 1} | Created: ${farm.created_at ? new Date(farm.created_at).toLocaleDateString() : '-'}`, 80, y);
    y += 7;
  });
  if (farms.length === 0) {
    doc.text('No gardens/zones have been created yet.', 14, y);
    y += 8;
  }

  y = ensurePage(doc, y + 6);
  writeSectionTitle(doc, 'Plant Inventory', y);
  y += 8;
  plants.forEach((plant: any) => {
    y = ensurePage(doc, y, 16);
    const farm = farms.find((f: any) => f.id === plant.farm_id);
    doc.setFont('helvetica', 'bold');
    doc.text(`${plant.name || 'Unnamed plant'} (${plant.health_status || '-'})`, 14, y);
    doc.setFont('helvetica', 'normal');
    y = writeWrapped(doc, `Type: ${plant.type || '-'} | Planted: ${plant.planting_date || '-'} | Garden: ${farm?.name || 'Default'}`, 14, y + 5, 180);
    y += 3;
  });
  if (plants.length === 0) {
    doc.text('No plants have been cataloged yet.', 14, y);
    y += 8;
  }

  y = ensurePage(doc, y + 6);
  writeSectionTitle(doc, 'AI Scan Diagnostics', y);
  y += 8;
  scans.forEach((scan: any) => {
    y = ensurePage(doc, y, 18);
    const plant = plants.find((p: any) => p.id === scan.plant_id);
    doc.setFont('helvetica', 'bold');
    doc.text(`${scan.diagnosis || 'Diagnosis'} - ${scan.confidence || 0}%`, 14, y);
    doc.setFont('helvetica', 'normal');
    y = writeWrapped(doc, `Plant: ${plant?.name || 'Deleted plant'} | Severity: ${scan.severity || '-'} | Scanned: ${scan.created_at ? new Date(scan.created_at).toLocaleString() : '-'}`, 14, y + 5, 180);
    y += 3;
  });
  if (scans.length === 0) {
    doc.text('No AI scans have been run yet.', 14, y);
    y += 8;
  }

  y = ensurePage(doc, y + 6);
  writeSectionTitle(doc, 'Treatment Plans', y);
  y += 8;
  treatments.forEach((treatment: any) => {
    y = ensurePage(doc, y, 16);
    doc.setFont('helvetica', 'bold');
    doc.text(treatment.type || 'Treatment', 14, y);
    doc.setFont('helvetica', 'normal');
    y = writeWrapped(doc, `Status: ${treatment.status || '-'} | Created: ${treatment.created_at ? new Date(treatment.created_at).toLocaleDateString() : '-'} | Resolved: ${treatment.resolved_at ? new Date(treatment.resolved_at).toLocaleDateString() : 'Active'}`, 14, y + 5, 180);
    y += 3;
  });
  if (treatments.length === 0) {
    doc.text('No treatment plans have been generated yet.', 14, y);
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
