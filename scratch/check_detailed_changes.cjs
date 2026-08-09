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

async function getDetailedChanges() {
  const thirtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  console.log(`Checking changes since: ${thirtyMinsAgo}\n`);

  console.log('--- Bank Receipts (Last 60 mins) ---');
  const { data: receipts } = await client.from('bank_receipts').select('*').gte('created_at', thirtyMinsAgo);
  console.log(JSON.stringify(receipts, null, 2));

  console.log('\n--- Manual Transactions (Last 60 mins) ---');
  const { data: txs } = await client.from('manual_transactions').select('*').gte('created_at', thirtyMinsAgo);
  console.log(JSON.stringify(txs, null, 2));

  console.log('\n--- Receipt Rules (Last 60 mins) ---');
  const { data: rules } = await client.from('receipt_rules').select('*').gte('created_at', thirtyMinsAgo);
  console.log(JSON.stringify(rules, null, 2));

  console.log('\n--- Category Budgets / Settings (Last 60 mins) ---');
  const { data: budgets } = await client.from('category_budgets').select('*').gte('updated_at', thirtyMinsAgo);
  console.log(JSON.stringify(budgets, null, 2));
}

getDetailedChanges().catch(console.error);
