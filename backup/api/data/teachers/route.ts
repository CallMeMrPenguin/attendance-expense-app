import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

  const { data: teachersData } = await client
    .from('teachers')
    .select('name')
    .neq('name', 'Giáo Viên 1')
    .order('name', { ascending: true });

  let list: string[] = teachersData
    ? teachersData.map((t: any) => t.name).filter((n: string) => n && n !== 'Giáo Viên 1')
    : [];

  // Fallback to profiles if teachers table is empty
  if (list.length === 0) {
    const { data: profileData } = await client
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
