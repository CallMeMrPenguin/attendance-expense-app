import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result: Record<string, any> = {
    cwd: process.cwd(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  const dataDir = path.resolve(process.cwd(), 'data');
  const dbPath = path.join(dataDir, 'local.db');

  result.dataDirExists = fs.existsSync(dataDir);
  result.dbExists = fs.existsSync(dbPath);
  if (result.dbExists) {
    try {
      result.dbStat = fs.statSync(dbPath);
    } catch (e: any) {
      result.dbStatError = e.message;
    }
  }

  // 1. Check if node can run inline script
  try {
    const nodeTest = execSync('node -e "console.log(process.versions)"', { encoding: 'utf8', timeout: 5000 });
    result.nodeVersions = JSON.parse(nodeTest.replace(/'/g, '"'));
  } catch (e: any) {
    result.nodeTestError = e.message;
  }

  // 2. Check if better-sqlite3 can be imported in a separate child process
  try {
    const importTest = execSync('node -e "const b = require(\'better-sqlite3\'); console.log(\'IMPORTED_OK\')"', {
      encoding: 'utf8',
      timeout: 5000,
      cwd: process.cwd(),
    });
    result.betterSqliteChildImport = importTest.trim();
  } catch (e: any) {
    result.betterSqliteChildImportError = {
      message: e.message,
      status: e.status,
      signal: e.signal,
      stderr: e.stderr?.toString(),
      stdout: e.stdout?.toString(),
    };
  }

  // 3. Check if better-sqlite3 can open an in-memory db
  try {
    const memTest = execSync('node -e "const Database = require(\'better-sqlite3\'); const db = new Database(\':memory:\'); db.exec(\'CREATE TABLE t(x); INSERT INTO t VALUES(1);\'); console.log(db.prepare(\'SELECT * FROM t\').all());"', {
      encoding: 'utf8',
      timeout: 5000,
      cwd: process.cwd(),
    });
    result.inMemoryDbTest = memTest.trim();
  } catch (e: any) {
    result.inMemoryDbTestError = {
      message: e.message,
      status: e.status,
      signal: e.signal,
      stderr: e.stderr?.toString(),
    };
  }

  // 4. Check if better-sqlite3 can open data/local.db
  try {
    const openDbScript = `
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.resolve('data/local.db');
      console.log('Opening:', dbPath);
      const db = new Database(dbPath, { readonly: true });
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log('TABLES:', JSON.stringify(tables));
      for (const t of tables) {
        try {
          const c = db.prepare('SELECT count(*) as cnt FROM \"' + t.name + '\"').get();
          console.log(t.name + ':', c.cnt);
        } catch(e) {
          console.log(t.name + ' ERROR:', e.message);
        }
      }
    `;
    const localDbTest = execSync(`node -e "${openDbScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      timeout: 10000,
      cwd: process.cwd(),
    });
    result.localDbTest = localDbTest.trim();
  } catch (e: any) {
    result.localDbTestError = {
      message: e.message,
      status: e.status,
      signal: e.signal,
      stderr: e.stderr?.toString(),
      stdout: e.stdout?.toString(),
    };
  }

  return NextResponse.json(result);
}
