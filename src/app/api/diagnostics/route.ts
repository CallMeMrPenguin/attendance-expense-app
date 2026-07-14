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

    teachersCount = tc || 0;
    profilesCount = pc || 0;
    sessionsCount = sc || 0;

    if (tErr || pErr || sErr) {
      errorMsg = {
        teachers: tErr?.message,
        profiles: pErr?.message,
        sessions: sErr?.message
      };
    }
  } catch (err: any) {
    errorMsg = err.message;
  }

  return NextResponse.json({
    supabaseUrl,
    teachersCount,
    profilesCount,
    sessionsCount,
    error: errorMsg
  });
}
