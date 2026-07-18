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

    const receipts = await syncBankReceipts(clientKeywords);
    const supabaseAdmin = getSupabaseAdmin();
    
    // Perform database queries
    const queries: any[] = [
      supabaseAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false })
    ];

    if (userId) {
      queries.push(
        supabaseAdmin.from('manual_transactions').select('*').eq('user_id', userId).order('date', { ascending: false })
      );
    }

    const results = await Promise.all(queries);
    const dbRules = results[0]?.data || [];
    const dbTxs = userId ? (results[1]?.data || []) : [];

    // Construct in-memory transaction records for any receipts that are classified but might not be in DB
    const memoryTransactions = receipts
      .filter((r: any) => r.status === 'classified' && r.type && r.category)
      .map((r: any) => {
        const txId = r.id.startsWith('tx-receipt-') ? r.id : `tx-receipt-${r.id.startsWith('vcb-') ? '' : 'vcb-'}${r.id}`;
        return {
          id: txId,
          desc: `[Biên lai] ${r.remitter_name || ''} ➔ ${r.beneficiary_name || ''}: ${r.details}`,
          amount: Number(r.amount) || 0,
          type: r.type,
          category: r.category,
          date: r.trans_date
        };
      });

    // Format the database transactions
    const formattedDbTxs = dbTxs.map((t: any) => ({
      id: t.id,
      desc: t.desc_text || t.desc || '',
      amount: Number(t.amount) || 0,
      type: t.type,
      category: t.category,
      date: t.date
    }));

    // Merge them using a map to prevent duplicates, preferring DB entries
    const txMap = new Map<string, any>();
    memoryTransactions.forEach((tx: any) => txMap.set(tx.id, tx));
    formattedDbTxs.forEach((tx: any) => txMap.set(tx.id, tx));
    
    const finalTransactions = Array.from(txMap.values());

    return NextResponse.json({
      success: true,
      syncedCount: receipts.length,
      receipts,
      rules: dbRules,
      transactions: finalTransactions
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts/sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
