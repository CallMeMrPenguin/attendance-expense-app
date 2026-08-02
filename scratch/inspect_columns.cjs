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

async function inspectColumns() {
  const { data, error } = await supabase.from('category_budgets').select('*').limit(1);
  if (error) {
    console.error('Error selecting category_budgets:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in category_budgets:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  }
}

inspectColumns().catch(console.error);
