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

const tables = [
  'bank_receipts',
  'category_budgets',
  'manual_transactions',
  'profiles',
  'receipt_rules',
  'savings_funds',
  'savings_history',
  'sessions',
  'teachers'
];

async function inspectColumns() {
  console.log('=== INSPECTING COLUMNS FOR ALL TABLES IN SUPABASE ===\n');

  for (const tbl of tables) {
    const { data, error } = await client.from(tbl).select('*').limit(1);
    if (error) {
      console.log(`Table [${tbl}]: Error -> ${error.message}`);
      continue;
    }
    const row = data && data[0] ? data[0] : null;
    const cols = row ? Object.keys(row) : 'No rows to infer columns';
    console.log(`Table [${tbl}]:`);
    console.log(`  Columns:`, cols);
    if (Array.isArray(cols)) {
      const hasTeacherName = cols.includes('teacher_name');
      const hasUserName = cols.includes('user_name');
      console.log(`  └─ teacher_name: ${hasTeacherName} | user_name: ${hasUserName}`);
    }
    console.log('');
  }
}

inspectColumns().catch(console.error);
