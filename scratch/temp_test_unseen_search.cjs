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

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');

  try {
    const startUnseen = Date.now();
    const unseenMsgs = await client.search({ unseen: true, from: 'VCBDigibank@info.vietcombank.com.vn' });
    console.log(`Unseen search (${unseenMsgs.length} msgs): ${Date.now() - startUnseen}ms!`);

    const startSeq = Date.now();
    const status = await client.status('INBOX', { messages: true });
    const totalMsgs = status.messages;
    const startRange = Math.max(1, totalMsgs - 100);
    const rangeMsgs = await client.search({ seq: `${startRange}:${totalMsgs}`, from: 'VCBDigibank@info.vietcombank.com.vn' });
    console.log(`Seq Range ${startRange}:${totalMsgs} search (${rangeMsgs.length} msgs): ${Date.now() - startSeq}ms!`);

  } finally {
    lock.release();
  }

  await client.logout();
}

run().catch(console.error);
