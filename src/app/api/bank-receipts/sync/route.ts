import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncBankReceipts } from '@/lib/imap-service';

export async function POST(req: Request) {
  try {
    let userId: string | undefined = undefined;
    let keywords: Record<string, string> | undefined = undefined;
    try {
      const body = await req.json();
      if (body) {
        if (body.userId) userId = body.userId;
        if (body.keywords) keywords = body.keywords;
      }
    } catch (e) {}

    // Run active IMAP Gmail scan & keyword classification
    try {
      await syncBankReceipts(keywords, userId);
    } catch (syncErr) {
      console.error('[IMAP Sync Error in API route]:', syncErr);
    }

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
      supabaseAdmin
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
