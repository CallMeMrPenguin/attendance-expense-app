import { NextResponse } from 'next/server';
import { syncBankReceipts } from '@/lib/imap-service';

export const maxDuration = 60; // Max allowed duration on Vercel Pro/Hobby

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Ensure cron calls are authorized by Vercel Cron Secret if set
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    console.log('[Cron] Starting scheduled 30-min IMAP bank receipt sync...');
    const receipts = await syncBankReceipts();
    console.log(`[Cron] Completed IMAP bank receipt sync. Total receipts in DB: ${receipts.length}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: receipts.length,
      receipts
    });
  } catch (error: any) {
    console.error('[Cron Error] Bank receipts sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
