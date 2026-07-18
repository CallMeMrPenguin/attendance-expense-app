import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = getSupabaseAdmin();

  let teachersCount = 0;
  let profilesCount = 0;
  let sessionsCount = 0;
  let errorMsg = null;

  try {
    const { count: tc, error: tErr } = await admin.from('teachers').select('*', { count: 'exact', head: true });
    const { count: pc, error: pErr } = await admin.from('profiles').select('*', { count: 'exact', head: true });
    const { count: sc, error: sErr } = await admin.from('sessions').select('*', { count: 'exact', head: true });

    const { count: txCount, error: txErr } = await admin.from('manual_transactions').select('*', { count: 'exact', head: true });
    const { count: fundCount, error: fundErr } = await admin.from('savings_funds').select('*', { count: 'exact', head: true });
    const { count: budgetCount, error: budgetErr } = await admin.from('category_budgets').select('*', { count: 'exact', head: true });
    const { count: histCount, error: histErr } = await admin.from('savings_history').select('*', { count: 'exact', head: true });

    teachersCount = tc || 0;
    profilesCount = pc || 0;
    sessionsCount = sc || 0;

    errorMsg = {
      teachers: tErr?.message || null,
      profiles: pErr?.message || null,
      sessions: sErr?.message || null,
      manual_transactions: txErr ? `${txErr.code}: ${txErr.message}` : `OK (${txCount || 0} rows)`,
      savings_funds: fundErr ? `${fundErr.code}: ${fundErr.message}` : `OK (${fundCount || 0} rows)`,
      category_budgets: budgetErr ? `${budgetErr.code}: ${budgetErr.message}` : `OK (${budgetCount || 0} rows)`,
      savings_history: histErr ? `${histErr.code}: ${histErr.message}` : `OK (${histCount || 0} rows)`,
    };
  } catch (err: any) {
    errorMsg = err.message;
  }

  // Retrieve cached receipts in memory
  let cachedReceipts: any[] = [];
  try {
    const { getCachedReceipts } = require('@/lib/imap-service');
    cachedReceipts = getCachedReceipts() || [];
  } catch (e) {}

  return NextResponse.json({
    supabaseUrl,
    teachersCount,
    profilesCount,
    sessionsCount,
    cachedReceiptsCount: cachedReceipts.length,
    cachedReceipts,
    diagnostics: errorMsg
  });
}
