import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export interface BankReceipt {
  id: string;
  order_number: string;
  trans_date: string;
  debit_account: string;
  remitter_name: string;
  credit_account: string;
  beneficiary_name: string;
  beneficiary_bank: string;
  amount: number;
  details: string;
  status: 'unclassified' | 'classified';
  type?: 'income' | 'expense';
  category?: string;
  user_id?: string;
  created_at?: string;
}

export interface ReceiptRule {
  id: string;
  user_id?: string;
  match_field: 'remitter_name' | 'beneficiary_name' | 'details' | 'sender';
  match_value: string;
  target_type: 'income' | 'expense';
  target_category: string;
  created_at?: string;
}

// Robust HTML / Text Parser for Vietcombank Email Receipts
export function parseVietcombankEmail(html: string, text: string): Partial<BankReceipt> | null {
  const content = (html || '') + '\n' + (text || '');
  if (!content) return null;

  const tablePairs: Record<string, string> = {};
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

  const getFieldValue = (labelPatterns: string[]): string => {
    // 1. Try table pairs first
    for (const pattern of labelPatterns) {
      const lowerPat = pattern.toLowerCase();
      for (const k of Object.keys(tablePairs)) {
        if (k.includes(lowerPat)) {
          return tablePairs[k];
        }
      }
    }
    // 2. Fallback to cleanText regex matching
    for (const pattern of labelPatterns) {
      const regex = new RegExp(`${pattern}\\s*[:\\s]+\\s*([^\\n\\r<]{1,120})`, 'i');
      const match = cleanText.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  };

  // 1. Order Number
  const orderNumberRaw = getFieldValue(['Số lệnh giao dịch', 'Order Number']);
  const orderNumber = orderNumberRaw.replace(/[^0-9]/g, '');

  // 2. Amount
  const amountStr = getFieldValue(['Số tiền', 'Amount']);
  let amount = 0;
  const amountMatch = amountStr.match(/([0-9\.\,]+)\s*(VND|VNĐ|đ)?/i);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, '').replace(/\./g, '')) || 0;
  }

  // 3. Trans Date
  const transDateRaw = getFieldValue(['Ngày, giờ giao dịch', 'Trans. Date, Time']);
  let transDate = new Date().toISOString().split('T')[0];
  const dateMatch = transDateRaw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('/');
    transDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 4. Accounts & Names
  const debitAccount = getFieldValue(['Tài khoản nguồn', 'Debit Account']);
  const remitterName = getFieldValue(['Tên người chuyển tiền', 'Remitter\'s name', 'Remitter name']);
  const creditAccount = getFieldValue(['Tài khoản người hưởng', 'Credit Account']);
  const beneficiaryName = getFieldValue(['Tên người hưởng', 'Beneficiary Name']);
  const beneficiaryBank = getFieldValue(['Tên ngân hàng hưởng', 'Beneficiary Bank Name', 'Beneficiary Bank']);
  
  // 5. Details
  const details = getFieldValue(['Nội dung chuyển tiền', 'Details of Payment']);

  if (!orderNumber && !amount) {
    return null;
  }

  return {
    order_number: orderNumber || `VCB-${Date.now()}`,
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

let imapClientInstance: ImapFlow | null = null;
let isIdleListening = false;

export function getImapConfig() {
  const user = process.env.GMAIL_USER || 'buiduchung2004@gmail.com';
  const pass = process.env.GMAIL_APP_PASSWORD || 'hkbs waqu qjtl nozt';
  const sender = process.env.GMAIL_ALLOWED_SENDER || 'VCBDigibank@info.vietcombank.com.vn';

  return { user, pass, sender };
}

export async function syncBankReceipts(): Promise<BankReceipt[]> {
  const { user, pass, sender } = getImapConfig();
  if (!user || !pass) {
    console.warn('Gmail IMAP credentials missing in environment variables.');
    return [];
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  const parsedReceipts: BankReceipt[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Filter by current month only (SINCE 1st of current month)
      const now = new Date();
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Search emails from Vietcombank sender or with Vietcombank keywords since current month
      let searchResult = await client.search({ since: firstDayOfCurrentMonth, from: sender });
      if (!searchResult || searchResult.length === 0) {
        // Fallback to searching since current month for any Vietcombank emails
        searchResult = await client.search({ since: firstDayOfCurrentMonth, body: 'Vietcombank' });
      }

      const msgIds = Array.isArray(searchResult) ? searchResult.slice(-30) : []; // Fetch up to 30 recent emails of current month

      if (msgIds.length > 0) {
        const clientAdmin = getSupabaseAdmin();
        // Fetch existing rules for auto-classification
        const { data: rules } = await clientAdmin.from('receipt_rules').select('*');
        const ruleList: ReceiptRule[] = rules || [];

        for (const seq of msgIds) {
          const message = await client.fetchOne(seq, { source: true, envelope: true });
          if (!message || !message.source) continue;

          const parsed = await simpleParser(message.source);
          const html = parsed.html || '';
          const text = parsed.text || '';

          const receiptData = parseVietcombankEmail(typeof html === 'string' ? html : '', text || '');
          if (!receiptData || !receiptData.order_number) continue;

          const receiptId = `vcb-${receiptData.order_number}`;

          // Check if already in DB
          const { data: existing } = await clientAdmin
            .from('bank_receipts')
            .select('*')
            .eq('id', receiptId)
            .maybeSingle();

          if (existing) {
            parsedReceipts.push(existing as BankReceipt);
            continue;
          }

          // Check auto classification rule match
          let status: 'unclassified' | 'classified' = 'unclassified';
          let matchedType: 'income' | 'expense' | undefined = undefined;
          let matchedCategory: string | undefined = undefined;

          for (const rule of ruleList) {
            let valToMatch = '';
            if (rule.match_field === 'remitter_name') valToMatch = receiptData.remitter_name || '';
            else if (rule.match_field === 'beneficiary_name') valToMatch = receiptData.beneficiary_name || '';
            else if (rule.match_field === 'details') valToMatch = receiptData.details || '';
            else if (rule.match_field === 'sender') valToMatch = sender;

            if (valToMatch && valToMatch.toLowerCase().includes(rule.match_value.toLowerCase())) {
              status = 'classified';
              matchedType = rule.target_type;
              matchedCategory = rule.target_category;
              break;
            }
          }

          const newReceipt: BankReceipt = {
            id: receiptId,
            order_number: receiptData.order_number || '',
            trans_date: receiptData.trans_date || new Date().toISOString().split('T')[0],
            debit_account: receiptData.debit_account || '',
            remitter_name: receiptData.remitter_name || '',
            credit_account: receiptData.credit_account || '',
            beneficiary_name: receiptData.beneficiary_name || '',
            beneficiary_bank: receiptData.beneficiary_bank || '',
            amount: receiptData.amount || 0,
            details: receiptData.details || '',
            status,
            type: matchedType,
            category: matchedCategory
          };

          // Insert into Supabase
          await clientAdmin.from('bank_receipts').upsert(newReceipt, { onConflict: 'id' });

          // If auto-classified, also create manual_transactions entry
          if (status === 'classified' && matchedType && matchedCategory) {
            const txRecord = {
              id: `tx-receipt-${receiptId}`,
              desc_text: `[Biên lai Vietcombank] ${newReceipt.remitter_name || ''} ➔ ${newReceipt.beneficiary_name || ''}: ${newReceipt.details}`,
              amount: newReceipt.amount,
              type: matchedType,
              category: matchedCategory,
              date: newReceipt.trans_date,
              teacher_name: 'System'
            };
            await clientAdmin.from('manual_transactions').upsert(txRecord, { onConflict: 'id' });
          }

          parsedReceipts.push(newReceipt);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('IMAP fetch error:', err);
  }

  return parsedReceipts;
}

export async function startImapIdleListener() {
  if (isIdleListening && imapClientInstance) {
    return;
  }

  const { user, pass } = getImapConfig();
  if (!user || !pass) return;

  try {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false
    });

    imapClientInstance = client;
    isIdleListening = true;

    client.on('exists', async (data) => {
      console.log(`[IMAP IDLE] New message detected (count: ${data.count}). Syncing receipts...`);
      await syncBankReceipts();
    });

    client.on('error', (err) => {
      console.error('[IMAP IDLE Error]', err);
      isIdleListening = false;
      imapClientInstance = null;
    });

    client.on('close', () => {
      console.log('[IMAP IDLE] Connection closed.');
      isIdleListening = false;
      imapClientInstance = null;
    });

    await client.connect();
    await client.mailboxOpen('INBOX');

    console.log('[IMAP IDLE] Connected & listening for real-time Vietcombank emails...');
    await client.idle();
  } catch (err) {
    console.error('Failed to start IMAP IDLE listener:', err);
    isIdleListening = false;
    imapClientInstance = null;
  }
}
