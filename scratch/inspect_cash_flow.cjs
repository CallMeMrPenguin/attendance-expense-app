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

async function inspect() {
  const { data, error } = await supabase.from('manual_transactions').select('*').limit(5);
  if (error) {
    console.error('Error fetching manual_transactions:', error);
  } else {
    console.log('Columns in manual_transactions:', data && data.length > 0 ? Object.keys(data[0]) : 'no rows');
    console.log('Sample row:', data[0]);
  }
}

inspect();
