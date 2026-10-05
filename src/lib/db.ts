import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'local.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

    // Seed default preserved data if profiles or sessions table is empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
    if (userCount.count === 0) {
      seedPreservedData(db);
    } else {
      const sessCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
      if (sessCount.count === 0) {
        seedPreservedData(db);
      }
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

  _db = db;
  return _db;
}

function seedPreservedData(db: Database.Database) {
  try {
    const backupPath = path.resolve(process.cwd(), 'scratch/backup_preserved_data.json');
    let backupData: any = null;
    if (fs.existsSync(backupPath)) {
      backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    }

    const insertProfile = db.prepare(`
      INSERT OR REPLACE INTO profiles (id, username, user_name, teacher_name, role, email, password, created_at)
      VALUES (@id, @username, @user_name, @teacher_name, @role, @email, @password, @created_at)
    `);

    const insertTeacher = db.prepare(`
      INSERT OR IGNORE INTO teachers (name, created_at)
      VALUES (?, datetime('now'))
    `);

    const insertBudget = db.prepare(`
      INSERT OR REPLACE INTO category_budgets (id, user_id, user_name, teacher_name, category, amount, type, icon, note, keywords, updated_at)
      VALUES (@id, @user_id, @user_name, @teacher_name, @category, @amount, @type, @icon, @note, @keywords, @updated_at)
    `);

    const insertFund = db.prepare(`
      INSERT OR REPLACE INTO savings_funds (user_id, user_name, teacher_name, emergency_current, emergency_target, accumulation_current, accumulation_target, updated_at)
      VALUES (@user_id, @user_name, @teacher_name, @emergency_current, @emergency_target, @accumulation_current, @accumulation_target, @updated_at)
    `);

    const insertRule = db.prepare(`
      INSERT OR REPLACE INTO receipt_rules (id, user_id, match_field, match_value, target_type, target_category, created_at)
      VALUES (@id, @user_id, @match_field, @match_value, @target_type, @target_category, @created_at)
    `);

    db.transaction(() => {
      // 1. Profiles
      if (backupData?.profiles?.length > 0) {
        for (const p of backupData.profiles) {
          const tName = p.user_name || p.teacher_name || p.username;
          insertProfile.run({
            id: p.id,
            username: p.username,
            user_name: p.user_name || tName,
            teacher_name: tName,
            role: p.role,
            email: p.email,
            password: p.password || '123456',
            created_at: p.created_at || new Date().toISOString()
          });
          insertTeacher.run(tName);
        }
      } else {
        // Fallback default admin profile
        const adminId = '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
        insertProfile.run({
          id: adminId,
          username: 'buiduchung2004',
          user_name: 'ADMIN',
          teacher_name: 'ADMIN',
          role: 'admin',
          email: 'buiduchung2004@gmail.com',
          password: 'callmemrpenguin',
          created_at: new Date().toISOString()
        });
        insertTeacher.run('ADMIN');
      }

      // 2. Category Budgets (Preserved 25 categories)
      if (backupData?.category_budgets?.length > 0) {
        for (const b of backupData.category_budgets) {
          let kw = '';
          let noteText = '';
          if (b.note && typeof b.note === 'string' && b.note.startsWith('{')) {
            try {
              const parsed = JSON.parse(b.note);
              noteText = parsed.text || '';
              kw = parsed.kw || '';
            } catch (e) {}
          }
          insertBudget.run({
            id: b.id || b.category,
            user_id: b.user_id || '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
            user_name: b.user_name || 'ADMIN',
            teacher_name: b.user_name || 'ADMIN',
            category: b.category,
            amount: Number(b.amount) || 0,
            type: b.type || 'expense',
            icon: b.icon || 'Coins',
            note: b.note || '',
            keywords: b.keywords || kw || '',
            updated_at: b.updated_at || new Date().toISOString()
          });
        }
      }

      // 3. Savings Funds (Preserved savings funds & balances)
      if (backupData?.savings_funds?.length > 0) {
        for (const f of backupData.savings_funds) {
          insertFund.run({
            user_id: f.user_id,
            user_name: f.user_name || 'ADMIN',
            teacher_name: f.user_name || 'ADMIN',
            emergency_current: Number(f.emergency_current) || 0,
            emergency_target: Number(f.emergency_target) || 30000000,
            accumulation_current: Number(f.accumulation_current) || 0,
            accumulation_target: Number(f.accumulation_target) || 150000000,
            updated_at: f.updated_at || new Date().toISOString()
          });
        }
      }

      // 3.1. Savings History (Preserved savings deposits & withdrawals)
      if (backupData?.savings_history?.length > 0) {
        const insertHist = db.prepare(`
          INSERT OR REPLACE INTO savings_history (
            id, user_id, user_name, teacher_name, fund, type, amount, date, created_at
          ) VALUES (
            @id, @user_id, @user_name, @teacher_name, @fund, @type, @amount, @date, @created_at
          )
        `);
        for (const h of backupData.savings_history) {
          insertHist.run({
            id: h.id,
            user_id: h.user_id || '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
            user_name: h.user_name || 'ADMIN',
            teacher_name: h.teacher_name || h.user_name || 'ADMIN',
            fund: h.fund,
            type: h.type,
            amount: Number(h.amount) || 0,
            date: h.date,
            created_at: h.created_at || new Date().toISOString()
          });
        }
      }

      // 4. Receipt Rules
      if (backupData?.receipt_rules?.length > 0) {
        for (const r of backupData.receipt_rules) {
          insertRule.run({
            id: r.id,
            user_id: r.user_id,
            match_field: r.match_field,
            match_value: r.match_value,
            target_type: r.target_type,
            target_category: r.target_category,
            created_at: r.created_at || new Date().toISOString()
          });
        }
      }

      // 5. Sessions (Preserved teaching schedules)
      if (backupData?.sessions?.length > 0) {
        const insertSession = db.prepare(`
          INSERT OR REPLACE INTO sessions (
            id, user_name, teacher_name, job_name, student_name, day_of_week, time, duration, price, status,
            month_year, color, date, auto_checkin, auto_check_in, loai_hinh_lich, loai_hinh, income_category,
            created_at, updated_at
          ) VALUES (
            @id, @user_name, @teacher_name, @job_name, @student_name, @day_of_week, @time, @duration, @price, @status,
            @month_year, @color, @date, @auto_checkin, @auto_check_in, @loai_hinh_lich, @loai_hinh, @income_category,
            @created_at, @updated_at
          )
        `);
        for (const s of backupData.sessions) {
          insertSession.run({
            id: s.id,
            user_name: s.user_name || 'ADMIN',
            teacher_name: s.teacher_name || s.user_name || 'ADMIN',
            job_name: s.job_name || s.student_name || 'Buổi dạy',
            student_name: s.student_name || s.job_name || 'Buổi dạy',
            day_of_week: s.day_of_week || 'Thứ 2',
            time: s.time || '18:00',
            duration: Number(s.duration || 2),
            price: Number(s.price || 0),
            status: s.status || 'Chưa làm',
            month_year: s.month_year,
            color: s.color || '#7c3aed',
            date: s.date,
            auto_checkin: s.auto_checkin ? 1 : 0,
            auto_check_in: s.auto_check_in ? 1 : 0,
            loai_hinh_lich: s.loai_hinh_lich || 'co_dinh',
            loai_hinh: s.loai_hinh || 'co_dinh',
            income_category: s.income_category || 'Giáo dục',
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString()
          });
        }
      }
    })();

    console.log('[Local SQLite] Preserved data successfully seeded into local.db');
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
  const whereClauses: string[] = [];
  const params: any[] = [];

  // Check valid table name
  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  // Handle count / head
  if (options.count === 'exact' && options.head) {
    if (options.eq) {
      for (const [k, v] of Object.entries(options.eq)) {
        whereClauses.push(`"${k}" = ?`);
        params.push(sanitizeSqliteValue(v));
      }
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const row = db.prepare(`SELECT COUNT(*) as count FROM "${table}" ${whereSql}`).get(...params) as { count: number };
    return { data: null, count: row.count, error: null };
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
    if (options.maybeSingle) {
      const row = db.prepare(query).get(...params);
      return { data: row || null, error: null };
    }

    const rows = db.prepare(query).all(...params);
    let totalCount = rows.length;
    if (options.count === 'exact') {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table}" ${whereSql}`).get(...params) as { count: number };
      totalCount = countRow.count;
    }
    return { data: rows, count: totalCount, error: null };
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

const tableColumnsCache: Record<string, Set<string>> = {};
function getTableColumns(db: Database.Database, table: string): Set<string> {
  if (!tableColumnsCache[table]) {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    tableColumnsCache[table] = new Set(cols.map(c => c.name));
  }
  return tableColumnsCache[table];
}

export function insertTable(table: string, records: any | any[]) {
  const db = getDb();
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const validTables = ['teachers', 'profiles', 'sessions', 'manual_transactions', 'savings_funds', 'category_budgets', 'savings_history', 'bank_receipts', 'receipt_rules', 'table_settings'];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  try {
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
        const stmt = db.prepare(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`);
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
        const stmt = db.prepare(`INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${placeholders})`);
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
    const validCols = getTableColumns(db, table);
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [k, v] of Object.entries(updates)) {
      if (!validCols.has(k)) continue;
      setClauses.push(`"${k}" = ?`);
      params.push(sanitizeSqliteValue(v));
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
    const result = db.prepare(query).run(...params);
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
    const query = `DELETE FROM "${table}" ${whereSql}`;
    const result = db.prepare(query).run(...params);
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

