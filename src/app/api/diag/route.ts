import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diag: Record<string, any> = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cwd: process.cwd(),
    uid: process.getuid ? process.getuid() : null,
    gid: process.getgid ? process.getgid() : null,
  };

  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    diag.dataDir = dataDir;
    diag.dataDirExists = fs.existsSync(dataDir);
    if (diag.dataDirExists) {
      diag.dataDirStats = {
        mode: fs.statSync(dataDir).mode.toString(8),
        files: fs.readdirSync(dataDir),
      };
    }

    const dbPath = path.join(dataDir, 'local.db');
    diag.dbPath = dbPath;
    diag.dbExists = fs.existsSync(dbPath);
    if (diag.dbExists) {
      diag.dbStats = {
        size: fs.statSync(dbPath).size,
        mode: fs.statSync(dbPath).mode.toString(8),
      };
    }

    // Now test importing better-sqlite3
    let DatabaseModule: any;
    try {
      DatabaseModule = (await import('better-sqlite3')).default;
      diag.betterSqliteImport = 'SUCCESS';
    } catch (e: any) {
      diag.betterSqliteImport = 'FAILED: ' + e.message;
      return NextResponse.json(diag);
    }

    // Try opening DB
    try {
      const db = new DatabaseModule(dbPath, { readonly: false });
      diag.openDb = 'SUCCESS';
      
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      diag.tables = tables.map((t: any) => t.name);

      const profileCount = db.prepare('SELECT count(*) as cnt FROM profiles').get();
      diag.profileCount = profileCount;

      db.close();
    } catch (e: any) {
      diag.openDb = 'FAILED: ' + e.message;
      diag.stack = e.stack;
    }

    // Try getDb() helper
    try {
      const { getDb } = await import('@/lib/db');
      const dbHelper = getDb();
      diag.getDbHelper = 'SUCCESS';
      const prof = dbHelper.prepare('SELECT * FROM profiles LIMIT 1').get();
      diag.sampleProfile = prof;
    } catch (e: any) {
      diag.getDbHelper = 'FAILED: ' + e.message;
      diag.getDbStack = e.stack;
    }

    return NextResponse.json(diag);
  } catch (err: any) {
    diag.fatal = err.message;
    diag.stack = err.stack;
    return NextResponse.json(diag, { status: 500 });
  }
}
