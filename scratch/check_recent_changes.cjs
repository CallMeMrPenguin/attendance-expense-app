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

async function checkRecentChanges() {
  console.log('Fetching recent Supabase database changes across tables...\n');
  const now = new Date();
  console.log(`Current Time (UTC): ${now.toISOString()}`);
  
  const tables = [
    'profiles',
    'teachers',
    'sessions',
    'manual_transactions',
    'savings_funds',
    'category_budgets',
    'savings_history',
    'bank_receipts',
    'receipt_rules',
    'user_table_settings'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await client.from(table).select('*').limit(20);
      if (error) {
        console.log(`Table [${table}]: Error fetching - ${error.message}`);
        continue;
      }
      if (!data || data.length === 0) {
        console.log(`Table [${table}]: 0 rows`);
        continue;
      }

      console.log(`\n=== Table [${table}] (${data.length} sample rows) ===`);
      // Find rows with timestamps if available
      const timeFields = ['updated_at', 'created_at', 'date', 'trans_date'];
      const fieldWithTime = timeFields.find(f => data[0] && f in data[0]);

      let sorted = data;
      if (fieldWithTime) {
        sorted = [...data].sort((a, b) => String(b[fieldWithTime] || '').localeCompare(String(a[fieldWithTime] || '')));
      }

      console.log(`Top 5 most recent entries (sorted by ${fieldWithTime || 'primary key'}):`);
      sorted.slice(0, 5).forEach((row, i) => {
        const timeVal = fieldWithTime ? row[fieldWithTime] : 'N/A';
        const desc = row.desc_text || row.details || row.name || row.category || row.match_value || row.id;
        console.log(`  ${i+1}. ID: ${row.id} | Time: ${timeVal} | ${JSON.stringify(row).substring(0, 150)}...`);
      });
    } catch (e) {
      console.error(`Error inspecting ${table}:`, e.message);
    }
  }
}

checkRecentChanges().catch(console.error);
