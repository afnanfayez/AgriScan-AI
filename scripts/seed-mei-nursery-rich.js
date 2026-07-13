'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TARGET_EMAIL = 'mei.nursery@agriscan-test.dev';
const TARGET_PASSWORD = 'NurseryPass#2026';

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env file.');
  process.exit(1);
}

const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (!match) return;
  let value = (match[2] || '').trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  env[match[1]] = value;
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date();
function daysAgo(days) {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysAhead(days) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDaysAgo(days) {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

async function findOrCreateUser() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const existing = (listData.users || []).find((user) => user.email === TARGET_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: 'Mei Tanaka',
      account_type: 'Nursery',
      avatar_url: 'https://i.pravatar.cc/150?u=mei',
    },
  });

  if (error || !data.user) throw new Error(error?.message || 'Failed to create Mei nursery user.');
  return data.user.id;
}

async function resetNurseryData(userId) {
  const { data: orderRows } = await supabase.from('orders').select('id').eq('user_id', userId);
  const orderIds = (orderRows || []).map((order) => order.id);
  if (orderIds.length > 0) {
    await supabase.from('order_items').delete().in('order_id', orderIds);
    await supabase.from('orders').delete().in('id', orderIds);
  }

  await supabase.from('batch_scans').delete().eq('user_id', userId);
  await supabase.from('inventory_batches').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('farms').delete().eq('user_id', userId);
}

function scanResult(imageUrl, diagnosis, severity, confidence, symptoms, likelyCause, affectedAreaPercent, treatmentPriority) {
  return {
    imageUrl,
    diagnosis,
    confidence,
    severity,
    symptoms,
    visibleOrgans: ['leaf', 'canopy'],
    likelyCause,
    affectedAreaPercent,
    scoutingNotes: 'Inspect adjacent trays, irrigation splash patterns, and lower canopy leaves before release.',
    recommendedAction: severity === 'High'
      ? 'Isolate affected trays, remove symptomatic stock, and repeat screening after treatment.'
      : 'Continue bench-level monitoring and keep this batch in the normal scouting rotation.',
    treatmentPriority,
  };
}

async function main() {
  console.log(`Seeding rich nursery demo data for ${TARGET_EMAIL}...`);
  const userId = await findOrCreateUser();

  await supabase.from('profiles').update({
    name: 'Mei Tanaka',
    account_type: 'Nursery',
    location: 'Portland, OR',
    units: 'metric',
    plan: 'Pro',
    avatar_url: 'https://i.pravatar.cc/150?u=mei',
  }).eq('id', userId);

  await resetNurseryData(userId);

  const { data: site, error: siteError } = await supabase.from('farms').insert({
    user_id: userId,
    name: 'Willamette Propagation Nursery',
    zone_count: 7,
    location: 'Portland, OR',
    acreage: 12.5,
    crop_type: 'Nursery Stock, Herbs, Ornamentals',
    latitude: 45.5152,
    longitude: -122.6784,
  }).select().single();

  if (siteError || !site) throw new Error(siteError?.message || 'Failed to create nursery site.');

  const batchesInput = [
    ['Maple-Acer-0726', 'Japanese Maple', 420, 18.5, daysAgo(94), daysAhead(18), 'Growing', 80, 'A'],
    ['Lavender-L2-0726', 'English Lavender', 880, 4.75, daysAgo(58), daysAhead(12), 'Ready', 120, 'A'],
    ['Rose-RG-0726', 'Grafted Rose', 310, 12.25, daysAgo(82), daysAhead(24), 'Needs Treatment', 70, 'B'],
    ['Tomato-GH4-0726', 'Heirloom Tomato Starts', 1250, 2.9, daysAgo(35), daysAhead(7), 'Ready', 180, 'A'],
    ['Basil-B7-0726', 'Genovese Basil', 1640, 1.85, daysAgo(24), daysAhead(6), 'Growing', 220, 'B'],
    ['Hydrangea-H3-0726', 'Hydrangea', 265, 10.75, daysAgo(120), daysAhead(32), 'Growing', 45, 'B'],
    ['Fern-F1-0726', 'Boston Fern', 540, 6.4, daysAgo(70), daysAhead(14), 'Ready', 90, 'A'],
    ['Pepper-P2-0726', 'Sweet Pepper Starts', 930, 2.65, daysAgo(31), daysAhead(9), 'Ready', 150, 'A'],
    ['Cedar-C4-0726', 'Western Red Cedar Seedlings', 760, 5.5, daysAgo(160), daysAhead(46), 'Propagating', 120, null],
    ['Straw-S1-0726', 'Strawberry Plugs', 1120, 1.95, daysAgo(42), daysAhead(10), 'Growing', 180, 'B'],
    ['Salvia-SV-0726', 'Blue Salvia', 690, 3.25, daysAgo(51), daysAhead(11), 'Ready', 100, 'A'],
    ['Boxwood-BX-0726', 'Boxwood Liners', 380, 7.9, daysAgo(135), daysAhead(28), 'Needs Treatment', 55, 'C'],
  ].map(([batchName, plantType, quantity, unitPrice, propagationDate, readyDate, status, lowStockThreshold, grade]) => ({
    user_id: userId,
    farm_id: site.id,
    batch_name: batchName,
    plant_type: plantType,
    quantity,
    unit_price: unitPrice,
    propagation_date: propagationDate,
    ready_date: readyDate,
    status,
    low_stock_threshold: lowStockThreshold,
    grade,
  }));

  const { data: batches, error: batchError } = await supabase.from('inventory_batches').insert(batchesInput).select();
  if (batchError || !batches) throw new Error(batchError?.message || 'Failed to create batches.');

  const byName = new Map(batches.map((batch) => [batch.batch_name, batch]));
  const image = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&h=650&fit=crop';
  const scans = [
    {
      batch: 'Rose-RG-0726',
      days: 2,
      total: 8,
      healthy: 3,
      infection: 63,
      results: [
        scanResult(image, 'Powdery Mildew', 'High', 91, 'White powdery growth across young rose leaves with curling on new flush.', 'Disease', 38, 'Urgent'),
        scanResult(image, 'Powdery Mildew', 'Medium', 84, 'Early white colonies on lower leaves; nearby trays should be scouted.', 'Disease', 22, 'Treat Soon'),
        scanResult(image, 'Healthy', 'Low', 95, 'Clean leaf surface and uniform color in this control sample.', 'Healthy', 0, 'Monitor'),
      ],
    },
    {
      batch: 'Boxwood-BX-0726',
      days: 1,
      total: 6,
      healthy: 2,
      infection: 67,
      results: [
        scanResult(image, 'Boxwood Blight Suspected', 'High', 88, 'Dark leaf lesions and early defoliation on lower canopy liners.', 'Disease', 44, 'Urgent'),
        scanResult(image, 'Leaf Spot Complex', 'Medium', 78, 'Scattered tan lesions on mature leaves; confirm with follow-up inspection.', 'Disease', 24, 'Treat Soon'),
      ],
    },
    {
      batch: 'Lavender-L2-0726',
      days: 5,
      total: 10,
      healthy: 9,
      infection: 10,
      results: [
        scanResult(image, 'Healthy', 'Low', 97, 'Silver-green foliage is uniform with no visible fungal sporulation.', 'Healthy', 0, 'Monitor'),
        scanResult(image, 'Minor Water Stress', 'Low', 72, 'Small amount of tip curl on one sample, likely irrigation timing related.', 'Water/heat stress', 6, 'Monitor'),
      ],
    },
    {
      batch: 'Tomato-GH4-0726',
      days: 3,
      total: 12,
      healthy: 10,
      infection: 17,
      results: [
        scanResult(image, 'Healthy', 'Low', 94, 'Strong canopy color and clean leaf margins on most tomato starts.', 'Healthy', 0, 'Monitor'),
        scanResult(image, 'Early Leaf Spot', 'Medium', 76, 'Small necrotic flecks on lower leaves, isolated to a small tray group.', 'Disease', 12, 'Treat Soon'),
      ],
    },
    {
      batch: 'Basil-B7-0726',
      days: 4,
      total: 9,
      healthy: 7,
      infection: 22,
      results: [
        scanResult(image, 'Downy Mildew Watch', 'Medium', 81, 'Subtle yellowing between veins; underside inspection recommended.', 'Disease', 18, 'Treat Soon'),
        scanResult(image, 'Healthy', 'Low', 92, 'Several samples are clean and marketable.', 'Healthy', 0, 'Monitor'),
      ],
    },
  ];

  await supabase.from('batch_scans').insert(scans.map((scan) => ({
    user_id: userId,
    batch_id: byName.get(scan.batch).id,
    total_samples: scan.total,
    healthy_count: scan.healthy,
    infection_percentage: scan.infection,
    results: scan.results,
    created_at: isoDaysAgo(scan.days),
  })));

  const ordersInput = [
    {
      customer_name: 'Cascade Garden Center',
      customer_contact: 'orders@cascade-garden.example',
      status: 'Pending',
      dispatch_date: daysAhead(2),
      notes: 'Hold for morning pickup. Include QR certificate on each rack.',
      items: [
        ['Lavender-L2-0726', 180, 4.75],
        ['Salvia-SV-0726', 120, 3.25],
      ],
    },
    {
      customer_name: 'Greenline Landscapes',
      customer_contact: 'procurement@greenline.example',
      status: 'Fulfilled',
      dispatch_date: daysAgo(6),
      notes: 'Delivered with Grade A stock certificates.',
      items: [
        ['Japanese Maple', 45, 18.5],
        ['Boston Fern', 80, 6.4],
      ],
    },
    {
      customer_name: 'Northwest Farm Market',
      customer_contact: 'buyer@nwmarket.example',
      status: 'Pending',
      dispatch_date: daysAhead(1),
      notes: 'Tomato and pepper starts for weekend retail benches.',
      items: [
        ['Tomato-GH4-0726', 320, 2.9],
        ['Pepper-P2-0726', 260, 2.65],
      ],
    },
    {
      customer_name: 'Urban Roots Co-op',
      customer_contact: 'stock@urbanroots.example',
      status: 'Cancelled',
      dispatch_date: daysAgo(3),
      notes: 'Cancelled after customer reduced spring herb allocation.',
      items: [
        ['Basil-B7-0726', 150, 1.85],
      ],
    },
  ];

  for (const order of ordersInput) {
    const total = order.items.reduce((sum, [batchRef, qty, price]) => sum + qty * price, 0);
    const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
      user_id: userId,
      customer_name: order.customer_name,
      customer_contact: order.customer_contact,
      status: order.status,
      dispatch_date: order.dispatch_date,
      total_amount: total,
      notes: order.notes,
    }).select().single();

    if (orderError || !newOrder) throw new Error(orderError?.message || 'Failed to create order.');

    const items = order.items.map(([batchRef, quantity, unitPrice]) => {
      const batch = byName.get(batchRef) || batches.find((candidate) => candidate.plant_type === batchRef);
      return {
        order_id: newOrder.id,
        batch_id: batch.id,
        quantity,
        unit_price: unitPrice,
      };
    });
    await supabase.from('order_items').insert(items);
  }

  await supabase.from('notifications').insert([
    {
      user_id: userId,
      title: 'Rose batch needs treatment',
      message: 'Rose-RG-0726 returned 63% infection in the latest screening. Isolate affected trays before release.',
      category: 'Alert',
      read: false,
    },
    {
      user_id: userId,
      title: 'Certificates ready for pickup orders',
      message: 'Cascade Garden Center order includes QR certificate links for Lavender and Salvia batches.',
      category: 'System',
      read: false,
    },
    {
      user_id: userId,
      title: 'Low stock watch',
      message: 'Hydrangea-H3-0726 is nearing its low-stock threshold after pending allocations.',
      category: 'Alert',
      read: true,
    },
  ]);

  console.log('Done. Login credentials:');
  console.log(`  Email: ${TARGET_EMAIL}`);
  console.log(`  Password: ${TARGET_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
