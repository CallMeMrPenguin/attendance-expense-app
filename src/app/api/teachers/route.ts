import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

// Helper to normalize username from teacher name
function generateUsername(name: string): string {
  if (!name) return 'user';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '') // remove special chars
    || 'user';
}

// Helper to authenticate the requester and check admin role
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'No authorization header', status: 401 };
  }

  // Verify the user token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Invalid or expired session', status: 401 };
  }

  // Check admin role in profiles
  const adminClient = getSupabaseAdmin();
  const { data: profile, error: dbError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbError || !profile || profile.role !== 'admin') {
    return { error: 'Access denied: Admin role required', status: 403 };
  }

  return { user, adminClient };
}

// 1. ADD TEACHER
export async function POST(request: NextRequest) {
  try {
    const { error, adminClient } = await verifyAdmin(request);
    if (error || !adminClient) {
      return NextResponse.json({ error }, { status: error === 'No authorization header' ? 401 : 403 });
    }

    const { name, role = 'teacher', password = '123' } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const username = generateUsername(trimmedName);
    const mockEmail = `${username}@giasupro.com`;

    // Create user in Supabase auth (this triggers profiles and teachers insertion)
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: mockEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: role,
        teacher_name: trimmedName,
        username: username
      }
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: `Teacher "${trimmedName}" created successfully!`,
      user: {
        id: authData.user.id,
        username: username,
        teacherName: trimmedName,
        role: role
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. RENAME TEACHER
export async function PUT(request: NextRequest) {
  try {
    const { error, adminClient } = await verifyAdmin(request);
    if (error || !adminClient) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { oldName, newName } = await request.json();
    if (!oldName || !newName || !oldName.trim() || !newName.trim()) {
      return NextResponse.json({ error: 'Old and new teacher names are required' }, { status: 400 });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    // 1. Update teachers table (this cascades ON UPDATE to public.profiles and public.sessions)
    const { error: renameError } = await adminClient
      .from('teachers')
      .update({ name: trimmedNew })
      .eq('name', trimmedOld);

    if (renameError) {
      return NextResponse.json({ error: renameError.message }, { status: 400 });
    }

    // 2. Query the updated profile to get the auth user ID and update metadata + username
    const newUsername = generateUsername(trimmedNew);
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('teacher_name', trimmedNew)
      .single();

    if (!profileError && profile) {
      // Update username in profiles
      await adminClient
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', profile.id);

      // Update auth user metadata
      await adminClient.auth.admin.updateUserById(profile.id, {
        email: `${newUsername}@giasupro.com`, // Sync email too!
        user_metadata: {
          teacher_name: trimmedNew,
          username: newUsername
        }
      });
    }

    return NextResponse.json({
      status: 'success',
      message: `Teacher renamed from "${trimmedOld}" to "${trimmedNew}" successfully!`,
      newUsername
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. DELETE TEACHER
export async function DELETE(request: NextRequest) {
  try {
    const { error, adminClient } = await verifyAdmin(request);
    if (error || !adminClient) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // 1. Find the corresponding auth user ID
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('teacher_name', trimmedName)
      .single();

    if (profileError || !profile) {
      // If no profile, just delete from teachers table directly
      const { error: deleteError } = await adminClient
        .from('teachers')
        .delete()
        .eq('name', trimmedName);
      
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }
    } else {
      // 2. Delete auth user (this will cascade delete profile via foreign key,
      // and delete sessions since teacher is removed)
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(profile.id);
      if (deleteAuthError) {
        return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
      }

      // Also ensure teacher row is deleted (in case cascade did not cover it)
      await adminClient
        .from('teachers')
        .delete()
        .eq('name', trimmedName);
    }

    return NextResponse.json({
      status: 'success',
      message: `Teacher "${trimmedName}" and all related data deleted successfully!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
