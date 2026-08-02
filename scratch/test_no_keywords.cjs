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

async function testNoKeywords() {
  console.log('--- Testing Upsert without keywords column ---');
  const { data: rows } = await supabase.from('category_budgets').select('*');
  console.log('Current rows count:', rows ? rows.length : 0);

  const testRecord = {
    id: 'Ăn uống',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    teacher_name: 'Admin',
    category: 'Ăn uống',
    amount: 4000000,
    type: 'expense',
    icon: 'Utensils',
    note: 'Nhà hàng, siêu thị, thực phẩm',
    updated_at: new Date().toISOString()
  };

  const { data: upData, error: upErr } = await supabase.from('category_budgets').upsert([testRecord], { onConflict: 'id' }).select('*');
  if (upErr) {
    console.error('Upsert error without keywords:', upErr);
  } else {
    console.log('✅ UPSERT WITHOUT KEYWORDS SUCCESSFUL!', upData);
  }
}

testNoKeywords().catch(console.error);
