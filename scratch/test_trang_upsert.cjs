const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';
let serviceKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = trimmed.split('=')[1].trim();
  }
}

const client = createClient(url, serviceKey || key);

async function testTrangUpsert() {
  console.log('--- TESTING TRANG ACCOUNT BALANCE UPSERT WITH ONCONFLICT ID ---');

  const payload = {
    id: 'trang_account_balance',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    user_name: 'ADMIN',
    category: '__TRANG_ACCOUNT_BALANCE__',
    amount: 7500000,
    type: 'settings',
    icon: 'Wallet',
    note: JSON.stringify({ initial_balance: 7500000 }),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client.from('category_budgets').upsert(payload, { onConflict: 'id' });
  console.log('Upsert result:', { error });

  const { data: bData } = await client
    .from('category_budgets')
    .select('*')
    .eq('category', '__TRANG_ACCOUNT_BALANCE__');

  console.log('Fetched record in DB after upsert:', bData);
}

testTrangUpsert().catch(console.error);
