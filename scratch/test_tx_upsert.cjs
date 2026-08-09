const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

const client = createClient(url, key);

async function testTxUpsert() {
  console.log('--- TESTING MANUAL TRANSACTIONS UPSERT ---');

  const recordsWithTeacher = [{
    id: 'test-tx-1',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    user_name: 'Admin',
    teacher_name: 'Admin',
    desc_text: 'Test Tx',
    amount: 50000,
    type: 'expense',
    category: 'Ăn uống',
    date: '2026-08-09'
  }];

  const { error: err1 } = await client.from('manual_transactions').upsert(recordsWithTeacher, { onConflict: 'id' });
  console.log('Upsert WITH teacher_name:', { error: err1 });

  const recordsWithoutTeacher = [{
    id: 'test-tx-1',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    user_name: 'Admin',
    desc_text: 'Test Tx',
    amount: 50000,
    type: 'expense',
    category: 'Ăn uống',
    date: '2026-08-09'
  }];

  const { error: err2 } = await client.from('manual_transactions').upsert(recordsWithoutTeacher, { onConflict: 'id' });
  console.log('Upsert WITHOUT teacher_name:', { error: err2 });

  await client.from('manual_transactions').delete().eq('id', 'test-tx-1');
}

testTxUpsert().catch(console.error);
