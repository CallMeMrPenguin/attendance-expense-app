import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/data/teachers
export async function GET(_request: NextRequest) {
  const admin = getSupabaseAdmin();

  // Get teachers from teachers table
  const { data: teachersData } = await admin
    .from('teachers')
    .select('name')
    .neq('name', 'Giáo Viên 1')
    .order('name', { ascending: true });

  let list: string[] = teachersData
    ? teachersData.map((t: any) => t.name).filter((n: string) => n && n !== 'Giáo Viên 1')
    : [];

  // Fallback to profiles if teachers table is empty
  if (list.length === 0) {
    const { data: profileData } = await admin
      .from('profiles')
      .select('teacher_name')
      .order('teacher_name', { ascending: true });

    if (profileData) {
      const raw = profileData
        .map((p: any) => p.teacher_name)
        .filter((n: string) => n && n !== 'Giáo Viên 1');
      list = [...new Set(raw)] as string[];
    }
  }

  return NextResponse.json({ teachers: list });
}
