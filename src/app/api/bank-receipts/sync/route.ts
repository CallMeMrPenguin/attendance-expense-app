import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    let userId: string | undefined = undefined;
    try {
      const body = await req.json();
      if (body && body.userId) userId = body.userId;
    } catch (e) {}

    // Immediately return current DB receipts, rules, and transactions (<50ms)
    const supabaseAdmin = getSupabaseAdmin();

    const [receiptsRes, rulesRes, txsRes] = await Promise.all([
      supabaseAdmin
        .from('bank_receipts')
        .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('receipt_rules')
        .select('id, user_id, match_field, match_value, target_type, target_category, created_at')
        .order('created_at', { ascending: false }),
      userId 
        ? supabaseAdmin
            .from('manual_transactions')
            .select('id, user_id, teacher_name, desc_text, amount, type, category, date, created_at')
            .eq('user_id', userId)
            .order('date', { ascending: false })
        : supabaseAdmin
            .from('manual_transactions')
            .select('id, user_id, teacher_name, desc_text, amount, type, category, date, created_at')
            .order('date', { ascending: false })
    ]);

    const dbReceipts = receiptsRes.data || [];
    const dbRules = rulesRes.data || [];
    const dbTxs = txsRes.data || [];

    const formattedTxs = dbTxs.map((t: any) => ({
      id: t.id,
      desc: t.desc_text || '',
      amount: Number(t.amount) || 0,
      type: t.type,
      category: t.category,
      date: t.date
    }));

    return NextResponse.json({
      success: true,
      syncing: false,
      syncedCount: dbReceipts.length,
      receipts: dbReceipts,
      rules: dbRules,
      transactions: formattedTxs
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts/sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
