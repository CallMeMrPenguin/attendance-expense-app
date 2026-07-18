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

async function testDeletedFlag() {
  console.log('Testing column is_deleted_from_history in bank_receipts table...');
  const { data, error } = await supabase.from('bank_receipts').select('id, is_deleted_from_history').limit(1);
  if (error) {
    console.error('Column test error:', error.message);
  } else {
    console.log('✅ Column is_deleted_from_history exists! Sample data:', data);
  }
}

testDeletedFlag().catch(console.error);
