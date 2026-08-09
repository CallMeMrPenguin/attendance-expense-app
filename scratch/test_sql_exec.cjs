const fs = require('fs');
const path = require('path');

const url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
const anonKey = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

async function trySql() {
  const query = 'ALTER TABLE bank_receipts ADD COLUMN IF NOT EXISTS sender_name text;';
  
  // Try endpoint /rest/v1/rpc/exec_sql
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({ query })
  });

  console.log('exec_sql status:', res.status, await res.text());
}

trySql().catch(console.error);
