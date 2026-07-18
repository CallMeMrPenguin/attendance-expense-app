const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');

const envPath = path.join(__dirname, '..', '.env.local');
let url = 'https://sdspzcyujygrrkgbqbgb.supabase.co';
let key = 'sb_publishable_RHfwA4KN6TguhzrSIIPhwQ_t9krP-ut';
let user = 'buiduchung2004@gmail.com';
let pass = 'hkbs waqu qjtl nozt';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('GMAIL_USER=')) user = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('GMAIL_APP_PASSWORD=')) pass = trimmed.split('=')[1].trim();
  }
}

async function testConnections() {
  console.log('===================================================');
  console.log('       SUPABASE & GMAIL IMAP DIAGNOSTIC TEST       ');
  console.log('===================================================\n');

  // 1. Supabase Check
  console.log(`Checking Supabase API (${url})...`);
  const supabase = createClient(url, key);
  const startSupa = Date.now();
  const { data: profs, error: supaErr } = await supabase.from('profiles').select('id, username').limit(1);
  if (supaErr) {
    console.error(`❌ Supabase Connection FAILED: ${supaErr.message}`);
  } else {
    console.log(`✅ Supabase Connected in ${Date.now() - startSupa}ms! Found profiles: ${profs ? profs.length : 0}`);
  }

  // 2. Gmail IMAP Check
  console.log(`\nChecking Gmail IMAP (${user})...`);
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  const startImap = Date.now();
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      console.log(`✅ Gmail IMAP Connected & Authenticated in ${Date.now() - startImap}ms!`);
      console.log(`   INBOX Messages: ${status.messages}, Unseen: ${status.unseen}`);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error(`❌ Gmail IMAP Connection FAILED:`, err.message);
  }

  console.log('\n===================================================');
}

testConnections().catch(console.error);
