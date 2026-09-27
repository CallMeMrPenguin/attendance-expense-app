const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), 'data/local.db');

if (!fs.existsSync(dbPath)) {
  console.error(`[ERROR] Local database file not found at: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

console.log('--- Checking Local SQLite DB Sync ---');
const tables = [
  'profiles',
  'teachers',
  'category_budgets',
  'savings_funds',
  'receipt_rules',
  'manual_transactions',
  'savings_history',
  'bank_receipts',
  'sessions'
];

let allOk = true;
for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM "${t}"`).get();
    console.log(`[OK] Table ${t}: ${row.count} rows`);
  } catch (err) {
    console.log(`[ERROR] Table ${t}: ${err.message}`);
    allOk = false;
  }
}

if (allOk) {
  console.log('--- All local tables synced and healthy! ---');
} else {
  console.error('--- Some tables encountered errors! ---');
  process.exit(1);
}
