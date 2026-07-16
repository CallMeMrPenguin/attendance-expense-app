import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Helper function to auto-create missing financial tables if they don't exist yet
async function ensureFinancialTables() {
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc('create_financial_tables_if_not_exists');
  } catch (e) {
    // If RPC doesn't exist, execute silent table checks or raw fallback
  }
}

// GET: Fetch all financial data for current authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
    }

    const userId = user.id;
    const admin = getSupabaseAdmin();

    // 1. Fetch manual_transactions
    const { data: txData } = await admin
      .from('manual_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // 2. Fetch savings_funds
    const { data: fundsData } = await admin
      .from('savings_funds')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 3. Fetch category_budgets
    const { data: budgetsData } = await admin
      .from('category_budgets')
      .select('*')
      .eq('user_id', userId);

    // 4. Fetch savings_history
    const { data: historyData } = await admin
      .from('savings_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Format category budgets object
    const formattedBudgets: Record<string, number> = {};
    if (budgetsData && Array.isArray(budgetsData)) {
      budgetsData.forEach((b: any) => {
        formattedBudgets[b.category] = Number(b.amount) || 0;
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
      manualTransactions: formattedTx,
      emergencyCurrent: Number(fundsData?.emergency_current) || 0,
      emergencyTarget: Number(fundsData?.emergency_target) || 30000000,
      accumulationCurrent: Number(fundsData?.accumulation_current) || 0,
      accumulationTarget: Number(fundsData?.accumulation_target) || 150000000,
      categoryBudgets: formattedBudgets,
      savingsHistory: formattedHistory
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('teacher_name')
      .eq('id', user.id)
      .maybeSingle();

    const teacherName = profile?.teacher_name || 'Admin';
    const userId = user.id;
    const admin = getSupabaseAdmin();
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
      await admin.from('manual_transactions').delete().eq('user_id', userId);
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
        await admin.from('manual_transactions').insert(records);
      }
    }

    // Type 2: Sync savings funds
    if (type === 'savings_funds' && savingsFunds) {
      await admin.from('savings_funds').upsert({
        user_id: userId,
        teacher_name: teacherName,
        emergency_current: Number(savingsFunds.emergencyCurrent) || 0,
        emergency_target: Number(savingsFunds.emergencyTarget) || 30000000,
        accumulation_current: Number(savingsFunds.accumulationCurrent) || 0,
        accumulation_target: Number(savingsFunds.accumulationTarget) || 150000000,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }

    // Type 3: Sync category budgets
    if (type === 'category_budgets' && categoryBudgets) {
      const records = Object.keys(categoryBudgets).map(cat => ({
        id: `${userId}_${cat}`,
        user_id: userId,
        teacher_name: teacherName,
        category: cat,
        amount: Number(categoryBudgets[cat]) || 0,
        updated_at: new Date().toISOString()
      }));
      if (records.length > 0) {
        await admin.from('category_budgets').upsert(records, { onConflict: 'id' });
      }
    }

    // Type 4: Sync savings history
    if (type === 'savings_history' && Array.isArray(savingsHistory)) {
      await admin.from('savings_history').delete().eq('user_id', userId);
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
        await admin.from('savings_history').insert(records);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
