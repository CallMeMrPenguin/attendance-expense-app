const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function testEndpoints() {
  const sql = `
    ALTER TABLE IF EXISTS category_budgets RENAME COLUMN teacher_name TO user_name;
    ALTER TABLE IF EXISTS manual_transactions RENAME COLUMN teacher_name TO user_name;
    ALTER TABLE IF EXISTS profiles RENAME COLUMN teacher_name TO user_name;
    ALTER TABLE IF EXISTS savings_funds RENAME COLUMN teacher_name TO user_name;
    ALTER TABLE IF EXISTS savings_history RENAME COLUMN teacher_name TO user_name;
    ALTER TABLE IF EXISTS sessions RENAME COLUMN teacher_name TO user_name;
  `;

  console.log('Testing SQL endpoints with anon key...');
  const endpoints = ['/rest/v1/rpc/sql', '/rest/v1/rpc/query', '/rest/v1/rpc/execute'];
  for (const ep of endpoints) {
    const res = await fetch(`${url}${ep}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ sql })
    });
    console.log(`${ep}: status = ${res.status}`);
  }
}

testEndpoints().catch(console.error);
