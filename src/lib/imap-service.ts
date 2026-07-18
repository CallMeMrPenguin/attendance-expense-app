import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export interface BankReceipt {
  id: string;
  order_number: string;
  trans_date: string;
  trans_time?: string;
  debit_account: string;
  remitter_name: string;
  credit_account: string;
  beneficiary_name: string;
  beneficiary_bank: string;
  amount: number;
  details: string;
  status: 'unclassified' | 'classified';
  type?: 'income' | 'expense' | 'saving';
  category?: string;
  user_id?: string;
  created_at?: string;
}

export interface ReceiptRule {
  id: string;
  user_id?: string;
  match_field: 'remitter_name' | 'beneficiary_name' | 'details' | 'sender' | 'remitter_beneficiary_details';
  match_value: string;
  target_type: 'income' | 'expense' | 'saving';
  target_category: string;
  created_at?: string;
}

// SSE Subscriber & Real-Time Broadcaster Mechanism
type SseListener = (event: string, data: any) => void;
const sseSubscribers = new Set<SseListener>();

export function subscribeSseClient(listener: SseListener) {
  sseSubscribers.add(listener);
}

export function unsubscribeSseClient(listener: SseListener) {
  sseSubscribers.delete(listener);
}

export function broadcastSseEvent(event: string, data: any) {
  for (const listener of sseSubscribers) {
    try {
      listener(event, data);
    } catch (e) {
      sseSubscribers.delete(listener);
    }
  }
}

// Server in-memory cache to guarantee persistence even if Supabase table is not created yet
const serverReceiptCacheMap = new Map<string, BankReceipt>();

export function getCachedReceipts(): BankReceipt[] {
  return Array.from(serverReceiptCacheMap.values()).sort((a, b) => b.trans_date.localeCompare(a.trans_date));
}

export function updateCachedReceipt(receipt: BankReceipt) {
  serverReceiptCacheMap.set(receipt.id, receipt);
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

  // 3. Trans Date & Time (Hours, minutes, seconds)
  let transDateRaw = getFieldValue(['ngày, giờ giao dịch', 'ngày giờ giao dịch', 'ngày giao dịch', 'trans. date', 'trans date', 'thời gian']);
  if (!transDateRaw) {
    transDateRaw = cleanText;
  }

  let transDate = new Date().toISOString().split('T')[0];
  let transTime = '';

  const dateMatch = transDateRaw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('/');
    transDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const timeMatch = transDateRaw.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (timeMatch) {
    transTime = timeMatch[1];
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
    trans_time: transTime,
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

// Helper to remove accents/diacritics and normalize text for comparison
export const cleanString = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
};

export async function syncBankReceipts(): Promise<BankReceipt[]> {
  const { user, pass, sender } = getImapConfig();
  if (!user || !pass) {
    console.warn('Gmail IMAP credentials missing in environment variables.');
    return getCachedReceipts();
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const clientAdmin = getSupabaseAdmin();

      // 1. Fetch existing receipts, rules, and category budgets from Supabase DB
      let ruleList: ReceiptRule[] = [];
      let categoryBudgetsList: any[] = [];
      try {
        const [receiptsRes, rulesRes, budgetsRes] = await Promise.all([
          clientAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
          clientAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false }),
          clientAdmin.from('category_budgets').select('*')
        ]);

        if (receiptsRes.data) {
          receiptsRes.data.forEach((r: any) => serverReceiptCacheMap.set(r.id, r as BankReceipt));
        }
        if (rulesRes.data) {
          ruleList = rulesRes.data as ReceiptRule[];
        }
        if (budgetsRes.data) {
          categoryBudgetsList = budgetsRes.data;
          console.log('[IMAP Service] Loaded category budgets for keywords matching:', budgetsRes.data.map((b: any) => ({ category: b.category, keywords: b.keywords })));
        }

        // Re-evaluate existing unclassified receipts in DB against keywords
        if (receiptsRes.data && budgetsRes.data) {
          const unclassifiedReceipts = receiptsRes.data.filter((r: any) => r.status === 'unclassified');
          if (unclassifiedReceipts.length > 0) {
            console.log(`[IMAP Sync] Re-evaluating ${unclassifiedReceipts.length} existing unclassified receipts against keywords...`);
            for (const receipt of unclassifiedReceipts) {
              const cleanDetails = cleanString(receipt.details || '');
              let matched = false;
              for (const budget of budgetsRes.data) {
                if (budget.keywords) {
                  const kwList = budget.keywords.split(',').map((kw: string) => cleanString(kw)).filter(Boolean);
                  for (const kw of kwList) {
                    if (cleanDetails.includes(kw)) {
                      console.log(`[IMAP Sync] Re-evaluation MATCH! Receipt "${receipt.id}" details "${cleanDetails}" matched keyword "${kw}" -> Category: "${budget.category}"`);
                      
                      const savingCats = ['Tiết kiệm khẩn cấp', 'Tích lũy dài hạn', 'Tiết kiệm khác', 'Tiết kiệm'];
                      const matchedType = savingCats.includes(budget.category) ? 'saving' : 'expense';
                      
                      const updatedReceipt = {
                        ...receipt,
                        status: 'classified' as const,
                        type: matchedType,
                        category: budget.category
                      };
                      
                      // Update cache
                      serverReceiptCacheMap.set(receipt.id, updatedReceipt);
                      
                      // Update DB
                      await clientAdmin.from('bank_receipts').upsert(updatedReceipt, { onConflict: 'id' });
                      
                      // Insert transaction
                      const txRecord = {
                        id: `tx-receipt-${receipt.id}`,
                        desc_text: `[Biên lai Vietcombank] ${updatedReceipt.remitter_name || ''} ➔ ${updatedReceipt.beneficiary_name || ''}: ${updatedReceipt.details}`,
                        amount: updatedReceipt.amount,
                        type: matchedType,
                        category: budget.category,
                        date: updatedReceipt.trans_date,
                        user_id: receipt.user_id || '2d3a11e1-4d71-474c-b8df-abb85394e9c8', // fallback if empty
                        teacher_name: 'Admin',
                        updated_at: new Date().toISOString()
                      };
                      await clientAdmin.from('manual_transactions').upsert(txRecord, { onConflict: 'id' });
                      
                      matched = true;
                      break;
                    }
                  }
                }
                if (matched) break;
              }
            }
          }
        }
      } catch (e) {}

      // 2. Optimized IMAP Search for Vietcombank emails since 1st of current month
      const now = new Date();
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let searchResult = await client.search({ since: firstDayOfCurrentMonth, body: 'Vietcombank' });
      if (!searchResult || searchResult.length === 0) {
        searchResult = await client.search({ since: firstDayOfCurrentMonth });
      }

      const msgIds = Array.isArray(searchResult) ? searchResult.slice(-20) : [];

      if (msgIds.length > 0) {
        for (const seq of msgIds) {
          const message = await client.fetchOne(seq, { source: true, envelope: true });
          if (!message || !message.source) continue;

          const parsed = await simpleParser(message.source);
          const subject = parsed.subject || '';
          const fromAddr = parsed.from ? parsed.from.text : '';

          const isVcbEmail = subject.includes('Biên lai') || 
            fromAddr.toLowerCase().includes('vietcombank') || 
            (parsed.text || '').includes('Vietcombank');

          if (!isVcbEmail) continue;

          const html = parsed.html || '';
          const text = parsed.text || '';

          const receiptData = parseVietcombankEmail(typeof html === 'string' ? html : '', text || '');
          if (!receiptData || !receiptData.order_number) continue;

          const receiptId = `vcb-${receiptData.order_number}`;

          // If already classified or in DB, keep existing state
          if (serverReceiptCacheMap.has(receiptId)) {
            const cached = serverReceiptCacheMap.get(receiptId);
            if (cached && cached.status === 'classified') {
              continue;
            }
          }

          // Check auto classification matching
          let status: 'unclassified' | 'classified' = 'unclassified';
          let matchedType: 'income' | 'expense' | 'saving' | undefined = undefined;
          let matchedCategory: string | undefined = undefined;



          // 1. Match against category-specific keywords in details (Nội dung chuyển tiền)
          const cleanDetails = cleanString(receiptData.details || '');
          console.log(`[IMAP Sync] Analyzing receipt details: "${receiptData.details}" -> Cleaned: "${cleanDetails}"`);
          for (const budget of categoryBudgetsList) {
            if (budget.keywords) {
              const kwList = budget.keywords.split(',').map((kw: string) => cleanString(kw)).filter(Boolean);
              for (const kw of kwList) {
                if (cleanDetails.includes(kw)) {
                  console.log(`[IMAP Sync] MATCH FOUND! cleanDetails "${cleanDetails}" contains keyword "${kw}" -> Category: "${budget.category}"`);
                  status = 'classified';
                  matchedCategory = budget.category;
                  const savingCats = ['Tiết kiệm khẩn cấp', 'Tích lũy dài hạn', 'Tiết kiệm khác', 'Tiết kiệm'];
                  matchedType = savingCats.includes(budget.category) ? 'saving' : 'expense';
                  break;
                }
              }
            }
            if (status === 'classified') break;
          }

          // 2. Fallback to existing ruleList matching
          if (status !== 'classified') {
            for (const rule of ruleList) {
              let valToMatch = '';
              if (rule.match_field === 'remitter_name') valToMatch = receiptData.remitter_name || '';
              else if (rule.match_field === 'beneficiary_name') valToMatch = receiptData.beneficiary_name || '';
              else if (rule.match_field === 'details') valToMatch = receiptData.details || '';
              else if (rule.match_field === 'sender') valToMatch = sender;
              else if (rule.match_field === 'remitter_beneficiary_details') {
                const rName = (receiptData.remitter_name || '').toUpperCase();
                const bName = (receiptData.beneficiary_name || '').toUpperCase();
                if (rName.includes('BUI DUC HUNG') && bName.includes('PHAM THI THU TRANG')) {
                  valToMatch = receiptData.details || '';
                }
              }

              if (valToMatch && valToMatch.toLowerCase().includes(rule.match_value.toLowerCase())) {
                status = 'classified';
                matchedType = rule.target_type;
                matchedCategory = rule.target_category;
                break;
              }
            }
          }

          const newReceipt: BankReceipt = {
            id: receiptId,
            order_number: receiptData.order_number || '',
            trans_date: receiptData.trans_date || new Date().toISOString().split('T')[0],
            trans_time: receiptData.trans_time || '',
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

          // Store in server memory cache
          serverReceiptCacheMap.set(receiptId, newReceipt);

          // Insert into Supabase DB
          try {
            const { error: dbErr } = await clientAdmin.from('bank_receipts').upsert(newReceipt, { onConflict: 'id' });
            if (dbErr) console.error('[Supabase bank_receipts upsert error]', dbErr.message);

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
          } catch (e) {}
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('IMAP fetch error:', err);
  }

  const receipts = getCachedReceipts();
  broadcastSseEvent('new-receipt', { receipts });
  return receipts;
}

let idleReconnectTimer: NodeJS.Timeout | null = null;

function scheduleIdleReconnect() {
  if (idleReconnectTimer) clearTimeout(idleReconnectTimer);
  isIdleListening = false;
  imapClientInstance = null;

  idleReconnectTimer = setTimeout(() => {
    console.log('[IMAP IDLE Auto-Reconnect] Attempting to reconnect to Gmail IMAP server...');
    startImapIdleListener().catch(console.error);
  }, 5000);
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
      console.log(`[IMAP IDLE] ⚡ New message detected (count: ${data.count}). Syncing receipts...`);
      const receipts = await syncBankReceipts();
      broadcastSseEvent('new-receipt', { receipts });
    });

    client.on('error', (err) => {
      console.error('[IMAP IDLE Error]', err);
      scheduleIdleReconnect();
    });

    client.on('close', () => {
      console.log('[IMAP IDLE] Connection closed. Auto-reconnecting in 5s...');
      scheduleIdleReconnect();
    });

    await client.connect();
    await client.mailboxOpen('INBOX');

    console.log('[IMAP IDLE] Connected & listening for real-time Vietcombank emails...');
    await client.idle();
  } catch (err) {
    console.error('Failed to start IMAP IDLE listener:', err);
    scheduleIdleReconnect();
  }
}
