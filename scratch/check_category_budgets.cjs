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

async function testFullSaveAndFetchCycle() {
  console.log('--- Testing Full Category Keywords Persistence Cycle ---');

  const categoriesToSave = [
    { cat: 'Ăn uống', amount: 4000000, type: 'expense', icon: 'Utensils', note: 'Ăn hàng, siêu thị', kw: 'an uong, bún bò, phở gà, matcha' },
    { cat: 'Shopping', amount: 2000000, type: 'expense', icon: 'ShoppingBag', note: 'Mua quần áo', kw: 'shopee, lazada, uniqlo, zara' }
  ];

  const records = categoriesToSave.map(c => ({
    id: c.cat,
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    teacher_name: 'ADMIN',
    category: c.cat,
    amount: c.amount,
    type: c.type,
    icon: c.icon,
    note: JSON.stringify({ text: c.note, kw: c.kw }),
    keywords: c.kw,
    updated_at: new Date().toISOString()
  }));

  let { error } = await supabase.from('category_budgets').upsert(records, { onConflict: 'id' });
  if (error && error.code === 'PGRST204') {
    const cleanRecords = records.map(({ keywords, ...rest }) => rest);
    const { error: retryErr } = await supabase.from('category_budgets').upsert(cleanRecords, { onConflict: 'id' });
    error = retryErr;
  }

  if (error) {
    console.error('Save failed:', error);
    return;
  }
  console.log('Saved successfully!');

  // Now simulate page reload fetch
  const { data, error: fetchErr } = await supabase.from('category_budgets').select('id, user_id, teacher_name, category, amount, note, updated_at');
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  const kMap = {};
  data.forEach((b) => {
    let kw = '';
    if (b.note && typeof b.note === 'string' && b.note.startsWith('{')) {
      try {
        const parsed = JSON.parse(b.note);
        if (parsed.kw !== undefined && parsed.kw !== null) kw = parsed.kw;
      } catch (e) {}
    }
    kMap[b.category] = kw;
  });

  console.log('Fetched Keywords Map from DB:');
  console.log(JSON.stringify(kMap, null, 2));

  // Verify
  if (kMap['Ăn uống'] === 'an uong, bún bò, phở gà, matcha' && kMap['Shopping'] === 'shopee, lazada, uniqlo, zara') {
    console.log('✅ TEST PASSED: Keywords persisted and retrieved accurately across page reloads!');
  } else {
    console.error('❌ TEST FAILED: Keywords mismatch!');
  }
}

testFullSaveAndFetchCycle();
