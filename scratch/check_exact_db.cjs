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

async function checkExactDb() {
  console.log('=== EXACT SUPABASE DATABASE CONTENTS ===');
  const { data: rows, error } = await supabase.from('category_budgets').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  console.log(`Found ${rows.length} rows in category_budgets:\n`);
  rows.forEach(r => {
    console.log(`Category: "${r.category}" (id: "${r.id}")`);
    console.log(`  Amount: ${r.amount}`);
    console.log(`  Raw keywords: ${JSON.stringify(r.keywords)}`);
    console.log(`  Typeof keywords: ${typeof r.keywords}`);
    console.log('---');
  });
}

checkExactDb().catch(console.error);
