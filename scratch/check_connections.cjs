const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = value;
    }
  });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnections() {
  console.log('--- Checking Connection Integrity ---');
  try {
    const { data, error } = await supabase.from('profiles').select('id, user_name, role').limit(5);
    if (error) {
      console.log('[ERROR] Profiles connection error:', error.message);
    } else {
      console.log(`[OK] Supabase connected successfully! Found ${data ? data.length : 0} profiles.`);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

checkConnections();
