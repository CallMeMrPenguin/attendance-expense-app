import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncBankReceipts, BankReceipt, ReceiptRule } from '@/lib/imap-service';

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
    }

    return NextResponse.json({
      success: true,
      receipts,
      rules
    });
  } catch (error: any) {
    console.error('GET /api/bank-receipts error:', error);
    return NextResponse.json({ success: true, receipts: [], rules: [] });
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

    // 1. Fetch targeted receipt from DB
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
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    // 2. Update receipt classification in DB
    const updatedReceipt: BankReceipt = {
      ...receipt,
      status: 'classified',
      type,
      category,
      user_id: userId || receipt.user_id
    };

    try {
      const { trans_time, ...receiptPayload } = updatedReceipt;
      await supabaseAdmin
        .from('bank_receipts')
        .upsert(receiptPayload, { onConflict: 'id' });
    } catch (e) {}

    // 3. Create or update manual_transaction
    const txId = `tx-receipt-${receiptId}`;
    const txRecord = {
      id: txId,
      user_id: userId || receipt.user_id,
      teacher_name: 'Admin',
      desc_text: `[Biên lai Vietcombank] ${receipt.remitter_name || ''} ➔ ${receipt.beneficiary_name || ''}: ${receipt.details}`,
      amount: Number(receipt.amount),
      type: type === 'saving' ? 'expense' : type,
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
      let dbUnclassified: BankReceipt[] = [];
      try {
        const { data } = await supabaseAdmin
          .from('bank_receipts')
          .select('*')
          .eq('status', 'unclassified');
        dbUnclassified = (data as BankReceipt[]) || [];
      } catch (e) {}

      for (const unRec of dbUnclassified) {
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

          try {
            const { trans_time, ...unRecPayload } = classifiedUnRec;
            await supabaseAdmin
              .from('bank_receipts')
              .upsert(unRecPayload, { onConflict: 'id' });

            const retroTx = {
              id: `tx-receipt-${unRec.id}`,
              user_id: userId || unRec.user_id,
              teacher_name: 'Admin',
              desc_text: `[Biên lai Vietcombank] ${unRec.remitter_name || ''} ➔ ${unRec.beneficiary_name || ''}: ${unRec.details}`,
              amount: Number(unRec.amount),
              type: type === 'saving' ? 'expense' : type,
              category,
              date: unRec.trans_date || new Date().toISOString().split('T')[0]
            };
            await supabaseAdmin.from('manual_transactions').upsert(retroTx, { onConflict: 'id' });
          } catch (e) {}
        }
      }
    }

    let finalReceipts: BankReceipt[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('bank_receipts')
        .select('*')
        .order('created_at', { ascending: false });
      finalReceipts = (data as BankReceipt[]) || [];
    } catch (e) {}

    return NextResponse.json({
      success: true,
      receipts: finalReceipts,
      rules: []
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
