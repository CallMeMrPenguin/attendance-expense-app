import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' }, { status: 400 });
    }

    const authResult = authenticateUser(username, password);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 400 });
    }

    return NextResponse.json({ 
      status: 'success', 
      email: authResult.user?.email,
      user: authResult.user,
      session: authResult.session,
      profile: authResult.profile
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
