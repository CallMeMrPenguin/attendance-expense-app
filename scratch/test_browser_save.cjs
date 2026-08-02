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

async function testBrowserSaveLogic() {
  console.log('--- Simulating Exact saveBudgets Function ---');

  const userId = '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
  const budgets = {
    'Lương': 15000000,
    'Giáo dục': 10000000,
    'Đầu tư': 5000000,
    'Ăn uống': 4000000,
    'Xăng': 500000,
    'Đi Chợ': 1500000
  };

  const keywords = {
    'Ăn uống': 'an uong, food, cafe, coffee, tra sua',
    'Xăng': 'xang, cay xang, petrolimex, 95'
  };

  const catTypes = {
    'Lương': 'income',
    'Giáo dục': 'income',
    'Đầu tư': 'income',
    'Ăn uống': 'expense',
    'Xăng': 'expense',
    'Đi Chợ': 'expense'
  };

  const catIcons = {
    'Ăn uống': '🍕',
    'Xăng': '🛵',
    'Đi Chợ': '🛒'
  };

  const catNotes = {
    'Ăn uống': 'Cơm, phở, bún, trà sữa',
    'Xăng': 'Đổ xăng xe máy'
  };

  const validKeys = new Set(Object.keys(budgets));
  
  // Fetch existing IDs
  const { data: existing, error: existErr } = await supabase.from('category_budgets').select('id');
  if (existErr) {
    console.error('Error fetching existing:', existErr);
    return;
  }
  
  const existingIds = existing.map(e => e.id);
  const idsToDelete = existingIds.filter(id => !validKeys.has(id));
  console.log('IDs to delete:', idsToDelete);
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase.from('category_budgets').delete().in('id', idsToDelete);
    console.log('Delete result error:', delErr);
  }

  const records = Object.keys(budgets).map(cat => {
    const type = catTypes[cat] || 'expense';
    const kw = keywords[cat] || '';
    const icon = catIcons[cat] || 'Coins';
    const note = catNotes[cat] || '';
    const metaStr = JSON.stringify({ type, kw, icon, note });
    return {
      id: cat,
      user_id: userId,
      teacher_name: 'Admin',
      category: cat,
      amount: Number(budgets[cat]) || 0,
      keywords: metaStr,
      updated_at: new Date().toISOString()
    };
  });

  console.log('Records to upsert:', JSON.stringify(records, null, 2));

  const { data: upsertData, error: upsertErr } = await supabase.from('category_budgets').upsert(records, { onConflict: 'id' }).select('*');
  if (upsertErr) {
    console.error('❌ UPSERT ERROR:', upsertErr);
  } else {
    console.log('✅ UPSERT SUCCESS! Rows returned:', upsertData.length);
  }

  console.log('\nReading back from DB:');
  const { data: reRead } = await supabase.from('category_budgets').select('*');
  reRead.forEach(r => {
    console.log(`"${r.category}": amount=${r.amount}, keywords=${r.keywords}`);
  });
}

testBrowserSaveLogic().catch(console.error);
