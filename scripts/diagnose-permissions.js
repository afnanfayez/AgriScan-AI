const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?/);
  if (!m) return;
  let v = (m[2] || '').trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function diagnose() {
  // Check table grants - can service_role read?
  const r1 = await supabase.from('profiles').select('id').limit(1);
  console.log('profiles SELECT:', r1.error ? 'ERROR: ' + r1.error.message : 'OK rows=' + (r1.data?.length || 0));

  const r2 = await supabase.from('farms').select('id').limit(1);
  console.log('farms SELECT:', r2.error ? 'ERROR: ' + r2.error.message : 'OK rows=' + (r2.data?.length || 0));

  // Try to insert into farms using a known user ID (check auth.users first)
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 10 });
  if (usersError) { console.log('listUsers error:', usersError.message); return; }
  
  const testEmail = 'layla.gardener@agriscan-test.dev';
  const testUser = users.users.find(u => u.email === testEmail);
  if (!testUser) { console.log('Test user not found — may have been deleted'); return; }
  
  console.log('Test user found:', testUser.id);
  
  // Check profile exists
  const r3 = await supabase.from('profiles').select('*').eq('id', testUser.id);
  console.log('profile for user:', r3.error ? 'ERROR: ' + r3.error.message : JSON.stringify(r3.data));
  
  // Try farm insert
  const r4 = await supabase.from('farms').insert({
    name: 'Test Farm Diagnostic',
    user_id: testUser.id,
    zone_count: 1,
  }).select().single();
  console.log('farm insert test:', r4.error ? 'ERROR: ' + r4.error.message + ' code=' + r4.error.code : 'OK id=' + r4.data?.id);
  
  // If insert worked, clean up
  if (r4.data?.id) {
    await supabase.from('farms').delete().eq('id', r4.data.id);
    console.log('Cleanup: test farm deleted');
  }
}

diagnose().catch(console.error);
