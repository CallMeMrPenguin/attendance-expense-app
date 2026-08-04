const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local for Supabase credentials
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.join('=').trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function migrate() {
  console.log('[Migration] Checking receipt_rules table in Supabase...');

  // 1. Fetch rules with match_field = 'beneficiary_name'
  const { data: rules, error: rulesErr } = await supabase
    .from('receipt_rules')
    .select('*')
    .eq('match_field', 'beneficiary_name');

  if (rulesErr) {
    console.error('Error fetching receipt_rules:', rulesErr.message);
    return;
  }

  console.log(`Found ${rules.length} rules matching 'beneficiary_name'.`);

  if (rules.length === 0) {
    console.log('[Migration] No rules to migrate.');
    return;
  }

  // 2. Fetch all bank receipts to map beneficiary_name to credit_account
  const { data: receipts, error: recErr } = await supabase
    .from('bank_receipts')
    .select('beneficiary_name, credit_account');

  if (recErr) {
    console.error('Error fetching bank_receipts:', recErr.message);
    return;
  }

  const nameToCreditMap = new Map();
  (receipts || []).forEach(r => {
    if (r.beneficiary_name && r.credit_account) {
      nameToCreditMap.set(r.beneficiary_name.trim().toLowerCase(), r.credit_account.trim());
    }
  });

  for (const rule of rules) {
    const matchedCreditAccount = nameToCreditMap.get((rule.match_value || '').trim().toLowerCase());
    if (matchedCreditAccount) {
      console.log(`Migrating rule ${rule.id}: beneficiary_name '${rule.match_value}' -> credit_account '${matchedCreditAccount}'`);
      const { error: updateErr } = await supabase
        .from('receipt_rules')
        .update({
          match_field: 'credit_account',
          match_value: matchedCreditAccount
        })
        .eq('id', rule.id);

      if (updateErr) {
        console.error(`Failed to update rule ${rule.id}:`, updateErr.message);
      } else {
        console.log(`Successfully migrated rule ${rule.id}`);
      }
    } else {
      console.log(`Rule ${rule.id}: No matching credit_account found in bank_receipts for '${rule.match_value}'. Updating match_field to 'credit_account' as safeguard.`);
      await supabase
        .from('receipt_rules')
        .update({ match_field: 'credit_account' })
        .eq('id', rule.id);
    }
  }

  console.log('[Migration] Migration complete.');
}

migrate().catch(console.error);
