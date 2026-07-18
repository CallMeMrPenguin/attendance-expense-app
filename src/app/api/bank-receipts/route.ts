import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncBankReceipts, getCachedReceipts, updateCachedReceipt, BankReceipt, ReceiptRule } from '@/lib/imap-service';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    let receipts: BankReceipt[] = [];
    let rules: ReceiptRule[] = [];

    try {
      const [receiptsRes, rulesRes] = await Promise.all([
        supabaseAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false })
      ]);
      receipts = receiptsRes.data || [];
      rules = rulesRes.data || [];
    } catch (e) {
      // DB missing error
    }

    if (receipts.length === 0) {
      receipts = await syncBankReceipts();
    } else {
      syncBankReceipts().catch(err => console.error('Background sync error:', err));
    }

    // Merge with in-memory server cache
    const cacheMap = new Map<string, BankReceipt>();
    receipts.forEach(r => cacheMap.set(r.id, r));
    getCachedReceipts().forEach(r => cacheMap.set(r.id, { ...(cacheMap.get(r.id) || {}), ...r }));
    
    const finalReceipts = Array.from(cacheMap.values()).sort((a, b) => b.trans_date.localeCompare(a.trans_date));

    return NextResponse.json({
      success: true,
      receipts: finalReceipts,
      rules
    });
  } catch (error: any) {
    console.error('GET /api/bank-receipts error:', error);
    return NextResponse.json({ success: true, receipts: getCachedReceipts(), rules: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { receiptId, type, category, userId, createRule, matchField, matchValue } = body;

    if (!receiptId || !type || !category) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch targeted receipt from DB or in-memory cache
    let receipt: BankReceipt | undefined;
    try {
      const { data } = await supabaseAdmin
        .from('bank_receipts')
        .select('*')
        .eq('id', receiptId)
        .maybeSingle();
      if (data) receipt = data as BankReceipt;
    } catch (e) {}

    if (!receipt) {
      receipt = getCachedReceipts().find(r => r.id === receiptId);
    }

    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    // 2. Update receipt classification in memory and DB
    const updatedReceipt: BankReceipt = {
      ...receipt,
      status: 'classified',
      type,
      category,
      user_id: userId || receipt.user_id
    };

    updateCachedReceipt(updatedReceipt);

    try {
      await supabaseAdmin
        .from('bank_receipts')
        .upsert(updatedReceipt, { onConflict: 'id' });
    } catch (e) {}

    // 3. Create or update manual_transaction
    const txId = `tx-receipt-${receiptId}`;
    const txRecord = {
      id: txId,
      user_id: userId || receipt.user_id,
      teacher_name: 'Admin',
      desc_text: `[Biên lai Vietcombank] ${receipt.remitter_name || ''} ➔ ${receipt.beneficiary_name || ''}: ${receipt.details}`,
      amount: Number(receipt.amount),
      type,
      category,
      date: receipt.trans_date || new Date().toISOString().split('T')[0]
    };

    try {
      await supabaseAdmin.from('manual_transactions').upsert(txRecord, { onConflict: 'id' });
    } catch (e) {}

    // 4. Save auto-classification rule if requested
    if (createRule && matchField && matchValue) {
      const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ruleRecord = {
        id: ruleId,
        user_id: userId || receipt.user_id,
        match_field: matchField,
        match_value: matchValue,
        target_type: type,
        target_category: category
      };
      try {
        await supabaseAdmin.from('receipt_rules').upsert(ruleRecord, { onConflict: 'id' });
      } catch (e) {}

      // 5. Retroactively classify all unclassified receipts matching this rule!
      const cachedAll = getCachedReceipts();
      for (const unRec of cachedAll) {
        if (unRec.status === 'unclassified') {
          let fieldVal = '';
          if (matchField === 'remitter_name') fieldVal = unRec.remitter_name || '';
          else if (matchField === 'beneficiary_name') fieldVal = unRec.beneficiary_name || '';
          else if (matchField === 'details') fieldVal = unRec.details || '';

          if (fieldVal && fieldVal.toLowerCase().includes(matchValue.toLowerCase())) {
            const classifiedUnRec: BankReceipt = {
              ...unRec,
              status: 'classified',
              type,
              category
            };
            updateCachedReceipt(classifiedUnRec);

            try {
              await supabaseAdmin
                .from('bank_receipts')
                .upsert(classifiedUnRec, { onConflict: 'id' });

              const retroTx = {
                id: `tx-receipt-${unRec.id}`,
                user_id: userId || unRec.user_id,
                teacher_name: 'Admin',
                desc_text: `[Biên lai Vietcombank] ${unRec.remitter_name || ''} ➔ ${unRec.beneficiary_name || ''}: ${unRec.details}`,
                amount: Number(unRec.amount),
                type,
                category,
                date: unRec.trans_date || new Date().toISOString().split('T')[0]
              };
              await supabaseAdmin.from('manual_transactions').upsert(retroTx, { onConflict: 'id' });
            } catch (e) {}
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      receipts: getCachedReceipts(),
      rules: []
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
