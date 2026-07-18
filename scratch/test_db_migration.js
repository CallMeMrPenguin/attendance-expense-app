const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function testSelectSessions() {
  console.log('Testing select from public.sessions...');
  const { data, error } = await client.from('sessions').select('*').limit(5);
  if (error) {
    console.error('Error selecting sessions:', error);
  } else {
    console.log('Selected sessions sample:', data);
  }
}

testSelectSessions();
