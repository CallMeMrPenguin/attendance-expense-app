const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert to bank_receipts with key type:', envVars.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon');
  
  const testRec = {
    id: 'vcb-test-15172535165',
    order_number: '15172535165',
    trans_date: '2026-07-18',
    debit_account: '1030723743',
    remitter_name: 'BUI DUC HUNG',
    credit_account: '106872262054',
    beneficiary_name: 'PHAM THI THU TRANG',
    beneficiary_bank: 'Ngân hàng TMCP Công Thương Việt Nam',
    amount: 5000,
    details: 'BUI DUC HUNG chuyen tien',
    status: 'unclassified'
  };

  const { data, error } = await client.from('bank_receipts').upsert(testRec, { onConflict: 'id' }).select();
  if (error) {
    console.error('ERROR inserting into bank_receipts:', error);
  } else {
    console.log('SUCCESSFULLY inserted/upserted into bank_receipts:', data);
  }
}

testInsert();
