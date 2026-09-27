import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getDb } from '@/lib/db';

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

  const token = authHeader.replace('Bearer ', '').trim();
  const db = getDb();

  // Find profile by token / id / username
  const profile = db.prepare(`
    SELECT * FROM profiles 
    WHERE id = ? OR username = ? OR ('local_token_' || id) LIKE ?
    LIMIT 1
  `).get(token, token, `%${token}%`) as any;

  if (!profile) {
    return { error: 'Invalid or expired session', status: 401 };
  }

  if (profile.role !== 'admin') {
    return { error: 'Access denied: Admin role required', status: 403 };
  }

  const adminClient = getSupabaseAdmin();
  return { user: profile, adminClient, userClient: adminClient };
}

// 1. ADD TEACHER
export async function POST(request: NextRequest) {
  try {
    const { error, userClient } = await verifyAdmin(request);
    if (error || !userClient) {
      return NextResponse.json({ error }, { status: error === 'No authorization header' ? 401 : 403 });
    }

    const { name, username: customUsername, role: rawRole, password = '123456' } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên giáo viên không được để trống' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const finalRole = (rawRole === 'admin' ? 'admin' : 'user');
    const finalUsername = customUsername && customUsername.trim() 
      ? customUsername.trim().toLowerCase() 
      : generateUsername(trimmedName);
    const mockEmail = finalUsername.includes('@') ? finalUsername : `${finalUsername}@giasupro.com`;

    const db = getDb();
    const userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'teacher_' + Date.now();

    // Insert or update teachers table
    db.prepare(`INSERT OR IGNORE INTO teachers (name) VALUES (?)`).run(trimmedName);

    // Insert or update profiles table
    db.prepare(`
      INSERT OR REPLACE INTO profiles (id, username, user_name, teacher_name, role, email, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, finalUsername, trimmedName, trimmedName, finalRole, mockEmail, password);

    return NextResponse.json({
      status: 'success',
      message: `Tài khoản giáo viên "${trimmedName}" đã được tạo thành công!`,
      user: {
        id: userId,
        username: finalUsername,
        teacherName: trimmedName,
        role: finalRole
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. UPDATE TEACHER DETAILS (NAME, USERNAME, PASSWORD, ROLE)
export async function PUT(request: NextRequest) {
  try {
    const { error, userClient } = await verifyAdmin(request);
    if (error || !userClient) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { oldName, newName, newUsername, newPassword, newRole: rawNewRole } = await request.json();
    if (!oldName || !oldName.trim()) {
      return NextResponse.json({ error: 'Tên nhận diện giáo viên là bắt buộc' }, { status: 400 });
    }

    const trimmedOld = oldName.trim();
    const trimmedNewName = newName?.trim() || trimmedOld;
    const trimmedNewUsername = newUsername?.trim().toLowerCase() || generateUsername(trimmedNewName);
    const finalRole = rawNewRole === 'admin' ? 'admin' : 'user';

    const db = getDb();

    // 1. Find profile of the teacher
    const profile = db.prepare(`
      SELECT * FROM profiles 
      WHERE user_name = ? OR teacher_name = ?
      LIMIT 1
    `).get(trimmedOld, trimmedOld) as any;

    // Rename teacher in teachers table
    if (trimmedNewName && trimmedNewName !== trimmedOld) {
      db.prepare(`UPDATE teachers SET name = ? WHERE name = ?`).run(trimmedNewName, trimmedOld);
      db.prepare(`INSERT OR IGNORE INTO teachers (name) VALUES (?)`).run(trimmedNewName);
      // Update sessions teacher_name
      db.prepare(`UPDATE sessions SET teacher_name = ? WHERE teacher_name = ?`).run(trimmedNewName, trimmedOld);
    }

    const profileId = profile?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'teacher_' + Date.now());

    if (newPassword && newPassword.trim()) {
      db.prepare(`
        UPDATE profiles 
        SET username = ?, user_name = ?, teacher_name = ?, role = ?, password = ?
        WHERE id = ?
      `).run(trimmedNewUsername, trimmedNewName, trimmedNewName, finalRole, newPassword.trim(), profileId);
    } else {
      db.prepare(`
        UPDATE profiles 
        SET username = ?, user_name = ?, teacher_name = ?, role = ?
        WHERE id = ?
      `).run(trimmedNewUsername, trimmedNewName, trimmedNewName, finalRole, profileId);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Cập nhật thông tin tài khoản thành công!',
      newUsername: trimmedNewUsername
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. DELETE TEACHER
export async function DELETE(request: NextRequest) {
  try {
    const { error, user, userClient } = await verifyAdmin(request);
    if (error || !userClient) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const db = getDb();

    // Find profile
    const profile = db.prepare(`SELECT * FROM profiles WHERE teacher_name = ? OR user_name = ? LIMIT 1`).get(trimmedName, trimmedName) as any;

    if (profile && profile.id === user.id) {
      return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính mình!' }, { status: 403 });
    }

    db.prepare(`DELETE FROM teachers WHERE name = ?`).run(trimmedName);
    db.prepare(`DELETE FROM profiles WHERE teacher_name = ? OR user_name = ?`).run(trimmedName, trimmedName);
    db.prepare(`DELETE FROM sessions WHERE teacher_name = ?`).run(trimmedName);

    return NextResponse.json({
      status: 'success',
      message: `Đã xóa giáo viên "${trimmedName}" và toàn bộ dữ liệu thành công!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
