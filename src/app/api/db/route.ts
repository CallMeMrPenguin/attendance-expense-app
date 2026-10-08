import { NextRequest, NextResponse } from 'next/server';
import { 
  queryTable, 
  insertTable, 
  upsertTable, 
  updateTable, 
  deleteTable, 
  authenticateUser, 
  updateUserPassword,
  getCachedStatement,
  getDb
} from '@/lib/db';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { action, table, options, records, updates, conditions, username, password, newPassword, userId, fn, args, operations } = body;

    if (action === 'batch' && Array.isArray(operations)) {
      const results: any[] = [];
      for (const op of operations) {
        if (!op || !op.table) {
          results.push({ error: { message: 'Missing table in batch operation' } });
          continue;
        }
        switch (op.action) {
          case 'query':
            results.push(queryTable(op.table, op.options));
            break;
          case 'insert':
            results.push(insertTable(op.table, op.records));
            break;
          case 'upsert':
            results.push(upsertTable(op.table, op.records, op.onConflict));
            break;
          case 'update':
            results.push(updateTable(op.table, op.updates, op.conditions || {}));
            break;
          case 'delete':
            results.push(deleteTable(op.table, op.conditions || {}));
            break;
          default:
            results.push({ error: { message: `Unsupported action: ${op.action}` } });
        }
      }
      const response = NextResponse.json({ data: results, error: null });
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }

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
        const stmt = getCachedStatement(db, `SELECT email FROM profiles WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1`);
        const profile = stmt.get(cleanInput, cleanInput) as any;
        return NextResponse.json({ data: profile?.email || null, error: null });
      }
      return NextResponse.json({ data: null, error: { message: `Unknown RPC function: ${fn}` } }, { status: 400 });
    }

    if (!table) {
      return NextResponse.json({ error: { message: 'Missing table name' } }, { status: 400 });
    }

    let result: any;
    switch (action) {
      case 'query': {
        result = queryTable(table, options);
        break;
      }
      case 'insert': {
        result = insertTable(table, records);
        break;
      }
      case 'upsert': {
        result = upsertTable(table, records, body.onConflict);
        break;
      }
      case 'update': {
        result = updateTable(table, updates, conditions || {});
        break;
      }
      case 'delete': {
        result = deleteTable(table, conditions || {});
        break;
      }
      default: {
        return NextResponse.json({ error: { message: `Unsupported action: ${action}` } }, { status: 400 });
      }
    }

    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  } catch (err: any) {
    console.error('API /api/db error:', err);
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
