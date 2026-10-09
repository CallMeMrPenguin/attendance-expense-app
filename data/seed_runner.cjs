const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

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

  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {}

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

      if (currentCount === 0) {
        console.log(`[SeedRunner] Bang "${table}" dang rong (0 ban ghi). Dang nap ${rows.length} ban ghi...`);
        const runTx = db.transaction(() => {
          for (const r of rows) {
            const keys = Object.keys(r);
            const cols = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map(k => `@${k}`).join(', ');
            const stmt = db.prepare(`INSERT OR IGNORE INTO "${table}" (${cols}) VALUES (${placeholders})`);
            stmt.run(r);
          }
        });
        runTx();
        const afterCount = db.prepare(`SELECT count(*) as cnt FROM "${table}"`).get().cnt;
        console.log(`[SeedRunner] Bang "${table}" da duoc nap thanh cong: ${afterCount} ban ghi.`);
        totalInserted += afterCount;
      } else {
        console.log(`[SeedRunner] Bang "${table}" da co san ${currentCount} ban ghi.`);
      }
    } catch (err) {
      console.warn(`[SeedRunner] Bang "${table}" gap loi hoac chua tao: ${err.message}`);
    }
  }

  db.close();
  console.log(`[SeedRunner] Hoan tat kiem tra. Tong ban ghi moi da nap: ${totalInserted}`);
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
