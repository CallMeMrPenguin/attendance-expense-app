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

async function testSaveBudgets() {
  console.log('Testing category_budgets upsert to Supabase...');

  const metaStr = JSON.stringify({ type: 'expense', kw: 'xang, cay xang', icon: '⚡', note: 'Xăng xe' });
  const record = {
    id: 'Xăng',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    teacher_name: 'ADMIN',
    category: 'Xăng',
    amount: 500000,
    keywords: metaStr,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('category_budgets').upsert([record], { onConflict: 'id' }).select('*');
  if (error) {
    console.error('❌ Supabase category_budgets upsert ERROR:', error);
  } else {
    console.log('✅ Supabase category_budgets upsert SUCCESS:', data);
  }
}

testSaveBudgets().catch(console.error);
