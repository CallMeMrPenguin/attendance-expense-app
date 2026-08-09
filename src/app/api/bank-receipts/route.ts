import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { BankReceipt, ReceiptRule, isDefaultTransferDetails } from '@/lib/imap-service';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    let receipts: BankReceipt[] = [];
    let rules: ReceiptRule[] = [];

    try {
      const [receiptsRes, rulesRes] = await Promise.all([
        supabaseAdmin
          .from('bank_receipts')
          .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('receipt_rules')
          .select('id, user_id, match_field, match_value, target_type, target_category, created_at')
          .order('created_at', { ascending: false })
      ]);
      receipts = receiptsRes.data || [];
      rules = rulesRes.data || [];
    } catch (e) {
      // DB missing error
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
    const { receiptId, type, category, userId, createRule, matchField, matchValue, note, unclassify } = body;

    if (!receiptId) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (unclassify) {
      const rawId = String(receiptId).replace(/^tx-receipt-/, '').replace(/^vcb-/, '');
      const txId = `tx-receipt-${rawId}`;

      try {
        await (supabaseAdmin
          .from('bank_receipts') as any)
          .update({
            status: 'unclassified',
            type: null,
            category: null
          })
          .eq('id', receiptId);

        await supabaseAdmin
          .from('manual_transactions')
          .delete()
          .in('id', [receiptId, txId, rawId, `vcb-${rawId}`]);
      } catch (e) {}

      let finalReceipts: BankReceipt[] = [];
      try {
        const { data } = await supabaseAdmin
          .from('bank_receipts')
          .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
          .order('created_at', { ascending: false });
        finalReceipts = (data as BankReceipt[]) || [];
      } catch (e) {}

      return NextResponse.json({
        success: true,
        receipts: finalReceipts
      });
    }

    if (!type || !category) {
      return NextResponse.json({ success: false, error: 'Missing type or category' }, { status: 400 });
    }
    const trimmedNote = note ? String(note).trim() : '';

    // 1. Fetch targeted receipt from DB
    let receipt: BankReceipt | undefined;
    try {
      const { data } = await supabaseAdmin
        .from('bank_receipts')
        .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
        .eq('id', receiptId)
        .maybeSingle();
      if (data) receipt = data as BankReceipt;
    } catch (e) {}

    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    const baseDetails = (receipt.details || '').split(' | Ghi chú: ')[0];
    const updatedDetails = trimmedNote ? `${baseDetails} | Ghi chú: ${trimmedNote}` : baseDetails;

    // 2. Update receipt classification in DB
    const updatedReceipt: BankReceipt = {
      ...receipt,
      status: 'classified',
      type,
      category,
      details: updatedDetails,
      user_id: userId || receipt.user_id
    };

    try {
      const { trans_time, ...receiptPayload } = updatedReceipt;
      await supabaseAdmin
        .from('bank_receipts')
        .upsert(receiptPayload as any, { onConflict: 'id' });
    } catch (e) {}

    // 3. Create or update manual_transaction
    const txId = `tx-receipt-${receiptId}`;
    const notePrefix = trimmedNote ? `${trimmedNote} ` : '';
    const descText = `${notePrefix}[Biên lai Vietcombank] ${receipt.remitter_name || ''} ➔ ${receipt.beneficiary_name || ''}: ${baseDetails}`;

    const txRecord = {
      id: txId,
      user_id: userId || receipt.user_id,
      user_name: 'Admin',
      desc_text: descText,
      amount: Number(receipt.amount),
      type: type === 'saving' ? 'expense' : type,
      category,
      date: receipt.trans_date || new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await supabaseAdmin.from('manual_transactions').upsert(txRecord as any, { onConflict: 'id' });
      if (error) {
        const { user_name, ...fallbackTx } = txRecord as any;
        fallbackTx.teacher_name = user_name;
        await supabaseAdmin.from('manual_transactions').upsert(fallbackTx as any, { onConflict: 'id' });
      }
    } catch (e) {}

    // 4. Save auto-classification rule if requested (ignore default transfer descriptions like 'bui duc hung chuyen tien')
    const isDefault = (matchField === 'details' || matchField === 'remitter_beneficiary_details') && isDefaultTransferDetails(matchValue);

    if (createRule && matchField && matchValue && !isDefault) {
      const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ruleRecord = {
        id: ruleId,
        user_id: userId || receipt.user_id,
        match_field: matchField === 'credit_account' ? 'details' : matchField,
        match_value: matchValue,
        target_type: type,
        target_category: category
      };
      try {
        await supabaseAdmin.from('receipt_rules').upsert(ruleRecord as any, { onConflict: 'id' });
      } catch (e) {}

      // 5. Retroactively classify all unclassified receipts matching this rule!
      let dbUnclassified: BankReceipt[] = [];
      try {
        const { data } = await supabaseAdmin
          .from('bank_receipts')
          .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
          .eq('status', 'unclassified');
        dbUnclassified = (data as BankReceipt[]) || [];
      } catch (e) {}

      for (const unRec of dbUnclassified) {
        let fieldVal = '';
        if (matchField === 'sender_name' || matchField === 'remitter_name') fieldVal = unRec.sender_name || unRec.remitter_name || '';
        else if (matchField === 'credit_account') fieldVal = unRec.credit_account || '';
        else if (matchField === 'details') fieldVal = `${unRec.details || ''} ${unRec.credit_account || ''}`;
        else if (matchField === 'beneficiary_name') fieldVal = `${unRec.credit_account || ''} ${unRec.beneficiary_name || ''}`;

        if (fieldVal && fieldVal.toLowerCase().includes(matchValue.toLowerCase())) {
          const unBaseDetails = (unRec.details || '').split(' | Ghi chú: ')[0];
          const unUpdatedDetails = trimmedNote ? `${unBaseDetails} | Ghi chú: ${trimmedNote}` : unBaseDetails;

          const classifiedUnRec: BankReceipt = {
            ...unRec,
            status: 'classified',
            type,
            category,
            details: unUpdatedDetails
          };

          try {
            const { trans_time, ...unRecPayload } = classifiedUnRec;
            await supabaseAdmin
              .from('bank_receipts')
              .upsert(unRecPayload as any, { onConflict: 'id' });

            const retroTx = {
              id: `tx-receipt-${unRec.id}`,
              user_id: userId || unRec.user_id,
              user_name: 'Admin',
              teacher_name: 'Admin',
              desc_text: `${notePrefix}[Biên lai Vietcombank] ${unRec.sender_name || unRec.remitter_name || ''} ➔ ${unRec.beneficiary_name || ''}: ${unBaseDetails}`,
              amount: Number(unRec.amount),
              type: type === 'saving' ? 'expense' : type,
              category,
              date: unRec.trans_date || new Date().toISOString().split('T')[0]
            };
            await supabaseAdmin.from('manual_transactions').upsert(retroTx as any, { onConflict: 'id' });
          } catch (e) {}
        }
      }
    }

    let finalReceipts: BankReceipt[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('bank_receipts')
        .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
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
