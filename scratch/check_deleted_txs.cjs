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

async function checkDeleted() {
  console.log('--- Inspecting Deleted Transactions & Sync Gaps ---\n');

  // 1. Fetch all bank receipts and manual_transactions
  const { data: receipts } = await client.from('bank_receipts').select('*').order('created_at', { ascending: false });
  const { data: manualTxs } = await client.from('manual_transactions').select('*').order('created_at', { ascending: false });

  console.log(`Total Bank Receipts in DB: ${receipts ? receipts.length : 0}`);
  console.log(`Total Manual Transactions in DB: ${manualTxs ? manualTxs.length : 0}\n`);

  // Check classified receipts whose manual_transaction row was DELETED by the user
  const missingTxFromReceipt = [];
  if (receipts && manualTxs) {
    const txIdSet = new Set(manualTxs.map(t => t.id));
    for (const r of receipts) {
      const txId = `tx-receipt-${r.id}`;
      if (!txIdSet.has(txId) && r.status === 'classified') {
        missingTxFromReceipt.push(r);
      }
    }
  }

  console.log(`Classified Receipts whose transaction was DELETED from History (${missingTxFromReceipt.length} found):`);
  missingTxFromReceipt.forEach((r, i) => {
    console.log(`  ${i+1}. Receipt ID: ${r.id} | Amount: ${r.amount} | Date: ${r.trans_date} | Details: ${r.details} | Category: ${r.category}`);
  });

  // 2. Check if Supabase audit log entries exist
  console.log('\n--- Checking Supabase System / Audit Logs ---');
  try {
    const { data: auditLogs, error: auditErr } = await client.rpc('get_audit_logs');
    if (auditErr) console.log('RPC get_audit_logs not present:', auditErr.message);
    else console.log('Audit logs RPC result:', auditLogs);
  } catch (e) {
    console.log('No RPC get_audit_logs');
  }

  // Check all manual transactions to see timestamp distribution
  console.log('\n--- Recent Manual Transactions currently in DB ---');
  (manualTxs || []).slice(0, 15).forEach((t, i) => {
    console.log(`  ${i+1}. ID: ${t.id} | Date: ${t.date} | Desc: ${t.desc_text} | Amount: ${t.amount} | CreatedAt: ${t.created_at}`);
  });
}

checkDeleted().catch(console.error);
