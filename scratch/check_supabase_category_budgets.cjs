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

async function inspectCategoryBudgets() {
  console.log('=== Live Supabase category_budgets table inspection ===\n');
  const { data: budgets, error } = await supabase.from('category_budgets').select('*');
  if (error) {
    console.error('Error fetching category_budgets:', error);
    return;
  }
  
  budgets.forEach(b => {
    console.log(`Category: "${b.category}" | Amount: ${b.amount} | Raw keywords column payload:`);
    console.log(`  └─ ${b.keywords}`);
    try {
      const parsed = JSON.parse(b.keywords);
      console.log(`  └─ Parsed Metadata: type=${parsed.type || 'N/A'}, icon=${parsed.icon || 'N/A'}, note=${parsed.note || 'N/A'}, kw=${parsed.kw || 'N/A'}`);
    } catch (e) {
      console.log(`  └─ Plain text (unparsed)`);
    }
    console.log('---');
  });
}

inspectCategoryBudgets().catch(console.error);
