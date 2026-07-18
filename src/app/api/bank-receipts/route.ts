import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncBankReceipts, BankReceipt, ReceiptRule } from '@/lib/imap-service';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch receipts & rules from DB
    const [receiptsRes, rulesRes] = await Promise.all([
      supabaseAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false })
    ]);

    let receipts: BankReceipt[] = receiptsRes.data || [];
    const rules: ReceiptRule[] = rulesRes.data || [];

    if (receipts.length === 0) {
      // If DB is empty, await sync synchronously to return fresh receipts immediately
      receipts = await syncBankReceipts();
    } else {
      // Trigger background sync for updates
      syncBankReceipts().catch(err => console.error('Background sync error:', err));
    }

    return NextResponse.json({
      success: true,
      receipts,
      rules
    });
  } catch (error: any) {
    console.error('GET /api/bank-receipts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    // 1. Fetch targeted receipt
    const { data: receipt, error: fetchErr } = await supabaseAdmin
      .from('bank_receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (fetchErr || !receipt) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    // 2. Update receipt classification
    const { error: updateErr } = await supabaseAdmin
      .from('bank_receipts')
      .update({
        status: 'classified',
        type,
        category,
        user_id: userId || receipt.user_id
      })
      .eq('id', receiptId);

    if (updateErr) throw updateErr;

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

    await supabaseAdmin.from('manual_transactions').upsert(txRecord, { onConflict: 'id' });

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
      await supabaseAdmin.from('receipt_rules').upsert(ruleRecord, { onConflict: 'id' });

      // 5. Retroactively classify all unclassified receipts matching this rule!
      const { data: unclassifiedList } = await supabaseAdmin
        .from('bank_receipts')
        .select('*')
        .eq('status', 'unclassified');

      if (unclassifiedList && unclassifiedList.length > 0) {
        for (const unRec of unclassifiedList) {
          let fieldVal = '';
          if (matchField === 'remitter_name') fieldVal = unRec.remitter_name || '';
          else if (matchField === 'beneficiary_name') fieldVal = unRec.beneficiary_name || '';
          else if (matchField === 'details') fieldVal = unRec.details || '';

          if (fieldVal && fieldVal.toLowerCase().includes(matchValue.toLowerCase())) {
            await supabaseAdmin
              .from('bank_receipts')
              .update({ status: 'classified', type, category })
              .eq('id', unRec.id);

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
          }
        }
      }
    }

    // Return updated receipts list
    const [receiptsRes, rulesRes] = await Promise.all([
      supabaseAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false })
    ]);

    return NextResponse.json({
      success: true,
      receipts: receiptsRes.data || [],
      rules: rulesRes.data || []
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
