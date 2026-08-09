const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function inspectTrangTxs() {
  console.log('=== INSPECTING ALL BANK RECEIPTS & MANUAL TXS FOR TRANG MATCH ===\n');

  const { data: receipts } = await client.from('bank_receipts').select('*');
  const { data: manualTxs } = await client.from('manual_transactions').select('*');

  console.log('--- Bank Receipts ---');
  (receipts || []).forEach(r => {
    const sName = (r.sender_name || r.remitter_name || '').toUpperCase();
    const dAcc = (r.debit_account || '').toString();
    const bName = (r.beneficiary_name || '').toUpperCase();
    const cAcc = (r.credit_account || '').toString();
    const detailsStr = (r.details || '').toUpperCase();

    const isHungSender = sName.includes('BUI DUC HUNG') || dAcc.includes('1030723743');
    const isTrangSender = sName.includes('PHAM THI THU TRANG') || dAcc.includes('9981397845');

    console.log(`Receipt ${r.id} | Status: ${r.status} | Type: ${r.type} | Amount: ${r.amount}`);
    console.log(`  Sender: "${sName}" (DebitAcc: ${dAcc}) | Receiver: "${bName}" (CreditAcc: ${cAcc})`);
    console.log(`  Details: "${r.details}"`);
    console.log(`  IsHungSender: ${isHungSender} | IsTrangSender: ${isTrangSender}\n`);
  });

  console.log('--- Manual Transactions ---');
  (manualTxs || []).forEach(t => {
    console.log(`Tx ${t.id} | Desc: "${t.desc_text || t.desc}" | Type: ${t.type} | Amount: ${t.amount}`);
  });
}

inspectTrangTxs().catch(console.error);
