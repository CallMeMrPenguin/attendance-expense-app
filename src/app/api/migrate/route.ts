import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;
  return getSupabaseAdmin();
}

// Direct purge and cleanup endpoint
export async function GET() {
  try {
    const adminClient = getSupabaseAdmin();
    
    // Purge Giáo Viên 1 records
    await (adminClient.from('sessions') as any).delete().eq('teacher_name', 'Giáo Viên 1');
    await (adminClient.from('profiles') as any).delete().eq('teacher_name', 'Giáo Viên 1');
    await (adminClient.from('teachers') as any).delete().eq('name', 'Giáo Viên 1');
    
    // Normalize role 'teacher' -> 'user'
    await (adminClient.from('profiles') as any).update({ role: 'user' }).eq('role', 'teacher');

    return NextResponse.json({ status: 'success', message: 'Legacy records purged and roles normalized successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = await verifyAdmin(request);
    if (!adminClient) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { sessions = [], teachers = [] } = await request.json();

    // 1. Migrate Teachers
    if (teachers.length > 0) {
      const teacherRecords = teachers
        .filter((t: any) => t && String(t).trim())
        .map((t: string) => ({ name: t.trim() }));
        
      const { error: tError } = await (adminClient
        .from('teachers') as any)
        .upsert(teacherRecords, { onConflict: 'name' });
      
      if (tError) {
        return NextResponse.json({ error: `Teacher upsert failed: ${tError.message}` }, { status: 400 });
      }
    }

    // 2. Migrate Sessions (Map JSON keys camelCase to Postgres snake_case)
    if (sessions.length > 0) {
      const sessionRecords = sessions.map((s: any) => ({
        teacher_name: s.teacherName || 'Giáo Viên 1',
        student_name: s.studentName || 'Học Sinh',
        day_of_week: s.dayOfWeek || 'Thứ 2',
        time: s.time || '18:00',
        duration: Number(s.duration) || 1.5,
        price: Number(s.price) || 0,
        status: s.status || 'Chưa dạy',
        grade: s.grade || '',
        homework: s.homework || '',
        note: s.note || '',
        month_year: s.monthYear || '',
        color: s.color || '#2563eb',
        date: s.date || ''
      }));

      // Delete existing sessions to avoid duplicates if re-migrating
      // (Optional safeguard, let's just insert them in chunks)
      const batchSize = 100;
      for (let i = 0; i < sessionRecords.length; i += batchSize) {
        const batch = sessionRecords.slice(i, i + batchSize);
        const { error: sError } = await (adminClient
          .from('sessions') as any)
          .insert(batch);
        
        if (sError) {
          return NextResponse.json({ error: `Session batch insert failed: ${sError.message}` }, { status: 400 });
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Migrated ${teachers.length} teachers and ${sessions.length} sessions successfully!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
