const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
  }
}

const supabase = createClient(url, key);

async function testUserUpsert() {
  console.log('--- Testing category_budgets schema and upsert constraints ---');
  
  // 1. Fetch table structure/columns
  const { data: rows, error: selectErr } = await supabase.from('category_budgets').select('*');
  console.log('Select rows count:', rows ? rows.length : 0, 'Select Error:', selectErr);
  if (rows && rows.length > 0) {
    console.log('Sample row structure:', Object.keys(rows[0]));
    console.log('Sample row sample:', rows[0]);
  }

  // 2. Test upserting a modified category
  const metaStr = JSON.stringify({ type: 'expense', kw: 'test_xang', icon: '🛵', note: 'Xăng đi lại' });
  const payload = {
    id: 'Xăng',
    user_id: rows && rows[0] ? rows[0].user_id : '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    teacher_name: 'Admin',
    category: 'Xăng',
    amount: 500000,
    keywords: metaStr,
    updated_at: new Date().toISOString()
  };

  const { data: upData, error: upErr } = await supabase.from('category_budgets').upsert([payload], { onConflict: 'id' }).select('*');
  console.log('\nUpsert result:', upData);
  console.log('Upsert Error:', upErr);
}

testUserUpsert().catch(console.error);
