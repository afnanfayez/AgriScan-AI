/**
 * AgriScan AI — Full Test Account Seeder
 * ======================================
 * Creates one real Supabase auth user per role (Gardener, Farmer, Nursery,
 * Agribusiness) and populates every feature table with realistic, logically
 * consistent data.
 *
 * Usage:  node scripts/seed-test-accounts.js
 *
 * Requirements: .env with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * NOTE: Uses the service_role admin client to create auth users and bypass
 * RLS for the initial seeding — this is the only way to programmatically
 * create confirmed auth accounts without the email OTP flow.
 * All data relationships (user_id, farm_id, plant_id) are correct and will
 * pass RLS when the user logs in via the normal anon/JWT path.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ─── 1. Parse .env ───────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) { console.error('.env not found'); process.exit(1); }

const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?/);
  if (!m) return;
  let v = (m[2] || '').trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
});

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// ─── 2. Supabase admin client (bypasses RLS for seeding) ─────────────────────
// The service_role key bypasses RLS but still needs table-level GRANTs
// in PostgreSQL's ACL system. We pass the Prefer: return=minimal header
// and the apikey + Authorization headers explicitly.
// If you see "permission denied for table X" — run the SQL in
// supabase_service_role_grant_fix.sql in your Supabase Dashboard → SQL Editor
// then re-run this script.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  },
});

// ─── 3. Helper: download a public URL image → base64 ─────────────────────────
function fetchImageAsBase64(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ct  = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${ct};base64,${buf.toString('base64')}`);
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

// ─── 4. Helper: upload base64 image to Supabase Storage ───────────────────────
async function uploadImage(base64, filePath) {
  if (!base64) return null;
  const BUCKET = 'agriscan';
  // ensure bucket exists
  try { await supabase.storage.createBucket(BUCKET, { public: true }); } catch {}

  let clean = base64, ct = 'image/jpeg';
  if (base64.startsWith('data:')) {
    const parts = base64.split(',');
    clean = parts[1];
    const m = parts[0].match(/data:(.*?);/);
    if (m) ct = m[1];
  }
  const buf = Buffer.from(clean, 'base64');
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buf, { contentType: ct, upsert: true });
  if (error) { console.warn(`  ⚠ Storage upload failed for ${filePath}:`, error.message); return null; }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── 5. Helper: delete any existing test accounts ────────────────────────────
async function cleanExistingTestAccounts(emails) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
  for (const u of (list?.users || [])) {
    if (emails.includes(u.email)) {
      console.log(`  🗑  Removing existing test account: ${u.email}`);
      await supabase.auth.admin.deleteUser(u.id);
    }
  }
}

// ─── 6. Helper: create an auth user + return their UUID ──────────────────────
async function createAuthUser({ email, password, name, accountType, avatarUrl }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, account_type: accountType, avatar_url: avatarUrl },
  });
  if (error || !data?.user) throw new Error(`createUser(${email}): ${error?.message}`);
  return data.user.id;
}

// ─── 7. Helper: update extra profile columns (trigger creates the row) ────────
async function updateProfile(userId, fields) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) console.warn(`  ⚠ profile update for ${userId}:`, error.message);
}

// ─── 8. Today helpers ─────────────────────────────────────────────────────────
const today = new Date();
function daysAgo(n)   { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function daysAhead(n) { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_ACCOUNTS = [
  {
    role: 'Gardener',
    email: 'layla.gardener@agriscan-test.dev',
    password: 'GardenerPass#2026',
    name:  'Layla Hassan',
    accountType: 'Gardener',
    location: 'Austin, TX',
    units: 'imperial',
    plan: 'Free',
    avatarUrl: 'https://i.pravatar.cc/150?u=layla',
  },
  {
    role: 'Farmer',
    email: 'carlos.farmer@agriscan-test.dev',
    password: 'FarmerPass#2026',
    name:  'Carlos Reyes',
    accountType: 'Farmer',
    location: 'Fresno, CA',
    units: 'metric',
    plan: 'Pro',
    avatarUrl: 'https://i.pravatar.cc/150?u=carlos',
  },
  {
    role: 'Nursery',
    email: 'mei.nursery@agriscan-test.dev',
    password: 'NurseryPass#2026',
    name:  'Mei Tanaka',
    accountType: 'Nursery',
    location: 'Portland, OR',
    units: 'metric',
    plan: 'Pro',
    avatarUrl: 'https://i.pravatar.cc/150?u=mei',
  },
  {
    role: 'Agribusiness',
    email: 'samuel.agribiz@agriscan-test.dev',
    password: 'AgribizPass#2026',
    name:  'Samuel Okafor',
    accountType: 'Agribusiness',
    location: 'Nairobi, Kenya',
    units: 'metric',
    plan: 'Enterprise',
    avatarUrl: 'https://i.pravatar.cc/150?u=samuel',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEEDER FUNCTIONS (one per role)
// ─────────────────────────────────────────────────────────────────────────────

// ─── GARDENER ─────────────────────────────────────────────────────────────────
async function seedGardener(userId, userEmail, userName) {
  console.log('\n  [Gardener] Seeding farm + plants...');

  // Farm / garden
  const { data: farm, error: farmErr } = await supabase.from('farms').insert({
    name: "Layla's Backyard Garden",
    user_id: userId,
    zone_count: 2,
    location: 'Austin, TX',
    acreage: 0.05,
    crop_type: 'Mixed Vegetables & Herbs',
  }).select().single();
  if (farmErr) { console.error('  Farm error:', farmErr.message); return; }
  const farmId = farm.id;

  // ── Plants ─────────────────────────────────────────────────────────────────
  const plantsData = [
    {
      name: 'Cherry Belle Radish',
      type: 'Vegetable',
      planting_date: daysAgo(30),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=300&fit=crop',
      farm_id: farmId, user_id: userId,
    },
    {
      name: 'Genovese Basil',
      type: 'Herb',
      planting_date: daysAgo(45),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1588979355313-6711a0954656?w=400&h=300&fit=crop',
      farm_id: farmId, user_id: userId,
    },
    {
      name: 'Knock Out Rose (Red)',
      type: 'Rose',
      planting_date: daysAgo(120),
      health_status: 'Warning',
      photo_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop',
      farm_id: farmId, user_id: userId,
    },
  ];

  const { data: plants, error: plantErr } = await supabase.from('plants').insert(plantsData).select();
  if (plantErr) { console.error('  Plants error:', plantErr.message); return; }
  const [radish, basil, rose] = plants;

  // ── Notes (radish — one with photo) ───────────────────────────────────────
  console.log('  [Gardener] Uploading note photo to Storage...');
  const noteImgB64 = await fetchImageAsBase64(
    'https://images.unsplash.com/photo-1590502593747-42a996133562?w=600&h=400&fit=crop'
  );
  const notePhotoUrl = await uploadImage(noteImgB64, `notes/${userId}/${Date.now()}-radish.jpg`);

  await supabase.from('notes').insert([
    {
      plant_id: radish.id, user_id: userId,
      content: 'Thinned seedlings to 2 inches apart. Soil stays moist but well-drained — perfect for spring radishes.',
      photo_url: notePhotoUrl,
    },
    {
      plant_id: radish.id, user_id: userId,
      content: 'Radishes are sizing up nicely — first harvest in about 7 days if weather holds.',
    },
    {
      plant_id: basil.id, user_id: userId,
      content: 'Pinched the flower buds off the main stem to keep leaves coming. Smells incredible.',
    },
    {
      plant_id: rose.id, user_id: userId,
      content: 'Noticed a faint white coating on the underside of newer leaves. Possibly powdery mildew starting.',
    },
  ]);

  // ── Scan + Treatment for rose ──────────────────────────────────────────────
  console.log('  [Gardener] Adding scan + treatment for rose...');
  const { data: scan, error: scanErr } = await supabase.from('scans').insert({
    plant_id: rose.id, user_id: userId,
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop',
    diagnosis: 'Powdery Mildew',
    confidence: 87.4,
    severity: 'Medium',
    symptoms: 'White powdery coating on upper and lower leaf surfaces; distorted new growth and early leaf drop.',
  }).select().single();
  if (!scanErr && scan) {
    await supabase.from('treatments').insert({
      scan_id: scan.id, plant_id: rose.id, user_id: userId,
      type: 'Powdery Mildew',
      organic_steps: [
        'Mix 1 tbsp baking soda + 1 tsp dish soap in 1 gallon of water; spray both leaf surfaces every 7 days.',
        'Apply neem oil solution (2 tsp/gallon) in the evening to avoid leaf burn.',
        'Remove and dispose of badly infected leaves in sealed bags — do not compost.',
      ],
      chemical_steps: [
        'Apply Myclobutanil-based fungicide (e.g., Eagle 20EW) on a 14-day schedule.',
        'Rotate with Trifloxystrobin to prevent resistance buildup.',
      ],
      status: 'In Progress',
    });

    // Expert review for the scan
    await supabase.from('expert_reviews').insert({
      scan_id: scan.id, plant_id: rose.id, user_id: userId,
      status: 'Pending',
    });
  }

  // ── Care Reminders ────────────────────────────────────────────────────────
  console.log('  [Gardener] Adding care reminders...');
  await supabase.from('care_reminders').insert([
    // upcoming
    {
      plant_id: radish.id, user_id: userId,
      reminder_type: 'Watering',
      due_date: daysAhead(1),
      recurring_days: 2,
      notes: 'Water in the morning; radishes prefer consistent moisture.',
      completed: false,
    },
    // overdue
    {
      plant_id: rose.id, user_id: userId,
      reminder_type: 'Pest Check',
      due_date: daysAgo(3),
      recurring_days: 7,
      notes: 'Check undersides of leaves for aphids and mite webbing.',
      completed: false,
    },
    // completed
    {
      plant_id: basil.id, user_id: userId,
      reminder_type: 'Fertilizing',
      due_date: daysAgo(10),
      notes: 'Apply half-strength fish emulsion for lush leaf growth.',
      completed: true,
      completed_at: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // upcoming recurring — pruning
    {
      plant_id: rose.id, user_id: userId,
      reminder_type: 'Pruning',
      due_date: daysAhead(5),
      recurring_days: 21,
      notes: 'Deadhead spent blooms and cut back canes crossing the centre.',
      completed: false,
    },
  ]);

  // ── Notifications ─────────────────────────────────────────────────────────
  await supabase.from('notifications').insert([
    {
      user_id: userId,
      title: 'Scan Complete — Powdery Mildew Detected',
      message: 'Your Knock Out Rose scan has returned a Powdery Mildew diagnosis at 87% confidence. A treatment plan is ready.',
      category: 'Scan', read: false,
    },
    {
      user_id: userId,
      title: 'Reminder Overdue',
      message: "Your Pest Check reminder for Knock Out Rose was due 3 days ago.",
      category: 'Alert', read: false,
    },
    {
      user_id: userId,
      title: 'Welcome to AgriScan AI!',
      message: 'Your Gardener account is fully set up. Start by scanning a plant or setting a care reminder.',
      category: 'System', read: true,
    },
  ]);

  // ── Forum posts + comments ─────────────────────────────────────────────────
  const { data: post } = await supabase.from('forum_posts').insert({
    title: 'Best organic fix for powdery mildew on roses?',
    content: "I just got a Powdery Mildew diagnosis on my Knock Out Rose and I'm trying to avoid chemical fungicides. Has anyone had success with the baking soda + neem oil combo? How often do you reapply after rain?",
    user_id: userId, author_name: userName, category: 'Diseases',
  }).select().single();
  if (post) {
    await supabase.from('forum_comments').insert({
      post_id: post.id,
      content: "Baking soda spray works well in dry climates. I do it every 5 days during humid spells. Make sure you get the undersides of the leaves!",
      user_id: userId, author_name: userName,
    });
  }

  console.log('  ✅ Gardener seeding complete.');
}

// ─── FARMER ──────────────────────────────────────────────────────────────────
async function seedFarmer(userId, userEmail, userName) {
  console.log('\n  [Farmer] Seeding fields, plants, equipment, expenses, tasks, team...');

  // Three fields (Commercial Farmer "fields" = farms rows), varied size/crop/status,
  // all near Fresno, CA with real lat/lng for the Field Map.
  const { data: fields, error: fieldsErr } = await supabase.from('farms').insert([
    {
      name: 'Block A — Roma Tomato',
      user_id: userId,
      zone_count: 3,
      location: 'Fresno, CA',
      acreage: 40,
      crop_type: 'Tomato',
      latitude: 36.7378,
      longitude: -119.7871,
    },
    {
      name: 'Block B — Beefsteak Tomato',
      user_id: userId,
      zone_count: 3,
      location: 'Fresno, CA',
      acreage: 35,
      crop_type: 'Tomato',
      latitude: 36.7512,
      longitude: -119.7695,
    },
    {
      name: 'Nonpareil Almond Orchard',
      user_id: userId,
      zone_count: 6,
      location: 'Fresno, CA',
      acreage: 205,
      crop_type: 'Nut Tree',
      latitude: 36.7201,
      longitude: -119.8103,
    },
  ]).select();
  if (fieldsErr) { console.error('  Fields error:', fieldsErr.message); return; }
  const [fieldA, fieldB, fieldAlmond] = fields;
  const farmId = fieldA.id; // legacy anchor field for team_members (farm_id NOT NULL there)

  // ── Plants ─────────────────────────────────────────────────────────────────
  const plantsData = [
    {
      name: 'Roma Tomato — Block A',
      type: 'Tomato',
      planting_date: daysAgo(60),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop',
      farm_id: fieldA.id, user_id: userId,
    },
    {
      name: 'Beefsteak Tomato — Block B',
      type: 'Tomato',
      planting_date: daysAgo(55),
      health_status: 'Critical',
      photo_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop',
      farm_id: fieldB.id, user_id: userId,
    },
    {
      name: 'Nonpareil Almond Orchard',
      type: 'Nut Tree',
      planting_date: daysAgo(365 * 3),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop',
      farm_id: fieldAlmond.id, user_id: userId,
    },
  ];
  const { data: plants, error: plantErr } = await supabase.from('plants').insert(plantsData).select();
  if (plantErr) { console.error('  Plants error:', plantErr.message); return; }
  const [tomatoA, tomatoB, almond] = plants;

  // ── Notes ──────────────────────────────────────────────────────────────────
  console.log('  [Farmer] Uploading note photo to Storage...');
  const farmNoteImgB64 = await fetchImageAsBase64(
    'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=600&h=400&fit=crop'
  );
  const farmNotePhotoUrl = await uploadImage(farmNoteImgB64, `notes/${userId}/${Date.now()}-tomato-field.jpg`);

  await supabase.from('notes').insert([
    {
      plant_id: tomatoA.id, user_id: userId,
      content: 'Block A looking excellent — uniform fruit set across all 12 rows. Drip system running on 6-hour cycles.',
      photo_url: farmNotePhotoUrl,
    },
    {
      plant_id: tomatoB.id, user_id: userId,
      content: 'Block B: brownish water-soaked patches spreading from north end. Likely late blight given overnight fog this week.',
    },
    {
      plant_id: almond.id, user_id: userId,
      content: 'Hull split at 15% — target harvest window is approximately 3 weeks out. Ordered 2 additional haul bins.',
    },
  ]);

  // ── Scan + Treatment (Block B — Late Blight) ───────────────────────────────
  console.log('  [Farmer] Adding scan + treatment...');
  const { data: scanB, error: scanErr } = await supabase.from('scans').insert({
    plant_id: tomatoB.id, user_id: userId,
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop',
    diagnosis: 'Tomato Late Blight',
    confidence: 94.1,
    severity: 'High',
    symptoms: 'Dark brown, water-soaked lesions on lower leaves; white sporulation on undersides during high humidity; rapid fruit lesion spread.',
  }).select().single();
  if (!scanErr && scanB) {
    await supabase.from('treatments').insert({
      scan_id: scanB.id, plant_id: tomatoB.id, user_id: userId,
      type: 'Tomato Late Blight',
      organic_steps: [
        'Immediately prune and bag all symptomatic foliage — do not leave on the ground.',
        'Apply copper hydroxide suspension at label rate; repeat every 5 days.',
        'Reduce overhead irrigation; switch Block B to drip-only until symptoms subside.',
      ],
      chemical_steps: [
        'Apply Mefenoxam + Chlorothalonil tank mix at full label rate.',
        'Follow with Mandipropamid systemic treatment 3 days later for residual control.',
      ],
      status: 'Pending',
    });

    // Expert review
    await supabase.from('expert_reviews').insert({
      scan_id: scanB.id, plant_id: tomatoB.id, user_id: userId,
      status: 'Reviewed',
      expert_reply: 'Confirmed late blight. Recommend immediate Chlorothalonil application and removal of a 2-row buffer zone around the outbreak. Check weather forecast — rain within 48 h will accelerate spread.',
    });
  }

  // ── Equipment ──────────────────────────────────────────────────────────────
  console.log('  [Farmer] Adding equipment...');
  await supabase.from('equipment').insert([
    {
      user_id: userId, farm_id: fieldA.id,
      name: 'John Deere 6120M Tractor',
      equipment_type: 'Tractor',
      status: 'Operational',
      purchase_date: '2022-03-15',
      notes: '2,200 hours on engine. Last service: 2026-05-10. Next service due at 2,500 hours.',
    },
    {
      user_id: userId, farm_id: fieldA.id,
      name: 'Netafim Drip Irrigation — Block A & B',
      equipment_type: 'Irrigation',
      status: 'Operational',
      purchase_date: '2021-11-01',
      notes: '6 zones, each 45 min cycle. Emitter pressure check due next month.',
    },
    {
      user_id: userId, farm_id: fieldB.id,
      name: 'Jacto AD-14 Sprayer',
      equipment_type: 'Sprayer',
      status: 'Maintenance',
      purchase_date: '2023-06-20',
      notes: 'Nozzle tips clogged after last Chlorothalonil run. Ordered replacement tips — expected delivery Jul 14.',
    },
    {
      user_id: userId, farm_id: fieldAlmond.id,
      name: 'Case IH 7140 Harvester',
      equipment_type: 'Harvester',
      status: 'Operational',
      purchase_date: '2020-08-01',
      notes: 'Used for almond shaking. Full pre-harvest inspection completed June 30.',
    },
  ]);

  // ── Expenses ───────────────────────────────────────────────────────────────
  console.log('  [Farmer] Adding expenses & revenues...');
  await supabase.from('expenses').insert([
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Seed',   type: 'Expense', amount: 3840.00,
      description: 'Roma & Beefsteak certified disease-free transplants (4,800 units × $0.80)',
      occurred_on: daysAgo(70),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Fertilizer', type: 'Expense', amount: 1250.00,
      description: '10-0-10 liquid fertigation blend — 25 totes × $50',
      occurred_on: daysAgo(55),
    },
    {
      user_id: userId, farm_id: fieldB.id,
      category: 'Pesticide', type: 'Expense', amount: 680.00,
      description: 'Chlorothalonil + Mefenoxam tank mix — emergency late blight response',
      occurred_on: daysAgo(2),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Labor', type: 'Expense', amount: 8400.00,
      description: 'Field crew (12 workers × 7 weeks @ $100/day)',
      occurred_on: daysAgo(14),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Water', type: 'Expense', amount: 920.00,
      description: 'Irrigation district charge — June water allotment',
      occurred_on: daysAgo(10),
    },
    {
      user_id: userId, farm_id: fieldB.id,
      category: 'Equipment', type: 'Expense', amount: 340.00,
      description: 'Jacto sprayer nozzle replacement kit + labour',
      occurred_on: daysAgo(3),
    },
    {
      user_id: userId, farm_id: fieldAlmond.id,
      category: 'Other', type: 'Revenue', amount: 42000.00,
      description: 'Almond contract partial payment — first tranche on 70-tonne advance',
      occurred_on: daysAgo(20),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Other', type: 'Revenue', amount: 12500.00,
      description: 'Block A Roma tomato wholesale delivery — 5,000 lbs @ $2.50/lb',
      occurred_on: daysAgo(7),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Seed', type: 'Expense', amount: 2100.00,
      description: 'Cover crop seed for post-harvest rotation — Block A',
      occurred_on: daysAgo(120),
    },
    {
      user_id: userId, farm_id: fieldB.id,
      category: 'Labor', type: 'Expense', amount: 5600.00,
      description: 'Extra crew shift — late blight scouting & pruning, Block B',
      occurred_on: daysAgo(45),
    },
    {
      user_id: userId, farm_id: fieldAlmond.id,
      category: 'Water', type: 'Expense', amount: 3400.00,
      description: 'Micro-sprinkler irrigation — almond orchard, spring cycle',
      occurred_on: daysAgo(100),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      category: 'Other', type: 'Revenue', amount: 9800.00,
      description: 'Roma tomato spot-market sale — 4,000 lbs',
      occurred_on: daysAgo(150),
    },
  ]);

  // ── Field scans (batch scanner results) ────────────────────────────────────
  console.log('  [Farmer] Adding field scans...');
  await supabase.from('field_scans').insert([
    {
      user_id: userId, farm_id: fieldB.id,
      total_samples: 8, healthy_count: 2, infection_percentage: 75,
      results: [
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Tomato Late Blight', confidence: 94, severity: 'High', symptoms: 'Dark brown, water-soaked lesions on lower leaves; white sporulation on undersides.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Tomato Late Blight', confidence: 91, severity: 'High', symptoms: 'Rapid fruit lesion spread near north end of block.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Tomato Late Blight', confidence: 88, severity: 'Medium', symptoms: 'Early-stage water-soaked patches on lower canopy.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Tomato Late Blight', confidence: 85, severity: 'Medium', symptoms: 'Leaf yellowing with irregular brown margins.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Tomato Late Blight', confidence: 79, severity: 'Medium', symptoms: 'Localized lesion cluster, rows 8-10.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 82, severity: 'Low', symptoms: 'No visible lesions, uniform green canopy.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 77, severity: 'Low', symptoms: 'Healthy fruit set, no blight symptoms observed.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Tomato Late Blight', confidence: 90, severity: 'High', symptoms: 'Advanced foliar collapse near irrigation head.' },
      ],
      created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      total_samples: 6, healthy_count: 6, infection_percentage: 0,
      results: [
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 96, severity: 'Low', symptoms: 'Uniform fruit set, no disease indicators.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 93, severity: 'Low', symptoms: 'Vigorous canopy growth across sample rows.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 95, severity: 'Low', symptoms: 'No pest or disease pressure observed.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 90, severity: 'Low', symptoms: 'Good color break progressing on schedule.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 92, severity: 'Low', symptoms: 'Consistent leaf color, no chlorosis.' },
        { imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 94, severity: 'Low', symptoms: 'No visible lesions across sample set.' },
      ],
      created_at: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  // ── Irrigation & inputs log ────────────────────────────────────────────────
  console.log('  [Farmer] Adding irrigation logs...');
  await supabase.from('irrigation_logs').insert([
    {
      user_id: userId, farm_id: fieldA.id,
      log_type: 'Irrigation', amount: 1800, unit: 'gallons',
      notes: 'Drip cycle, Block A — 6 hours per zone.',
      logged_on: daysAgo(1),
    },
    {
      user_id: userId, farm_id: fieldB.id,
      log_type: 'Pesticide', amount: 12, unit: 'liters',
      notes: 'Chlorothalonil + Mefenoxam tank mix applied to Block B, north end first.',
      logged_on: daysAgo(2),
    },
    {
      user_id: userId, farm_id: fieldAlmond.id,
      log_type: 'Fertilizer', amount: 300, unit: 'kg',
      notes: 'Foliar potassium application ahead of hull split.',
      logged_on: daysAgo(6),
    },
    {
      user_id: userId, farm_id: fieldA.id,
      log_type: 'Irrigation', amount: 1650, unit: 'gallons',
      notes: 'Drip cycle, Block A — reduced 30 min due to recent rain.',
      logged_on: daysAgo(8),
    },
  ]);

  // ── Team members ───────────────────────────────────────────────────────────
  console.log('  [Farmer] Adding team members...');
  await supabase.from('team_members').insert([
    { farm_id: fieldA.id, email: 'pedro.supervisor@agriscan-test.dev', role: 'Manager' },
    { farm_id: fieldA.id, email: 'rosa.worker@agriscan-test.dev',       role: 'Worker'  },
    { farm_id: fieldB.id, email: 'jose.worker@agriscan-test.dev',       role: 'Worker'  },
  ]);

  // ── Farm tasks ─────────────────────────────────────────────────────────────
  console.log('  [Farmer] Adding farm tasks...');
  await supabase.from('farm_tasks').insert([
    {
      user_id: userId, farm_id: fieldB.id,
      title: 'Apply emergency fungicide — Block B late blight',
      description: 'Tank mix Chlorothalonil + Mefenoxam. Start from north end. Wear full PPE. Cover 48 rows.',
      assignee_email: 'pedro.supervisor@agriscan-test.dev',
      due_date: daysAhead(1),
      status: 'Pending',
    },
    {
      user_id: userId, farm_id: fieldA.id,
      title: 'Harvest Block A Roma tomatoes — rows 1–6',
      description: 'Pick at 85% color break. Load 50-lb bins. Coordinate with transport at 7 AM.',
      assignee_email: 'rosa.worker@agriscan-test.dev',
      due_date: daysAhead(3),
      status: 'Pending',
    },
    {
      user_id: userId, farm_id: fieldA.id,
      title: 'Drip system emitter check — all zones',
      description: 'Walk all 6 zones. Replace clogged emitters. Record pressure readings per zone.',
      assignee_email: 'jose.worker@agriscan-test.dev',
      due_date: daysAhead(7),
      status: 'Pending',
    },
    {
      user_id: userId, farm_id: fieldAlmond.id,
      title: 'Pre-harvest almond orchard inspection',
      description: 'Check hull split percentage across 5 sample trees per block. Report back to Carlos.',
      due_date: daysAgo(5),
      status: 'Completed',
    },
    {
      user_id: userId, farm_id: fieldA.id,
      title: 'Tractor 250-hour service',
      description: 'Oil & filter change, air filter clean, hydraulic fluid top-up. Log in maintenance sheet.',
      due_date: daysAhead(14),
      status: 'In Progress',
    },
  ]);

  // ── Care reminders for the tomato plants ──────────────────────────────────
  await supabase.from('care_reminders').insert([
    {
      plant_id: tomatoA.id, user_id: userId,
      reminder_type: 'Watering',
      due_date: daysAhead(0),
      recurring_days: 1,
      notes: 'Block A drip cycle — 6 hours per zone.',
      completed: false,
    },
    {
      plant_id: tomatoB.id, user_id: userId,
      reminder_type: 'Pest Check',
      due_date: daysAgo(1),
      notes: 'Monitor late blight spread. Check 10 sentinel plants per row.',
      completed: false,
    },
    {
      plant_id: almond.id, user_id: userId,
      reminder_type: 'Custom',
      due_date: daysAhead(21),
      notes: 'Hull-split harvest window target. Coordinate with contract buyer.',
      completed: false,
    },
  ]);

  // ── Notifications ─────────────────────────────────────────────────────────
  await supabase.from('notifications').insert([
    {
      user_id: userId,
      title: 'High-Severity Scan Alert — Late Blight Confirmed',
      message: 'Beefsteak Tomato Block B scan returned 94% confidence Late Blight. Immediate treatment recommended.',
      category: 'Scan', read: false,
    },
    {
      user_id: userId,
      title: 'Expert Review Complete',
      message: 'An agronomist has reviewed your Block B scan and left a detailed reply.',
      category: 'Treatment', read: false,
    },
    {
      user_id: userId,
      title: 'Revenue Recorded — Almond Contract',
      message: 'AUD $42,000 partial payment logged for almond contract delivery.',
      category: 'System', read: true,
    },
  ]);

  // ── Forum post ─────────────────────────────────────────────────────────────
  await supabase.from('forum_posts').insert({
    title: 'Late blight outbreak in Fresno — weather correlation?',
    content: "We've had dense morning fog for 10 straight days and late blight just hit Block B hard. Anyone else in the Central Valley seeing this? I'm wondering if the coastal marine layer pushing inland is the trigger this year more than usual humidity.",
    user_id: userId, author_name: userName, category: 'Diseases',
  });

  console.log('  ✅ Farmer seeding complete.');
}

// ─── NURSERY ─────────────────────────────────────────────────────────────────
async function seedNursery(userId, userEmail, userName) {
  console.log('\n  [Nursery] Seeding nursery, inventory, orders, suppliers...');

  // Farm (nursery location)
  const { data: farm, error: farmErr } = await supabase.from('farms').insert({
    name: 'Tanaka Botanical Nursery',
    user_id: userId,
    zone_count: 4,
    location: 'Portland, OR',
    acreage: 1.2,
    crop_type: 'Ornamental Flowers, Native Plants, Ferns',
  }).select().single();
  if (farmErr) { console.error('  Farm error:', farmErr.message); return; }
  const farmId = farm.id;

  // ── Plants (display / mother stock) ────────────────────────────────────────
  const plantsData = [
    {
      name: 'Japanese Maple (Mother Stock)',
      type: 'Tree',
      planting_date: daysAgo(365),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&h=300&fit=crop',
      farm_id: farmId, user_id: userId,
    },
    {
      name: 'Pink Hydrangea (Display Bed)',
      type: 'Flower',
      planting_date: daysAgo(90),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
      farm_id: farmId, user_id: userId,
    },
    {
      name: 'Pacific Coast Iris (Propagation)',
      type: 'Flower',
      planting_date: daysAgo(40),
      health_status: 'Warning',
      photo_url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=400&h=300&fit=crop',
      farm_id: farmId, user_id: userId,
    },
  ];
  const { data: plants, error: plantErr } = await supabase.from('plants').insert(plantsData).select();
  if (plantErr) { console.error('  Plants error:', plantErr.message); return; }
  const [maple, hydrangea, iris] = plants;

  // ── Notes (iris — one with photo) ─────────────────────────────────────────
  console.log('  [Nursery] Uploading note photo to Storage...');
  const nursNoteImgB64 = await fetchImageAsBase64(
    'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=600&h=400&fit=crop'
  );
  const nursNotePhotoUrl = await uploadImage(nursNoteImgB64, `notes/${userId}/${Date.now()}-iris-propagation.jpg`);

  await supabase.from('notes').insert([
    {
      plant_id: maple.id, user_id: userId,
      content: 'Mother stock in excellent shape — 42 cuttings taken last week. Strike rate expected ~70%.',
    },
    {
      plant_id: hydrangea.id, user_id: userId,
      content: 'Heads fully developed — 85 plants ready for the Portland Garden Show floor display.',
    },
    {
      plant_id: iris.id, user_id: userId,
      content: 'Leaf spotting visible on 6 of 30 propagation plugs. Increased air circulation in propagation house.',
      photo_url: nursNotePhotoUrl,
    },
  ]);

  // ── Scan for iris ─────────────────────────────────────────────────────────
  const { data: irisScan } = await supabase.from('scans').insert({
    plant_id: iris.id, user_id: userId,
    image_url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=400&h=300&fit=crop',
    diagnosis: 'Ink Disease (Drechslera iridis)',
    confidence: 78.3,
    severity: 'Low',
    symptoms: 'Dark brown irregular spots with yellow halos on leaf blades; soft rot at base of affected plugs.',
  }).select().single();
  if (irisScan) {
    await supabase.from('treatments').insert({
      scan_id: irisScan.id, plant_id: iris.id, user_id: userId,
      type: 'Fungal Leaf Spot',
      organic_steps: [
        'Remove infected plugs immediately and isolate from healthy stock.',
        'Increase bench spacing in propagation house to improve air flow.',
        'Apply copper-based foliar spray every 7 days for 3 weeks.',
      ],
      chemical_steps: [
        'Drench plugs with Iprodione at label rate to prevent soil-borne spread.',
      ],
      status: 'In Progress',
    });
  }

  // ── Inventory Batches ─────────────────────────────────────────────────────
  console.log('  [Nursery] Adding inventory batches...');
  const { data: batches } = await supabase.from('inventory_batches').insert([
    {
      user_id: userId, farm_id: farmId,
      plant_type: 'Japanese Maple',
      batch_name: 'Acer palmatum — Spring Cuttings 2026',
      quantity: 42,
      unit_price: 28.00,
      propagation_date: daysAgo(14),
      ready_date: daysAhead(45),
      status: 'Propagating',
      low_stock_threshold: 10,
      grade: 'A',
    },
    {
      user_id: userId, farm_id: farmId,
      plant_type: 'Pink Hydrangea',
      batch_name: 'Hydrangea macrophylla — Show Stock',
      quantity: 85,
      unit_price: 14.50,
      propagation_date: daysAgo(90),
      ready_date: daysAgo(5),
      status: 'Ready',
      low_stock_threshold: 20,
      grade: 'A',
    },
    {
      user_id: userId, farm_id: farmId,
      plant_type: 'Pacific Coast Iris',
      batch_name: 'Iris douglasiana — Spring Mix Plugs',
      quantity: 24,
      unit_price: 9.00,
      propagation_date: daysAgo(40),
      ready_date: daysAhead(30),
      status: 'Needs Treatment',
      low_stock_threshold: 5,
      grade: 'B',
    },
    {
      user_id: userId, farm_id: farmId,
      plant_type: 'Western Red Cedar',
      batch_name: 'Thuja plicata — Bare Root Liners',
      quantity: 0,
      unit_price: 5.00,
      propagation_date: daysAgo(120),
      ready_date: daysAgo(30),
      status: 'Sold Out',
      low_stock_threshold: 15,
      grade: 'C',
    },
  ]).select();

  // ── Batch health screening (Iris — matches the Ink Disease scan above) ─────
  if (batches && batches[2]) {
    console.log('  [Nursery] Adding batch health screening...');
    await supabase.from('batch_scans').insert({
      user_id: userId,
      batch_id: batches[2].id,
      total_samples: 10,
      healthy_count: 4,
      infection_percentage: 60,
      results: [
        { imageUrl: 'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=400&h=300&fit=crop', diagnosis: 'Ink Disease (Drechslera iridis)', confidence: 82, severity: 'Medium', symptoms: 'Dark brown irregular leaf spotting with yellow halos.' },
        { imageUrl: 'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=400&h=300&fit=crop', diagnosis: 'Ink Disease (Drechslera iridis)', confidence: 76, severity: 'Medium', symptoms: 'Soft rot at base of propagation plug.' },
        { imageUrl: 'https://images.unsplash.com/photo-1490750967868-88df5691cc1e?w=400&h=300&fit=crop', diagnosis: 'Healthy', confidence: 91, severity: 'Low', symptoms: 'No visible symptoms.' },
      ],
    });
  }

  // ── Suppliers ─────────────────────────────────────────────────────────────
  console.log('  [Nursery] Adding suppliers...');
  await supabase.from('suppliers').insert([
    {
      user_id: userId,
      name: 'Cascade Growers Wholesale',
      contact_info: 'orders@cascadegrowers.com | +1-503-555-0142',
      notes: 'Primary propagation media and 4" pot supplier. 30-day net terms.',
    },
    {
      user_id: userId,
      name: 'PNW Native Seeds Co.',
      contact_info: 'hello@pnwnativeseeds.com | +1-360-555-0289',
      notes: 'Source for Pacific Coast Iris and native wildflower seed stock. Good germination rates.',
    },
    {
      user_id: userId,
      name: 'Green Thumb Chemicals Ltd.',
      contact_info: 'sales@gtchem.com | +1-800-555-0374',
      notes: 'Copper fungicide and Iprodione supplier. Order 3 weeks in advance for volume pricing.',
    },
  ]);

  // ── Orders + Order Items ───────────────────────────────────────────────────
  console.log('  [Nursery] Adding customer orders...');
  if (batches && batches.length >= 2) {
    const [mapleBatch, hydrangBatch] = batches;

    const { data: order1 } = await supabase.from('orders').insert({
      user_id: userId,
      customer_name: 'Portland Community Garden Society',
      customer_contact: 'pcgs@community.org | 503-555-0190',
      status: 'Fulfilled',
      total_amount: 1160.00,
      notes: 'Annual spring planting order. Delivered to NE Portland site. Invoice #2026-0041.',
    }).select().single();

    if (order1) {
      await supabase.from('order_items').insert([
        { order_id: order1.id, batch_id: hydrangBatch.id, quantity: 40, unit_price: 14.50 },
        { order_id: order1.id, batch_id: mapleBatch.id,   quantity: 20, unit_price: 28.00 },
      ]);
    }

    const { data: order2 } = await supabase.from('orders').insert({
      user_id: userId,
      customer_name: 'Fernwood Hotel & Spa',
      customer_contact: 'facilities@fernwoodhotel.com | 503-555-0211',
      status: 'Pending',
      total_amount: 580.00,
      notes: 'Lobby refresh order. Client requested 4-week delivery window starting Jul 20.',
    }).select().single();

    if (order2) {
      await supabase.from('order_items').insert([
        { order_id: order2.id, batch_id: hydrangBatch.id, quantity: 40, unit_price: 14.50 },
      ]);
    }

    const { data: order3 } = await supabase.from('orders').insert({
      user_id: userId,
      customer_name: 'Riverside Elementary School',
      customer_contact: 'principal@riverside.edu | 503-555-0188',
      status: 'Cancelled',
      total_amount: 270.00,
      notes: 'School garden order — cancelled due to budget freeze. Batch returned to stock.',
    }).select().single();

    if (order3 && batches[2]) {
      await supabase.from('order_items').insert([
        { order_id: order3.id, batch_id: batches[2].id, quantity: 30, unit_price: 9.00 },
      ]);
    }
  }

  // ── Farm Tasks ─────────────────────────────────────────────────────────────
  await supabase.from('farm_tasks').insert([
    {
      user_id: userId, farm_id: farmId,
      title: 'Prepare 85 Hydrangea plants for Portland Garden Show',
      description: 'Pot up, tag, and arrange display. Truck departs at 6 AM Jul 15.',
      due_date: daysAhead(5),
      status: 'In Progress',
    },
    {
      user_id: userId, farm_id: farmId,
      title: 'Mist cuttings — Japanese Maple propagation house',
      description: 'Run mist system 4× daily. Check rooting progress on tray #3.',
      due_date: daysAhead(1),
      status: 'Pending',
    },
    {
      user_id: userId, farm_id: farmId,
      title: 'Isolate and treat infected Iris plugs',
      description: 'Move 6 affected plugs to quarantine bench. Apply copper spray.',
      due_date: daysAgo(1),
      status: 'Completed',
    },
  ]);

  // ── Care reminders ─────────────────────────────────────────────────────────
  await supabase.from('care_reminders').insert([
    {
      plant_id: maple.id, user_id: userId,
      reminder_type: 'Watering',
      due_date: daysAhead(1),
      recurring_days: 2,
      notes: 'Propagation bench — mist twice daily or when plugs feel dry at 1-inch depth.',
      completed: false,
    },
    {
      plant_id: iris.id, user_id: userId,
      reminder_type: 'Pest Check',
      due_date: daysAgo(1),
      notes: 'Check for Drechslera spread; inspect remaining 24 plugs.',
      completed: false,
    },
    {
      plant_id: hydrangea.id, user_id: userId,
      reminder_type: 'Fertilizing',
      due_date: daysAhead(7),
      recurring_days: 14,
      notes: 'Slow-release granular 14-14-14 at 1 tsp per 6" pot.',
      completed: false,
    },
  ]);

  // ── Notifications ─────────────────────────────────────────────────────────
  await supabase.from('notifications').insert([
    {
      user_id: userId,
      title: 'Low Stock Warning — Japanese Maple',
      message: 'The Acer palmatum batch has only 42 propagating units. Consider ordering additional cutting stock.',
      category: 'Alert', read: false,
    },
    {
      user_id: userId,
      title: 'Order Fulfilled — Portland Community Garden Society',
      message: '80 plants dispatched. Total invoice: $1,160.00.',
      category: 'System', read: true,
    },
    {
      user_id: userId,
      title: 'Scan Result — Iris Leaf Spot Detected',
      message: 'Pacific Coast Iris scan returned a Low-severity Drechslera diagnosis. Treatment plan created.',
      category: 'Scan', read: false,
    },
  ]);

  // ── Forum post ─────────────────────────────────────────────────────────────
  await supabase.from('forum_posts').insert({
    title: 'Tips for raising Pacific Coast Iris strike rates in a propagation house?',
    content: "I'm propagating Iris douglasiana and seeing a lot of Drechslera leaf spot on my plugs despite good humidity control. The mother plants look fine — the issue seems to start in the propagation house. Anyone successfully used copper drench + increased airflow? What propagation media are you using?",
    user_id: userId, author_name: userName, category: 'Tips',
  });

  console.log('  ✅ Nursery seeding complete.');
}

// ─── AGRIBUSINESS ─────────────────────────────────────────────────────────────
async function seedAgribusiness(userId, userEmail, userName) {
  console.log('\n  [Agribusiness] Seeding large-scale operation...');

  // Two farms (separate divisions)
  const { data: farm1, error: farm1Err } = await supabase.from('farms').insert({
    name: 'Rift Valley Maize Division',
    user_id: userId,
    zone_count: 10,
    location: 'Nakuru, Rift Valley, Kenya',
    acreage: 1500,
    crop_type: 'Maize (Corn)',
    latitude: -0.3031,
    longitude: 36.0800,
  }).select().single();
  if (farm1Err) { console.error('  Farm1 error:', farm1Err.message); return; }

  const { data: farm2, error: farm2Err } = await supabase.from('farms').insert({
    name: 'Coastal Sugarcane Estate',
    user_id: userId,
    zone_count: 8,
    location: 'Kilifi, Coast Province, Kenya',
    acreage: 820,
    crop_type: 'Sugarcane',
    latitude: -3.6305,
    longitude: 39.8499,
  }).select().single();
  if (farm2Err) { console.error('  Farm2 error:', farm2Err.message); return; }

  // Third division — nursery stock, so the Agribusiness org has one Commercial
  // Farm + one Nursery to link (Sugarcane Estate stays unlinked, demonstrating
  // the "link a farm" picker in Multi-Farm Manager).
  const { data: farm3, error: farm3Err } = await supabase.from('farms').insert({
    name: 'Okafor Seedling Nursery — Eldoret',
    user_id: userId,
    zone_count: 4,
    location: 'Eldoret, Rift Valley, Kenya',
    acreage: 15,
    crop_type: 'Seedlings / Nursery Stock',
    latitude: 0.5143,
    longitude: 35.2698,
  }).select().single();
  if (farm3Err) { console.error('  Farm3 error:', farm3Err.message); return; }

  const farmId1 = farm1.id;
  const farmId2 = farm2.id;
  const farmId3 = farm3.id;

  // ── Plants ──────────────────────────────────────────────────────────────────
  const plantsData = [
    {
      name: 'DK8031 Hybrid Maize — Block N1',
      type: 'Maize',
      planting_date: daysAgo(80),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop',
      farm_id: farmId1, user_id: userId,
    },
    {
      name: 'DK8031 Hybrid Maize — Block S3',
      type: 'Maize',
      planting_date: daysAgo(75),
      health_status: 'Warning',
      photo_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop',
      farm_id: farmId1, user_id: userId,
    },
    {
      name: 'Co 86032 Sugarcane Ratoon — Plot C2',
      type: 'Sugarcane',
      planting_date: daysAgo(365),
      health_status: 'Healthy',
      photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
      farm_id: farmId2, user_id: userId,
    },
  ];
  const { data: plants, error: plantErr } = await supabase.from('plants').insert(plantsData).select();
  if (plantErr) { console.error('  Plants error:', plantErr.message); return; }
  const [maizeN1, maizeS3, sugarcane] = plants;

  // ── Notes (maize block S3 — one with photo) ───────────────────────────────
  console.log('  [Agribusiness] Uploading note photo to Storage...');
  const bizNoteImgB64 = await fetchImageAsBase64(
    'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&h=400&fit=crop'
  );
  const bizNotePhotoUrl = await uploadImage(bizNoteImgB64, `notes/${userId}/${Date.now()}-maize-block.jpg`);

  await supabase.from('notes').insert([
    {
      plant_id: maizeN1.id, user_id: userId,
      content: 'Block N1 at VT stage (tasseling). Uniform stand across all 10 rows. Yield forecast: 8.2 t/ha.',
    },
    {
      plant_id: maizeS3.id, user_id: userId,
      content: 'Block S3: irregular pale streaks on leaves of rows 4–7. Scouting suggests Fall Armyworm larvae. Escalating to AgriOps team.',
      photo_url: bizNotePhotoUrl,
    },
    {
      plant_id: sugarcane.id, user_id: userId,
      content: 'Ratoon crop recovering well post-cut. Brix at 18.4 — on track for Oct mill delivery.',
    },
  ]);

  // ── Scan + Treatment (maize S3 — armyworm) ───────────────────────────────
  console.log('  [Agribusiness] Adding scan + treatment...');
  const { data: maizeScan } = await supabase.from('scans').insert({
    plant_id: maizeS3.id, user_id: userId,
    image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop',
    diagnosis: 'Fall Armyworm (Spodoptera frugiperda)',
    confidence: 91.8,
    severity: 'High',
    symptoms: 'Window-pane feeding on leaves, ragged whorl damage, frass deposits in leaf axils, irregular elongated feeding galleries on upper leaves.',
  }).select().single();
  if (maizeScan) {
    await supabase.from('treatments').insert({
      scan_id: maizeScan.id, plant_id: maizeS3.id, user_id: userId,
      type: 'Fall Armyworm',
      organic_steps: [
        'Apply Bacillus thuringiensis (Bt) var. kurstaki at 1.5 L/ha early morning when larvae are active.',
        'Deploy pheromone traps (4 per ha) to monitor adult population pressure.',
        'Manual scouting every 3 days — remove larvae mechanically in accessible rows.',
      ],
      chemical_steps: [
        'Apply Lambda-cyhalothrin 5 EC at 200 mL/ha by motorised knapsack sprayer.',
        'Alternate with Chlorantraniliprole (Coragen) on second spray cycle to prevent resistance.',
      ],
      status: 'In Progress',
    });

    await supabase.from('expert_reviews').insert({
      scan_id: maizeScan.id, plant_id: maizeS3.id, user_id: userId,
      status: 'Pending',
    });
  }

  // ── Expenses (both farms) ─────────────────────────────────────────────────
  console.log('  [Agribusiness] Adding expenses & revenues...');
  await supabase.from('expenses').insert([
    {
      user_id: userId, farm_id: farmId1,
      category: 'Seed', type: 'Expense', amount: 42000.00,
      description: 'DK8031 certified hybrid seed — 150 kg bags × KES 280/kg (1,500 ha coverage)',
      occurred_on: daysAgo(90),
    },
    {
      user_id: userId, farm_id: farmId1,
      category: 'Fertilizer', type: 'Expense', amount: 185000.00,
      description: 'CAN + DAP basal dressing — 800 bags × KES 3,800 per 50 kg',
      occurred_on: daysAgo(82),
    },
    {
      user_id: userId, farm_id: farmId1,
      category: 'Pesticide', type: 'Expense', amount: 28000.00,
      description: 'Lambda-cyhalothrin + Bt biological — emergency FAW response (Block S3)',
      occurred_on: daysAgo(1),
    },
    {
      user_id: userId, farm_id: farmId1,
      category: 'Labor', type: 'Expense', amount: 320000.00,
      description: 'Seasonal labour — 80 workers × 90 days @ KES 600/day',
      occurred_on: daysAgo(30),
    },
    {
      user_id: userId, farm_id: farmId2,
      category: 'Water', type: 'Expense', amount: 64000.00,
      description: 'Drip irrigation operational cost — Q2 2026 (Kilifi estate)',
      occurred_on: daysAgo(15),
    },
    {
      user_id: userId, farm_id: farmId2,
      category: 'Equipment', type: 'Expense', amount: 75000.00,
      description: 'Replacement cane-cutter blades + workshop labour (3 harvesters)',
      occurred_on: daysAgo(25),
    },
    {
      user_id: userId, farm_id: farmId1,
      category: 'Other', type: 'Revenue', amount: 2100000.00,
      description: 'NCPB maize off-take contract — 2,100 t @ KES 4,000/bag (90 kg)',
      occurred_on: daysAgo(10),
    },
    {
      user_id: userId, farm_id: farmId2,
      category: 'Other', type: 'Revenue', amount: 680000.00,
      description: 'Mumias Sugar mill advance payment — 340 t sugarcane Q2',
      occurred_on: daysAgo(20),
    },
  ]);

  // ── Equipment ─────────────────────────────────────────────────────────────
  await supabase.from('equipment').insert([
    {
      user_id: userId, farm_id: farmId1,
      name: 'CLAAS Lexion 770 Combine Harvester',
      equipment_type: 'Harvester',
      status: 'Operational',
      purchase_date: '2019-06-10',
      notes: 'Major overhaul completed April 2026. Ready for maize harvest season.',
    },
    {
      user_id: userId, farm_id: farmId1,
      name: 'New Holland T7.270 4WD Tractor',
      equipment_type: 'Tractor',
      status: 'Operational',
      purchase_date: '2021-02-28',
      notes: 'Primary tillage unit. GPS RTK-assisted field guidance installed.',
    },
    {
      user_id: userId, farm_id: farmId2,
      name: 'Cane-Cutter CBH12 (Unit 2)',
      equipment_type: 'Harvester',
      status: 'Maintenance',
      purchase_date: '2020-11-15',
      notes: 'Blades replaced. Hydraulic leak in row-divider arm under investigation.',
    },
    {
      user_id: userId, farm_id: farmId1,
      name: 'Valley Center Pivot Irrigation',
      equipment_type: 'Irrigation',
      status: 'Operational',
      purchase_date: '2018-03-01',
      notes: '6-span pivot covering 300 ha in Block N. Automated scheduling via GSM module.',
    },
  ]);

  // ── Team members (across both farms) ─────────────────────────────────────
  console.log('  [Agribusiness] Adding team members...');
  await supabase.from('team_members').insert([
    { farm_id: farmId1, email: 'agriops.manager@agriscan-test.dev',  role: 'Manager' },
    { farm_id: farmId1, email: 'fieldtech.nakuru@agriscan-test.dev', role: 'Worker'  },
    { farm_id: farmId2, email: 'cane.manager@agriscan-test.dev',     role: 'Manager' },
    { farm_id: farmId2, email: 'fieldtech.kilifi@agriscan-test.dev', role: 'Worker'  },
  ]);

  // ── Farm tasks ─────────────────────────────────────────────────────────────
  await supabase.from('farm_tasks').insert([
    {
      user_id: userId, farm_id: farmId1,
      title: 'Emergency FAW spray — Block S3 rows 4–7',
      description: 'Apply Lambda-cyhalothrin 5 EC at 200 mL/ha. 4-person crew. PPE mandatory. Complete before 9 AM.',
      assignee_email: 'agriops.manager@agriscan-test.dev',
      due_date: daysAhead(1),
      status: 'Pending',
    },
    {
      user_id: userId, farm_id: farmId1,
      title: 'Q3 yield forecast update — all Nakuru blocks',
      description: 'Cob count and canopy sample across 5 sentinel rows per block. Submit Excel report by EOD.',
      assignee_email: 'fieldtech.nakuru@agriscan-test.dev',
      due_date: daysAhead(4),
      status: 'Pending',
    },
    {
      user_id: userId, farm_id: farmId2,
      title: 'Hydraulic inspection — Cane-Cutter Unit 2',
      description: 'Identify source of hydraulic leak in row-divider arm. Log findings. Escalate if >4 hours repair time.',
      assignee_email: 'cane.manager@agriscan-test.dev',
      due_date: daysAhead(2),
      status: 'In Progress',
    },
    {
      user_id: userId, farm_id: farmId1,
      title: 'April CLAAS Lexion 770 pre-season service',
      description: 'Full harvest readiness checklist — grain header, reel, separator, grain tank seals.',
      due_date: daysAgo(70),
      status: 'Completed',
    },
    {
      user_id: userId, farm_id: farmId2,
      title: 'Brix sampling — Kilifi Plot C2 ratoon',
      description: 'Take 20 stalk samples, run refractometer. Compare to last month (18.0). Log in crop tracker.',
      assignee_email: 'fieldtech.kilifi@agriscan-test.dev',
      due_date: daysAgo(3),
      status: 'Completed',
    },
  ]);

  // ── Care reminders ─────────────────────────────────────────────────────────
  await supabase.from('care_reminders').insert([
    {
      plant_id: maizeN1.id, user_id: userId,
      reminder_type: 'Pest Check',
      due_date: daysAhead(2),
      recurring_days: 3,
      notes: 'Scout N1 for FAW spread from adjacent S3 block — 5 rows per scout path.',
      completed: false,
    },
    {
      plant_id: maizeS3.id, user_id: userId,
      reminder_type: 'Custom',
      due_date: daysAgo(1),
      notes: 'Second FAW spray follow-up — check residual larvae post-Lambda-cyhalothrin application.',
      completed: false,
    },
    {
      plant_id: sugarcane.id, user_id: userId,
      reminder_type: 'Fertilizing',
      due_date: daysAhead(10),
      recurring_days: 60,
      notes: 'Ratoon top-dressing: 150 kg/ha CAN split-applied. Coordinate with drip fertigation.',
      completed: false,
    },
  ]);

  // ── Notifications ─────────────────────────────────────────────────────────
  await supabase.from('notifications').insert([
    {
      user_id: userId,
      title: 'High-Priority Scan — Fall Armyworm Confirmed',
      message: 'Block S3 maize scan returned 91.8% confidence Fall Armyworm detection. Emergency treatment plan created.',
      category: 'Scan', read: false,
    },
    {
      user_id: userId,
      title: 'Revenue Posted — NCPB Maize Contract',
      message: 'KES 2,100,000 logged for Q3 NCPB maize off-take. Balance due at final grain delivery.',
      category: 'System', read: true,
    },
    {
      user_id: userId,
      title: 'Equipment Alert — Cane-Cutter Unit 2',
      message: 'Hydraulic leak reported on Cane-Cutter CBH12. Equipment flagged as Maintenance. Investigation in progress.',
      category: 'Alert', read: false,
    },
    {
      user_id: userId,
      title: 'Market Price Update — Maize & Sugarcane',
      message: 'New market reference prices recorded. Check the Market Prices dashboard for current benchmarks.',
      category: 'System', read: false,
    },
  ]);

  // ── Forum posts ────────────────────────────────────────────────────────────
  const { data: bizPost } = await supabase.from('forum_posts').insert({
    title: 'Managing Fall Armyworm at scale in East Africa — what works?',
    content: "We've got a confirmed FAW outbreak on 150+ ha of maize in Nakuru. Bt + Lambda-cyhalothrin rotation is our current protocol but we're dealing with drone spray availability issues this season. Has anyone had success with aerial ULV application in Kenya? What rates are you using and what service providers are you working with?",
    user_id: userId, author_name: userName, category: 'Farming Tech',
  }).select().single();

  if (bizPost) {
    await supabase.from('forum_posts').insert({
      title: 'Sugarcane Brix targets for Mumias Sugar mill delivery',
      content: "What Brix do you need to hit for premium pricing at Mumias mill? We're averaging 18.4 on our ratoon crop and the estate contract states 17.5 as the minimum — curious whether going above 19 actually triggers a price premium or just better acceptance rates.",
      user_id: userId, author_name: userName, category: 'General',
    });
  }

  // ── Organization (links Maize commercial division + Eldoret nursery) ────────
  console.log('  [Agribusiness] Adding organization, org members, API key, audit reports...');
  const { data: org, error: orgErr } = await supabase.from('organizations').insert({
    owner_user_id: userId,
    name: 'Okafor AgriHoldings',
  }).select().single();

  if (orgErr) {
    console.error('  Organization error:', orgErr.message);
  } else {
    const orgId = org.id;

    await supabase.from('organization_farms').insert([
      { org_id: orgId, farm_id: farmId1 }, // Rift Valley Maize Division — Commercial Farm
      { org_id: orgId, farm_id: farmId3 }, // Okafor Seedling Nursery — Nursery
    ]);

    await supabase.from('org_members').insert([
      { org_id: orgId, email: 'agriops.manager@agriscan-test.dev', role: 'Admin' },
      { org_id: orgId, email: 'analyst.nairobi@agriscan-test.dev', role: 'Analyst' },
      { org_id: orgId, email: 'viewer.investor@agriscan-test.dev', role: 'Viewer' },
    ]);

    // API key — store only the hash, matching how the real API key creation
    // endpoint works (plaintext secret is shown once, never persisted).
    const apiSecret = `agai_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
    const { data: apiKey, error: apiKeyErr } = await supabase.from('api_keys').insert({
      user_id: userId,
      label: 'Production Integration',
      key_prefix: apiSecret.slice(0, 12),
      key_hash: apiKeyHash,
      status: 'Active',
    }).select().single();

    if (apiKeyErr) {
      console.error('  API key error:', apiKeyErr.message);
    } else {
      const endpoints = ['/api/v1/farms', '/api/v1/scans', '/api/v1/plants', '/api/v1/analytics', '/api/v1/expenses'];
      const statusCodes = [200, 200, 200, 201, 404];
      const usageLogs = Array.from({ length: 26 }, (_, i) => ({
        api_key_id: apiKey.id,
        endpoint: endpoints[i % endpoints.length],
        status_code: statusCodes[i % statusCodes.length],
        requested_at: new Date(Date.now() - i * 13 * 60 * 60 * 1000).toISOString(),
      }));
      await supabase.from('api_usage_logs').insert(usageLogs);
    }

    await supabase.from('audit_reports').insert([
      {
        user_id: userId, farm_id: farmId1,
        title: 'Q3 Phytosanitary Compliance — Rift Valley Maize Division',
        summary: 'Fall Armyworm outbreak response protocol, chemical application logs, and PPE compliance records for Block S3 emergency treatment.',
        status: 'Final',
      },
      {
        user_id: userId, farm_id: farmId3,
        title: 'Nursery Stock Health Audit — Eldoret',
        summary: 'Draft audit covering propagation records and disease-screening history ahead of Q4 export certification.',
        status: 'Draft',
      },
    ]);
  }

  console.log('  ✅ Agribusiness seeding complete.');
}

// ─── Cross-account forum interactions ─────────────────────────────────────────
async function seedCrossAccountInteractions(users) {
  console.log('\n  [Cross-Account] Adding cross-user forum comments...');
  const { data: allPosts } = await supabase.from('forum_posts').select('id, title, user_id');
  if (!allPosts || allPosts.length === 0) return;

  // Farmer (carlos) comments on Gardener's rose post
  const rosePost = allPosts.find(p => p.title.includes('organic fix for powdery mildew'));
  const farmerUser = users.find(u => u.role === 'Farmer');
  if (rosePost && farmerUser) {
    await supabase.from('forum_comments').insert({
      post_id: rosePost.id,
      content: "On commercial scale we rotate Trifloxystrobin and Myclobutanil every 14 days. For a home garden baking soda every 5 days is solid — just make sure to reapply after any rain!",
      user_id: farmerUser.userId, author_name: farmerUser.name,
    });
  }

  // Agribusiness (samuel) comments on Farmer's late blight post
  const blightPost = allPosts.find(p => p.title.includes('Late blight outbreak'));
  const bizUser = users.find(u => u.role === 'Agribusiness');
  if (blightPost && bizUser) {
    await supabase.from('forum_comments').insert({
      post_id: blightPost.id,
      content: "We see the same pattern in highland Kenya when cold fronts bring prolonged leaf wetness. Our protocol: Mancozeb as protectant before fog season, then systemic Metalaxyl if symptoms appear. The marine layer timing you describe matches very well.",
      user_id: bizUser.userId, author_name: bizUser.name,
    });
  }

  // Nursery (mei) comments on Agribusiness FAW post
  const fawPost = allPosts.find(p => p.title.includes('Fall Armyworm'));
  const nursUser = users.find(u => u.role === 'Nursery');
  if (fawPost && nursUser) {
    await supabase.from('forum_comments').insert({
      post_id: fawPost.id,
      content: "Not at your scale, but we've used pheromone traps for FAW monitoring effectively even in small propagation blocks. The trap catch data really helps time Bt applications before instar 3. Good luck with the aerial ULV application!",
      user_id: nursUser.userId, author_name: nursUser.name,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      AgriScan AI — Full Test Account Seeder v2.0        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Clean any previous test accounts with these emails
  const emails = TEST_ACCOUNTS.map(a => a.email);
  console.log('Step 1/3: Cleaning existing test accounts...');
  await cleanExistingTestAccounts(emails);

  // 2. Create auth users and seed data
  console.log('\nStep 2/3: Creating auth users and seeding data...');
  const seededUsers = [];

  for (const account of TEST_ACCOUNTS) {
    console.log(`\n──────────────────────────────────────`);
    console.log(`Role: ${account.role} | Email: ${account.email}`);
    console.log(`──────────────────────────────────────`);

    let userId;
    try {
      userId = await createAuthUser(account);
      console.log(`  ✔ Auth user created — UUID: ${userId}`);
    } catch (err) {
      console.error(`  ✗ Failed to create auth user: ${err.message}`);
      continue;
    }

    // Update extra profile fields (trigger already created the row)
    await updateProfile(userId, {
      location: account.location,
      units: account.units,
      plan: account.plan,
    });
    console.log(`  ✔ Profile updated (location, units, plan)`);

    seededUsers.push({ ...account, userId });

    // Role-specific seeding
    switch (account.role) {
      case 'Gardener':
        await seedGardener(userId, account.email, account.name);
        break;
      case 'Farmer':
        await seedFarmer(userId, account.email, account.name);
        break;
      case 'Nursery':
        await seedNursery(userId, account.email, account.name);
        break;
      case 'Agribusiness':
        await seedAgribusiness(userId, account.email, account.name);
        break;
    }
  }

  // 3. Cross-account forum interactions
  console.log('\nStep 3/3: Seeding cross-account forum interactions...');
  await seedCrossAccountInteractions(seededUsers);

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                SEEDING COMPLETE — CREDENTIALS           ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  for (const u of seededUsers) {
    console.log(`║  Role: ${u.role.padEnd(14)} ${u.email}`);
    console.log(`║                         Password: ${u.password}`);
    console.log('║  ─────────────────────────────────────────────────────');
  }
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
