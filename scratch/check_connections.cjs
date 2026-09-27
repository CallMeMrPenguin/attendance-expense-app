const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), 'data/local.db');

async function checkConnections() {
  console.log('--- Checking Connection Integrity (Local SQLite) ---');
  try {
    if (!fs.existsSync(dbPath)) {
      console.log('[ERROR] Database file not found at:', dbPath);
      return;
    }
    const db = new Database(dbPath);
    const profiles = db.prepare('SELECT id, username, user_name, role FROM profiles LIMIT 5').all();
    console.log(`[OK] Local database connected successfully! Found ${profiles.length} profiles.`);
    profiles.forEach(p => console.log(`  - User: ${p.username} (${p.user_name}) | Role: ${p.role}`));
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

checkConnections();
