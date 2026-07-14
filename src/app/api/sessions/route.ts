import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherName = searchParams.get('teacher_name');
  const monthYear = searchParams.get('month_year');

  if (!teacherName || !monthYear) {
    return NextResponse.json({ error: 'Missing teacher_name or month_year' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  let client;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    client = getSupabaseAdmin();
  } else {
    const authHeader = request.headers.get('Authorization');
    client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
      auth: { persistSession: false }
    });
  }

  const { data, error } = await client
    .from('sessions')
    .select('*')
    .eq('teacher_name', teacherName)
    .eq('month_year', monthYear)
    .order('date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
