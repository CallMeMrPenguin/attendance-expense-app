import { NextResponse } from 'next/server';
import { syncBankReceipts } from '@/lib/imap-service';

export async function GET(req: Request) {
  try {
    console.log('[Local Cron] Starting scheduled IMAP bank receipt sync...');
    const receipts = await syncBankReceipts();
    console.log(`[Local Cron] Completed IMAP bank receipt sync. Total receipts in DB: ${receipts.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: receipts.length,
      receipts
    });
  } catch (error: any) {
    console.error('[Local Cron Error] Bank receipts sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
