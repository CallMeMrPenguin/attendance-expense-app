const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const user = envVars.GMAIL_USER || 'buiduchung2004@gmail.com';
const pass = envVars.GMAIL_APP_PASSWORD || 'hkbs waqu qjtl nozt';

function parseVietcombankEmail(html, text) {
  const content = (html || '') + '\n' + (text || '');
  if (!content) return null;

  const tablePairs = {};
  if (html) {
    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rowMatches) {
      const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [])
        .map(c => c.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim());
      if (cells.length >= 2) {
        tablePairs[cells[0].toLowerCase()] = cells[1];
        if (cells.length >= 4) {
          tablePairs[cells[2].toLowerCase()] = cells[3];
        }
      }
    }
  }

  const cleanText = content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ');

  const getFieldValue = (labelPatterns) => {
    for (const pattern of labelPatterns) {
      const lowerPat = pattern.toLowerCase();
      for (const k of Object.keys(tablePairs)) {
        if (k.includes(lowerPat)) {
          return tablePairs[k];
        }
      }
    }
    for (const pattern of labelPatterns) {
      const regex = new RegExp(`${pattern}\\s*[:\\s]+\\s*([^\\n\\r<]{1,120})`, 'i');
      const match = cleanText.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  };

  const orderNumberRaw = getFieldValue(['Số lệnh giao dịch', 'Order Number']);
  const orderNumber = orderNumberRaw.replace(/[^0-9]/g, '');

  const amountStr = getFieldValue(['Số tiền', 'Amount']);
  let amount = 0;
  const amountMatch = amountStr.match(/([0-9\.\,]+)\s*(VND|VNĐ|đ)?/i);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, '').replace(/\./g, '')) || 0;
  }

  const transDateRaw = getFieldValue(['Ngày, giờ giao dịch', 'Trans. Date, Time']);
  let transDate = new Date().toISOString().split('T')[0];
  const dateMatch = transDateRaw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('/');
    transDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const debitAccount = getFieldValue(['Tài khoản nguồn', 'Debit Account']);
  const remitterName = getFieldValue(['Tên người chuyển tiền', 'Remitter\'s name', 'Remitter name']);
  const creditAccount = getFieldValue(['Tài khoản người hưởng', 'Credit Account']);
  const beneficiaryName = getFieldValue(['Tên người hưởng', 'Beneficiary Name']);
  const beneficiaryBank = getFieldValue(['Tên ngân hàng hưởng', 'Beneficiary Bank Name', 'Beneficiary Bank']);
  const details = getFieldValue(['Nội dung chuyển tiền', 'Details of Payment']);

  return {
    order_number: orderNumber,
    trans_date: transDate,
    debit_account: debitAccount,
    remitter_name: remitterName,
    credit_account: creditAccount,
    beneficiary_name: beneficiaryName,
    beneficiary_bank: beneficiaryBank,
    amount,
    details: details || 'Biên lai Vietcombank'
  };
}

async function testParse() {
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
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const searchResult = await client.search({ since: firstDayOfCurrentMonth });
    console.log('Search since 1st of month count:', searchResult.length);

    for (const seq of searchResult.slice(-5)) {
      const message = await client.fetchOne(seq, { source: true, envelope: true });
      if (!message || !message.source) continue;

      const parsed = await simpleParser(message.source);
      if ((parsed.subject || '').includes('Biên lai')) {
        console.log('=== FOUND RECEIPT EMAIL ===');
        console.log('Subject:', parsed.subject);
        console.log('From:', parsed.from ? parsed.from.text : '');
        const res = parseVietcombankEmail(parsed.html || '', parsed.text || '');
        console.log('PARSED RESULT:', JSON.stringify(res, null, 2));
      }
    }
  } finally {
    lock.release();
  }
  await client.logout();
}

testParse();
