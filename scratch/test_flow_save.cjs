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

async function testFullSaveCycle() {
  console.log('--- Testing Full Save & Read Cycle ---');

  const userId = '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
  const newCatName = 'Ăn Trưa';
  const icon = '🍔';
  const note = 'Cơm trưa văn phòng';
  const kw = 'com trua, pho, bun cha';
  const type = 'expense';
  const amount = 3000000;

  const metaStr = JSON.stringify({ type, kw, icon, note });

  const record = {
    id: newCatName,
    user_id: userId,
    teacher_name: 'Admin',
    category: newCatName,
    amount: amount,
    keywords: metaStr,
    updated_at: new Date().toISOString()
  };

  console.log('1. Upserting custom category:', record);
  const { data: upsertData, error: upsertErr } = await supabase.from('category_budgets').upsert([record], { onConflict: 'id' }).select('*');
  if (upsertErr) {
    console.error('Upsert Error:', upsertErr);
    return;
  }
  console.log('Upsert result:', upsertData);

  console.log('\n2. Querying all category_budgets from Supabase...');
  const { data: fetchBudgets, error: fetchErr } = await supabase.from('category_budgets').select('*');
  if (fetchErr) {
    console.error('Fetch Error:', fetchErr);
    return;
  }

  fetchBudgets.forEach(b => {
    console.log(`- "${b.category}": amount=${b.amount}, raw keywords payload: ${b.keywords}`);
  });
}

testFullSaveCycle().catch(console.error);
