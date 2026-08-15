#!/usr/bin/env node
/**
 * AgriScan-AI :: AI provider verification harness
 *
 *   node scripts/verify-openai.mjs                    # synthetic test image
 *   node scripts/verify-openai.mjs ./crop-photo.jpg   # real photo (recommended)
 *
 * Requires OPENAI_API_KEY (or OPENAI_KEY) in the environment.
 *
 * Deliberately dependency-free (plain fetch, no SDK import) so it can run
 * before `pnpm install`, in CI, or against a deployed environment.
 *
 * The model chain and the response contract are READ FROM THE APP SOURCE
 * (services/ai/models.ts and services/ai/contract.ts) rather than duplicated
 * here, so this also fails if the two drift apart.
 *
 * Checks:
 *   1. Key is valid and can list models              (GET  /v1/models)
 *   2. Every model the app is configured to use is reachable
 *   3. Image + strict JSON-schema round trip works   (POST /v1/responses)
 *   4. Parsed output satisfies the analysis contract
 *   5. Batch latency fits the routes' maxDuration budget
 */

import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;

const PLANS = ['Free', 'Pro', 'Enterprise'];

// Mirrors the routes: single scan 60s, field/batch scans 120s.
const BATCH_MAX_DURATION_S = 120;
const BATCH_SAMPLE_IMAGES = 8;

// ── console helpers ──────────────────────────────────────────────────────────
const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const fail = (m) => console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
const warn = (m) => console.log(`  \x1b[33mWARN\x1b[0m  ${m}`);
const info = (m) => console.log(`        ${m}`);
const step = (n, m) => console.log(`\n\x1b[1m[${n}] ${m}\x1b[0m`);

let failures = 0;
const check = (ok, msg) => { ok ? pass(msg) : (failures++, fail(msg)); return ok; };

// ── read the app's real configuration ────────────────────────────────────────
function readConfiguredChains(provider) {
  const src = readFileSync(join(ROOT, 'services/ai/models.ts'), 'utf8');
  const start = src.indexOf(`${provider}: {`);
  if (start === -1) throw new Error(`No "${provider}" block in services/ai/models.ts`);

  const other = provider === 'openai' ? 'gemini: {' : 'openai: {';
  const otherAt = src.indexOf(other, start);
  const block = src.slice(start, otherAt === -1 ? undefined : otherAt);

  const chains = {};
  for (const plan of PLANS) {
    const match = block.match(new RegExp(`${plan}:\\s*\\[([^\\]]*)\\]`));
    chains[plan] = match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  }
  return chains;
}

/** The `required` field list from ANALYSIS_JSON_SCHEMA in services/ai/contract.ts. */
function readContractFields() {
  const src = readFileSync(join(ROOT, 'services/ai/contract.ts'), 'utf8');
  const block = src.slice(src.indexOf('ANALYSIS_JSON_SCHEMA'));
  const required = block.slice(block.indexOf('required: ['), block.indexOf(']', block.indexOf('required: [')));
  return [...required.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

// ── request shape (must match services/ai/openai-provider.ts) ────────────────
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'diagnosis', 'confidence', 'severity', 'symptoms', 'visibleOrgans',
    'likelyCause', 'affectedAreaPercent', 'scoutingNotes', 'recommendedAction',
    'treatmentPriority', 'organicTreatments', 'chemicalTreatments',
  ],
  properties: {
    diagnosis: { type: 'string' },
    confidence: { type: 'integer', minimum: 1, maximum: 99 },
    severity: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    symptoms: { type: 'string' },
    visibleOrgans: { type: 'array', items: { type: 'string' } },
    likelyCause: { type: 'string' },
    affectedAreaPercent: { type: 'integer', minimum: 0, maximum: 100 },
    scoutingNotes: { type: 'string' },
    recommendedAction: { type: 'string' },
    treatmentPriority: { type: 'string', enum: ['Monitor', 'Treat Soon', 'Urgent'] },
    organicTreatments: { type: 'array', items: { type: 'string' } },
    chemicalTreatments: { type: 'array', items: { type: 'string' } },
  },
};

const PROMPT = `Analyze this agricultural crop scouting image for disease, pests, nutrient deficiency, abiotic stress, physical injury, or healthy status.
Registered plant name: "Roma Tomato". Registered plant type/cultivar: "Tomato".

The image may show the whole plant or any visible plant part, including leaves, stems, fruit, flowers, roots, soil-line crown, canopy, or field row context.
First identify the visible plant organ(s) and visible evidence. Only diagnose what is visible or reasonably inferable from the image and the registered crop type.
Do not overuse "Unable to assess image". If any crop tissue, field row, leaf, stem, fruit, canopy, or soil-line plant context is visible, provide the best cautious agronomic assessment with low confidence when needed.
Return practical organic and chemical/control recommendations. If healthy, return maintenance recommendations and "No chemical treatment required."
Avoid claiming laboratory certainty.`;

// ── synthetic fallback image: 128x128 RGB PNG, green leaf w/ brown lesions ───
function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function syntheticLeafPng(size = 128) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2, cy = y - size / 2;
      const inLeaf = (cx * cx) / (size * 0.22) ** 2 + (cy * cy) / (size * 0.42) ** 2 <= 1;
      const lesion = [[-14, -20, 9], [10, 6, 11], [-6, 26, 7]]
        .some(([lx, ly, r]) => (cx - lx) ** 2 + (cy - ly) ** 2 < r * r);
      let rgb;
      if (!inLeaf) rgb = [232, 228, 216];
      else if (lesion) rgb = [104, 62, 24];
      else rgb = [46 + ((x * 7 + y * 3) % 22), 118 + ((x * 3) % 26), 38];
      raw[p++] = rgb[0]; raw[p++] = rgb[1]; raw[p++] = rgb[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function loadImage(path) {
  if (!path) {
    return {
      dataUrl: `data:image/png;base64,${syntheticLeafPng().toString('base64')}`,
      label: 'synthetic leaf PNG (128x128) - pass a real photo for a meaningful diagnosis',
    };
  }
  const bytes = readFileSync(path);
  const ext = path.toLowerCase().split('.').pop();
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
  if (!mime) throw new Error(`Unsupported image type ".${ext}" - use PNG, JPEG, WEBP, or GIF.`);
  return {
    dataUrl: `data:${mime};base64,${bytes.toString('base64')}`,
    label: `${basename(path)} (${(bytes.length / 1024).toFixed(0)} KB, ${mime})`,
  };
}

async function analyze(model, dataUrl) {
  const started = Date.now();
  const res = await fetch(`${API}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: PROMPT },
          { type: 'input_image', image_url: dataUrl, detail: 'auto' },
        ],
      }],
      text: { format: { type: 'json_schema', name: 'plant_analysis', strict: true, schema: ANALYSIS_SCHEMA } },
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 4000,
    }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body, ms: Date.now() - started };
}

/** Mirrors extractPayload() in services/ai/openai-provider.ts. */
function extractPayload(body) {
  for (const item of body?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === 'refusal' && part.refusal) return { kind: 'refusal', text: part.refusal };
    }
  }
  const text = typeof body?.output_text === 'string' ? body.output_text.trim() : '';
  if (text) return { kind: 'text', text };
  return { kind: 'empty', text: '' };
}

function validateContract(o) {
  const errs = [];
  const str = (k) => (typeof o[k] === 'string' && o[k].length > 0) || errs.push(`${k} must be a non-empty string (got ${JSON.stringify(o[k])})`);
  const arr = (k) => (Array.isArray(o[k]) && o[k].every((v) => typeof v === 'string')) || errs.push(`${k} must be a string[] (got ${JSON.stringify(o[k])})`);
  const num = (k, lo, hi) => (Number.isInteger(o[k]) && o[k] >= lo && o[k] <= hi) || errs.push(`${k} must be an integer in [${lo},${hi}] (got ${JSON.stringify(o[k])})`);
  const enm = (k, vals) => vals.includes(o[k]) || errs.push(`${k} must be one of ${vals.join('|')} (got ${JSON.stringify(o[k])})`);

  ['diagnosis', 'symptoms', 'likelyCause', 'scoutingNotes', 'recommendedAction'].forEach(str);
  ['visibleOrgans', 'organicTreatments', 'chemicalTreatments'].forEach(arr);
  num('confidence', 1, 99);
  num('affectedAreaPercent', 0, 100);
  enm('severity', ['Low', 'Medium', 'High']);
  enm('treatmentPriority', ['Monitor', 'Treat Soon', 'Urgent']);
  return errs;
}

// ── run ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n\x1b[1mAgriScan-AI - OpenAI provider verification\x1b[0m');

  if (!KEY) {
    fail('OPENAI_API_KEY (or OPENAI_KEY) is not set in the environment.');
    return 1;
  }

  step(0, 'Configuration drift');
  const chains = readConfiguredChains('openai');
  const contractFields = readContractFields();
  const schemaFields = ANALYSIS_SCHEMA.required;

  for (const plan of PLANS) info(`${plan.padEnd(11)} ${chains[plan].join(' → ') || '(none configured)'}`);
  check(
    contractFields.length === schemaFields.length && contractFields.every((f) => schemaFields.includes(f)),
    'harness schema matches ANALYSIS_JSON_SCHEMA in services/ai/contract.ts'
  );
  if (contractFields.length !== schemaFields.length) {
    info(`app: ${contractFields.join(', ')}`);
    info(`harness: ${schemaFields.join(', ')}`);
  }

  const configuredModels = [...new Set(PLANS.flatMap((p) => chains[p]))];
  const override = process.env.OPENAI_MODEL;
  if (override) {
    info(`OPENAI_MODEL override set: ${override} (tried ahead of every chain)`);
    configuredModels.unshift(override);
  }
  check(configuredModels.length > 0, 'at least one model is configured');

  step(1, 'Credential check');
  info(`endpoint: ${API}`);
  info(`key: ${KEY.slice(0, 11)}…${KEY.slice(-4)}  (${KEY.length} chars)`);
  const catalogRes = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${KEY}` } });
  const catalog = await catalogRes.json();
  if (!check(catalogRes.ok, `GET /v1/models → ${catalogRes.status}`)) {
    info(catalog?.error?.message ?? JSON.stringify(catalog).slice(0, 300));
    info('A 401 here means the key is invalid, revoked, or belongs to a different project.');
    return 1;
  }
  const available = new Set((catalog.data ?? []).map((m) => m.id));
  info(`${available.size} models visible to this key`);

  step(2, 'Configured models are reachable');
  const usable = [...new Set(configuredModels.filter((m) => available.has(m)))];
  for (const model of configuredModels) {
    if (available.has(model)) pass(model);
    else warn(`${model} - configured in services/ai/models.ts but NOT available to this key`);
  }
  if (!check(usable.length > 0, 'at least one configured model is reachable')) {
    info(`Visible model ids: ${[...available].sort().slice(0, 40).join(', ')}`);
    return 1;
  }
  // Every plan needs at least one working model or that tier is dead on arrival.
  for (const plan of PLANS) {
    check(chains[plan].some((m) => available.has(m)), `${plan} plan has a reachable model`);
  }

  step(3, 'Image + strict JSON-schema round trip');
  const img = loadImage(process.argv[2]);
  info(`image: ${img.label}`);
  info(`payload: ${(img.dataUrl.length / 1024).toFixed(0)} KB base64 data URL`);

  const timings = [];
  for (const model of usable) {
    console.log(`\n  \x1b[1m→ ${model}\x1b[0m`);
    let r;
    try {
      r = await analyze(model, img.dataUrl);
    } catch (e) {
      failures++; fail(`${model}: network error - ${e.message}`);
      continue;
    }

    if (!check(r.ok, `POST /v1/responses → ${r.status} (${r.ms} ms)`)) {
      info(`error.type=${r.body?.error?.type} error.code=${r.body?.error?.code}`);
      info(r.body?.error?.message ?? JSON.stringify(r.body).slice(0, 300));
      continue;
    }

    const payload = extractPayload(r.body);
    if (payload.kind === 'refusal') { failures++; fail(`model refused: ${payload.text}`); continue; }
    if (!check(payload.kind === 'text', 'response carries a text payload')) {
      info(`status=${r.body.status} incomplete=${JSON.stringify(r.body.incomplete_details ?? null)}`);
      info('An "incomplete" status here means OPENAI_MAX_OUTPUT_TOKENS is too low for this model.');
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(payload.text);
      pass('payload parses as JSON');
    } catch (e) {
      failures++; fail(`payload is not valid JSON - ${e.message}`);
      info(payload.text.slice(0, 300));
      continue;
    }

    const errs = validateContract(parsed);
    check(errs.length === 0, 'output satisfies the AgriScan analysis contract');
    errs.forEach((e) => info(`↳ ${e}`));

    const u = r.body.usage ?? {};
    timings.push({ model, ms: r.ms });
    // Guarded so a malformed payload prints a summary instead of crashing.
    const list = (v) => (Array.isArray(v) ? v : []);
    info(`latency ${r.ms} ms · in ${u.input_tokens ?? '?'} tok · out ${u.output_tokens ?? '?'} tok`);
    info(`diagnosis: "${parsed.diagnosis}" · ${parsed.confidence}% · ${parsed.severity} · ${parsed.treatmentPriority}`);
    info(`organs: [${list(parsed.visibleOrgans).join(', ')}] · affected ${parsed.affectedAreaPercent}%`);
    info(`organic: ${list(parsed.organicTreatments).length} steps · chemical: ${list(parsed.chemicalTreatments).length} steps`);
  }

  step(4, `Batch latency projection (${BATCH_SAMPLE_IMAGES}-image field scan, maxDuration=${BATCH_MAX_DURATION_S}s)`);
  const concurrency = Math.max(1, Math.min(8, Number(process.env.AI_BATCH_CONCURRENCY) || 3));
  info(`AI_BATCH_CONCURRENCY=${concurrency}`);
  if (timings.length === 0) {
    warn('no successful calls to project from');
  }
  for (const t of timings) {
    const sequential = (t.ms * BATCH_SAMPLE_IMAGES) / 1000;
    const concurrent = (t.ms * Math.ceil(BATCH_SAMPLE_IMAGES / concurrency)) / 1000;
    info(`${t.model}: sequential ≈ ${sequential.toFixed(0)}s · at concurrency ${concurrency} ≈ ${concurrent.toFixed(0)}s`);
    check(
      concurrent < BATCH_MAX_DURATION_S * 0.9,
      `${t.model}: an ${BATCH_SAMPLE_IMAGES}-image batch fits inside maxDuration=${BATCH_MAX_DURATION_S}s`
    );
  }

  step(5, 'Result');
  if (failures === 0) {
    console.log(`  \x1b[32mAll checks passed.\x1b[0m Fastest reachable model: ${
      [...timings].sort((a, b) => a.ms - b.ms)[0]?.model ?? usable[0]
    }`);
    return 0;
  }
  console.log(`  \x1b[31m${failures} check(s) failed.\x1b[0m`);
  return 1;
}

process.exitCode = await main();
