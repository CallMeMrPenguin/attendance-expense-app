const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');

const envPath = path.join(__dirname, '..', '.env.local');
let user = 'buiduchung2004@gmail.com';
let pass = 'hkbs waqu qjtl nozt';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('GMAIL_USER=')) user = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('GMAIL_APP_PASSWORD=')) pass = trimmed.split('=')[1].trim();
  }
}

async function run() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  const startConnect = Date.now();
  await client.connect();
  console.log(`IMAP Connect: ${Date.now() - startConnect}ms`);

  const lock = await client.getMailboxLock('INBOX');

  try {
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startSearch = Date.now();
    const searchResult = await client.search({ since: firstDayOfCurrentMonth, from: 'VCBDigibank@info.vietcombank.com.vn' });
    console.log(`IMAP Search (${searchResult.length} msgs): ${Date.now() - startSearch}ms`);

    const msgIds = Array.isArray(searchResult) ? searchResult : [];

    // Test 1: Fetch Envelopes Only
    const startEnv = Date.now();
    let envCount = 0;
    for await (const message of client.fetch(msgIds, { envelope: true, internalDate: true })) {
      envCount++;
    }
    console.log(`Fetch Envelopes Only (${envCount} msgs): ${Date.now() - startEnv}ms`);

    // Test 2: Fetch Full Source
    const startSrc = Date.now();
    let srcCount = 0;
    for await (const message of client.fetch(msgIds, { source: true, envelope: true })) {
      srcCount++;
    }
    console.log(`Fetch Full Source (${srcCount} msgs): ${Date.now() - startSrc}ms`);

  } finally {
    lock.release();
  }

  await client.logout();
}

run().catch(console.error);
