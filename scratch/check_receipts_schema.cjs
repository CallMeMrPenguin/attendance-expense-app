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

async function inspectSchema() {
  console.log('--- Inspecting bank_receipts & receipt_rules ---');

  const { data: recs, error: recErr } = await client.from('bank_receipts').select('*').limit(3);
  if (recErr) console.error('Error fetching bank_receipts:', recErr);
  else {
    console.log('bank_receipts columns:', recs && recs[0] ? Object.keys(recs[0]) : 'no rows');
    if (recs && recs[0]) console.log('Sample row:', recs[0]);
  }

  const { data: rules, error: ruleErr } = await client.from('receipt_rules').select('*').limit(3);
  if (ruleErr) console.error('Error fetching receipt_rules:', ruleErr);
  else {
    console.log('\nreceipt_rules columns:', rules && rules[0] ? Object.keys(rules[0]) : 'no rows');
    if (rules && rules[0]) console.log('Sample row:', rules[0]);
  }
}

inspectSchema().catch(console.error);
