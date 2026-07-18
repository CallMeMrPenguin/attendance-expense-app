import { NextResponse } from 'next/server';
import { syncBankReceipts } from '@/lib/imap-service';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    let clientKeywords: Record<string, string> | undefined = undefined;
    let userId: string | undefined = undefined;
    try {
      const body = await req.json();
      if (body) {
        if (body.keywords) clientKeywords = body.keywords;
        if (body.userId) userId = body.userId;
      }
    } catch (e) {}

    // 1. Trigger background IMAP sync non-blocking to prevent HTTP request timeout
    syncBankReceipts(clientKeywords, userId).catch(err => {
      console.error('[Background IMAP Sync Error]:', err);
    });

    // 2. Immediately return current DB receipts, rules, and transactions (<50ms)
    const supabaseAdmin = getSupabaseAdmin();

    const [receiptsRes, rulesRes, txsRes] = await Promise.all([
      supabaseAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false }),
      userId 
        ? supabaseAdmin.from('manual_transactions').select('*').eq('user_id', userId).order('date', { ascending: false })
        : supabaseAdmin.from('manual_transactions').select('*').order('date', { ascending: false })
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
      syncing: true,
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
