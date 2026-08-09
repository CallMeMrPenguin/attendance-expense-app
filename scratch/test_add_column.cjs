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

async function testAddColumn() {
  // Let's test calling pg_net / rpc / query or fetching raw column info
  const res = await fetch(`${url}/rest/v1/bank_receipts?select=sender_name&limit=1`, {
    headers: {
      'apikey': serviceKey || key,
      'Authorization': `Bearer ${serviceKey || key}`
    }
  });

  console.log('Status of select sender_name:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response body:', text);
}

testAddColumn().catch(console.error);
