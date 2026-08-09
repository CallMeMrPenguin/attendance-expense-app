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

async function cleanSenders() {
  console.log('--- CLEANING SENDER NAMES IN DB BASED ON DEBIT ACCOUNT ---');

  const { data: recs } = await client.from('bank_receipts').select('*');
  let updated = 0;

  for (const r of recs || []) {
    const dAcc = (r.debit_account || '').toString();
    const detailsStr = (r.details || '').toUpperCase();
    let newSender = r.sender_name || r.remitter_name;

    if (dAcc.includes('1030723743') || detailsStr.includes('1030723743')) {
      newSender = 'BUI DUC HUNG';
    } else if (dAcc.includes('9981397845') || detailsStr.includes('9981397845')) {
      newSender = 'PHAM THI THU TRANG';
    }

    if (newSender !== r.remitter_name || newSender !== r.sender_name) {
      await client.from('bank_receipts').update({
        remitter_name: newSender,
        sender_name: newSender
      }).eq('id', r.id);
      updated++;
    }
  }

  console.log(`Cleaned up ${updated} receipts in DB.`);
}

cleanSenders().catch(console.error);
