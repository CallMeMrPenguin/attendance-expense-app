const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function testSaveBudgets() {
  console.log('--- TESTING CLEAN CATEGORY_BUDGETS UPSERT ---');

  const records = [{
    id: 'Test Category',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    user_name: 'Admin',
    category: 'Test Category',
    amount: 100000,
    type: 'income',
    icon: 'Coins',
    note: JSON.stringify({ text: 'Test', kw: 'test' }),
    updated_at: new Date().toISOString()
  }];

  const { error } = await client.from('category_budgets').upsert(records, { onConflict: 'id' });
  console.log('Clean upsert result:', { error });

  // Verify fetch
  const { data } = await client.from('category_budgets').select('*').eq('id', 'Test Category');
  console.log('Fetched record in DB:', data);

  // Clean up test category
  await client.from('category_budgets').delete().eq('id', 'Test Category');
}

testSaveBudgets().catch(console.error);
