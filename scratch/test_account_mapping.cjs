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

async function testMapping() {
  console.log('--- TESTING SENDER NAME ACCOUNT MAPPINGS ---\n');

  // Verify Trang's account balance setting in category_budgets
  const { data: bData } = await client
    .from('category_budgets')
    .select('*')
    .eq('category', '__TRANG_ACCOUNT_BALANCE__');

  console.log('Trang Account Balance Setting in DB:', bData);

  // Inspect recent bank receipts for debit_account / sender_name
  const { data: recs } = await client.from('bank_receipts').select('*').limit(10);
  console.log(`\nSample bank receipts count: ${recs ? recs.length : 0}`);
  (recs || []).forEach(r => {
    console.log(`Receipt ${r.id} | DebitAcc: ${r.debit_account} | Remitter: ${r.remitter_name} | Sender: ${r.sender_name || r.remitter_name}`);
  });
}

testMapping().catch(console.error);
