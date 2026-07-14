import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/sessions?teacher_name=...&month_year=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherName = searchParams.get('teacher_name');
  const monthYear = searchParams.get('month_year');

  if (!teacherName || !monthYear) {
    return NextResponse.json({ error: 'Missing teacher_name or month_year' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
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
