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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase environment variables not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const testSession = {
    teacher_name: 'Test Teacher',
    student_name: 'Test Student',
    day_of_week: 'Thứ 2',
    time: '18:00',
    duration: 1.5,
    price: 100000,
    status: 'Chưa dạy',
    month_year: '2026-07',
    color: '#7c3aed',
    date: '2026-07-20',
    auto_check_in: true,
    loai_hinh_lich: 'co_dinh'
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert([testSession])
    .select();

  if (error) {
    console.error('Insert failed:', error.message, error.code);
  } else {
    console.log('Insert succeeded! Created row:', data);
    // Delete the test row
    await supabase.from('sessions').delete().eq('teacher_name', 'Test Teacher');
  }
}

run();
