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

async function checkRules() {
  console.log('=== CHECKING RECEIPT RULES & PHAM THI THU TRANG RECEIPTS ===');
  const { data: rules } = await supabase.from('receipt_rules').select('*');
  console.log('Receipt Rules:', rules);

  const { data: receipts } = await supabase
    .from('bank_receipts')
    .select('*')
    .ilike('remitter_name', '%TRANG%');
  console.log('\nReceipts from TRANG:', receipts);
}

checkRules();
