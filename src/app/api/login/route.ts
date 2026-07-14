import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' }, { status: 400 });
    }

    const cleanInput = username.trim().toLowerCase();
    
    // Check if service role key is available on the server (Vercel has this)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Local sync unavailable: SUPABASE_SERVICE_ROLE_KEY is not set. Please log in with your email or configure the key.' 
      }, { status: 501 });
    }

    const admin = getSupabaseAdmin();

    // 1. Find profile in profiles table (bypassing RLS using admin client)
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, password, username, teacher_name, role')
      .or(`username.eq.${cleanInput},email.eq.${cleanInput}`)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' }, { status: 400 });
    }

    // 2. Verify plain text password
    if (profile.password !== password) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' }, { status: 400 });
    }

    // 3. User verified in profiles. Ensure they exist and are synced in Supabase Auth.
    const userEmail = profile.email || `${profile.username}@giasupro.com`;

    try {
      // Attempt to sync password and metadata to existing Auth user ID
      const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
        password: password,
        email_confirm: true,
        user_metadata: {
          role: profile.role,
          teacher_name: profile.teacher_name,
          username: profile.username
        }
      });

      if (updateError) {
        throw new Error(updateError.message);
      }
    } catch (authErr: any) {
      // If update fails (e.g. user does not exist in auth.users), create them!
      try {
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: userEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            role: profile.role,
            teacher_name: profile.teacher_name,
            username: profile.username
          }
        });

        if (createError) {
          // If we couldn't create with a matching ID (e.g. email mismatch), fallback to default creation
          return NextResponse.json({ error: `Không thể đồng bộ Auth: ${createError.message}` }, { status: 500 });
        }

        if (newUser?.user) {
          // Re-link the profiles row to the newly created Auth user ID
          await admin
            .from('profiles')
            .update({ id: newUser.user.id })
            .eq('username', profile.username);
        }
      } catch (createErr: any) {
        return NextResponse.json({ error: `Đồng bộ tài khoản thất bại: ${createErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ status: 'success', email: userEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
