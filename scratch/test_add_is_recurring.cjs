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

const clientKey = serviceKey || key;
const supabase = createClient(url, clientKey);

async function test() {
  console.log('Using key type:', serviceKey ? 'SERVICE_ROLE' : 'ANON');
  
  // 1. Try to upsert a test row with is_recurring field
  const { data: selectData } = await supabase.from('manual_transactions').select('*').limit(1);
  if (selectData && selectData.length > 0) {
    const sample = selectData[0];
    console.log('Sample existing row keys:', Object.keys(sample));
    
    const payload = {
      ...sample,
      is_recurring: false
    };
    
    const { data: upData, error: upErr } = await supabase.from('manual_transactions').upsert([payload], { onConflict: 'id' }).select('*');
    if (upErr) {
      console.log('Upsert error with is_recurring:', upErr);
    } else {
      console.log('Upsert succeeded! Keys:', Object.keys(upData[0]));
    }
  }

  // 2. Try RPC exec_sql if available
  const { data: rpcData, error: rpcErr } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.manual_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;'
  });
  console.log('RPC exec_sql result:', rpcData, 'RPC Error:', rpcErr);
}

test();
