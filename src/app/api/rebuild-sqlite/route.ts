import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result: Record<string, any> = {};
  try {
    // 1. Install 11.8.1 which has prebuilt binary for node-v115-linux-x64
    const installOut = execSync('npm install better-sqlite3@11.8.1 --no-save', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 120000,
    });
    result.installOutput = installOut;

    // 2. Test in-memory DB
    const testMem = execSync('node -e "const Database = require(\'better-sqlite3\'); const db = new Database(\':memory:\'); db.exec(\'CREATE TABLE t(x); INSERT INTO t VALUES(42);\'); console.log(\'SUCCESS_MEM_VAL:\', db.prepare(\'SELECT * FROM t\').get().x);"', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10000,
    });
    result.memTest = testMem.trim();

    // 3. Test opening local.db
    const testLocal = execSync('node -e "const Database = require(\'better-sqlite3\'); const path = require(\'path\'); const db = new Database(path.resolve(\'data/local.db\'), { readonly: true }); console.log(\'PROFILES:\', db.prepare(\'SELECT count(*) as c FROM profiles\').get().c); console.log(\'SESSIONS:\', db.prepare(\'SELECT count(*) as c FROM sessions\').get().c);"', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10000,
    });
    result.localTest = testLocal.trim();

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stderr: err.stderr?.toString(),
      stdout: err.stdout?.toString(),
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
