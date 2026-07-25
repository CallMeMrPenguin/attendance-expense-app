const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
  }
}

const supabase = createClient(url, key);

async function testUserQuery() {
  console.log('--- TEST USER AUTH & QUERIES ---');

  // Test 1: Query manual_transactions with anon client
  const { data: txsAnon, error: errAnon } = await supabase.from('manual_transactions').select('*');
  console.log('Anon client manual_transactions:', txsAnon, errAnon ? errAnon.message : '');

  // Test 2: Login as buiduchung
  const { data: user1Auth, error: err1 } = await supabase.auth.signInWithPassword({
    email: 'buiduchung2004@gmail.com',
    password: 'callmemrpenguin'
  });
  console.log('\nUser 1 (buiduchung2004) sign-in:', user1Auth?.user?.id, err1 ? err1.message : '');

  if (user1Auth?.session?.access_token) {
    const client1 = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${user1Auth.session.access_token}` } }
    });
    const { data: txs1, error: e1 } = await client1.from('manual_transactions').select('*');
    console.log('User 1 manual_transactions:', txs1, e1 ? e1.message : '');

    const { data: funds1 } = await client1.from('savings_funds').select('*');
    console.log('User 1 savings_funds:', funds1);
  }

  // Sign out
  await supabase.auth.signOut();

  // Test 3: Login as phamthithutrang
  const { data: user2Auth, error: err2 } = await supabase.auth.signInWithPassword({
    email: 'phamthithutrang110902@gmail.com',
    password: 'trang110902'
  });
  console.log('\nUser 2 (phamthithutrang110902) sign-in:', user2Auth?.user?.id, err2 ? err2.message : '');

  if (user2Auth?.session?.access_token) {
    const client2 = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${user2Auth.session.access_token}` } }
    });
    const { data: txs2, error: e2 } = await client2.from('manual_transactions').select('*');
    console.log('User 2 manual_transactions:', txs2, e2 ? e2.message : '');

    const { data: funds2 } = await client2.from('savings_funds').select('*');
    console.log('User 2 savings_funds:', funds2);
  }
}

testUserQuery().catch(console.error);
