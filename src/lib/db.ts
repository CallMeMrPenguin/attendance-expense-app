import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Global SQLite singleton & high performance cache
interface GlobalDbHolder {
  _dbInstance?: Database.Database;
  _schemaInitialized?: boolean;
  _statementCache?: Map<string, Database.Statement>;
  _queryCache?: Map<string, { data: any; count?: number; timestamp: number; version: number }>;
  _tableVersion?: Record<string, number>;
  _tableColumnsCache?: Record<string, Set<string>>;
}

const globalForDb = globalThis as unknown as GlobalDbHolder;
if (!globalForDb._statementCache) globalForDb._statementCache = new Map();
if (!globalForDb._queryCache) globalForDb._queryCache = new Map();
if (!globalForDb._tableVersion) globalForDb._tableVersion = {};
if (!globalForDb._tableColumnsCache) globalForDb._tableColumnsCache = {};

export function getCachedStatement(db: Database.Database, sql: string): Database.Statement {
  const cache = globalForDb._statementCache!;
  let stmt = cache.get(sql);
  if (!stmt) {
    if (cache.size > 500) {
      const keys = Array.from(cache.keys()).slice(0, 50);
      for (const k of keys) cache.delete(k);
    }
    stmt = db.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

export function invalidateTableCache(table: string) {
  if (!globalForDb._tableVersion) globalForDb._tableVersion = {};
  globalForDb._tableVersion[table] = (globalForDb._tableVersion[table] || 0) + 1;
  if (globalForDb._queryCache) {
    const prefix = `${table}:`;
    for (const key of globalForDb._queryCache.keys()) {
      if (key.startsWith(prefix)) {
        globalForDb._queryCache.delete(key);
      }
    }
  }
}

export function getDb(): Database.Database {
  if (globalForDb._dbInstance) return globalForDb._dbInstance;

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'local.db');
  const db = new Database(dbPath, { timeout: 10000 });
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {
    try {
      db.pragma('journal_mode = DELETE');
    } catch (e2) {}
  }
  db.pragma('synchronous = NORMAL');
  try {
    db.pragma('mmap_size = 268435456');
    db.pragma('cache_size = -64000');
    db.pragma('temp_store = MEMORY');
  } catch (e) {}
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 10000');

  // If schema was already initialized in this process, skip all DDL & migrations for 0ms startup
  if (globalForDb._schemaInitialized) {
    globalForDb._dbInstance = db;
    return db;
  }

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      name TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      user_name TEXT,
      teacher_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'teacher')),
      email TEXT,
      password TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      teacher_name TEXT,
      job_name TEXT NOT NULL,
      student_name TEXT,
      day_of_week TEXT NOT NULL,
      time TEXT NOT NULL,
      duration REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Chưa làm', 'Đã làm', 'Chưa dạy', 'Đã dạy', 'Chưa học', 'Đã học', 'Hủy')),
      month_year TEXT NOT NULL,
      color TEXT NOT NULL,
      date TEXT NOT NULL,
      grade TEXT,
      homework TEXT,
      note TEXT,
      auto_checkin INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS manual_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      teacher_name TEXT,
      desc_text TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving', 'exchange')),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_funds (
      user_id TEXT PRIMARY KEY,
      user_name TEXT,
      teacher_name TEXT,
      emergency_current REAL DEFAULT 0,
      emergency_target REAL DEFAULT 30000000,
      accumulation_current REAL DEFAULT 0,
      accumulation_target REAL DEFAULT 150000000,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS category_budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      teacher_name TEXT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'expense',
      icon TEXT,
      note TEXT,
      keywords TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      teacher_name TEXT,
      fund TEXT NOT NULL CHECK (fund IN ('emergency', 'accumulation')),
      type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bank_receipts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      order_number TEXT,
      trans_date TEXT,
      trans_time TEXT,
      debit_account TEXT,
      remitter_name TEXT,
      sender_name TEXT,
      credit_account TEXT,
      beneficiary_name TEXT,
      beneficiary_bank TEXT,
      amount REAL NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'unclassified',
      type TEXT,
      category TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      match_field TEXT NOT NULL,
      match_value TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_category TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS table_settings (
      id TEXT PRIMARY KEY,
      table_id TEXT,
      user_id TEXT,
      layout TEXT,
      setting_key TEXT,
      setting_value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_month_year ON sessions(month_year);
    CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher_name);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_month ON sessions(user_name, month_year);
    CREATE INDEX IF NOT EXISTS idx_sessions_teacher_month ON sessions(teacher_name, month_year);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_manual_tx_date ON manual_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_manual_tx_date_desc ON manual_transactions(date DESC);
    CREATE INDEX IF NOT EXISTS idx_manual_tx_type ON manual_transactions(type);
    CREATE INDEX IF NOT EXISTS idx_manual_tx_cat ON manual_transactions(category);
    CREATE INDEX IF NOT EXISTS idx_manual_tx_updated_at ON manual_transactions(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bank_receipts_created_desc ON bank_receipts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bank_receipts_trans_date ON bank_receipts(trans_date);
    CREATE INDEX IF NOT EXISTS idx_bank_receipts_trans_date_desc ON bank_receipts(trans_date DESC);
    CREATE INDEX IF NOT EXISTS idx_bank_receipts_status ON bank_receipts(status);
    CREATE INDEX IF NOT EXISTS idx_bank_receipts_updated_at ON bank_receipts(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_receipt_rules_created_desc ON receipt_rules(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_receipt_rules_updated_at ON receipt_rules(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_category_budgets_user_cat ON category_budgets(user_id, category);
    CREATE INDEX IF NOT EXISTS idx_category_budgets_updated_at ON category_budgets(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_savings_history_date_desc ON savings_history(date DESC);
  `);

  // Ensure all optional columns exist in sessions
  const sessionCols = db.prepare('PRAGMA table_info(sessions)').all().map((c: any) => c.name);
  if (!sessionCols.includes('auto_check_in')) db.exec('ALTER TABLE sessions ADD COLUMN auto_check_in INTEGER DEFAULT 1');
  if (!sessionCols.includes('loai_hinh_lich')) db.exec('ALTER TABLE sessions ADD COLUMN loai_hinh_lich TEXT');
  if (!sessionCols.includes('loai_hinh')) db.exec('ALTER TABLE sessions ADD COLUMN loai_hinh TEXT');
  if (!sessionCols.includes('income_category')) db.exec('ALTER TABLE sessions ADD COLUMN income_category TEXT');

  // Ensure table_settings has table_id and layout
  const tableSettingCols = db.prepare('PRAGMA table_info(table_settings)').all().map((c: any) => c.name);
  if (!tableSettingCols.includes('table_id')) db.exec('ALTER TABLE table_settings ADD COLUMN table_id TEXT');
  if (!tableSettingCols.includes('layout')) db.exec('ALTER TABLE table_settings ADD COLUMN layout TEXT');

  // Ensure sync support tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_deletions (
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (table_name, record_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sync_deletions_time ON sync_deletions(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_sync_deletions_table_time_desc ON sync_deletions(table_name, deleted_at DESC);

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Ensure updated_at exists on all syncable tables for conflict resolution
  const ensureCol = (tbl: string, col: string) => {
    try {
      const cols = db.prepare(`PRAGMA table_info("${tbl}")`).all().map((c: any) => c.name);
      if (!cols.includes(col)) {
        db.exec(`ALTER TABLE "${tbl}" ADD COLUMN ${col} TEXT`);
        db.exec(`UPDATE "${tbl}" SET ${col} = datetime('now') WHERE ${col} IS NULL`);
      }
    } catch (e) {}
  };

  ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'].forEach(t => {
    ensureCol(t, 'updated_at');
  });

  // Ensure manual_transactions supports 'exchange' type
  try {
    const mtSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'manual_transactions'").get() as { sql: string } | undefined;
    if (mtSchema && mtSchema.sql && !mtSchema.sql.includes('exchange')) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE manual_transactions_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_name TEXT,
          teacher_name TEXT,
          desc_text TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving', 'exchange')),
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        INSERT INTO manual_transactions_new SELECT * FROM manual_transactions;
        DROP TABLE manual_transactions;
        ALTER TABLE manual_transactions_new RENAME TO manual_transactions;
      `);
      db.pragma('foreign_keys = ON');
    }
  } catch (e) {}

  // Seed default preserved data if any primary table is empty
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number })?.count || 0;
    const sessCount = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number })?.count || 0;
    const txCount = (db.prepare('SELECT COUNT(*) as count FROM manual_transactions').get() as { count: number })?.count || 0;
    const rcptCount = (db.prepare('SELECT COUNT(*) as count FROM bank_receipts').get() as { count: number })?.count || 0;

    if (userCount === 0 || sessCount === 0 || txCount === 0 || rcptCount === 0) {
      seedPreservedData(db);
    }
  } catch (e) {
    console.warn('[Local SQLite] Seed check warning:', e);
  }

  // Ensure all sessions have valid unique UUIDs
  try {
    const nullSessions = db.prepare("SELECT rowid FROM sessions WHERE id IS NULL OR id = ''").all() as { rowid: number }[];
    if (nullSessions.length > 0) {
      const updateStmt = db.prepare("UPDATE sessions SET id = ? WHERE rowid = ?");
      for (const s of nullSessions) {
        updateStmt.run(crypto.randomUUID(), s.rowid);
      }
    }
  } catch (e) {
    console.warn('[Local SQLite] Check null sessions id error:', e);
  }

  globalForDb._schemaInitialized = true;
  globalForDb._dbInstance = db;
  return db;
}

function seedPreservedData(db: Database.Database) {
  try {
    let backupData: any = null;
    const seedPath = path.resolve(process.cwd(), 'data/seed_data.json');
    const backupPath = path.resolve(process.cwd(), 'scratch/backup_preserved_data.json');

    if (fs.existsSync(seedPath)) {
      backupData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    } else if (fs.existsSync(backupPath)) {
      backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    }

    if (!backupData) {
      console.warn('[Local SQLite] No seed file found at data/seed_data.json or scratch/backup_preserved_data.json');
      // Minimal fallback default admin
      const insertProfile = db.prepare(`
        INSERT OR IGNORE INTO profiles (id, username, user_name, teacher_name, role, email, password, created_at)
        VALUES (@id, @username, @user_name, @teacher_name, @role, @email, @password, @created_at)
      `);
      insertProfile.run({
        id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
        username: 'buiduchung2004',
        user_name: 'ADMIN',
        teacher_name: 'ADMIN',
        role: 'admin',
        email: 'buiduchung2004@gmail.com',
        password: 'callmemrpenguin',
        created_at: new Date().toISOString()
      });
      db.prepare(`INSERT OR IGNORE INTO teachers (name, created_at) VALUES ('ADMIN', datetime('now'))`).run();
      return;
    }

    const tables = [
      'profiles',
      'teachers',
      'category_budgets',
      'savings_funds',
      'receipt_rules',
      'manual_transactions',
      'savings_history',
      'bank_receipts',
      'sessions',
      'table_settings'
    ];

    db.transaction(() => {
      for (const table of tables) {
        const rows = backupData[table];
        if (Array.isArray(rows) && rows.length > 0) {
          const currentCount = (db.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get() as { c: number })?.c || 0;
          if (currentCount === 0) {
            console.log(`[Local SQLite] Seeding ${rows.length} rows into empty table "${table}"...`);
            for (const r of rows) {
              const keys = Object.keys(r);
              const cols = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map(k => `@${k}`).join(', ');
              const stmt = getCachedStatement(db, `INSERT OR IGNORE INTO "${table}" (${cols}) VALUES (${placeholders})`);
              stmt.run(r);
            }
          }
        }
      }
    })();

    console.log('[Local SQLite] Preserved data successfully verified and seeded into local.db');
  } catch (err) {
    console.error('[Local SQLite] Error seeding preserved data:', err);
  }
}

// -------------------------------------------------------------
// Universal Query & Mutation Helpers for Local SQLite
// -------------------------------------------------------------

export interface QueryOptions {
  columns?: string;
  eq?: Record<string, any>;
  neq?: Record<string, any>;
  in?: Record<string, any[]>;
  or?: string; // e.g. "username.eq.admin,email.eq.admin"
  ilike?: Record<string, string>;
  lt?: Record<string, any>;
  lte?: Record<string, any>;
  gt?: Record<string, any>;
  gte?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  maybeSingle?: boolean;
  count?: 'exact' | null;
  head?: boolean;
}

export function queryTable(table: string, options: QueryOptions = {}) {
  const db = getDb();

  // Check valid table name
  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  const currentVersion = globalForDb._tableVersion?.[table] || 0;
  const cacheKey = `${table}:${JSON.stringify(options)}`;
  const now = Date.now();

  // Fast path: In-memory cache hit (valid for 3000ms if table has not mutated)
  const cached = globalForDb._queryCache?.get(cacheKey);
  if (cached && cached.version === currentVersion && (now - cached.timestamp < 3000)) {
    return { data: cached.data, count: cached.count, error: null };
  }

  const whereClauses: string[] = [];
  const params: any[] = [];

  // Handle count / head
  if (options.count === 'exact' && options.head) {
    if (options.eq) {
      for (const [k, v] of Object.entries(options.eq)) {
        whereClauses.push(`"${k}" = ?`);
        params.push(sanitizeSqliteValue(v));
      }
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*) as count FROM "${table}" ${whereSql}`;
    const stmt = getCachedStatement(db, countSql);
    const row = stmt.get(...params) as { count: number };
    const res = { data: null, count: row.count, error: null };
    globalForDb._queryCache?.set(cacheKey, { data: null, count: row.count, timestamp: now, version: currentVersion });
    return res;
  }

  if (options.eq) {
    for (const [k, v] of Object.entries(options.eq)) {
      whereClauses.push(`"${k}" = ?`);
      params.push(sanitizeSqliteValue(v));
    }
  }

  if (options.neq) {
    for (const [k, v] of Object.entries(options.neq)) {
      whereClauses.push(`"${k}" != ?`);
      params.push(sanitizeSqliteValue(v));
    }
  }

  if (options.ilike) {
    for (const [k, v] of Object.entries(options.ilike)) {
      whereClauses.push(`"${k}" LIKE ?`);
      params.push(v.includes('%') ? v : `%${v}%`);
    }
  }

  if (options.lt) {
    for (const [k, v] of Object.entries(options.lt)) {
      whereClauses.push(`"${k}" < ?`);
      params.push(sanitizeSqliteValue(v));
    }
  }

  if (options.lte) {
    for (const [k, v] of Object.entries(options.lte)) {
      whereClauses.push(`"${k}" <= ?`);
      params.push(sanitizeSqliteValue(v));
    }
  }

  if (options.gt) {
    for (const [k, v] of Object.entries(options.gt)) {
      whereClauses.push(`"${k}" > ?`);
      params.push(sanitizeSqliteValue(v));
    }
  }

  if (options.gte) {
    for (const [k, v] of Object.entries(options.gte)) {
      whereClauses.push(`"${k}" >= ?`);
      params.push(sanitizeSqliteValue(v));
    }
  }

  if (options.in) {
    for (const [k, vals] of Object.entries(options.in)) {
      if (Array.isArray(vals) && vals.length > 0) {
        const placeholders = vals.map(() => '?').join(', ');
        whereClauses.push(`"${k}" IN (${placeholders})`);
        params.push(...vals);
      } else {
        whereClauses.push(`0 = 1`);
      }
    }
  }

  if (options.or) {
    // Parse format: "col1.eq.val1,col2.eq.val2"
    const subClauses: string[] = [];
    const parts = options.or.split(',');
    for (const p of parts) {
      const match = p.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/);
      if (match) {
        subClauses.push(`"${match[1]}" = ?`);
        params.push(match[2]);
      }
    }
    if (subClauses.length > 0) {
      whereClauses.push(`(${subClauses.join(' OR ')})`);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderSql = options.order ? `ORDER BY "${options.order.column}" ${options.order.ascending ? 'ASC' : 'DESC'}` : '';
  const limitSql = options.limit ? `LIMIT ${Number(options.limit)}` : (options.maybeSingle ? 'LIMIT 1' : '');

  const cols = options.columns && options.columns !== '*' ? options.columns.split(',').map(c => `"${c.trim()}"`).join(', ') : '*';
  const query = `SELECT ${cols} FROM "${table}" ${whereSql} ${orderSql} ${limitSql}`;

  try {
    let resultData: any;
    let totalCount: number | undefined;

    const stmt = getCachedStatement(db, query);
    if (options.maybeSingle) {
      const row = stmt.get(...params);
      resultData = row || null;
    } else {
      const rows = stmt.all(...params);
      resultData = rows;
      totalCount = rows.length;
      if (options.count === 'exact') {
        const countQuery = `SELECT COUNT(*) as count FROM "${table}" ${whereSql}`;
        const countStmt = getCachedStatement(db, countQuery);
        const countRow = countStmt.get(...params) as { count: number };
        totalCount = countRow.count;
      }
    }

    // Cache the result
    if (globalForDb._queryCache) {
      if (globalForDb._queryCache.size > 1000) {
        const oldestKeys = Array.from(globalForDb._queryCache.keys()).slice(0, 200);
        for (const k of oldestKeys) globalForDb._queryCache.delete(k);
      }
      globalForDb._queryCache.set(cacheKey, {
        data: resultData,
        count: totalCount,
        timestamp: now,
        version: currentVersion
      });
    }

    return { data: resultData, count: totalCount, error: null };
  } catch (err: any) {
    console.error(`[Local SQLite] query error on ${table}:`, err.message);
    return { data: null, error: { message: err.message } };
  }
}

export function sanitizeSqliteValue(v: any): any {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object' && v !== null && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

function getTableColumns(db: Database.Database, table: string): Set<string> {
  const cache = globalForDb._tableColumnsCache!;
  if (!cache[table]) {
    const cols = getCachedStatement(db, `PRAGMA table_info("${table}")`).all() as { name: string }[];
    cache[table] = new Set(cols.map(c => c.name));
  }
  return cache[table];
}

export function insertTable(table: string, records: any | any[]) {
  const db = getDb();
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  try {
    invalidateTableCache(table);
    const validCols = getTableColumns(db, table);
    const results: any[] = [];
    const runInsert = db.transaction(() => {
      for (const rawRec of arr) {
        const cleanRec: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawRec || {})) {
          if (validCols.has(k)) {
            cleanRec[k] = sanitizeSqliteValue(v);
          }
        }
        if (table !== 'savings_funds' && table !== 'teachers' && (!cleanRec.id || typeof cleanRec.id !== 'string' || cleanRec.id.trim() === '')) {
          cleanRec.id = crypto.randomUUID();
        }
        if (validCols.has('created_at') && !cleanRec.created_at) {
          cleanRec.created_at = new Date().toISOString();
        }
        if (validCols.has('updated_at') && !cleanRec.updated_at) {
          cleanRec.updated_at = new Date().toISOString();
        }
        const keys = Object.keys(cleanRec);
        const cols = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map(k => `@${k}`).join(', ');
        const stmt = getCachedStatement(db, `INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`);
        stmt.run(cleanRec);
        results.push(cleanRec);
      }
    });
    runInsert();
    return { data: results, error: null };
  } catch (err: any) {
    console.error(`[Local SQLite] insert error on ${table}:`, err.message);
    return { data: null, error: { message: err.message } };
  }
}

export function upsertTable(table: string, records: any | any[], onConflictKey?: string) {
  const db = getDb();
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  try {
    invalidateTableCache(table);
    const validCols = getTableColumns(db, table);
    const results: any[] = [];
    const runUpsert = db.transaction(() => {
      for (const rawRec of arr) {
        const cleanRec: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawRec || {})) {
          if (validCols.has(k)) {
            cleanRec[k] = sanitizeSqliteValue(v);
          }
        }
        if (table !== 'savings_funds' && table !== 'teachers' && (!cleanRec.id || typeof cleanRec.id !== 'string' || cleanRec.id.trim() === '')) {
          cleanRec.id = crypto.randomUUID();
        }
        if (validCols.has('created_at') && !cleanRec.created_at) {
          cleanRec.created_at = new Date().toISOString();
        }
        if (validCols.has('updated_at') && !cleanRec.updated_at) {
          cleanRec.updated_at = new Date().toISOString();
        }
        const keys = Object.keys(cleanRec);
        const cols = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map(k => `@${k}`).join(', ');
        
        // Use INSERT OR REPLACE INTO for standard SQLite upsert behavior
        const stmt = getCachedStatement(db, `INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${placeholders})`);
        stmt.run(cleanRec);
        results.push(cleanRec);
      }
    });
    runUpsert();
    return { data: results, error: null };
  } catch (err: any) {
    console.error(`[Local SQLite] upsert error on ${table}:`, err.message);
    return { data: null, error: { message: err.message } };
  }
}

export function updateTable(table: string, updates: Record<string, any>, conditions: { eq?: Record<string, any>; in?: Record<string, any[]>; ilike?: Record<string, string>; or?: string }) {
  const db = getDb();
  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  try {
    invalidateTableCache(table);
    const validCols = getTableColumns(db, table);
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [k, v] of Object.entries(updates)) {
      if (!validCols.has(k)) continue;
      setClauses.push(`"${k}" = ?`);
      params.push(sanitizeSqliteValue(v));
    }
    if (validCols.has('updated_at') && !updates.updated_at) {
      setClauses.push('"updated_at" = ?');
      params.push(new Date().toISOString());
    }

    const whereClauses: string[] = [];
    if (conditions.eq) {
      for (const [k, v] of Object.entries(conditions.eq)) {
        whereClauses.push(`"${k}" = ?`);
        params.push(sanitizeSqliteValue(v));
      }
    }
    if (conditions.ilike) {
      for (const [k, v] of Object.entries(conditions.ilike)) {
        whereClauses.push(`"${k}" LIKE ?`);
        params.push(v.includes('%') ? v : `%${v}%`);
      }
    }
    if (conditions.in) {
      for (const [k, vals] of Object.entries(conditions.in)) {
        if (Array.isArray(vals) && vals.length > 0) {
          const placeholders = vals.map(() => '?').join(', ');
          whereClauses.push(`"${k}" IN (${placeholders})`);
          params.push(...vals);
        }
      }
    }
    if (conditions.or) {
      const subClauses: string[] = [];
      const parts = conditions.or.split(',');
      for (const p of parts) {
        const match = p.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/);
        if (match) {
          subClauses.push(`"${match[1]}" = ?`);
          params.push(match[2]);
        }
      }
      if (subClauses.length > 0) {
        whereClauses.push(`(${subClauses.join(' OR ')})`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `UPDATE "${table}" SET ${setClauses.join(', ')} ${whereSql}`;
    const stmt = getCachedStatement(db, query);
    const result = stmt.run(...params);
    return { data: { changes: result.changes }, error: null };
  } catch (err: any) {
    console.error(`[Local SQLite] update error on ${table}:`, err.message);
    return { data: null, error: { message: err.message } };
  }
}

export function deleteTable(table: string, conditions: { eq?: Record<string, any>; in?: Record<string, any[]>; ilike?: Record<string, string>; or?: string }) {
  const db = getDb();
  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  try {
    invalidateTableCache(table);
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (conditions.eq) {
      for (const [k, v] of Object.entries(conditions.eq)) {
        whereClauses.push(`"${k}" = ?`);
        params.push(v);
      }
    }
    if (conditions.ilike) {
      for (const [k, v] of Object.entries(conditions.ilike)) {
        whereClauses.push(`"${k}" LIKE ?`);
        params.push(v.includes('%') ? v : `%${v}%`);
      }
    }
    if (conditions.in) {
      for (const [k, vals] of Object.entries(conditions.in)) {
        if (Array.isArray(vals) && vals.length > 0) {
          const placeholders = vals.map(() => '?').join(', ');
          whereClauses.push(`"${k}" IN (${placeholders})`);
          params.push(...vals);
        }
      }
    }
    if (conditions.or) {
      const subClauses: string[] = [];
      const parts = conditions.or.split(',');
      for (const p of parts) {
        const match = p.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/);
        if (match) {
          subClauses.push(`"${match[1]}" = ?`);
          params.push(match[2]);
        }
      }
      if (subClauses.length > 0) {
        whereClauses.push(`(${subClauses.join(' OR ')})`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Capture records to be deleted for tombstone tracking in sync_deletions
    const idCol = table === 'teachers' ? 'name' : (table === 'savings_funds' ? 'user_id' : 'id');
    const recordsToDeleteStmt = getCachedStatement(db, `SELECT "${idCol}" as del_id FROM "${table}" ${whereSql}`);
    const recordsToDelete = recordsToDeleteStmt.all(...params) as { del_id: any }[];

    const query = `DELETE FROM "${table}" ${whereSql}`;
    const runDelete = db.transaction(() => {
      const stmt = getCachedStatement(db, query);
      const result = stmt.run(...params);
      const tombstoneStmt = getCachedStatement(db, `INSERT OR REPLACE INTO sync_deletions (table_name, record_id, deleted_at) VALUES (?, ?, ?)`);
      const now = new Date().toISOString();
      for (const r of recordsToDelete) {
        if (r.del_id !== undefined && r.del_id !== null) {
          tombstoneStmt.run(table, String(r.del_id), now);
        }
      }
      return result;
    });

    const result = runDelete();
    return { data: { changes: result.changes }, error: null };
  } catch (err: any) {
    console.error(`[Local SQLite] delete error on ${table}:`, err.message);
    return { data: null, error: { message: err.message } };
  }
}


export function authenticateUser(usernameOrEmail: string, password: string) {
  const db = getDb();
  const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
  
  const profile = db.prepare(`
    SELECT * FROM profiles 
    WHERE LOWER(username) = ? OR LOWER(email) = ?
    LIMIT 1
  `).get(cleanInput, cleanInput) as any;

  if (!profile) {
    return { error: 'Tên đăng nhập hoặc mật khẩu không chính xác!', user: null, session: null };
  }

  if (profile.password && profile.password !== password) {
    return { error: 'Tên đăng nhập hoặc mật khẩu không chính xác!', user: null, session: null };
  }

  const user = {
    id: profile.id,
    email: profile.email || `${profile.username}@local.com`,
    user_metadata: {
      role: profile.role,
      teacher_name: profile.teacher_name || profile.user_name || profile.username,
      username: profile.username
    }
  };

  const session = {
    access_token: `local_token_${profile.id}_${Date.now()}`,
    user: user,
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30
  };

  return { error: null, user, session, profile };
}

export function updateUserPassword(userId: string, newPassword: string) {
  const db = getDb();
  try {
    const result = db.prepare(`UPDATE profiles SET password = ? WHERE id = ?`).run(newPassword, userId);
    return { success: result.changes > 0, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

