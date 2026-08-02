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

async function testAlter() {
  console.log('Testing RPC or SQL execution to add columns to category_budgets...');

  // Try RPC exec_sql if available
  const { data: rpcData, error: rpcErr } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.category_budgets ADD COLUMN IF NOT EXISTS type text; ALTER TABLE public.category_budgets ADD COLUMN IF NOT EXISTS icon text; ALTER TABLE public.category_budgets ADD COLUMN IF NOT EXISTS note text;'
  });

  console.log('RPC exec_sql result:', rpcData, 'RPC Error:', rpcErr);
}

testAlter().catch(console.error);
