const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const matchUrl = line.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)$/);
    if (matchUrl) supabaseUrl = matchUrl[1].trim().replace(/['"]/g, '');
    const matchKey = line.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)$/);
    if (matchKey) supabaseAnonKey = matchKey[1].trim().replace(/['"]/g, '');
  }
}

console.log('Supabase URL:', supabaseUrl);
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase environment variables not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .limit(1);
  if (error) {
    console.error('Error querying sessions:', error);
  } else {
    console.log('Sessions row keys:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
    console.log('Session row sample:', data[0]);
  }
}

run();
