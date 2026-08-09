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

async function purgeJulyBackward() {
  console.log('--- PURGING ALL TRANSACTIONS FROM JULY 2026 AND BACKWARD ---\n');

  // 1. Delete from manual_transactions where date < 2026-08-01
  console.log('Deleting from manual_transactions (date < 2026-08-01)...');
  const { data: deletedTxs, error: errTx } = await client
    .from('manual_transactions')
    .delete()
    .lt('date', '2026-08-01')
    .select('id');

  if (errTx) {
    console.error('Error deleting manual_transactions:', errTx.message);
  } else {
    console.log(`Successfully deleted ${deletedTxs ? deletedTxs.length : 0} rows from manual_transactions.`);
  }

  // 2. Delete from bank_receipts where trans_date < 2026-08-01
  console.log('\nDeleting from bank_receipts (trans_date < 2026-08-01)...');
  const { data: deletedReceipts, error: errRec } = await client
    .from('bank_receipts')
    .delete()
    .lt('trans_date', '2026-08-01')
    .select('id');

  if (errRec) {
    console.error('Error deleting bank_receipts:', errRec.message);
  } else {
    console.log(`Successfully deleted ${deletedReceipts ? deletedReceipts.length : 0} rows from bank_receipts.`);
  }

  // 3. Delete from savings_history where created_at < 2026-08-01
  console.log('\nDeleting from savings_history (created_at < 2026-08-01T00:00:00Z)...');
  const { data: deletedSavings, error: errSav } = await client
    .from('savings_history')
    .delete()
    .lt('created_at', '2026-08-01T00:00:00Z')
    .select('id');

  if (errSav) {
    console.error('Error deleting savings_history:', errSav.message);
  } else {
    console.log(`Successfully deleted ${deletedSavings ? deletedSavings.length : 0} rows from savings_history.`);
  }

  // 4. Verify remaining row counts
  console.log('\n--- VERIFICATION OF REMAINING ROWS (AUGUST 2026 ONWARDS) ---');
  const { count: txCount } = await client.from('manual_transactions').select('*', { count: 'exact', head: true });
  const { count: recCount } = await client.from('bank_receipts').select('*', { count: 'exact', head: true });
  const { count: savCount } = await client.from('savings_history').select('*', { count: 'exact', head: true });

  console.log(`Remaining manual_transactions in DB: ${txCount}`);
  console.log(`Remaining bank_receipts in DB: ${recCount}`);
  console.log(`Remaining savings_history in DB: ${savCount}`);
}

purgeJulyBackward().catch(console.error);
