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
  'profiles',
  'sessions',
  'manual_transactions',
  'savings_funds',
  'savings_history',
  'category_budgets'
];

async function migrateTeacherNameToUserName() {
  console.log('=== MIGRATING DB TABLES: teacher_name -> user_name ===\n');

  for (const tbl of tables) {
    try {
      const { data, error } = await client.from(tbl).select('*');
      if (error) {
        console.error(`Error querying table ${tbl}:`, error.message);
        continue;
      }

      console.log(`Table [${tbl}]: Total rows = ${data ? data.length : 0}`);
      if (!data || data.length === 0) continue;

      let updatedCount = 0;
      for (const row of data) {
        const uName = row.user_name || row.teacher_name || 'Admin';
        const { error: upErr } = await client
          .from(tbl)
          .update({ user_name: uName, teacher_name: uName })
          .eq('id', row.id);

        if (!upErr) updatedCount++;
      }
      console.log(`  └─ Updated ${updatedCount} rows in [${tbl}] with user_name & teacher_name.\n`);
    } catch (e) {
      console.error(`Failed migration on ${tbl}:`, e.message);
    }
  }

  console.log('=== DB MIGRATION FINISHED ===');
}

migrateTeacherNameToUserName().catch(console.error);
