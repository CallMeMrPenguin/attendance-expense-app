const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function testIsTrangTx() {
  console.log('--- TESTING NEW IS_TRANG_TX LOGIC ON DB ---');

  const { data: receipts } = await client.from('bank_receipts').select('*');
  const { data: manualTxs } = await client.from('manual_transactions').select('*');

  const isTrangTx = (item) => {
    const sName = (item.sender_name || item.remitter_name || '').toUpperCase();
    const dAcc = (item.debit_account || '').toString();
    const detailsStr = (item.details || item.desc || '').toUpperCase();

    // If sender is explicitly BUI DUC HUNG or account 1030723743, it is HUNG'S payment, NEVER Trang's!
    const isHungSender = sName.includes('BUI DUC HUNG') || dAcc.includes('1030723743') || detailsStr.includes('BUI DUC HUNG CHUYEN TIEN');
    if (isHungSender) return false;

    // Check if Trang is the sender
    const isTrangSender = (
      sName.includes('PHAM THI THU TRANG') ||
      dAcc.includes('9981397845') ||
      detailsStr.includes('9981397845') ||
      detailsStr.includes('DEBIT: 9981397845') ||
      detailsStr.includes('SENDER: PHAM THI THU TRANG')
    );

    return isTrangSender;
  };

  const receiptsTrang = (receipts || []).filter(r => r.status === 'classified' && isTrangTx(r));
  const manualTrang = (manualTxs || []).filter(t => t.type === 'expense' && isTrangTx(t));

  console.log(`Matched Trang Classified Receipts: ${receiptsTrang.length}`);
  receiptsTrang.forEach(r => console.log(`  Receipt ${r.id}: ${r.details} (${r.amount}đ)`));

  console.log(`Matched Trang Manual Expenses: ${manualTrang.length}`);
  manualTrang.forEach(t => console.log(`  Tx ${t.id}: ${t.desc_text || t.desc} (${t.amount}đ)`));
}

testIsTrangTx().catch(console.error);
