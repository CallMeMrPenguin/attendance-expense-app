import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getDb } from '@/lib/db';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  const db = getDb();
  const profile = db.prepare(`
    SELECT * FROM profiles 
    WHERE id = ? OR username = ? OR ('local_token_' || id) LIKE ?
    LIMIT 1
  `).get(token, token, `%${token}%`) as any;

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

    // 2. Migrate Sessions
    if (sessions.length > 0) {
      const sessionRecords = sessions.map((s: any) => ({
        id: s.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_name: s.teacherName || 'Admin',
        teacher_name: s.teacherName || 'Admin',
        job_name: s.jobName || 'Dạy học',
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

      const { error: sError } = await (adminClient
        .from('sessions') as any)
        .upsert(sessionRecords, { onConflict: 'id' });
      
      if (sError) {
        return NextResponse.json({ error: `Session batch insert failed: ${sError.message}` }, { status: 400 });
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
