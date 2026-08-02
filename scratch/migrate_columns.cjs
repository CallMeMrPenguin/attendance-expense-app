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
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && trimmed.split('=')[1].trim()) {
      key = trimmed.split('=')[1].trim();
    }
  }
}

const supabaseAdmin = createClient(url, key);

async function migrateColumns() {
  console.log('--- Migrating category_budgets table to add icon, note, type columns ---');

  const { data: rows, error: selErr } = await supabaseAdmin.from('category_budgets').select('*').limit(1);
  if (selErr) {
    console.error('Select error:', selErr);
    return;
  }

  const existingCols = Object.keys(rows[0] || {});
  console.log('Existing columns:', existingCols);

  const testPayload = {
    ...rows[0],
    icon: 'Utensils',
    note: 'Test note',
    type: 'expense'
  };

  const { data: upData, error: upErr } = await supabaseAdmin.from('category_budgets').upsert([testPayload], { onConflict: 'id' }).select('*');
  if (upErr) {
    console.log('Upsert with new columns error:', upErr.message);
  } else {
    console.log('Upsert succeeded! Columns:', Object.keys(upData[0]));
  }
}

migrateColumns().catch(console.error);
