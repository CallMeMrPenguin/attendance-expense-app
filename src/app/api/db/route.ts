import { NextRequest, NextResponse } from 'next/server';
import { 
  queryTable, 
  insertTable, 
  upsertTable, 
  updateTable, 
  deleteTable, 
  authenticateUser, 
  updateUserPassword,
  getDb
} from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, table, options, records, updates, conditions, username, password, newPassword, userId, fn, args } = body;

    if (action === 'auth_login') {
      const res = authenticateUser(username, password);
      if (res.error) {
        return NextResponse.json({ error: { message: res.error } }, { status: 400 });
      }
      return NextResponse.json({ data: { user: res.user, session: res.session, profile: res.profile }, error: null });
    }

    if (action === 'auth_update_password') {
      const res = updateUserPassword(userId, newPassword);
      if (res.error) {
        return NextResponse.json({ error: { message: res.error } }, { status: 400 });
      }
      return NextResponse.json({ data: { success: true }, error: null });
    }

    if (action === 'rpc') {
      if (fn === 'resolve_username_email') {
        const cleanInput = (args?.p_username || '').trim().toLowerCase();
        const db = getDb();
        const profile = db.prepare(`SELECT email FROM profiles WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1`).get(cleanInput, cleanInput) as any;
        return NextResponse.json({ data: profile?.email || null, error: null });
      }
      return NextResponse.json({ data: null, error: { message: `Unknown RPC function: ${fn}` } }, { status: 400 });
    }

    if (!table) {
      return NextResponse.json({ error: { message: 'Missing table name' } }, { status: 400 });
    }

    switch (action) {
      case 'query': {
        const result = queryTable(table, options);
        return NextResponse.json(result);
      }
      case 'insert': {
        const result = insertTable(table, records);
        return NextResponse.json(result);
      }
      case 'upsert': {
        const result = upsertTable(table, records, body.onConflict);
        return NextResponse.json(result);
      }
      case 'update': {
        const result = updateTable(table, updates, conditions || {});
        return NextResponse.json(result);
      }
      case 'delete': {
        const result = deleteTable(table, conditions || {});
        return NextResponse.json(result);
      }
      default: {
        return NextResponse.json({ error: { message: `Unsupported action: ${action}` } }, { status: 400 });
      }
    }
  } catch (err: any) {
    console.error('API /api/db error:', err);
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
