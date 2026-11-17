import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { syncBankReceipts } from '@/lib/imap-service';

export async function POST(req: Request) {
  try {
    let userId: string | undefined = undefined;
    let keywords: Record<string, string> | undefined = undefined;
    let forceFull: boolean = false;
    try {
      const body = await req.json();
      if (body) {
        if (body.userId) userId = body.userId;
        if (body.keywords) keywords = body.keywords;
        if (body.forceFull) forceFull = !!body.forceFull;
      }
    } catch (e) {}

    const supabaseAdmin = getSupabaseAdmin();

    // Count existing receipts before sync
    let beforeCount = 0;
    try {
      const { count } = await supabaseAdmin
        .from('bank_receipts')
        .select('id', { count: 'exact', head: true });
      beforeCount = count || 0;
    } catch (e) {}

    // Run active IMAP Gmail scan & keyword classification
    let syncErrorMsg: string | null = null;
    try {
      await syncBankReceipts(keywords, userId, forceFull);
    } catch (syncErr: any) {
      console.error('[IMAP Sync Error in API route]:', syncErr);
      syncErrorMsg = syncErr?.message || 'IMAP sync failed';
    }

    const [receiptsRes, rulesRes, txsRes] = await Promise.all([
      supabaseAdmin
        .from('bank_receipts')
        .select('*')
        .order('trans_date', { ascending: false }),
      supabaseAdmin
        .from('receipt_rules')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('manual_transactions')
        .select('*')
        .order('date', { ascending: false })
    ]);

    const dbReceipts = receiptsRes.data || [];
    const dbRules = rulesRes.data || [];
    const dbTxs = txsRes.data || [];
    const newlySyncedCount = Math.max(0, dbReceipts.length - beforeCount);

    const formattedTxs = dbTxs.map((t: any) => {
      const rawDesc = t.desc_text || t.desc || '';
      const isRecurring = !!(t.isRecurring || t.is_recurring || /^\[(CỐ ĐỊNH|RECURRING)\]/i.test(rawDesc));
      const desc = rawDesc.replace(/^\[(CỐ ĐỊNH|RECURRING)\]\s*/i, '');
      return {
        id: t.id,
        desc,
        amount: Number(t.amount) || 0,
        type: t.type,
        category: t.category,
        date: t.date,
        isRecurring,
        isManual: true
      };
    });

    return NextResponse.json({
      success: true,
      syncing: false,
      syncedCount: dbReceipts.length,
      newlySyncedCount,
      syncWarning: syncErrorMsg,
      receipts: dbReceipts,
      rules: dbRules,
      transactions: formattedTxs
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts/sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
