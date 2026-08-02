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

async function inspectReceipts() {
  const { data: receipts, error } = await supabase.from('bank_receipts').select('*').limit(10);
  if (error) {
    console.error('Error fetching receipts:', error);
    return;
  }
  console.log('Sample Receipts from DB:');
  console.log(JSON.stringify(receipts, null, 2));

  const { data: budgets } = await supabase.from('category_budgets').select('*');
  console.log('\nCategory Budgets from DB:');
  console.log(JSON.stringify(budgets, null, 2));
}

inspectReceipts().catch(console.error);
