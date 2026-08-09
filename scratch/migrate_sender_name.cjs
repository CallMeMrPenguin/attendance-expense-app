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

async function migrateSchema() {
  console.log('--- MIGRATING BANK_RECEIPTS: remitter_name -> sender_name ---\n');

  // Fetch all receipts
  const { data: recs, error: fetchErr } = await client.from('bank_receipts').select('*');
  if (fetchErr) {
    console.error('Error fetching bank_receipts:', fetchErr.message);
    return;
  }

  console.log(`Fetched ${recs ? recs.length : 0} receipts.`);

  // Check if sender_name exists by updating 1 row or checking keys
  let hasSenderName = recs && recs[0] && ('sender_name' in recs[0]);

  if (!hasSenderName) {
    console.log('Adding column sender_name to bank_receipts via RPC or SQL fallback...');
    // Try executing SQL via rpc
    const { error: rpcErr } = await client.rpc('exec_sql', {
      sql_query: 'ALTER TABLE bank_receipts ADD COLUMN IF NOT EXISTS sender_name text;'
    });

    if (rpcErr) {
      console.log('exec_sql RPC not available, copying via update if column added manually...');
    }
  }

  // Populate sender_name for all rows using remitter_name if sender_name is empty
  let updatedCount = 0;
  for (const r of recs || []) {
    const sName = r.sender_name || r.remitter_name || '';
    const { error: upErr } = await client
      .from('bank_receipts')
      .update({ sender_name: sName, remitter_name: sName })
      .eq('id', r.id);

    if (!upErr) updatedCount++;
  }
  console.log(`Updated ${updatedCount} rows in bank_receipts with sender_name.`);

  // Update receipt_rules where match_field === 'remitter_name'
  const { data: rulesToUpdate } = await client.from('receipt_rules').select('*').eq('match_field', 'remitter_name');
  if (rulesToUpdate && rulesToUpdate.length > 0) {
    console.log(`Updating ${rulesToUpdate.length} rules from remitter_name to sender_name...`);
    await client.from('receipt_rules').update({ match_field: 'sender_name' }).eq('match_field', 'remitter_name');
  } else {
    console.log('No receipt_rules found with match_field = remitter_name.');
  }

  // Ensure initial Trang Account Balance setting exists in category_budgets
  const adminUserId = '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
  const { data: existingTrangAccount } = await client
    .from('category_budgets')
    .select('*')
    .eq('category', '__TRANG_ACCOUNT_BALANCE__');

  if (!existingTrangAccount || existingTrangAccount.length === 0) {
    console.log('Creating default __TRANG_ACCOUNT_BALANCE__ in category_budgets...');
    await client.from('category_budgets').insert({
      id: 'trang_account_balance',
      user_id: adminUserId,
      teacher_name: 'ADMIN',
      category: '__TRANG_ACCOUNT_BALANCE__',
      amount: 5000000, // Default 5,000,000đ initial balance
      type: 'settings',
      icon: 'Wallet',
      note: '{"initial_balance":5000000}'
    });
  } else {
    console.log('__TRANG_ACCOUNT_BALANCE__ already exists:', existingTrangAccount[0]);
  }

  console.log('\n--- MIGRATION COMPLETED SUCCESSFULLY ---');
}

migrateSchema().catch(console.error);
