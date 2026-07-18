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


// Robust HTML / Text Parser for Vietcombank Email Receipts
export function parseVietcombankEmail(html: string, text: string): Partial<BankReceipt> | null {
  const content = (html || '') + '\n' + (text || '');
  if (!content) return null;

  const tablePairs: Record<string, string> = {};
  if (html) {
    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rowMatches) {
      let cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [])
        .map(c => c.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim());
      
      // Filter out empty cells and standalone colons
      cells = cells.filter(c => c !== ':' && c !== '');

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
          const val = tablePairs[k].trim();
          if (val && val !== ':') return val;
        }
      }
    }
    // 2. Fallback to cleanText regex matching
    for (const pattern of labelPatterns) {
      const regex = new RegExp(`${pattern}\\s*[:\\s]+\\s*([^\\n\\r<]{1,120})`, 'i');
      const match = cleanText.match(regex);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val && val !== ':') return val;
      }
    }
    return '';
  };

  // 1. Order Number
  const orderNumberRaw = getFieldValue(['Số lệnh giao dịch', 'Order Number', 'Mã giao dịch', 'Mã GD', 'Số GD', 'Ref No', 'Mã tham chiếu', 'Số tham chiếu', 'Trans ID']);
  const orderNumber = orderNumberRaw.replace(/[^0-9]/g, '');

  // 2. Amount
  const amountStr = getFieldValue(['Số tiền', 'Amount', 'Số tiền giao dịch', 'Giá trị giao dịch', 'Số tiền thanh toán']);
  let amount = 0;
  const amountMatch = amountStr.match(/([+-]?\s*[0-9\.\,]+)\s*(VND|VNĐ|đ)?/i);
  if (amountMatch && amountMatch[1]) {
    const rawNum = amountMatch[1].replace(/\s+/g, '');
    if (rawNum.includes(',') && rawNum.includes('.')) {
      if (rawNum.indexOf('.') < rawNum.indexOf(',')) {
        amount = parseFloat(rawNum.replace(/\./g, '').replace(',', '.')) || 0;
      } else {
        amount = parseFloat(rawNum.replace(/,/g, '')) || 0;
      }
    } else {
      amount = parseFloat(rawNum.replace(/[,.]/g, '')) || 0;
    }
    amount = Math.abs(amount);
  }

  // 3. Trans Date & Time (Hours, minutes, seconds)
  let transDateRaw = getFieldValue(['ngày, giờ giao dịch', 'ngày giờ giao dịch', 'ngày giao dịch', 'trans. date', 'trans date', 'thời gian', 'thời gian giao dịch', 'ngày thực hiện']);
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
  const debitAccount = getFieldValue(['Tài khoản nguồn', 'Debit Account', 'Tài khoản trích nợ', 'Tài khoản thanh toán', 'Từ tài khoản', 'Tài khoản chuyển']);
  const remitterName = getFieldValue(['Tên người chuyển tiền', 'Remitter\'s name', 'Remitter name', 'Người chuyển', 'Nguồn tiền', 'Tên người chuyển']);
  const creditAccount = getFieldValue(['Tài khoản người hưởng', 'Credit Account', 'Tài khoản nhận', 'Tài khoản thụ hưởng', 'Đến tài khoản']);
  const beneficiaryName = getFieldValue(['Tên người hưởng', 'Beneficiary Name', 'Beneficiary name', 'Người nhận', 'Tên người thụ hưởng', 'Tên tài khoản nhận']);
  const beneficiaryBank = getFieldValue(['Tên ngân hàng hưởng', 'Beneficiary Bank Name', 'Beneficiary Bank', 'Ngân hàng nhận', 'Ngân hàng thụ hưởng']);
  
  // 5. Details
  const details = getFieldValue(['Nội dung chuyển tiền', 'Details of Payment', 'Nội dung', 'Diễn giải', 'Nội dung thanh toán', 'Nội dung giao dịch']);

  if (!orderNumber && !amount) {
    return null;
  }

  let finalOrderNumber = orderNumber;
  if (!finalOrderNumber) {
    const cleanDet = (details || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
    finalOrderNumber = `AUTO-${transDate.replace(/-/g, '')}-${amount}-${cleanDet}`;
  }

  return {
    order_number: finalOrderNumber,
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

export function matchKeyword(cleanDetails: string, kw: string): boolean {
  const cleanedKw = cleanString(kw);
  if (!cleanedKw) return false;

  if (cleanedKw.includes(' ')) {
    return cleanDetails.includes(cleanedKw);
  } else {
    const words = cleanDetails.split(/[\s,._-]+/).filter(Boolean);
    return words.includes(cleanedKw) || new RegExp(`\\b${cleanedKw}\\b`, 'i').test(cleanDetails);
  }
}

export async function stopImapIdleListener() {
  if (imapClientInstance) {
    try {
      isIdleListening = false;
      const client = imapClientInstance;
      imapClientInstance = null;
      await client.logout();
    } catch (e) {}
  }
}

export async function syncBankReceipts(clientKeywords?: Record<string, string>, userIdParam?: string): Promise<BankReceipt[]> {
  // Pause IDLE listener temporarily to prevent IMAP connection pool overflow
  await stopImapIdleListener();

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

  const clientAdmin = getSupabaseAdmin();
  let existingMap = new Map<string, BankReceipt>();
  let ruleList: ReceiptRule[] = [];
  let categoryBudgetsList: any[] = [];

  // Determine user ID for manual_transactions
  let targetUserId = userIdParam || '';
  if (!targetUserId) {
    try {
      const { data: profData } = await clientAdmin.from('profiles').select('id').limit(1).maybeSingle();
      if (profData && profData.id) {
        targetUserId = profData.id;
      }
    } catch (e) {}
  }

  // 1. Fetch existing receipts, rules, and category budgets from Supabase DB FIRST
  try {
    const [receiptsRes, rulesRes, budgetsRes] = await Promise.all([
      clientAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
      clientAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false }),
      clientAdmin.from('category_budgets').select('*')
    ]);

    let dbReceipts: BankReceipt[] = [];
    if (receiptsRes.data) {
      dbReceipts = receiptsRes.data as BankReceipt[];
    }
    if (rulesRes.data) {
      ruleList = rulesRes.data as ReceiptRule[];
    }
    const defaultKeywords: Record<string, string> = {
      'Lương': 'luong',
      'Giáo dục': 'day hoc, day, cham cong',
      'Đầu tư': 'dau tu, chung khoan',
      'Khác': 'khac',
      'Ăn uống': 'an uong, do an, food, com, an',
      'Di chuyển': 'xang, grab, taxi, di lai',
      'Shopping': 'shopping, mua sam',
      'Hóa đơn': 'hoa don, dien nuoc, wifi',
      'Giải trí': 'giai tri, xem phim, du lich',
      'Tiết kiệm khẩn cấp': 'tiet kiem khan cap, khan cap',
      'Tích lũy dài hạn': 'tich luy dai han, tich luy',
      'Tiết kiệm khác': 'tiet kiem khac'
    };

    if (budgetsRes.data && budgetsRes.data.length > 0) {
      categoryBudgetsList = budgetsRes.data.map((b: any) => ({
        category: b.category,
        keywords: b.keywords || defaultKeywords[b.category] || ''
      }));
    } else {
      categoryBudgetsList = Object.keys(defaultKeywords).map(cat => ({
        category: cat,
        keywords: defaultKeywords[cat]
      }));
    }

    if (clientKeywords) {
      const clientBudgets = Object.keys(clientKeywords).map(cat => ({
        category: cat,
        keywords: clientKeywords[cat]
      }));
      
      clientBudgets.forEach(cb => {
        const existing = categoryBudgetsList.find(x => x.category === cb.category);
        if (existing) {
          if (cb.keywords) existing.keywords = cb.keywords;
        } else {
          categoryBudgetsList.push(cb);
        }
      });
    }

    existingMap = new Map<string, BankReceipt>(dbReceipts.map(r => [r.id, r]));

    // Re-evaluate all unclassified receipts in database against keywords
    const unclassifiedReceipts = dbReceipts.filter((r: any) => r.status === 'unclassified');
    if (unclassifiedReceipts.length > 0 && categoryBudgetsList.length > 0) {
      for (const receipt of unclassifiedReceipts) {
        const cleanDetails = cleanString(receipt.details || '');
        let matched = false;
        for (const budget of categoryBudgetsList) {
          if (budget.keywords) {
            const kwList = budget.keywords.split(',').map((kw: string) => cleanString(kw)).filter(Boolean);
            for (const kw of kwList) {
              if (matchKeyword(cleanDetails, kw)) {
                const savingCats = ['Tiết kiệm khẩn cấp', 'Tích lũy dài hạn', 'Tiết kiệm khác', 'Tiết kiệm'];
                const matchedType: 'income' | 'expense' | 'saving' = savingCats.includes(budget.category) ? 'saving' : 'expense';
                
                const updatedReceipt = {
                  ...receipt,
                  status: 'classified' as const,
                  type: matchedType,
                  category: budget.category
                };
                
                existingMap.set(receipt.id, updatedReceipt);
                
                (async () => {
                  try {
                    await clientAdmin.from('bank_receipts').upsert(updatedReceipt, { onConflict: 'id' });
                    
                    if (targetUserId) {
                      const txRecord = {
                        id: `tx-receipt-${receipt.id}`,
                        user_id: targetUserId,
                        teacher_name: 'Admin',
                        desc_text: `[Biên lai] ${updatedReceipt.remitter_name || ''} ➔ ${updatedReceipt.beneficiary_name || ''}: ${updatedReceipt.details}`,
                        amount: updatedReceipt.amount,
                        type: matchedType === 'saving' ? 'expense' : matchedType,
                        category: budget.category,
                        date: updatedReceipt.trans_date
                      };
                      await clientAdmin.from('manual_transactions').upsert(txRecord, { onConflict: 'id' });
                    }
                  } catch (dbErr) {
                    console.error('[IMAP Sync] DB background update failed:', dbErr);
                  }
                })();
                
                matched = true;
                break;
              }
            }
          }
          if (matched) break;
        }
      }
    }
  } catch (e) {
    console.error('[IMAP Sync] Error loading metadata from Supabase DB:', e);
  }

  // 2. Fetch new emails from Gmail IMAP for current month (with 45s timeout safeguard)
  try {
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('IMAP connection timeout (45s)')), 45000));
    await Promise.race([connectPromise, timeoutPromise]);

    const lock = await client.getMailboxLock('INBOX');

    try {
      const now = new Date();
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Try targeted IMAP search for Vietcombank sender & receipt subject
      const targetSender = sender || 'VCBDigibank@info.vietcombank.com.vn';
      let searchResult = await client.search({ since: firstDayOfCurrentMonth, from: targetSender });
      if (!searchResult || searchResult.length === 0) {
        searchResult = await client.search({ since: firstDayOfCurrentMonth });
      }
      if (!searchResult || searchResult.length === 0) {
        searchResult = await client.search({ from: targetSender });
      }

      const msgIds = Array.isArray(searchResult) ? searchResult : [];

      if (msgIds.length > 0) {
        for (const seq of msgIds) {
          const message = await client.fetchOne(seq, { source: true, envelope: true });
          if (!message || !message.source) continue;

          const parsed = await simpleParser(message.source);
          const subject = parsed.subject || '';
          const fromAddr = parsed.from ? parsed.from.text : '';
          const bodyText = parsed.text || '';
          const htmlText = typeof parsed.html === 'string' ? parsed.html : '';

          const cleanSubj = cleanString(subject);
          const cleanFrom = cleanString(fromAddr);
          const cleanText = cleanString(bodyText);
          const cleanHtml = cleanString(htmlText);

          // Strictly filter for sender VCBDigibank@info.vietcombank.com.vn & topic Biên lai chuyển tiền qua tài khoản
          const isVcbSender = cleanFrom.includes('vcbdigibank@info.vietcombank.com.vn') || 
                              cleanFrom.includes('vietcombank') || 
                              cleanFrom.includes('vcb');
          
          const isReceiptSubject = cleanSubj.includes('bien lai chuyen tien qua tai khoan') || 
                                   cleanSubj.includes('bien lai chuyen tien') || 
                                   cleanSubj.includes('bien lai');

          const isBankContent = cleanText.includes('vietcombank') || cleanHtml.includes('vietcombank');

          const isBankEmail = isVcbSender || isReceiptSubject || isBankContent;

          if (!isBankEmail) continue;

          const html = parsed.html || '';
          const text = parsed.text || '';

          const receiptData = parseVietcombankEmail(typeof html === 'string' ? html : '', text || '');
          if (!receiptData || !receiptData.order_number) continue;

          const receiptId = `vcb-${receiptData.order_number}`;

          // If already classified or in DB, keep existing state
          if (existingMap.has(receiptId)) {
            const cached = existingMap.get(receiptId);
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
          for (const budget of categoryBudgetsList) {
            if (budget.keywords) {
              const kwList = budget.keywords.split(',').map((kw: string) => cleanString(kw)).filter(Boolean);
              for (const kw of kwList) {
                if (matchKeyword(cleanDetails, kw)) {
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
            category: matchedCategory,
            user_id: targetUserId || undefined
          };

          existingMap.set(receiptId, newReceipt);

          // Save directly to Supabase DB
          try {
            const receiptPayload = targetUserId ? { ...newReceipt, user_id: targetUserId } : newReceipt;
            const { error: dbErr } = await clientAdmin.from('bank_receipts').upsert(receiptPayload, { onConflict: 'id' });
            if (dbErr) console.error('[Supabase bank_receipts upsert error]', dbErr.message);

            if (status === 'classified' && matchedType && matchedCategory && targetUserId) {
              const txRecord = {
                id: `tx-receipt-${receiptId}`,
                user_id: targetUserId,
                teacher_name: 'Admin',
                desc_text: `[Biên lai Vietcombank] ${newReceipt.remitter_name || ''} ➔ ${newReceipt.beneficiary_name || ''}: ${newReceipt.details}`,
                amount: newReceipt.amount,
                type: matchedType === 'saving' ? 'expense' : matchedType,
                category: matchedCategory,
                date: newReceipt.trans_date
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

  // Combine DB receipts with in-memory map of newly parsed IMAP receipts
  try {
    const { data: dbData } = await clientAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false });
    if (dbData && Array.isArray(dbData)) {
      dbData.forEach((r: BankReceipt) => {
        if (!existingMap.has(r.id)) {
          existingMap.set(r.id, r);
        }
      });
    }
  } catch (e) {}

  const finalReceiptsList = Array.from(existingMap.values()).sort((a, b) => b.trans_date.localeCompare(a.trans_date));

  broadcastSseEvent('new-receipt', { receipts: finalReceiptsList });
  return finalReceiptsList;
}

export async function startImapIdleListener() {
  // Disabled background IDLE persistent connection to avoid Gmail IMAP connection limits
  return;
}
