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

async function checkDbSync() {
  console.log('===================================================');
  console.log('   SUPABASE DATABASE VS APP DATA SYNC INTEGRITY   ');
  console.log('===================================================\n');

  const tables = [
    'profiles',
    'teachers',
    'sessions',
    'manual_transactions',
    'savings_funds',
    'category_budgets',
    'savings_history',
    'bank_receipts',
    'receipt_rules'
  ];

  const counts = {};
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ Table [${table}]: Error - ${error.message}`);
    } else {
      counts[table] = count;
      console.log(`✅ Table [${table}]: ${count} rows`);
    }
  }

  console.log('\n--- Checking Bank Receipts vs Manual Transactions Sync ---');
  const { data: receipts } = await supabase.from('bank_receipts').select('id, status, type, category, amount, details');
  const { data: manualTxs } = await supabase.from('manual_transactions').select('id, amount, desc_text, type, category');

  const classified = (receipts || []).filter(r => r.status === 'classified');
  const unclassified = (receipts || []).filter(r => r.status === 'unclassified');

  console.log(`Bank Receipts Total: ${receipts ? receipts.length : 0}`);
  console.log(`  └─ Classified: ${classified.length}`);
  console.log(`  └─ Unclassified (Yellow): ${unclassified.length}`);
  console.log(`Manual Transactions Total: ${manualTxs ? manualTxs.length : 0}`);

  let missingTxCount = 0;
  for (const r of classified) {
    const txId = `tx-receipt-${r.id}`;
    const txMatch = (manualTxs || []).find(t => t.id === txId);
    if (!txMatch) {
      console.warn(`⚠️ Warning: Classified receipt [${r.id}] missing in manual_transactions DB!`);
      missingTxCount++;
    }
  }

  if (missingTxCount === 0) {
    console.log('✅ All classified bank receipts are properly synced with manual_transactions!');
  } else {
    console.warn(`❌ Found ${missingTxCount} classified receipts not synced to manual_transactions!`);
  }

  console.log('\n===================================================');
}

checkDbSync().catch(console.error);
