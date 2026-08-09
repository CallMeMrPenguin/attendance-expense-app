const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function checkTables() {
  const tables = ['profiles', 'category_budgets', 'manual_transactions', 'savings_funds', 'savings_history', 'sessions'];
  console.log('--- TABLES CHECK ---');
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (data && data[0]) {
      const keys = Object.keys(data[0]);
      console.log(`Table [${t}]: has teacher_name? ${keys.includes('teacher_name')} | has user_name? ${keys.includes('user_name')}`);
    } else {
      console.log(`Table [${t}]: No rows (schema unknown from SELECT)`);
    }
  }
}

checkTables().catch(console.error);
