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

  // Check admin role in profiles using the authenticated userClient (RLS active)
  const { data: profile, error: dbError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbError || !profile || profile.role !== 'admin') {
    return { error: 'Access denied: Admin role required', status: 403 };
  }

  const adminClient = getSupabaseAdmin();
  return { user, adminClient, userClient };
}

// 1. ADD TEACHER
export async function POST(request: NextRequest) {
  try {
    const { error, adminClient, userClient } = await verifyAdmin(request);
    if (error || !adminClient || !userClient) {
      return NextResponse.json({ error }, { status: error === 'No authorization header' ? 401 : 403 });
    }

    const { name, role = 'teacher', password = '123456' } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên giáo viên không được để trống' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const username = generateUsername(trimmedName);
    const mockEmail = `${username}@giasupro.com`;

    // Ensure record exists in teachers table
    await userClient
      .from('teachers')
      .upsert({ name: trimmedName }, { onConflict: 'name' });

    // 1. Try to create user via adminClient (requires service role key)
    let authCreated = false;
    let authData: any = null;

    try {
      const { data, error: createError } = await adminClient.auth.admin.createUser({
        email: mockEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: role,
          teacher_name: trimmedName,
          username: username
        }
      });
      
      if (!createError && data?.user) {
        authCreated = true;
        authData = data;
      }
    } catch (authErr: any) {
      console.warn('Auth admin createUser skipped:', authErr.message);
    }

    // 2. Fallback to client-side auth.signUp using anon key
    if (!authCreated) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
        email: mockEmail,
        password: password,
        options: {
          data: {
            role: role,
            teacher_name: trimmedName,
            username: username
          }
        }
      });

      if (!signUpError && signUpData?.user) {
        authCreated = true;
        authData = signUpData;
      }
    }

    // Ensure profiles row exists for user even if trigger didn't run
    const userId = authData?.user?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0'));
    
    await userClient
      .from('profiles')
      .upsert({
        id: userId,
        username: username,
        teacher_name: trimmedName,
        role: role
      }, { onConflict: 'username' });

    return NextResponse.json({
      status: 'success',
      message: `Tài khoản giáo viên "${trimmedName}" đã được tạo thành công!`,
      user: {
        id: userId,
        username: username,
        teacherName: trimmedName,
        role: role
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. UPDATE TEACHER DETAILS (NAME, USERNAME, PASSWORD, ROLE)
export async function PUT(request: NextRequest) {
  try {
    const { error, adminClient, user, userClient } = await verifyAdmin(request);
    if (error || !adminClient || !userClient) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { oldName, newName, newUsername, newPassword, newRole } = await request.json();
    if (!oldName || !oldName.trim()) {
      return NextResponse.json({ error: 'Teacher identification name is required' }, { status: 400 });
    }

    const trimmedOld = oldName.trim();

    // 1. Find profile of the teacher using userClient (RLS active)
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, username, teacher_name, role')
      .eq('teacher_name', trimmedOld)
      .maybeSingle();

    const trimmedNewName = newName?.trim();
    const trimmedNewUsername = newUsername?.trim().toLowerCase();

    // 2. Handle orphan teacher (no profiles record exists yet, like 'Giáo Viên 1')
    if (!profile) {
      const { data: teacherRow } = await userClient
        .from('teachers')
        .select('name')
        .eq('name', trimmedOld)
        .maybeSingle();

      if (!teacherRow) {
        return NextResponse.json({ error: 'Không tìm thấy giáo viên trong danh sách!' }, { status: 404 });
      }

      // Rename teacher row if changed
      if (trimmedNewName && trimmedNewName !== trimmedOld) {
        const { error: renameError } = await userClient
          .from('teachers')
          .update({ name: trimmedNewName })
          .eq('name', trimmedOld);

        if (renameError) {
          return NextResponse.json({ error: renameError.message }, { status: 400 });
        }
      }

      // Lazy create login account if credentials were provided
      if (trimmedNewUsername) {
        const { data: existingUser } = await userClient
          .from('profiles')
          .select('id')
          .eq('username', trimmedNewUsername)
          .maybeSingle();

        if (existingUser) {
          return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại!' }, { status: 400 });
        }

        let authCreated = false;
        try {
          const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
            email: `${trimmedNewUsername}@giasupro.com`,
            password: newPassword?.trim() || '123456',
            email_confirm: true,
            user_metadata: {
              role: newRole || 'teacher',
              teacher_name: trimmedNewName || trimmedOld,
              username: trimmedNewUsername
            }
          });

          if (!createError && authData?.user) {
            authCreated = true;
          }
        } catch (authCreateErr: any) {
          // Admin create skipped
        }

        // Fallback to client-side auth.signUp using anon key
        if (!authCreated) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { autoRefreshToken: false, persistSession: false }
          });

          const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
            email: `${trimmedNewUsername}@giasupro.com`,
            password: newPassword?.trim() || '123456',
            options: {
              data: {
                role: newRole || 'teacher',
                teacher_name: trimmedNewName || trimmedOld,
                username: trimmedNewUsername
              }
            }
          });

          if (!signUpError && signUpData?.user) {
            authCreated = true;
          } else if (signUpError) {
            return NextResponse.json({ error: `Không thể tạo tài khoản đăng nhập: ${signUpError.message}` }, { status: 400 });
          }
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Cập nhật thông tin giáo viên thành công!',
        newUsername: trimmedNewUsername || trimmedOld.toLowerCase().replace(/\s+/g, '')
      });
    }

    const activeUsername = trimmedNewUsername || (trimmedNewName ? generateUsername(trimmedNewName) : profile.username);

    // 3. Update teachers table name if changed (this cascades automatically)
    if (trimmedNewName && trimmedNewName !== trimmedOld) {
      const { data: existingTeacher } = await userClient
        .from('teachers')
        .select('name')
        .eq('name', trimmedNewName)
        .maybeSingle();
      if (existingTeacher) {
        return NextResponse.json({ error: 'Tên giáo viên này đã tồn tại!' }, { status: 400 });
      }

      const { error: renameError } = await userClient
        .from('teachers')
        .update({ name: trimmedNewName })
        .eq('name', trimmedOld);

      if (renameError) {
        return NextResponse.json({ error: renameError.message }, { status: 400 });
      }
    }

    // 4. Verify custom username is unique if changed
    if (trimmedNewUsername && trimmedNewUsername !== profile.username) {
      const { data: existingUser } = await userClient
        .from('profiles')
        .select('id')
        .eq('username', trimmedNewUsername)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại!' }, { status: 400 });
      }
    }

    // 5. Update profiles table (username, role, teacher_name)
    const profileUpdates: any = {};
    if (trimmedNewName && trimmedNewName !== trimmedOld) {
      profileUpdates.teacher_name = trimmedNewName;
    }
    if (activeUsername !== profile.username) {
      profileUpdates.username = activeUsername;
    }
    if (newRole && (newRole === 'admin' || newRole === 'teacher') && newRole !== profile.role) {
      if (profile.id === user.id) {
        profileUpdates.role = 'admin';
      } else {
        if (profile.username === 'admin' && newRole !== 'admin') {
          return NextResponse.json({ error: 'Không thể hạ quyền tài khoản admin hệ thống!' }, { status: 400 });
        }
        profileUpdates.role = newRole;
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profError } = await userClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profile.id);
      if (profError) {
        return NextResponse.json({ error: profError.message }, { status: 400 });
      }
    }

    // 6. Optional auth user updates (best-effort)
    const authUpdates: any = {};
    if (newPassword && newPassword.trim()) {
      authUpdates.password = newPassword.trim();
    }
    if (activeUsername !== profile.username) {
      authUpdates.email = `${activeUsername}@giasupro.com`;
    }

    const userMetadata: any = {};
    if (trimmedNewName && trimmedNewName !== trimmedOld) {
      userMetadata.teacher_name = trimmedNewName;
    }
    if (activeUsername !== profile.username) {
      userMetadata.username = activeUsername;
    }
    if (newRole && newRole !== profile.role) {
      userMetadata.role = profile.id === user.id ? 'admin' : newRole;
    }

    if (Object.keys(userMetadata).length > 0) {
      authUpdates.user_metadata = userMetadata;
    }

    if (Object.keys(authUpdates).length > 0) {
      try {
        await adminClient.auth.admin.updateUserById(profile.id, authUpdates);
      } catch (authUpdErr: any) {
        console.warn('Auth admin updateUserById optional update skipped:', authUpdErr.message);
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Cập nhật thông tin giáo viên thành công!',
      newUsername: activeUsername
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. DELETE TEACHER
export async function DELETE(request: NextRequest) {
  try {
    const { error, adminClient, user, userClient } = await verifyAdmin(request);
    if (error || !adminClient || !userClient) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // 1. Find the corresponding auth user ID using userClient (RLS active)
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id')
      .eq('teacher_name', trimmedName)
      .maybeSingle();

    if (profileError || !profile) {
      // If no profile exists, delete from teachers table directly
      const { error: deleteError } = await userClient
        .from('teachers')
        .delete()
        .eq('name', trimmedName);
      
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }
    } else {
      // Safety check: Prevent admin from deleting their own account
      if (profile.id === user.id) {
        return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính mình!' }, { status: 400 });
      }

      // 2. Delete auth user (requires service role key). If it fails, fall back to DB-only delete.
      let authDeleted = false;
      try {
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(profile.id);
        if (!deleteAuthError) {
          authDeleted = true;
        } else {
          console.warn('Failed to delete auth user from Supabase, attempting database-only deletion:', deleteAuthError.message);
        }
      } catch (authErr: any) {
        console.warn('Auth admin deleteUser failed with exception:', authErr.message);
      }

      // Fallback: delete database profile manually if auth user deletion failed/was skipped
      if (!authDeleted) {
        const { error: profileDeleteError } = await userClient
          .from('profiles')
          .delete()
          .eq('id', profile.id);
        
        if (profileDeleteError) {
          return NextResponse.json({ error: `Lỗi xóa hồ sơ: ${profileDeleteError.message}` }, { status: 400 });
        }
      }

      // Also ensure teacher row is deleted (cascade deletes sessions)
      const { error: teacherDeleteError } = await userClient
        .from('teachers')
        .delete()
        .eq('name', trimmedName);
      
      if (teacherDeleteError) {
        return NextResponse.json({ error: `Lỗi xóa giáo viên: ${teacherDeleteError.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Teacher "${trimmedName}" and all related data deleted successfully!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
