const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initSchema(db) {
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
      status TEXT DEFAULT 'pending',
      type TEXT DEFAULT 'income',
      category TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      keyword TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT DEFAULT 'expense',
      priority INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_deletions (
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      PRIMARY KEY (table_name, record_id)
    );

    CREATE TABLE IF NOT EXISTS table_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      visible_columns TEXT,
      column_order TEXT,
      column_widths TEXT,
      column_pinning TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_month ON sessions(user_name, month_year);
    CREATE INDEX IF NOT EXISTS idx_sessions_teacher_month ON sessions(teacher_name, month_year);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_manual_tx_date ON manual_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_bank_receipts_date ON bank_receipts(trans_date);
  `);

  // Add auto_check_in, loai_hinh columns to sessions if missing
  const cols = db.prepare('PRAGMA table_info(sessions)').all().map(c => c.name);
  if (!cols.includes('auto_check_in')) db.exec('ALTER TABLE sessions ADD COLUMN auto_check_in INTEGER DEFAULT 1;');
  if (!cols.includes('loai_hinh_lich')) db.exec("ALTER TABLE sessions ADD COLUMN loai_hinh_lich TEXT DEFAULT 'co_dinh';");
  if (!cols.includes('loai_hinh')) db.exec("ALTER TABLE sessions ADD COLUMN loai_hinh TEXT DEFAULT 'co_dinh';");
  if (!cols.includes('income_category')) db.exec("ALTER TABLE sessions ADD COLUMN income_category TEXT DEFAULT 'Giáo dục';");

  // Ensure manual_transactions columns
  const txCols = db.prepare('PRAGMA table_info(manual_transactions)').all().map(c => c.name);
  if (!txCols.includes('updated_at')) db.exec("ALTER TABLE manual_transactions ADD COLUMN updated_at TEXT;");
}

function runSeed() {
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'local.db');
  let seedPath = path.join(dataDir, 'seed_data.json');
  if (!fs.existsSync(seedPath)) {
    seedPath = path.resolve(process.cwd(), 'scratch/backup_preserved_data.json');
  }

  if (!fs.existsSync(seedPath)) {
    console.log('[SeedRunner] Khong tim thay file seed_data.json hay backup_preserved_data.json.');
    return;
  }

  console.log(`[SeedRunner] Dang doc du lieu mau tu: ${seedPath}`);
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  // Kiem tra tinh toan ven (integrity check)
  let dbCorrupted = false;
  if (fs.existsSync(dbPath)) {
    try {
      const testDb = new Database(dbPath, { timeout: 3000 });
      const checkRes = testDb.pragma('integrity_check');
      const isOk = Array.isArray(checkRes) && checkRes.length > 0 && checkRes[0].integrity_check === 'ok';
      if (!isOk) {
        console.warn('[SeedRunner] CANH BAO: SQLite integrity check that bai! Ket qua:', checkRes);
        dbCorrupted = true;
      }
      testDb.close();
    } catch (e) {
      console.warn('[SeedRunner] CANH BAO: Loi khi mo SQLite de kiem tra toan ven:', e.message);
      dbCorrupted = true;
    }
  }

  if (dbCorrupted) {
    const backupCorruptedPath = path.join(dataDir, `local_corrupted_${Date.now()}.db`);
    console.log(`[SeedRunner] Dang sao luu database hong sang: ${backupCorruptedPath} va tao database sach moi...`);
    try {
      if (fs.existsSync(dbPath)) fs.renameSync(dbPath, backupCorruptedPath);
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (renameErr) {
      console.warn('[SeedRunner] Khong the rename db cu:', renameErr.message);
    }
  }

  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  } catch (e) {}

  initSchema(db);

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

  let totalInserted = 0;
  for (const table of tables) {
    const rows = seedData[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      const countRow = db.prepare(`SELECT count(*) as cnt FROM "${table}"`).get();
      const currentCount = countRow ? countRow.cnt : 0;

      // Neu bang rong hoac so luong it hon du lieu mau, nap du lieu
      if (currentCount === 0 || currentCount < rows.length) {
        console.log(`[SeedRunner] Bang "${table}" co ${currentCount} ban ghi (seed co ${rows.length}). Dang nap du lieu...`);
        const runTx = db.transaction(() => {
          for (const r of rows) {
            // Loc bo ban ghi loi o manual_transactions neu date khong phai string
            if (table === 'manual_transactions') {
              if (typeof r.date !== 'string' || !r.date.includes('-')) continue;
            }

            const keys = Object.keys(r);
            const cols = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map(k => `@${k}`).join(', ');
            const stmt = db.prepare(`INSERT OR IGNORE INTO "${table}" (${cols}) VALUES (${placeholders})`);
            stmt.run(r);
          }
        });
        runTx();
        const afterCount = db.prepare(`SELECT count(*) as cnt FROM "${table}"`).get().cnt;
        console.log(`[SeedRunner] Bang "${table}" hien co: ${afterCount} ban ghi.`);
        totalInserted += (afterCount - currentCount);
      } else {
        console.log(`[SeedRunner] Bang "${table}" da co san day du ${currentCount} ban ghi.`);
      }
    } catch (err) {
      console.warn(`[SeedRunner] Bang "${table}" gap loi: ${err.message}`);
    }
  }

  // Chay REINDEX va VACUUM de dam bao SQLite hoan toan khoe manh
  try {
    db.exec('REINDEX;');
  } catch (e) {}

  const finalCheck = db.pragma('integrity_check');
  console.log('[SeedRunner] Ket qua kiem tra toan ven cuoi cung:', finalCheck);

  db.close();
  console.log(`[SeedRunner] Hoan tat kiem tra. Tong ban ghi moi da nap: ${totalInserted}`);
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
