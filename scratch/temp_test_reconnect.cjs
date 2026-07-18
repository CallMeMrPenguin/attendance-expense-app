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
  console.log(`1st Connection (Cold Start): ${Date.now() - startConnect}ms`);

  const lock = await client.getMailboxLock('INBOX');

  try {
    // 1st Sync on open connection
    const startSync1 = Date.now();
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const search1 = await client.search({ since: firstDayOfCurrentMonth, from: 'VCBDigibank@info.vietcombank.com.vn' });
    console.log(`1st Sync on open connection (${search1.length} msgs): ${Date.now() - startSync1}ms`);

    // 2nd Sync on same open connection (Simulating 2nd click or auto-sync)
    const startSync2 = Date.now();
    const search2 = await client.search({ since: firstDayOfCurrentMonth, from: 'VCBDigibank@info.vietcombank.com.vn' });
    console.log(`2nd Sync on SAME open connection (${search2.length} msgs): ${Date.now() - startSync2}ms!`);

  } finally {
    lock.release();
  }

  await client.logout();
}

run().catch(console.error);
