import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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
      database_type: 'Local SQLite (data/local.db)',
      port: 9000,
      teachers: tErr?.message || `OK (${tc || 0} rows)`,
      profiles: pErr?.message || `OK (${pc || 0} rows)`,
      sessions: sErr?.message || `OK (${sc || 0} rows)`,
      manual_transactions: txErr ? txErr.message : `OK (${txCount || 0} rows)`,
      savings_funds: fundErr ? fundErr.message : `OK (${fundCount || 0} rows)`,
      category_budgets: budgetErr ? budgetErr.message : `OK (${budgetCount || 0} rows)`,
      savings_history: histErr ? histErr.message : `OK (${histCount || 0} rows)`,
    };
  } catch (err: any) {
    errorMsg = err.message;
  }

  // Retrieve bank receipts directly from local DB
  let dbReceiptsCount = 0;
  let dbReceipts: any[] = [];
  try {
    const { data } = await admin
      .from('bank_receipts')
      .select('id, user_id, order_number, trans_date, debit_account, remitter_name, credit_account, beneficiary_name, beneficiary_bank, amount, details, status, type, category, created_at')
      .order('created_at', { ascending: false });
    dbReceipts = data || [];
    dbReceiptsCount = dbReceipts.length;
  } catch (e) {}

  return NextResponse.json({
    databaseType: 'Local SQLite Database (offline 100%)',
    teachersCount,
    profilesCount,
    sessionsCount,
    dbReceiptsCount,
    dbReceipts,
    diagnostics: errorMsg
  });
}
