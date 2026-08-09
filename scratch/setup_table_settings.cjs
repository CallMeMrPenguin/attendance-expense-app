const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function setupTableSettings() {
  console.log('--- SETTING UP TABLE_SETTINGS IN SUPABASE ---');

  // Check if table_settings table already exists or can be queried
  const { data, error } = await client.from('table_settings').select('*').limit(1);

  if (error && error.code === '42P01') {
    console.log('table_settings table does not exist in Postgres DB yet.');
    console.log('Provide SQL DDL to create table_settings in Supabase SQL Editor.');
  } else if (!error) {
    console.log('✅ table_settings table exists in Supabase DB! Current row count:', data ? data.length : 0);
  } else {
    console.log('table_settings check result:', { error });
  }

  // Check category_budgets for existing __TABLE_SETTINGS_... entries to migrate
  const { data: legacy } = await client
    .from('category_budgets')
    .select('*')
    .like('category', '__TABLE_SETTINGS_%');

  console.log(`Found ${legacy ? legacy.length : 0} legacy table setting rows in category_budgets.`);
}

setupTableSettings().catch(console.error);
