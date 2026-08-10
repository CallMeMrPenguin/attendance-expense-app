const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envLocal = '';
try { envLocal = fs.readFileSync('.env.local', 'utf-8'); } catch (e) {}
const envVars = {};
envLocal.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function classify200k() {
  const receiptId = 'vcb-15519094840';
  console.log(`=== CLASSIFYING 200k RECEIPT ${receiptId} ===`);

  const { data: rec } = await supabase
    .from('bank_receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (!rec) return;

  await supabase
    .from('bank_receipts')
    .update({
      status: 'classified',
      type: 'income',
      category: 'Khác'
    })
    .eq('id', receiptId);

  const rawId = receiptId.replace(/^vcb-/, '');
  const txId = `tx-receipt-${rawId}`;
  const descText = `[Biên lai Vietcombank] ${rec.remitter_name || ''} ➔ ${rec.beneficiary_name || ''}: ${rec.details}`;

  const txRecord = {
    id: txId,
    user_id: rec.user_id,
    user_name: 'Admin',
    desc_text: descText,
    amount: Number(rec.amount),
    type: 'income',
    category: 'Khác',
    date: rec.trans_date ? rec.trans_date.split(' ')[0] : new Date().toISOString().split('T')[0]
  };

  const { error: txErr } = await supabase.from('manual_transactions').upsert(txRecord, { onConflict: 'id' });
  if (txErr) console.error('Upsert tx error:', txErr);
  else console.log('Successfully upserted 200k transaction into manual_transactions!');
}

classify200k();
