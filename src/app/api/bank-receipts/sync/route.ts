import { NextResponse } from 'next/server';
import { syncBankReceipts } from '@/lib/imap-service';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    let clientKeywords: Record<string, string> | undefined = undefined;
    try {
      const body = await req.json();
      if (body && body.keywords) {
        clientKeywords = body.keywords;
      }
    } catch (e) {}

    const receipts = await syncBankReceipts(clientKeywords);
    const supabaseAdmin = getSupabaseAdmin();
    
    const [allReceiptsRes, rulesRes] = await Promise.all([
      supabaseAdmin.from('bank_receipts').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('receipt_rules').select('*').order('created_at', { ascending: false })
    ]);

    return NextResponse.json({
      success: true,
      syncedCount: receipts.length,
      receipts: allReceiptsRes.data || [],
      rules: rulesRes.data || []
    });
  } catch (error: any) {
    console.error('POST /api/bank-receipts/sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
