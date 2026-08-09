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

async function checkDates() {
  console.log('--- Inspecting Transactions & Receipts by Date ---\n');

  // 1. Check manual_transactions
  const { data: txs } = await client.from('manual_transactions').select('id, date, created_at, desc_text, amount');
  const julyAndOlderTxs = (txs || []).filter(t => (t.date && t.date < '2026-08-01') || (t.created_at && t.created_at < '2026-08-01T00:00:00Z'));
  const augustTxs = (txs || []).filter(t => (t.date && t.date >= '2026-08-01') || (t.created_at && t.created_at >= '2026-08-01T00:00:00Z'));

  console.log(`manual_transactions: Total=${txs ? txs.length : 0}`);
  console.log(`  └─ July 2026 & Older (To Delete): ${julyAndOlderTxs.length}`);
  console.log(`  └─ August 2026 (To Keep): ${augustTxs.length}`);

  // Sample July & older manual_transactions
  console.log('\nSample July & older manual_transactions:');
  julyAndOlderTxs.slice(0, 5).forEach(t => {
    console.log(`  ID: ${t.id} | Date: ${t.date} | Amount: ${t.amount} | Desc: ${t.desc_text}`);
  });

  // 2. Check bank_receipts
  const { data: receipts } = await client.from('bank_receipts').select('id, trans_date, created_at, details, amount');
  const julyAndOlderReceipts = (receipts || []).filter(r => (r.trans_date && r.trans_date < '2026-08-01') || (r.created_at && r.created_at < '2026-08-01T00:00:00Z'));
  const augustReceipts = (receipts || []).filter(r => (r.trans_date && r.trans_date >= '2026-08-01') || (r.created_at && r.created_at >= '2026-08-01T00:00:00Z'));

  console.log(`\nbank_receipts: Total=${receipts ? receipts.length : 0}`);
  console.log(`  └─ July 2026 & Older (To Delete): ${julyAndOlderReceipts.length}`);
  console.log(`  └─ August 2026 (To Keep): ${augustReceipts.length}`);

  console.log('\nSample July & older bank_receipts:');
  julyAndOlderReceipts.slice(0, 5).forEach(r => {
    console.log(`  ID: ${r.id} | TransDate: ${r.trans_date} | Amount: ${r.amount} | Details: ${r.details}`);
  });
}

checkDates().catch(console.error);
