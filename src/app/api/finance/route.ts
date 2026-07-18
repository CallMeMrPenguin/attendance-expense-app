import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET: Fetch all financial data for current authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const admin = getSupabaseAdmin();

    let userId: string | null = null;
    const { data: authUserData } = await admin.auth.getUser(token);
    if (authUserData?.user?.id) {
      userId = authUserData.user.id;
    } else {
      // Fallback: match profile by token or username/id if custom auth session
      const { data: matchedProfile } = await admin
        .from('profiles')
        .select('id')
        .or(`id.eq.${token},username.eq.${token}`)
        .maybeSingle();
      if (matchedProfile?.id) {
        userId = matchedProfile.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user session token' }, { status: 401 });
    }

    // 1. Fetch manual_transactions
    const { data: txData, error: txError } = await admin
      .from('manual_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // 2. Fetch savings_funds
    const { data: fundsData, error: fundsError } = await admin
      .from('savings_funds')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 3. Fetch category_budgets
    const { data: budgetsData, error: budgetsError } = await admin
      .from('category_budgets')
      .select('*')
      .eq('user_id', userId);

    // 4. Fetch savings_history
    const { data: historyData, error: historyError } = await admin
      .from('savings_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Check if tables are missing in Postgres DB (Code 42P01)
    const tableMissingErr = [txError, fundsError, budgetsError, historyError].find(
      err => err && (err.code === '42P01' || err.message?.includes('does not exist'))
    );

    if (tableMissingErr) {
      return NextResponse.json({
        tablesMissing: true,
        error: tableMissingErr.message,
        message: 'Financial tables do not exist in Supabase DB yet. Run schema.sql in Supabase SQL Editor.'
      });
    }

    // Format category budgets and keywords object
    const formattedBudgets: Record<string, number> = {};
    const formattedKeywords: Record<string, string> = {};
    if (budgetsData && Array.isArray(budgetsData)) {
      budgetsData.forEach((b: any) => {
        formattedBudgets[b.category] = Number(b.amount) || 0;
        formattedKeywords[b.category] = b.keywords || '';
      });
    }

    // Format transactions array
    const formattedTx = (txData || []).map((t: any) => ({
      id: t.id,
      desc: t.desc_text || t.desc || '',
      amount: Number(t.amount) || 0,
      type: t.type,
      category: t.category,
      date: t.date
    }));

    // Format savings history array
    const formattedHistory = (historyData || []).map((h: any) => ({
      id: h.id,
      fund: h.fund,
      type: h.type,
      amount: Number(h.amount) || 0,
      date: h.date
    }));

    return NextResponse.json({
      success: true,
      manualTransactions: formattedTx,
      emergencyCurrent: Number(fundsData?.emergency_current) || 0,
      emergencyTarget: Number(fundsData?.emergency_target) || 30000000,
      accumulationCurrent: Number(fundsData?.accumulation_current) || 0,
      accumulationTarget: Number(fundsData?.accumulation_target) || 150000000,
      categoryBudgets: formattedBudgets,
      categoryKeywords: formattedKeywords,
      savingsHistory: formattedHistory,
      hasData: (txData && txData.length > 0) || !!fundsData || (historyData && historyData.length > 0)
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save/Sync financial data to Supabase
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const admin = getSupabaseAdmin();

    let userId: string | null = null;
    const { data: authUserData } = await admin.auth.getUser(token);
    if (authUserData?.user?.id) {
      userId = authUserData.user.id;
    } else {
      const { data: matchedProfile } = await admin
        .from('profiles')
        .select('id')
        .or(`id.eq.${token},username.eq.${token}`)
        .maybeSingle();
      if (matchedProfile?.id) {
        userId = matchedProfile.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user session token' }, { status: 401 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('teacher_name')
      .eq('id', userId)
      .maybeSingle();

    const teacherName = profile?.teacher_name || 'Admin';
    const body = await request.json();

    const {
      type,
      transactions,
      savingsFunds,
      categoryBudgets,
      savingsHistory
    } = body;

    // Type 1: Sync manual transactions
    if (type === 'transactions' && Array.isArray(transactions)) {
      const { error: delErr } = await admin.from('manual_transactions').delete().eq('user_id', userId);
      if (delErr && delErr.code === '42P01') {
        return NextResponse.json({ tablesMissing: true, error: delErr.message }, { status: 400 });
      }

      if (transactions.length > 0) {
        const records = transactions.map((t: any) => ({
          id: t.id || `tx-${Date.now()}-${Math.random()}`,
          user_id: userId,
          teacher_name: teacherName,
          desc_text: t.desc || '',
          amount: Number(t.amount) || 0,
          type: t.type,
          category: t.category,
          date: t.date
        }));

        const { error: insErr } = await admin.from('manual_transactions').insert(records);
        if (insErr) {
          console.error('Failed to insert manual_transactions into Supabase:', insErr);
          return NextResponse.json({ error: insErr.message, code: insErr.code }, { status: 400 });
        }
      }
    }

    // Type 2: Sync savings funds
    if (type === 'savings_funds' && savingsFunds) {
      const { error: fundErr } = await admin.from('savings_funds').upsert({
        user_id: userId,
        teacher_name: teacherName,
        emergency_current: Number(savingsFunds.emergencyCurrent) || 0,
        emergency_target: Number(savingsFunds.emergencyTarget) || 30000000,
        accumulation_current: Number(savingsFunds.accumulationCurrent) || 0,
        accumulation_target: Number(savingsFunds.accumulationTarget) || 150000000,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (fundErr) {
        console.error('Failed to upsert savings_funds in Supabase:', fundErr);
        return NextResponse.json({ error: fundErr.message, code: fundErr.code }, { status: 400 });
      }
    }

    // Type 3: Sync category budgets & keywords
    if (type === 'category_budgets' && categoryBudgets) {
      const budgetsMap = categoryBudgets.budgets || categoryBudgets;
      const keywordsMap = categoryBudgets.keywords || {};
      const records = Object.keys(budgetsMap).map(cat => ({
        id: `${userId}_${cat}`,
        user_id: userId,
        teacher_name: teacherName,
        category: cat,
        amount: Number(budgetsMap[cat]) || 0,
        keywords: keywordsMap[cat] || null,
        updated_at: new Date().toISOString()
      }));

      if (records.length > 0) {
        const { error: bErr } = await admin.from('category_budgets').upsert(records, { onConflict: 'id' });
        if (bErr) {
          console.error('Failed to upsert category_budgets in Supabase:', bErr);
          return NextResponse.json({ error: bErr.message, code: bErr.code }, { status: 400 });
        }
      }
    }

    // Type 4: Sync savings history
    if (type === 'savings_history' && Array.isArray(savingsHistory)) {
      const { error: delHistErr } = await admin.from('savings_history').delete().eq('user_id', userId);
      if (delHistErr && delHistErr.code === '42P01') {
        return NextResponse.json({ tablesMissing: true, error: delHistErr.message }, { status: 400 });
      }

      if (savingsHistory.length > 0) {
        const records = savingsHistory.map((h: any) => ({
          id: h.id || `sh-${Date.now()}-${Math.random()}`,
          user_id: userId,
          teacher_name: teacherName,
          fund: h.fund,
          type: h.type,
          amount: Number(h.amount) || 0,
          date: h.date
        }));

        const { error: insHistErr } = await admin.from('savings_history').insert(records);
        if (insHistErr) {
          console.error('Failed to insert savings_history in Supabase:', insHistErr);
          return NextResponse.json({ error: insHistErr.message, code: insHistErr.code }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
